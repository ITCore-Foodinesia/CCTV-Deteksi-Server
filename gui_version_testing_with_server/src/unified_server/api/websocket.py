"""
WebSocket (Socket.IO) event handlers for real-time updates.

Provides real-time communication with dashboard for:
- Status updates
- Statistics updates
- Detection events
- Sheets data updates
- Telegram status updates
"""

import time
import threading
from typing import Dict, Any, Optional, Callable
from flask_socketio import SocketIO, emit


def setup_websocket_handlers(
    socketio: SocketIO,
    app_context: Dict[str, Any]
) -> None:
    """
    Setup Socket.IO event handlers.
    
    Args:
        socketio: Flask-SocketIO instance
        app_context: Dictionary containing:
            - frame_buffer: FrameBuffer instance
            - stream_capture: StreamCapture instance
            - sheets: SheetsIntegration instance (optional)
            - telegram_state: Dict for telegram state
    """
    frame_buffer = app_context['frame_buffer']
    stream_capture = app_context['stream_capture']
    sheets = app_context.get('sheets')
    telegram_state = app_context.get('telegram_state', {})
    
    @socketio.on('connect')
    def handle_connect(auth=None):
        """Handle client connection."""
        client_id = getattr(emit, 'sid', 'unknown')
        print(f"[WebSocket] Client connected: {client_id}")
        
        # Send initial state
        emit('status_update', {
            'status': stream_capture.status,
            'running': stream_capture.is_running,
        })
        
        # Send current stats
        buffer_stats = frame_buffer.get_stats()
        emit('stats_update', {
            'fps': buffer_stats.get('fps', 0),
            'frame_count': buffer_stats.get('frame_count', 0),
            'detections': buffer_stats.get('total_detections', 0),
            'inbound': 0,
            'outbound': 0,
            'trucks': 0,
        })
        
        # Send sheets data if available
        if sheets:
            emit('sheets_update', sheets.get_latest_data())
        
        # Send telegram state
        if telegram_state:
            emit('telegram_status', telegram_state)
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection."""
        client_id = getattr(emit, 'sid', 'unknown')
        print(f"[WebSocket] Client disconnected: {client_id}")
    
    @socketio.on('request_stats')
    def handle_request_stats():
        """Handle stats request from client."""
        buffer_stats = frame_buffer.get_stats()
        
        # Get sheets data if available
        inbound = 0
        outbound = 0
        if sheets:
            sheets_data = sheets.get_latest_data()
            # Use latest_loading/latest_rehab (last row) not loading_count/rehab_count (totals)
            inbound = sheets_data.get('latest_loading', 0)
            outbound = sheets_data.get('latest_rehab', 0)
        
        emit('stats_update', {
            'fps': buffer_stats.get('fps', 0),
            'frame_count': buffer_stats.get('frame_count', 0),
            'detections': buffer_stats.get('total_detections', 0),
            'inbound': inbound,
            'outbound': outbound,
            'trucks': 0,
            'latency': buffer_stats.get('age_ms', 0),
        })
    
    @socketio.on('request_activities')
    def handle_request_activities():
        """Handle activities request from client."""
        # TODO: Implement activity logging
        emit('activities_update', [])
    
    @socketio.on('request_status')
    def handle_request_status():
        """Handle status request from client."""
        emit('status_update', {
            'status': stream_capture.status,
            'running': stream_capture.is_running,
        })
    
    @socketio.on('ping')
    def handle_ping():
        """Handle ping from client."""
        emit('pong', {'timestamp': time.time()})


class WebSocketBroadcaster:
    """
    Helper class to broadcast events to all connected clients.
    
    Usage:
        broadcaster = WebSocketBroadcaster(socketio)
        broadcaster.start_stats_loop(frame_buffer, sheets, interval=1.0)
    """
    
    def __init__(self, socketio: SocketIO):
        self.socketio = socketio
        self._stop_event = threading.Event()
        self._threads = []
    
    def start_stats_loop(
        self,
        frame_buffer,
        sheets: Optional[Any] = None,
        interval: float = 1.0
    ) -> None:
        """
        Start periodic stats broadcast.
        
        Args:
            frame_buffer: FrameBuffer instance
            sheets: SheetsIntegration instance (optional)
            interval: Broadcast interval in seconds
        """
        self._sheets = sheets  # Store for periodic broadcast
        
        def loop():
            sheets_broadcast_counter = 0
            
            while not self._stop_event.is_set():
                try:
                    buffer_stats = frame_buffer.get_stats()
                    
                    # Get sheets data if available
                    inbound = 0
                    outbound = 0
                    sheets_data = {}
                    if sheets:
                        sheets_data = sheets.get_latest_data()
                        # Use latest_loading/latest_rehab (last row) not loading_count/rehab_count (totals)
                        inbound = sheets_data.get('latest_loading', 0)
                        outbound = sheets_data.get('latest_rehab', 0)
                    
                    # Send stats update
                    self.socketio.emit('stats_update', {
                        'fps': buffer_stats.get('fps', 0),
                        'frame_count': buffer_stats.get('frame_count', 0),
                        'detections': buffer_stats.get('total_detections', 0),
                        'inbound': inbound,
                        'outbound': outbound,
                        'trucks': 0,
                        'latency': buffer_stats.get('age_ms', 0),
                    })
                    
                    # Also broadcast full sheets data every 5 seconds
                    sheets_broadcast_counter += 1
                    if sheets and sheets_broadcast_counter >= 5:
                        self.socketio.emit('sheets_update', sheets_data)
                        sheets_broadcast_counter = 0
                        
                except Exception as e:
                    print(f"[WebSocket] Stats broadcast error: {e}")
                
                self._stop_event.wait(interval)
        
        thread = threading.Thread(target=loop, daemon=True)
        thread.start()
        self._threads.append(thread)
    
    def broadcast_status(self, status: str, running: bool = True) -> None:
        """Broadcast status update to all clients."""
        self.socketio.emit('status_update', {
            'status': status,
            'running': running,
        })
    
    def broadcast_detection(self, detections: list) -> None:
        """Broadcast detection event to all clients."""
        self.socketio.emit('detection_event', {
            'timestamp': time.time(),
            'detections': detections,
        })
    
    def broadcast_sheets_update(self, data: dict) -> None:
        """Broadcast sheets data update to all clients."""
        self.socketio.emit('sheets_update', data)
    
    def broadcast_telegram_status(self, state: dict) -> None:
        """Broadcast telegram status update to all clients."""
        self.socketio.emit('telegram_status', state)
    
    def broadcast_activity(self, activity: dict) -> None:
        """Broadcast new activity to all clients."""
        self.socketio.emit('new_activity', activity)
    
    def stop(self) -> None:
        """Stop all broadcast loops."""
        self._stop_event.set()
        for thread in self._threads:
            if thread.is_alive():
                thread.join(timeout=1.0)