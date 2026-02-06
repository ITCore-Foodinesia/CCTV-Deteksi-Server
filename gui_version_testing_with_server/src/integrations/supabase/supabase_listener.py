"""
Supabase Session Listener for CCTV Detection Engine

This module subscribes to Supabase Realtime changes on the loading_sessions table
and triggers the CCTV detection engine based on session status changes.

Flow:
1. Flutter App starts a loading session (status='loading')
2. This listener receives the realtime event
3. Listener calls on_session_start callback → detection engine starts counting
4. Detection engine periodically pushes counts back to Supabase
5. Flutter App / Dashboard receives count updates via realtime

Requirements:
- supabase-py >= 2.0.0
- python-dotenv

Usage:
    from src.integrations.supabase.supabase_listener import SessionListener
    
    def on_start(session_data):
        print(f"Start counting for session: {session_data['id']}")
        
    def on_stop(session_id):
        print(f"Stop counting for session: {session_id}")
    
    listener = SessionListener(on_start, on_stop)
    listener.start()
"""

import os
import json
import threading
import time
import logging
from typing import Callable, Dict, Optional, Any
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(name)s] %(levelname)s: %(message)s'
)
logger = logging.getLogger('SupabaseListener')

try:
    from supabase import create_client, Client
    from realtime.connection import Socket
    SUPABASE_AVAILABLE = True
except ImportError:
    logger.warning("supabase-py not installed. Install with: pip install supabase")
    SUPABASE_AVAILABLE = False
    Client = None

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


class SessionListener:
    """
    Listens to Supabase loading_sessions table for status changes.
    Triggers detection engine callbacks based on session lifecycle.
    
    Attributes:
        on_session_start: Callback when a session transitions to 'loading' status
        on_session_stop: Callback when a session completes/cancels
        on_count_request: Optional callback to get current counts from detection
    """
    
    # Session statuses that trigger counting
    COUNTING_STATUSES = {'loading'}
    # Session statuses that stop counting
    STOPPED_STATUSES = {'completed', 'cancelled'}
    
    def __init__(
        self,
        on_session_start: Callable[[Dict], None],
        on_session_stop: Callable[[str], None],
        on_count_request: Optional[Callable[[str], Dict]] = None,
        supabase_url: Optional[str] = None,
        supabase_key: Optional[str] = None,
        use_service_role: bool = True
    ):
        """
        Initialize the SessionListener.
        
        Args:
            on_session_start: Called with session data when counting should start
            on_session_stop: Called with session_id when counting should stop
            on_count_request: Optional - called to get current counts for a session
            supabase_url: Supabase project URL (default: from env)
            supabase_key: Supabase key (default: from env, uses service_role if available)
            use_service_role: If True, prefer service_role key over anon key
        """
        if not SUPABASE_AVAILABLE:
            raise ImportError("supabase-py is required. Install with: pip install supabase")
        
        self.on_session_start = on_session_start
        self.on_session_stop = on_session_stop
        self.on_count_request = on_count_request
        
        # Get Supabase credentials
        self.supabase_url = supabase_url or os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
        
        # Prefer service_role key for backend operations (bypasses RLS)
        if use_service_role:
            self.supabase_key = supabase_key or os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        if not self.supabase_key:
            self.supabase_key = supabase_key or os.getenv('SUPABASE_ANON_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError(
                "Supabase credentials not found. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
                "environment variables."
            )
        
        # Initialize Supabase client
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)
        
        # Track active sessions being counted
        self.active_sessions: Dict[str, Dict] = {}
        
        # Thread control
        self._running = False
        self._channel = None
        self._push_thread: Optional[threading.Thread] = None
        self._push_interval = 5  # seconds between count pushes
        
        logger.info(f"SessionListener initialized for {self.supabase_url}")
    
    def start(self) -> None:
        """
        Start listening to Supabase Realtime.
        
        This method:
        1. Fetches existing active sessions
        2. Subscribes to realtime changes
        3. Starts background thread for count pushing
        """
        self._running = True
        
        # Fetch existing active sessions
        self._fetch_active_sessions()
        
        # Subscribe to realtime changes
        self._subscribe_to_sessions()
        
        # Start count pushing thread
        self._start_push_thread()
        
        logger.info("SessionListener started")
    
    def stop(self) -> None:
        """Stop listening and clean up resources."""
        self._running = False
        
        # Stop push thread
        if self._push_thread and self._push_thread.is_alive():
            self._push_thread.join(timeout=2)
        
        # Unsubscribe from realtime
        if self._channel:
            try:
                self.supabase.realtime.remove_channel(self._channel)
            except Exception as e:
                logger.warning(f"Error removing channel: {e}")
        
        # Notify stop for all active sessions
        for session_id in list(self.active_sessions.keys()):
            try:
                self.on_session_stop(session_id)
            except Exception as e:
                logger.error(f"Error calling on_session_stop for {session_id}: {e}")
        
        self.active_sessions.clear()
        logger.info("SessionListener stopped")
    
    def _fetch_active_sessions(self) -> None:
        """Fetch sessions that are currently in 'loading' status."""
        try:
            result = self.supabase.table('loading_sessions').select(
                'id, driver_id, truck_id, dock_id, camera_id, status, plate_number, '
                'counting_active, loading_count, rehab_count, started_at, metadata'
            ).in_('status', list(self.COUNTING_STATUSES)).execute()
            
            for session in result.data:
                session_id = session['id']
                self.active_sessions[session_id] = session
                
                # Trigger callback for each active session
                try:
                    self.on_session_start(session)
                    logger.info(f"Resumed active session: {session_id}")
                except Exception as e:
                    logger.error(f"Error in on_session_start for {session_id}: {e}")
            
            logger.info(f"Found {len(result.data)} active sessions")
            
        except Exception as e:
            logger.error(f"Failed to fetch active sessions: {e}")
    
    def _subscribe_to_sessions(self) -> None:
        """Subscribe to realtime changes on loading_sessions table."""
        try:
            self._channel = self.supabase.realtime.channel('session-changes')
            
            self._channel.on_postgres_changes(
                event='*',
                schema='public',
                table='loading_sessions',
                callback=self._handle_change
            )
            
            self._channel.subscribe()
            logger.info("Subscribed to loading_sessions realtime changes")
            
        except Exception as e:
            logger.error(f"Failed to subscribe to realtime: {e}")
            raise
    
    def _handle_change(self, payload: Dict) -> None:
        """
        Handle realtime change events from Supabase.
        
        Args:
            payload: Realtime event payload containing:
                - eventType: 'INSERT', 'UPDATE', or 'DELETE'
                - new: New record data (for INSERT/UPDATE)
                - old: Old record data (for UPDATE/DELETE)
        """
        try:
            event_type = payload.get('eventType', payload.get('type', ''))
            new_data = payload.get('new', {})
            old_data = payload.get('old', {})
            
            session_id = new_data.get('id') or old_data.get('id')
            new_status = new_data.get('status')
            old_status = old_data.get('status')
            
            logger.debug(f"Realtime event: {event_type}, session={session_id}, "
                        f"status: {old_status} -> {new_status}")
            
            # Session started loading
            if new_status in self.COUNTING_STATUSES and old_status not in self.COUNTING_STATUSES:
                self.active_sessions[session_id] = new_data
                try:
                    self.on_session_start(new_data)
                    logger.info(f"Session started: {session_id} (plate: {new_data.get('plate_number')})")
                except Exception as e:
                    logger.error(f"Error in on_session_start: {e}")
            
            # Session stopped/completed
            elif old_status in self.COUNTING_STATUSES and new_status not in self.COUNTING_STATUSES:
                if session_id in self.active_sessions:
                    del self.active_sessions[session_id]
                try:
                    self.on_session_stop(session_id)
                    logger.info(f"Session stopped: {session_id} (status: {new_status})")
                except Exception as e:
                    logger.error(f"Error in on_session_stop: {e}")
            
            # Session update while active (just update local cache)
            elif session_id in self.active_sessions:
                self.active_sessions[session_id] = new_data
                
        except Exception as e:
            logger.error(f"Error handling realtime change: {e}")
    
    def _start_push_thread(self) -> None:
        """Start background thread for periodically pushing counts to Supabase."""
        def push_loop():
            while self._running:
                self._push_all_counts()
                time.sleep(self._push_interval)
        
        self._push_thread = threading.Thread(target=push_loop, daemon=True)
        self._push_thread.start()
        logger.info(f"Count push thread started (interval: {self._push_interval}s)")
    
    def _push_all_counts(self) -> None:
        """Push current counts for all active sessions to Supabase."""
        if not self.on_count_request:
            return
        
        for session_id in list(self.active_sessions.keys()):
            try:
                counts = self.on_count_request(session_id)
                if counts:
                    self.update_counts(
                        session_id,
                        counts.get('loading_count', 0),
                        counts.get('rehab_count', 0)
                    )
            except Exception as e:
                logger.warning(f"Failed to push counts for {session_id}: {e}")
    
    def update_counts(
        self,
        session_id: str,
        loading_count: int,
        rehab_count: int
    ) -> bool:
        """
        Update counting values in Supabase.
        
        Args:
            session_id: ID of the loading session
            loading_count: Current loading count from CCTV
            rehab_count: Current rehab count from CCTV
            
        Returns:
            True if update succeeded, False otherwise
        """
        try:
            self.supabase.table('loading_sessions').update({
                'loading_count': loading_count,
                'rehab_count': rehab_count,
                'updated_at': datetime.utcnow().isoformat()
            }).eq('id', session_id).execute()
            
            logger.debug(f"Updated counts for {session_id}: loading={loading_count}, rehab={rehab_count}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update counts for {session_id}: {e}")
            return False
    
    def log_event(
        self,
        session_id: str,
        event_type: str,
        description: str = '',
        event_data: Optional[Dict] = None
    ) -> bool:
        """
        Insert a loading_event record.
        
        Args:
            session_id: ID of the loading session
            event_type: Type of event (e.g., 'truck_detected', 'plate_recognized')
            description: Human-readable description
            event_data: Additional structured data
            
        Returns:
            True if insert succeeded, False otherwise
        """
        try:
            self.supabase.table('loading_events').insert({
                'session_id': session_id,
                'event_type': event_type,
                'description': description,
                'event_data': json.dumps(event_data) if event_data else None,
                'source': 'cctv_engine',
                'event_ts': datetime.utcnow().isoformat()
            }).execute()
            
            logger.debug(f"Logged event for {session_id}: {event_type}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to log event for {session_id}: {e}")
            return False
    
    def update_plate_detected(
        self,
        session_id: str,
        plate_number: str,
        confidence: float = 0.0
    ) -> bool:
        """
        Update detected plate number from OCR.
        
        Args:
            session_id: ID of the loading session
            plate_number: Detected plate number
            confidence: OCR confidence (0-100)
            
        Returns:
            True if update succeeded, False otherwise
        """
        try:
            session = self.active_sessions.get(session_id, {})
            current_metadata = session.get('metadata') or {}
            
            self.supabase.table('loading_sessions').update({
                'plate_detected': plate_number,
                'metadata': {
                    **current_metadata,
                    'plate_confidence': confidence,
                    'plate_detected_at': datetime.utcnow().isoformat()
                },
                'updated_at': datetime.utcnow().isoformat()
            }).eq('id', session_id).execute()
            
            logger.info(f"Updated plate for {session_id}: {plate_number} (conf: {confidence:.1f}%)")
            return True
            
        except Exception as e:
            logger.error(f"Failed to update plate for {session_id}: {e}")
            return False
    
    def complete_session(
        self,
        session_id: str,
        final_loading_count: int = 0,
        final_rehab_count: int = 0
    ) -> bool:
        """
        Mark a session as completed from the CCTV engine side.
        
        Args:
            session_id: ID of the loading session
            final_loading_count: Final loading count
            final_rehab_count: Final rehab count
            
        Returns:
            True if update succeeded, False otherwise
        """
        try:
            session = self.active_sessions.get(session_id, {})
            started_at = session.get('started_at')
            
            ended_at = datetime.utcnow()
            duration = 0
            if started_at:
                try:
                    start_dt = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
                    duration = int((ended_at - start_dt).total_seconds())
                except:
                    pass
            
            self.supabase.table('loading_sessions').update({
                'status': 'completed',
                'counting_active': False,
                'loading_count': final_loading_count,
                'rehab_count': final_rehab_count,
                'items_in': final_loading_count,
                'items_out': final_rehab_count,
                'ended_at': ended_at.isoformat(),
                'duration_seconds': duration,
                'updated_at': ended_at.isoformat()
            }).eq('id', session_id).execute()
            
            # Remove from active sessions
            if session_id in self.active_sessions:
                del self.active_sessions[session_id]
            
            logger.info(f"Session completed: {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to complete session {session_id}: {e}")
            return False
    
    def get_session_by_plate(self, plate_number: str) -> Optional[Dict]:
        """
        Find active session by plate number.
        
        Args:
            plate_number: Plate number to search for
            
        Returns:
            Session data if found, None otherwise
        """
        # First check local cache
        for session in self.active_sessions.values():
            if session.get('plate_number') == plate_number:
                return session
            if session.get('plate_detected') == plate_number:
                return session
        
        # Query database if not in cache
        try:
            result = self.supabase.table('loading_sessions').select('*').or_(
                f'plate_number.eq.{plate_number},plate_detected.eq.{plate_number}'
            ).in_('status', list(self.COUNTING_STATUSES)).execute()
            
            if result.data:
                return result.data[0]
                
        except Exception as e:
            logger.error(f"Failed to query session by plate: {e}")
        
        return None
    
    @property
    def is_running(self) -> bool:
        """Check if listener is currently running."""
        return self._running
    
    @property
    def active_session_count(self) -> int:
        """Get count of currently active sessions."""
        return len(self.active_sessions)
    
    def get_active_session_ids(self) -> list:
        """Get list of active session IDs."""
        return list(self.active_sessions.keys())


# Example usage and testing
if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Supabase Session Listener Test')
    parser.add_argument('--test', action='store_true', help='Run in test mode')
    args = parser.parse_args()
    
    # Test callbacks
    def on_start(session_data):
        print(f"\n>>> SESSION STARTED <<<")
        print(f"    ID: {session_data['id']}")
        print(f"    Plate: {session_data.get('plate_number', 'N/A')}")
        print(f"    Status: {session_data['status']}")
    
    def on_stop(session_id):
        print(f"\n>>> SESSION STOPPED <<<")
        print(f"    ID: {session_id}")
    
    def get_counts(session_id):
        # Mock counts - in real usage, get from detection engine
        import random
        return {
            'loading_count': random.randint(0, 100),
            'rehab_count': random.randint(0, 20)
        }
    
    try:
        listener = SessionListener(
            on_session_start=on_start,
            on_session_stop=on_stop,
            on_count_request=get_counts if args.test else None
        )
        
        print("Starting Supabase Session Listener...")
        print(f"Supabase URL: {listener.supabase_url}")
        print("Press Ctrl+C to stop\n")
        
        listener.start()
        
        # Keep running
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nStopping...")
        listener.stop()
        print("Done.")
    except Exception as e:
        print(f"Error: {e}")
