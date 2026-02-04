"""
Mock Loading Dashboard - Display All Active Loading Sessions + CCTV Streaming

This testing module:
- Connects to Supabase database (realtime)
- Listens to loading_sessions table for ALL docks
- Displays current loading drivers with counting status
- Simulates CCTV engine response to Flutter "Mulai Loading" action
- **INTEGRATES with existing CCTV Dashboard Live Streaming**
- For testing integration: Flutter App → Database → CCTV Engine → Dashboard

Connection to Live CCTV Dashboard:
    This server exposes APIs compatible with the existing dashboard:
    - Socket.IO for realtime stats/activities (same as api_server.py)
    - /api/stream/video for MJPEG streaming (passthrough or mock)
    - /api/sheets/status for Google Sheets compatibility
    
    Set VITE_API_URL to this server's address to test with React Dashboard.

Usage:
    python -m src.testing.mock_loading_dashboard
    python -m src.testing.mock_loading_dashboard --tui        # With TUI dashboard
    python -m src.testing.mock_loading_dashboard --simulate   # Auto-simulate counting
    python -m src.testing.mock_loading_dashboard --with-stream # Include MJPEG stream

Test Flow:
    1. Flutter App: Driver clicks "Mulai Loading"
    2. Supabase: Insert/Update loading_session with status='loading'
    3. This Server: Receives realtime event → displays on dashboard
    4. This Server: Simulates counting (optional)
    5. Dashboard (React): Shows live count updates via Socket.IO
    6. CCTVFeed: Shows video stream from /api/stream/video

Requirements:
    pip install flask flask-socketio supabase-py python-dotenv requests opencv-python numpy
"""

import argparse
import json
import os
import random
import threading
import time
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional

from flask import Flask, Response, jsonify, request
from flask_cors import CORS

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Socket.IO for Dashboard compatibility
try:
    from flask_socketio import SocketIO, emit
    SOCKETIO_AVAILABLE = True
except ImportError:
    SOCKETIO_AVAILABLE = False
    print("[WARNING] flask-socketio not installed. Run: pip install flask-socketio")

# OpenCV for video streaming
try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    print("[WARNING] opencv-python not installed. Video streaming disabled.")

# Supabase imports
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None
    print("[WARNING] supabase-py not installed. Run: pip install supabase")

# Flask app with CORS
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Socket.IO initialization
if SOCKETIO_AVAILABLE:
    socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')
else:
    socketio = None

# =============================================================================
# GLOBAL STATE
# =============================================================================

# Active loading sessions from all docks
active_sessions: Dict[str, Dict] = {}
sessions_lock = threading.Lock()

# Server stats
server_stats = {
    'status': 'initializing',
    'supabase_connected': False,
    'total_sessions_received': 0,
    'active_sessions_count': 0,
    'last_event_time': None,
    'uptime_seconds': 0,
    'mode': 'mock_loading_dashboard'
}

# Configuration
config = {
    'supabase_url': None,
    'supabase_connected': False,
    'simulate_counting': False,
    'counting_interval': 2,  # seconds
    'port': 5003
}

# Control flags
stop_event = threading.Event()
start_time = time.time()

# Supabase client
supabase_client: Optional[Client] = None


# =============================================================================
# SUPABASE CONNECTION
# =============================================================================

def init_supabase() -> bool:
    """Initialize Supabase client and verify connection."""
    global supabase_client, config, server_stats
    
    supabase_url = os.getenv('SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
    supabase_key = (
        os.getenv('SUPABASE_SERVICE_ROLE_KEY') or 
        os.getenv('SUPABASE_ANON_KEY') or 
        os.getenv('VITE_SUPABASE_ANON_KEY')
    )
    
    if not supabase_url or not supabase_key:
        print("[ERROR] Supabase credentials not found in environment")
        print("       Set SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY)")
        return False
    
    if not SUPABASE_AVAILABLE:
        print("[ERROR] supabase-py not installed")
        return False
    
    try:
        supabase_client = create_client(supabase_url, supabase_key)
        config['supabase_url'] = supabase_url
        config['supabase_connected'] = True
        server_stats['supabase_connected'] = True
        print(f"[Supabase] Connected to: {supabase_url}")
        return True
    except Exception as e:
        print(f"[ERROR] Failed to connect to Supabase: {e}")
        return False


def fetch_active_sessions() -> List[Dict]:
    """Fetch all currently active loading sessions from database."""
    global active_sessions, server_stats
    
    if not supabase_client:
        return []
    
    try:
        # Query loading_sessions with status='loading', join with drivers and docks
        result = supabase_client.table('loading_sessions').select(
            '''
            id,
            driver_id,
            truck_id,
            dock_id,
            camera_id,
            plate_number,
            status,
            loading_count,
            rehab_count,
            counting_active,
            started_at,
            created_at,
            tenant_id,
            drivers!loading_sessions_driver_id_fkey(id, name, phone, driver_code),
            docks!loading_sessions_dock_id_fkey(id, dock_code, dock_name),
            trucks!loading_sessions_truck_id_fkey(id, plate_number, truck_type)
            '''
        ).eq('status', 'loading').execute()
        
        with sessions_lock:
            for session in result.data:
                session_id = session['id']
                active_sessions[session_id] = format_session_data(session)
            
            server_stats['active_sessions_count'] = len(active_sessions)
        
        print(f"[Supabase] Fetched {len(result.data)} active sessions")
        return result.data
        
    except Exception as e:
        print(f"[ERROR] Failed to fetch active sessions: {e}")
        return []


def format_session_data(raw_session: Dict) -> Dict:
    """Format session data for display."""
    driver_data = raw_session.get('drivers') or {}
    dock_data = raw_session.get('docks') or {}
    truck_data = raw_session.get('trucks') or {}
    
    return {
        'id': raw_session.get('id'),
        'driver': {
            'id': driver_data.get('id'),
            'name': driver_data.get('name', 'Unknown Driver'),
            'phone': driver_data.get('phone', ''),
            'code': driver_data.get('driver_code', '')
        },
        'dock': {
            'id': dock_data.get('id'),
            'code': dock_data.get('dock_code', 'N/A'),
            'name': dock_data.get('dock_name', 'Unknown Dock')
        },
        'truck': {
            'id': truck_data.get('id'),
            'plate': truck_data.get('plate_number') or raw_session.get('plate_number', 'N/A'),
            'type': truck_data.get('truck_type', 'N/A')
        },
        'plate_number': raw_session.get('plate_number', 'N/A'),
        'status': raw_session.get('status', 'unknown'),
        'loading_count': raw_session.get('loading_count', 0),
        'rehab_count': raw_session.get('rehab_count', 0),
        'counting_active': raw_session.get('counting_active', False),
        'started_at': raw_session.get('started_at'),
        'created_at': raw_session.get('created_at'),
        'tenant_id': raw_session.get('tenant_id'),
        'last_update': datetime.now().isoformat()
    }


def subscribe_to_sessions():
    """
    Subscribe to realtime changes on loading_sessions table.
    
    NOTE: supabase-py sync client doesn't support Realtime.
    We use polling instead (fetch_active_sessions every 2 seconds).
    This function is kept for future async implementation.
    """
    global supabase_client, server_stats
    
    if not supabase_client:
        print("[ERROR] Supabase client not initialized")
        return
    
    # NOTE: Realtime not supported in sync client
    # Using polling approach instead (see broadcast_loop)
    print("[Supabase] Realtime subscription not available in sync client")
    print("[Supabase] Using polling approach instead (every 2 seconds)")
    server_stats['status'] = 'polling'


# =============================================================================
# COUNTING SIMULATION
# =============================================================================

def simulate_counting_loop():
    """Simulate CCTV counting for all active sessions."""
    global active_sessions
    
    print("[Simulator] Starting counting simulation...")
    
    while not stop_event.is_set():
        with sessions_lock:
            for session_id, session in active_sessions.items():
                if session.get('counting_active', True):
                    # Simulate random counting
                    session['loading_count'] += random.randint(0, 3)
                    session['rehab_count'] += random.randint(0, 1)
                    session['last_update'] = datetime.now().isoformat()
                    
                    # Push to Supabase
                    if supabase_client and config['simulate_counting']:
                        try:
                            supabase_client.table('loading_sessions').update({
                                'loading_count': session['loading_count'],
                                'rehab_count': session['rehab_count'],
                                'updated_at': datetime.utcnow().isoformat()
                            }).eq('id', session_id).execute()
                        except Exception as e:
                            print(f"[Simulator] Failed to push counts: {e}")
        
        # Broadcast update to dashboard
        broadcast_session_update()
        
        stop_event.wait(config['counting_interval'])
    
    print("[Simulator] Counting simulation stopped")


def broadcast_loop():
    """Periodic broadcast to connected dashboard clients + polling from database."""
    print("[Broadcast] Starting broadcast loop with database polling...")
    
    while not stop_event.is_set():
        try:
            # Polling: Fetch active sessions from database every cycle
            if supabase_client:
                fetch_active_sessions()
            
            # Broadcast to dashboard
            broadcast_session_update()
        except Exception as e:
            print(f"[Broadcast] Error: {e}")
        
        stop_event.wait(2)  # Poll & broadcast every 2 seconds
    
    print("[Broadcast] Broadcast loop stopped")


# =============================================================================
# REST API ENDPOINTS
# =============================================================================

@app.route('/health')
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'mode': 'mock_loading_dashboard',
        'supabase_connected': config['supabase_connected']
    })


@app.route('/stats')
def get_stats():
    """Server statistics endpoint."""
    server_stats['uptime_seconds'] = int(time.time() - start_time)
    return jsonify(server_stats)


@app.route('/sessions')
def get_all_sessions():
    """Get all active loading sessions."""
    with sessions_lock:
        return jsonify({
            'count': len(active_sessions),
            'sessions': list(active_sessions.values())
        })


@app.route('/sessions/<session_id>')
def get_session(session_id):
    """Get specific session by ID."""
    with sessions_lock:
        session = active_sessions.get(session_id)
        if session:
            return jsonify(session)
        return jsonify({'error': 'Session not found'}), 404


@app.route('/sessions/by-dock/<dock_code>')
def get_sessions_by_dock(dock_code):
    """Get sessions for specific dock."""
    with sessions_lock:
        dock_sessions = [
            s for s in active_sessions.values()
            if s.get('dock', {}).get('code') == dock_code
        ]
        return jsonify({
            'dock_code': dock_code,
            'count': len(dock_sessions),
            'sessions': dock_sessions
        })


@app.route('/sessions/by-driver/<driver_id>')
def get_sessions_by_driver(driver_id):
    """Get sessions for specific driver."""
    with sessions_lock:
        driver_sessions = [
            s for s in active_sessions.values()
            if s.get('driver', {}).get('id') == driver_id
        ]
        return jsonify({
            'driver_id': driver_id,
            'count': len(driver_sessions),
            'sessions': driver_sessions
        })


@app.route('/simulate/start-loading', methods=['POST'])
def simulate_start_loading():
    """
    Simulate Flutter "Mulai Loading" action.
    
    This endpoint inserts a new loading_session with status='loading'
    to trigger the realtime flow.
    
    Body:
        {
            "driver_id": "uuid",
            "truck_id": "uuid",
            "dock_id": "uuid",
            "plate_number": "B 1234 ABC"
        }
    """
    if not supabase_client:
        return jsonify({'error': 'Supabase not connected'}), 503
    
    data = request.get_json() or {}
    
    required_fields = ['driver_id', 'dock_id', 'plate_number']
    missing = [f for f in required_fields if not data.get(f)]
    if missing:
        return jsonify({'error': f'Missing fields: {missing}'}), 400
    
    try:
        # Get tenant_id from existing data or use default
        tenant_id = data.get('tenant_id', 'test-tenant-001')
        
        new_session = {
            'driver_id': data['driver_id'],
            'truck_id': data.get('truck_id'),
            'dock_id': data['dock_id'],
            'plate_number': data['plate_number'],
            'status': 'loading',
            'counting_active': True,
            'loading_count': 0,
            'rehab_count': 0,
            'started_at': datetime.utcnow().isoformat(),
            'tenant_id': tenant_id
        }
        
        result = supabase_client.table('loading_sessions').insert(new_session).execute()
        
        return jsonify({
            'success': True,
            'message': 'Loading session started',
            'session': result.data[0] if result.data else None
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/simulate/stop-loading/<session_id>', methods=['POST'])
def simulate_stop_loading(session_id):
    """
    Simulate Flutter "Selesai Loading" action.
    
    Updates session status to 'completed'.
    """
    if not supabase_client:
        return jsonify({'error': 'Supabase not connected'}), 503
    
    try:
        with sessions_lock:
            session = active_sessions.get(session_id)
            final_loading = session['loading_count'] if session else 0
            final_rehab = session['rehab_count'] if session else 0
        
        result = supabase_client.table('loading_sessions').update({
            'status': 'completed',
            'counting_active': False,
            'loading_count': final_loading,
            'rehab_count': final_rehab,
            'ended_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat()
        }).eq('id', session_id).execute()
        
        return jsonify({
            'success': True,
            'message': 'Loading session completed',
            'final_counts': {
                'loading': final_loading,
                'rehab': final_rehab
            }
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/simulate/increment-count/<session_id>', methods=['POST'])
def simulate_increment_count(session_id):
    """
    Manually increment counts for testing.
    
    Body (optional):
        {
            "loading_increment": 1,
            "rehab_increment": 0
        }
    """
    data = request.get_json() or {}
    loading_inc = data.get('loading_increment', 1)
    rehab_inc = data.get('rehab_increment', 0)
    
    with sessions_lock:
        if session_id not in active_sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        session = active_sessions[session_id]
        session['loading_count'] += loading_inc
        session['rehab_count'] += rehab_inc
        session['last_update'] = datetime.now().isoformat()
        
        new_counts = {
            'loading_count': session['loading_count'],
            'rehab_count': session['rehab_count']
        }
    
    # Push to Supabase if connected
    if supabase_client:
        try:
            supabase_client.table('loading_sessions').update({
                **new_counts,
                'updated_at': datetime.utcnow().isoformat()
            }).eq('id', session_id).execute()
        except Exception as e:
            print(f"[API] Failed to push increment: {e}")
    
    return jsonify({
        'success': True,
        'session_id': session_id,
        'counts': new_counts
    })


# =============================================================================
# DASHBOARD-COMPATIBLE API ENDPOINTS (for React Dashboard integration)
# These endpoints match api_server.py interface so dashboard can connect
# =============================================================================

@app.route('/api/status')
def api_status():
    """Status endpoint compatible with dashboard."""
    with sessions_lock:
        active_count = len(active_sessions)
        if active_count > 0:
            first_session = list(active_sessions.values())[0]
            active_plate = first_session.get('plate_number', 'N/A')
        else:
            active_plate = 'N/A'
    
    return jsonify({
        'status': 'Connected' if config['supabase_connected'] else 'Offline',
        'mode': 'mock_loading_dashboard',
        'active_sessions': active_count,
        'active_plate': active_plate
    })


@app.route('/api/stats')
def api_stats():
    """Stats endpoint compatible with dashboard."""
    with sessions_lock:
        total_loading = sum(s.get('loading_count', 0) for s in active_sessions.values())
        total_rehab = sum(s.get('rehab_count', 0) for s in active_sessions.values())
        trucks = len(active_sessions)
    
    return jsonify({
        'inbound': total_loading,
        'outbound': total_rehab,
        'trucks': trucks,
        'capacity': 84,
        'fps': 30,
        'latency': 50
    })


@app.route('/api/activities')
def api_activities():
    """Activities endpoint compatible with dashboard."""
    with sessions_lock:
        activities = []
        for session in active_sessions.values():
            activities.append({
                'id': session.get('id'),
                'type': 'loading',
                'description': f"Loading: {session.get('driver', {}).get('name', 'Unknown')} @ {session.get('dock', {}).get('code', 'N/A')}",
                'plate': session.get('plate_number', 'N/A'),
                'loading_count': session.get('loading_count', 0),
                'rehab_count': session.get('rehab_count', 0),
                'timestamp': session.get('last_update', datetime.now().isoformat())
            })
    
    return jsonify(activities)


@app.route('/api/sheets/status')
def api_sheets_status():
    """Google Sheets status compatible with dashboard."""
    with sessions_lock:
        if active_sessions:
            first_session = list(active_sessions.values())[0]
            return jsonify({
                'connected': True,
                'latest_plate': first_session.get('plate_number', 'N/A'),
                'latest_driver': first_session.get('driver', {}).get('name', 'Unknown'),
                'latest_items': 'Mock Items',
                'loading_count': sum(s.get('loading_count', 0) for s in active_sessions.values()),
                'rehab_count': sum(s.get('rehab_count', 0) for s in active_sessions.values()),
                'latest_loading': first_session.get('loading_count', 0),
                'latest_rehab': first_session.get('rehab_count', 0),
                'jam_datang': first_session.get('started_at', ''),
                'jam_selesai': ''  # Empty means still loading
            })
    
    return jsonify({
        'connected': True,
        'latest_plate': 'N/A',
        'latest_driver': 'N/A',
        'latest_items': 'N/A',
        'loading_count': 0,
        'rehab_count': 0,
        'latest_loading': 0,
        'latest_rehab': 0,
        'jam_datang': '',
        'jam_selesai': ''
    })


# =============================================================================
# VIDEO STREAMING (for CCTVFeed component)
# =============================================================================

def generate_mock_video_frame():
    """Generate a mock video frame with current session info."""
    if not CV2_AVAILABLE:
        return None
    
    # Create a dark frame
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    frame[:] = (30, 30, 40)  # Dark blue-gray
    
    # Add header
    cv2.putText(frame, "MOCK CCTV STREAM", (180, 40), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 200, 255), 2)
    
    # Add timestamp
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(frame, timestamp, (10, 470), 
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 200), 1)
    
    # Add active sessions info
    with sessions_lock:
        y_pos = 80
        if active_sessions:
            for session in list(active_sessions.values())[:3]:
                driver = session.get('driver', {}).get('name', 'Unknown')
                dock = session.get('dock', {}).get('code', 'N/A')
                loading = session.get('loading_count', 0)
                rehab = session.get('rehab_count', 0)
                
                cv2.putText(frame, f"DOCK {dock}: {driver}", (20, y_pos),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
                cv2.putText(frame, f"Loading: {loading} | Rehab: {rehab}", (20, y_pos + 25),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 100), 1)
                y_pos += 60
        else:
            cv2.putText(frame, "No Active Loading Sessions", (150, 240),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (100, 100, 100), 2)
    
    # Encode to JPEG
    _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
    return jpeg.tobytes()


def generate_mjpeg_stream():
    """Generator for MJPEG video stream."""
    while True:
        frame_bytes = generate_mock_video_frame()
        if frame_bytes:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.033)  # ~30 FPS


@app.route('/api/stream/video')
def api_stream_video():
    """MJPEG stream endpoint compatible with CCTVFeed component."""
    if not CV2_AVAILABLE:
        return jsonify({'error': 'OpenCV not available for video streaming'}), 503
    
    return Response(
        generate_mjpeg_stream(),
        mimetype='multipart/x-mixed-replace; boundary=frame',
        headers={
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Access-Control-Allow-Origin': '*',
        }
    )


@app.route('/video_feed')
def video_feed():
    """Alternative video stream endpoint (mock_main_v3 compatible)."""
    return api_stream_video()


# =============================================================================
# SOCKET.IO EVENTS (for real-time dashboard updates)
# =============================================================================

if SOCKETIO_AVAILABLE and socketio:
    @socketio.on('connect')
    def handle_connect():
        """Handle client connection."""
        print(f"[Socket.IO] Client connected")
        emit('status_update', {'status': 'Connected'})
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection."""
        print(f"[Socket.IO] Client disconnected")
    
    @socketio.on('request_stats')
    def handle_request_stats():
        """Send current stats to client."""
        with sessions_lock:
            total_loading = sum(s.get('loading_count', 0) for s in active_sessions.values())
            total_rehab = sum(s.get('rehab_count', 0) for s in active_sessions.values())
            trucks = len(active_sessions)
        
        emit('stats_update', {
            'inbound': total_loading,
            'outbound': total_rehab,
            'trucks': trucks,
            'capacity': 84,
            'fps': 30,
            'latency': 50
        })
    
    @socketio.on('request_activities')
    def handle_request_activities():
        """Send activities to client."""
        with sessions_lock:
            activities = []
            for session in active_sessions.values():
                activities.append({
                    'id': session.get('id'),
                    'type': 'loading',
                    'description': f"Loading: {session.get('driver', {}).get('name', 'Unknown')}",
                    'timestamp': session.get('last_update', datetime.now().isoformat())
                })
        
        emit('activities_update', activities)


def broadcast_session_update():
    """Broadcast session updates to all connected Socket.IO clients."""
    if not SOCKETIO_AVAILABLE or not socketio:
        return
    
    with sessions_lock:
        total_loading = sum(s.get('loading_count', 0) for s in active_sessions.values())
        total_rehab = sum(s.get('rehab_count', 0) for s in active_sessions.values())
        
        if active_sessions:
            first_session = list(active_sessions.values())[0]
            
            # Ensure jam_datang has a value when loading is active
            jam_datang = first_session.get('started_at') or first_session.get('created_at')
            if not jam_datang:
                # If no started_at, use current time to indicate active loading
                jam_datang = datetime.now().strftime('%H:%M:%S')
            
            sheets_data = {
                'connected': True,
                'latest_plate': first_session.get('plate_number') or first_session.get('truck', {}).get('plate', 'N/A'),
                'latest_driver': first_session.get('driver', {}).get('name', 'Unknown'),
                'latest_items': f"Dock {first_session.get('dock', {}).get('code', 'N/A')} - Loading",
                'loading_count': total_loading,
                'rehab_count': total_rehab,
                'latest_loading': first_session.get('loading_count', 0),
                'latest_rehab': first_session.get('rehab_count', 0),
                'jam_datang': jam_datang,  # Must have value for dashboard to show "loading aktif"
                'jam_selesai': ''  # Empty = still loading
            }
        else:
            sheets_data = {
                'connected': True,
                'latest_plate': 'N/A',
                'latest_driver': 'N/A',
                'latest_items': 'N/A',
                'loading_count': 0,
                'rehab_count': 0,
                'latest_loading': 0,
                'latest_rehab': 0,
                'jam_datang': '',
                'jam_selesai': ''
            }
    
    try:
        socketio.emit('stats_update', {
            'inbound': total_loading,
            'outbound': total_rehab,
            'trucks': len(active_sessions),
            'capacity': 84,
            'fps': 30,
            'latency': 50
        })
        socketio.emit('sheets_update', sheets_data)
    except Exception as e:
        print(f"[Socket.IO] Broadcast error: {e}")


@app.route('/dashboard')
def dashboard_html():
    """Simple HTML dashboard for visual testing."""
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Mock Loading Dashboard</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #1a1a2e; color: #eee; }
            h1 { color: #00d4ff; }
            .card { background: #16213e; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #00d4ff; }
            .driver { font-size: 1.2em; font-weight: bold; color: #fff; }
            .dock { color: #00d4ff; }
            .counts { display: flex; gap: 20px; margin-top: 10px; }
            .count-box { background: #0f3460; padding: 10px 20px; border-radius: 4px; }
            .count-value { font-size: 1.5em; font-weight: bold; }
            .loading { color: #00ff88; }
            .rehab { color: #ff6b6b; }
            .status { font-size: 0.9em; color: #888; }
            #refresh { background: #00d4ff; color: #000; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-bottom: 20px; }
        </style>
    </head>
    <body>
        <h1>🚛 Mock Loading Dashboard</h1>
        <button id="refresh" onclick="fetchSessions()">Refresh</button>
        <div id="sessions"></div>
        
        <script>
            function fetchSessions() {
                fetch('/sessions')
                    .then(r => r.json())
                    .then(data => {
                        let html = '<p>Active Sessions: ' + data.count + '</p>';
                        data.sessions.forEach(s => {
                            html += `
                                <div class="card">
                                    <div class="driver">${s.driver.name}</div>
                                    <div class="dock">Dock: ${s.dock.code} - ${s.dock.name}</div>
                                    <div class="counts">
                                        <div class="count-box">
                                            <div class="count-value loading">${s.loading_count}</div>
                                            <div>Loading</div>
                                        </div>
                                        <div class="count-box">
                                            <div class="count-value rehab">${s.rehab_count}</div>
                                            <div>Rehab</div>
                                        </div>
                                    </div>
                                    <div class="status">Plate: ${s.plate_number} | Updated: ${s.last_update}</div>
                                </div>
                            `;
                        });
                        document.getElementById('sessions').innerHTML = html;
                    });
            }
            
            fetchSessions();
            setInterval(fetchSessions, 2000);
        </script>
    </body>
    </html>
    """
    return Response(html, mimetype='text/html')


# =============================================================================
# TUI DASHBOARD
# =============================================================================

def get_tui_stats() -> Dict:
    """Get stats for TUI display."""
    with sessions_lock:
        sessions_list = list(active_sessions.values())
    
    return {
        'status': server_stats['status'],
        'mode': 'MOCK LOADING DASHBOARD',
        'port': config['port'],
        'uptime_seconds': int(time.time() - start_time),
        'supabase': {
            'connected': config['supabase_connected'],
            'url': config['supabase_url'][:30] + '...' if config['supabase_url'] else 'N/A'
        },
        'sessions': {
            'active_count': len(sessions_list),
            'total_received': server_stats['total_sessions_received'],
            'last_event': server_stats['last_event_time']
        },
        'active_drivers': [
            {
                'name': s['driver']['name'],
                'dock': s['dock']['code'],
                'loading': s['loading_count'],
                'rehab': s['rehab_count']
            }
            for s in sessions_list
        ],
        'urls': {
            'dashboard': f'http://localhost:{config["port"]}/dashboard',
            'sessions': f'http://localhost:{config["port"]}/sessions',
            'health': f'http://localhost:{config["port"]}/health'
        }
    }


# =============================================================================
# MAIN
# =============================================================================

def run_server(port: int = 5003):
    """Run Flask server with Socket.IO if available."""
    import logging
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    
    if SOCKETIO_AVAILABLE and socketio:
        print(f"[Server] Starting with Socket.IO on port {port}")
        socketio.run(app, host='0.0.0.0', port=port, debug=False, allow_unsafe_werkzeug=True)
    else:
        print(f"[Server] Starting Flask-only on port {port}")
        app.run(host='0.0.0.0', port=port, debug=False, threaded=True)


def main():
    global config
    
    parser = argparse.ArgumentParser(
        description="Mock Loading Dashboard - Display Active Loading Sessions + CCTV Integration"
    )
    parser.add_argument(
        '--port', '-p',
        type=int,
        default=5003,
        help='Server port (default: 5003)'
    )
    parser.add_argument(
        '--tui',
        action='store_true',
        help='Enable TUI dashboard (requires rich library)'
    )
    parser.add_argument(
        '--simulate',
        action='store_true',
        help='Enable automatic counting simulation'
    )
    parser.add_argument(
        '--interval',
        type=int,
        default=2,
        help='Counting simulation interval in seconds (default: 2)'
    )
    
    args = parser.parse_args()
    config['port'] = args.port
    config['simulate_counting'] = args.simulate
    config['counting_interval'] = args.interval
    
    # Initialize TUI if requested
    tui = None
    if args.tui:
        try:
            from src.utils.tui import ServerTUI
            tui = ServerTUI(
                title=f"Mock Loading Dashboard - Port {args.port}",
                get_stats=get_tui_stats
            )
            if not tui.start():
                tui = None
                print("[TUI] Failed to start. Running without TUI.")
        except ImportError:
            print("[TUI] TUI module not found. Running without TUI.")
    
    if not tui:
        print("=" * 70)
        print("  Mock Loading Dashboard + CCTV Streaming Integration")
        print("=" * 70)
        print()
        print(f"  Port: {args.port}")
        print(f"  Simulate Counting: {'Enabled' if args.simulate else 'Disabled'}")
        print(f"  Socket.IO: {'Enabled' if SOCKETIO_AVAILABLE else 'Disabled'}")
        print(f"  Video Stream: {'Enabled' if CV2_AVAILABLE else 'Disabled'}")
        print()
    
    # Initialize Supabase
    if not init_supabase():
        print("[WARNING] Running without Supabase connection")
        print("         Set environment variables to enable database connection")
    else:
        # Fetch existing active sessions
        fetch_active_sessions()
        
        # Subscribe to realtime changes
        subscribe_to_sessions()
    
    # Start counting simulation if enabled
    if args.simulate:
        sim_thread = threading.Thread(target=simulate_counting_loop, daemon=True)
        sim_thread.start()
        print(f"[Simulator] Counting simulation enabled (interval: {args.interval}s)")
    
    # Start broadcast loop for dashboard updates
    broadcast_thread = threading.Thread(target=broadcast_loop, daemon=True)
    broadcast_thread.start()
    print("[Broadcast] Dashboard broadcast loop started")
    
    if not tui:
        print()
        print("─" * 70)
        print("  React Dashboard Integration (set VITE_API_URL to this server)")
        print("─" * 70)
        print(f"  API Status:     http://localhost:{args.port}/api/status")
        print(f"  API Stats:      http://localhost:{args.port}/api/stats")
        print(f"  Video Stream:   http://localhost:{args.port}/api/stream/video")
        print(f"  Sheets Status:  http://localhost:{args.port}/api/sheets/status")
        print()
        print("─" * 70)
        print("  Testing Endpoints")
        print("─" * 70)
        print(f"  Sessions List:  http://localhost:{args.port}/sessions")
        print(f"  Mock Dashboard: http://localhost:{args.port}/dashboard")
        print()
        print("  POST /simulate/start-loading   - Simulate Flutter 'Mulai Loading'")
        print("  POST /simulate/stop-loading/<id>  - Simulate 'Selesai Loading'")
        print("  POST /simulate/increment-count/<id> - Manual count increment")
        print()
        print("─" * 70)
        print("  To connect React Dashboard:")
        print(f"    VITE_API_URL=http://localhost:{args.port}")
        print("─" * 70)
        print()
        print("Press Ctrl+C to stop")
        print("=" * 70)
    
    # Run server
    server_stats['status'] = 'running'
    run_server(args.port)


if __name__ == '__main__':
    main()
