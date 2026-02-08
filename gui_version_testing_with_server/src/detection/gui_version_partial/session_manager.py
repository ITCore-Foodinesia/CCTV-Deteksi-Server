"""
Session Manager for CCTV Detection Engine

Bridges multiple session sources:
1. Flutter App via Supabase (loading_sessions table)
2. QR Code Scanner (local detection)

Provides unified session state to the detector and uploader.

ELI5: Think of this as a "traffic controller" that listens to two roads 
(Flutter app and QR scanner) and tells the counting machine when to start/stop.
"""

import os
import time
import threading
import logging
from typing import Callable, Dict, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime

# Configure logging
from pathlib import Path
import sys

# Define log file path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
LOG_DIR = PROJECT_ROOT / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / "session_manager.log"

# Setup file handler
file_handler = logging.FileHandler(LOG_FILE, mode='a', encoding='utf-8')
file_handler.setFormatter(logging.Formatter('%(asctime)s [%(name)s] %(levelname)s: %(message)s'))

# Setup console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(logging.Formatter('%(asctime)s [%(name)s] %(levelname)s: %(message)s'))

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    handlers=[file_handler, console_handler]
)
logger = logging.getLogger('SessionManager')

# Try importing Supabase (optional dependency)
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    logger.warning("supabase-py not installed. Supabase integration disabled.")
    SUPABASE_AVAILABLE = False
    Client = None

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


@dataclass
class Session:
    """
    Represents an active counting session.
    
    Can be started from:
    - Flutter app (via Supabase) -> has session_id
    - QR scan (local) -> session_id is None
    """
    plate_number: str
    started_at: float = field(default_factory=time.time)
    loading_count: int = 0
    rehab_count: int = 0
    source: str = "unknown"  # "supabase", "qr_scan", "api"
    session_id: Optional[str] = None  # Supabase session ID (UUID)
    driver_id: Optional[str] = None
    truck_id: Optional[str] = None
    dock_id: Optional[str] = None
    camera_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'plate_number': self.plate_number,
            'started_at': self.started_at,
            'loading_count': self.loading_count,
            'rehab_count': self.rehab_count,
            'source': self.source,
            'session_id': self.session_id,
            'driver_id': self.driver_id,
            'truck_id': self.truck_id,
            'dock_id': self.dock_id,
            'camera_id': self.camera_id,
            'metadata': self.metadata,
        }


class SessionManager:
    """
    Manages active sessions from multiple sources.
    
    Responsibilities:
    1. Listen to Supabase for Flutter-initiated sessions
    2. Accept QR scan events from detector
    3. Provide unified session state
    4. Push count updates to Supabase (if session is from Flutter)
    
    Usage:
        manager = SessionManager(
            on_session_change=lambda session: print(f"New session: {session}"),
            supabase_url="https://xxx.supabase.co",
            supabase_key="your-key"
        )
        manager.start()
        
        # When QR scanned
        manager.start_session_from_qr("KT 1234 ABC")
        
        # When counts change
        manager.update_counts(10, 2)
        
        # Stop
        manager.stop()
    """
    
    def __init__(
        self,
        on_session_change: Optional[Callable[[Optional[Session]], None]] = None,
        supabase_url: Optional[str] = None,
        supabase_key: Optional[str] = None,
        push_interval: float = 5.0,
        enable_supabase: bool = True
    ):
        """
        Initialize SessionManager.
        
        Args:
            on_session_change: Callback when session starts/stops
            supabase_url: Supabase project URL
            supabase_key: Supabase service role key
            push_interval: How often to push counts to Supabase (seconds)
            enable_supabase: Enable Supabase integration
        """
        self.on_session_change = on_session_change
        self.push_interval = push_interval
        self.enable_supabase = enable_supabase and SUPABASE_AVAILABLE
        
        # Current active session
        self._session: Optional[Session] = None
        self._lock = threading.RLock()
        
        # Supabase client
        self._supabase: Optional[Client] = None
        self._supabase_url = supabase_url or os.getenv('SUPABASE_URL')
        self._supabase_key = supabase_key or os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY')
        
        # Thread control
        self._running = False
        self._channel = None
        self._push_thread: Optional[threading.Thread] = None
        
        # Initialize Supabase if available
        if self.enable_supabase and self._supabase_url and self._supabase_key:
            try:
                self._supabase = create_client(self._supabase_url, self._supabase_key)
                logger.info(f"Supabase client initialized: {self._supabase_url}")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase: {e}")
                self._supabase = None
        else:
            logger.info("Supabase integration disabled (missing credentials or flag)")
    
    @property
    def current_session(self) -> Optional[Session]:
        """Get current active session."""
        with self._lock:
            return self._session
    
    @property
    def current_plate(self) -> str:
        """Get current plate number or 'UNKNOWN'."""
        with self._lock:
            return self._session.plate_number if self._session else "UNKNOWN"
    
    @property
    def is_counting_active(self) -> bool:
        """Check if a counting session is active."""
        with self._lock:
            return self._session is not None
    
    @property
    def is_supabase_connected(self) -> bool:
        """Check if Supabase is connected."""
        return self._supabase is not None
    
    def start(self) -> None:
        """Start the session manager (Supabase listener + push thread)."""
        self._running = True
        
        # Fetch existing active sessions from Supabase
        if self._supabase:
            self._fetch_active_sessions()
            self._subscribe_to_sessions()
        
        # Start count push thread
        self._start_push_thread()

        # Start polling thread (Fail-safe)
        self._start_polling_thread()
        
        logger.info("SessionManager started")
    
    def stop(self) -> None:
        """Stop the session manager."""
        self._running = False
        
        # Stop push thread
        if self._push_thread and self._push_thread.is_alive():
            self._push_thread.join(timeout=2)
        
        # Stop polling thread
        if hasattr(self, '_polling_thread') and self._polling_thread and self._polling_thread.is_alive():
            self._polling_thread.join(timeout=2)
        
        # Unsubscribe from Supabase
        if self._channel and self._supabase:
            try:
                self._supabase.realtime.remove_channel(self._channel)
            except Exception as e:
                logger.warning(f"Error removing channel: {e}")
        
        logger.info("SessionManager stopped")
    
    def start_session_from_qr(self, plate_number: str) -> Session:
        """
        Start a new session from QR scan.
        
        Args:
            plate_number: Scanned plate number
            
        Returns:
            The new Session object
        """
        with self._lock:
            # End previous session if exists
            if self._session:
                self._end_current_session()
            
            # Create new session
            self._session = Session(
                plate_number=plate_number,
                source="qr_scan",
                started_at=time.time()
            )
            
            logger.info(f"Session started from QR: {plate_number}")
            
            # Notify callback
            if self.on_session_change:
                self.on_session_change(self._session)
            
            return self._session
    
    def start_session_from_supabase(self, session_data: Dict) -> Session:
        """
        Start a new session from Supabase event.
        
        Args:
            session_data: Session data from Supabase
            
        Returns:
            The new Session object
        """
        with self._lock:
            # End previous session if exists
            if self._session:
                self._end_current_session()
            
            # Extract plate_number strategy:
            # 1. Check 'plate_detected' (highest priority as per user request)
            # 2. Check 'plate_number' (loading_sessions table)
            # 3. Check joined truck data (trucks.plate_number)
            # 4. Manual fetch from trucks table using truck_id (fallback)
            
            # Strategy 1: Check 'plate_detected' (from Flutter/User input)
            plate_detected = session_data.get('plate_detected')
            
            # Strategy 2: Check 'plate_number' (Legacy/DB field)
            plate_direct = session_data.get('plate_number')
            
            # Strategy 3: Check joined truck data
            plate_trucks = None
            trucks_data = session_data.get('trucks')
            if trucks_data and isinstance(trucks_data, dict):
                plate_trucks = trucks_data.get('plate_number')
                
            # Log all available sources for debugging
            logger.info(f"🔍 Resolving Plate for Session {session_data.get('id')}:")
            logger.info(f"   - plate_detected: '{plate_detected}'")
            logger.info(f"   - plate_number:   '{plate_direct}'")
            logger.info(f"   - trucks.plate:   '{plate_trucks}'")

            # Decision Logic (Priority: Detected > Direct > Trucks Join)
            plate_number = plate_detected or plate_direct or plate_trucks
            
            # Strategy 4: Manual fetch if we have truck_id but still no plate
            truck_id = session_data.get('truck_id')
            if not plate_number and truck_id and self._supabase:
                try:
                    logger.info(f"⚠️ Plate still missing. Attempting manual fetch for truck_id: {truck_id}")
                    t_res = self._supabase.table('trucks').select('plate_number').eq('id', truck_id).execute()
                    if t_res.data and len(t_res.data) > 0:
                        plate_number = t_res.data[0].get('plate_number')
                        logger.info(f"✅ Manual truck fetch success: {plate_number}")
                    else:
                        logger.warning(f"❌ Manual truck fetch returned no data for ID {truck_id}")
                except Exception as e:
                    logger.error(f"❌ Manual truck fetch error: {e}")

            # Final Fallback
            if not plate_number:
                # Use truck_id as last resort visual identifier if available
                if truck_id:
                    plate_number = f"TRUCK-{str(truck_id)[:4]}"
                else:
                    plate_number = 'UNKNOWN'
                logger.error(f"❌ All plate fetch strategies failed. Final Fallback: {plate_number}")
            else:
                logger.info(f"🎯 Final Resolved Plate: '{plate_number}'")
            
            # Create new session
            self._session = Session(
                plate_number=plate_number,
                source="supabase",
                session_id=session_data.get('id'),
                driver_id=session_data.get('driver_id'),
                truck_id=session_data.get('truck_id'),
                dock_id=session_data.get('dock_id'),
                camera_id=session_data.get('camera_id'),
                loading_count=session_data.get('loading_count', 0),
                rehab_count=session_data.get('rehab_count', 0),
                metadata=session_data.get('metadata') or {}
            )
            
            # Parse started_at if available
            started_at_str = session_data.get('started_at')
            if started_at_str:
                try:
                    dt = datetime.fromisoformat(started_at_str.replace('Z', '+00:00'))
                    self._session.started_at = dt.timestamp()
                except:
                    pass
            
            logger.info(f"Session started from Supabase: {self._session.plate_number} (ID: {self._session.session_id})")
            
            # Notify callback
            if self.on_session_change:
                self.on_session_change(self._session)
            
            return self._session
    
    def start_session_from_api(self, plate_number: str, status: str = "START") -> Optional[Session]:
        """
        Start a new session from API (Telegram bot, etc.).
        
        Args:
            plate_number: Plate number from API
            status: Status string (START, LOADING, etc.)
            
        Returns:
            The new Session object or None if status is STOP
        """
        if status in ["STOP", "STOPPED", "WAITING", "IDLE", "FINISHED"]:
            self.end_session()
            return None
        
        with self._lock:
            # If same plate and already active, just update
            if self._session and self._session.plate_number == plate_number:
                return self._session
            
            # End previous session if different plate
            if self._session:
                self._end_current_session()
            
            # Create new session
            self._session = Session(
                plate_number=plate_number,
                source="api",
                started_at=time.time()
            )
            
            logger.info(f"Session started from API: {plate_number}")
            
            # Notify callback
            if self.on_session_change:
                self.on_session_change(self._session)
            
            return self._session
    
    def end_session(self) -> Optional[Session]:
        """
        End the current session.
        
        Returns:
            The ended Session object or None
        """
        with self._lock:
            if not self._session:
                return None
            
            ended_session = self._end_current_session()
            
            # Notify callback
            if self.on_session_change:
                self.on_session_change(None)
            
            return ended_session
    
    def update_counts(self, loading: int, rehab: int) -> None:
        """
        Update counts for current session.
        
        Args:
            loading: New loading count
            rehab: New rehab count
        """
        with self._lock:
            if self._session:
                self._session.loading_count = loading
                self._session.rehab_count = rehab
    
    def increment_loading(self) -> int:
        """Increment loading count by 1. Returns new count."""
        with self._lock:
            if self._session:
                self._session.loading_count += 1
                return self._session.loading_count
            return 0
    
    def increment_rehab(self) -> int:
        """Increment rehab count by 1. Returns new count."""
        with self._lock:
            if self._session:
                self._session.rehab_count += 1
                return self._session.rehab_count
            return 0
    
    def get_counts(self) -> tuple:
        """Get current (loading, rehab, total) counts."""
        with self._lock:
            if self._session:
                loading = self._session.loading_count
                rehab = self._session.rehab_count
                return (loading, rehab, loading - rehab)
            return (0, 0, 0)
    
    def _end_current_session(self) -> Optional[Session]:
        """Internal: End current session and push final counts."""
        if not self._session:
            return None
        
        ended_session = self._session
        
        # Push final counts to Supabase if session is from Flutter
        if ended_session.session_id and self._supabase:
            try:
                self._push_counts_to_supabase(ended_session, final=True)
            except Exception as e:
                logger.error(f"Failed to push final counts: {e}")
        
        self._session = None
        logger.info(f"Session ended: {ended_session.plate_number}")
        
        return ended_session
    
    def _fetch_active_sessions(self) -> None:
        """Fetch existing active sessions from Supabase."""
        if not self._supabase:
            return
        
        try:
            # Join with trucks table to get plate_number if not directly stored
            # Added 'plate_detected' to selection
            result = self._supabase.table('loading_sessions').select(
                'id, driver_id, truck_id, dock_id, camera_id, status, plate_number, plate_detected, '
                'counting_active, loading_count, rehab_count, started_at, metadata, '
                'trucks(plate_number)'
            ).eq('status', 'loading').execute()
            
            if result.data:
                # Take the first active session
                session_data = result.data[0]
                self.start_session_from_supabase(session_data)
                logger.info(f"Resumed active session from Supabase: {session_data['id']}")
            
        except Exception as e:
            logger.error(f"Failed to fetch active sessions: {e}")
    
    def _subscribe_to_sessions(self) -> None:
        """Subscribe to Supabase realtime changes."""
        if not self._supabase:
            return
        
        try:
            self._channel = self._supabase.realtime.channel('session-manager')
            
            self._channel.on_postgres_changes(
                event='*',
                schema='public',
                table='loading_sessions',
                callback=self._handle_supabase_change
            )
            
            self._channel.subscribe()
            logger.info("Subscribed to loading_sessions realtime changes")
            
        except Exception as e:
            logger.error(f"Failed to subscribe to realtime: {e}")
    
    def _handle_supabase_change(self, payload: Dict) -> None:
        """Handle Supabase realtime events."""
        try:
            new_data = payload.get('new', {})
            old_data = payload.get('old', {})
            
            # Normalize status to lowercase for comparison
            new_status = str(new_data.get('status', '')).lower()
            old_status = str(old_data.get('status', '')).lower()
            session_id = new_data.get('id') or old_data.get('id')
            
            logger.info(f"Supabase Realtime Event: ID={session_id} | Status: {old_status} -> {new_status}")
            
            # Session started loading (handle 'loading', 'started', 'active')
            active_statuses = ['loading', 'started', 'active']
            
            is_becoming_active = new_status in active_statuses and old_status not in active_statuses
            
            if is_becoming_active:
                logger.info(f"⚡ DETECTED NEW SESSION START: ID={session_id}")
                
                # Realtime payload doesn't include joined trucks data
                # Re-fetch the session with trucks JOIN to get plate_number
                # Add a small delay to ensure DB commit propagation if needed
                time.sleep(0.5)
                
                session_data = self._fetch_session_with_trucks(session_id)
                if session_data:
                    plate = session_data.get('plate_detected') or session_data.get('plate_number')
                    logger.info(f"✅ Fetch success for {session_id}. Found Plate: {plate}")
                    self.start_session_from_supabase(session_data)
                else:
                    # Fallback to raw payload if fetch fails
                    logger.warning(f"⚠️ Could not fetch session details with trucks, falling back to raw payload from realtime event")
                    self.start_session_from_supabase(new_data)
            
            # Session completed/cancelled
            elif old_status in active_statuses and new_status in ['completed', 'cancelled', 'stopped']:
                with self._lock:
                    if self._session and self._session.session_id == session_id:
                        self._session = None
                        if self.on_session_change:
                            self.on_session_change(None)
                        logger.info(f"Session stopped from Supabase: {session_id}")
            
        except Exception as e:
            logger.error(f"Error handling Supabase change: {e}")
    
    def _fetch_session_with_trucks(self, session_id: str) -> Optional[Dict]:
        """
        Fetch a single session with trucks JOIN to get plate_number.
        
        Args:
            session_id: The session UUID to fetch
            
        Returns:
            Session data dict with trucks.plate_number, or None if failed
        """
        if not self._supabase or not session_id:
            return None
        
        try:
            # First try: Standard join
            # Added 'plate_detected' to selection
            result = self._supabase.table('loading_sessions').select(
                'id, driver_id, truck_id, dock_id, camera_id, status, plate_number, plate_detected, '
                'counting_active, loading_count, rehab_count, started_at, metadata, '
                'trucks(plate_number)'
            ).eq('id', session_id).execute()
            
            if result.data and len(result.data) > 0:
                data = result.data[0]
                # Log what we found
                truck_info = data.get('trucks')
                logger.info(f"Fetch result for {session_id}: Plate={data.get('plate_number')}, TruckInfo={truck_info}")
                return data
            
            logger.warning(f"Session {session_id} not found in fetch (retrying...)")
            return None
            
        except Exception as e:
            logger.error(f"Failed to fetch session with trucks: {e}")
            return None
    
    def _start_polling_thread(self) -> None:
        """Start background thread for polling active sessions (Fail-safe)."""
        def poll_loop():
            logger.info("Polling thread started (interval: 2s)")
            while self._running:
                try:
                    # If we don't have an active session, look for one
                    if not self._session:
                        self._fetch_active_sessions()
                    
                    # If we DO have a session from Supabase, verify it's still active
                    elif self._session.source == "supabase" and self._session.session_id:
                        self._verify_current_session_status()
                        
                except Exception as e:
                    logger.error(f"Polling error: {e}")
                
                time.sleep(2.0)
        
        self._polling_thread = threading.Thread(target=poll_loop, daemon=True)
        self._polling_thread.start()

    def _verify_current_session_status(self) -> None:
        """Check if current Supabase session is still valid/active."""
        if not self._supabase or not self._session or not self._session.session_id:
            return

        try:
            # Fetch current status of this session
            res = self._supabase.table('loading_sessions').select('status').eq('id', self._session.session_id).execute()
            if res.data:
                status = res.data[0].get('status', '').lower()
                # If status changed to completed/cancelled, end it locally
                if status in ['completed', 'cancelled', 'stopped']:
                    logger.info(f"Polling detected session ended: {self._session.session_id} (status={status})")
                    self.end_session()
        except Exception as e:
            logger.error(f"Error verifying session status: {e}")

    def _start_push_thread(self) -> None:
        """Start background thread for pushing counts to Supabase."""
        def push_loop():
            while self._running:
                self._push_current_counts()
                time.sleep(self.push_interval)
        
        self._push_thread = threading.Thread(target=push_loop, daemon=True)
        self._push_thread.start()
        logger.info(f"Count push thread started (interval: {self.push_interval}s)")
    
    def _push_current_counts(self) -> None:
        """Push current counts to Supabase if session is active."""
        with self._lock:
            if self._session and self._session.session_id and self._supabase:
                try:
                    self._push_counts_to_supabase(self._session)
                except Exception as e:
                    logger.warning(f"Failed to push counts: {e}")
    
    def _push_counts_to_supabase(self, session: Session, final: bool = False) -> None:
        """Push counts to Supabase."""
        if not self._supabase or not session.session_id:
            return
        
        update_data = {
            'loading_count': session.loading_count,
            'rehab_count': session.rehab_count,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        if final:
            update_data['status'] = 'completed'
            update_data['counting_active'] = False
            update_data['ended_at'] = datetime.utcnow().isoformat()
            update_data['items_in'] = session.loading_count
            update_data['items_out'] = session.rehab_count
        
        self._supabase.table('loading_sessions').update(
            update_data
        ).eq('id', session.session_id).execute()
        
        logger.debug(f"Pushed counts to Supabase: L={session.loading_count}, R={session.rehab_count}")


# Singleton instance for easy access
_manager_instance: Optional[SessionManager] = None


def get_session_manager() -> Optional[SessionManager]:
    """Get the global SessionManager instance."""
    return _manager_instance


def init_session_manager(**kwargs) -> SessionManager:
    """Initialize the global SessionManager instance."""
    global _manager_instance
    _manager_instance = SessionManager(**kwargs)
    return _manager_instance


# Test code
if __name__ == '__main__':
    def on_change(session):
        if session:
            print(f"Session active: {session.plate_number} (source: {session.source})")
        else:
            print("Session ended")
    
    manager = SessionManager(on_session_change=on_change)
    manager.start()
    
    print("Testing QR scan...")
    manager.start_session_from_qr("KT 1234 ABC")
    manager.update_counts(10, 2)
    print(f"Counts: {manager.get_counts()}")
    
    time.sleep(2)
    
    manager.end_session()
    manager.stop()
    print("Done.")
