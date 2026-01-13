"""
Unified Stream Server - Single Worker CCTV Dashboard Backend

Entry point for the unified server that combines:
- Video capture from RTSP/camera
- YOLO object detection
- MJPEG streaming
- REST API endpoints
- WebSocket real-time updates
- Google Sheets integration
- Telegram integration

Usage:
    python -m unified_server.main [options]
    
Options:
    --config PATH    Path to config file (default: config.json)
    --port PORT      Server port (default: 5001)
    --host HOST      Server host (default: 0.0.0.0)
    --tui            Enable terminal UI dashboard
    --no-detection   Disable YOLO detection
    --debug          Enable debug mode
"""

import argparse
import signal
import sys
import time
from typing import Dict, Any, Optional

from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

from .config import load_config, ServerConfig, CaptureConfig
from .capture.frame_buffer import FrameBuffer
from .capture.stream_capture import StreamCapture
from .capture.http_relay import HTTPStreamRelay, StreamCaptureRelay
from .api.routes import create_api_blueprint
from .api.websocket import setup_websocket_handlers, WebSocketBroadcaster
from .integrations.google_sheets import SheetsIntegration
from .integrations.telegram import TelegramStateManager


# ==============================================================================
# Flask App Factory
# ==============================================================================

def create_app(config: ServerConfig) -> tuple:
    """
    Create and configure Flask application.
    
    Args:
        config: Server configuration
        
    Returns:
        tuple: (app, socketio, app_context)
    """
    app = Flask(__name__)
    CORS(app)
    
    # Check for WebSocket support
    try:
        import simple_websocket  # noqa: F401
        allow_upgrades = True
    except ImportError:
        allow_upgrades = False
        print("[Warning] simple-websocket not installed, WebSocket upgrades disabled")
    
    socketio = SocketIO(
        app,
        cors_allowed_origins="*",
        async_mode="threading",
        allow_upgrades=allow_upgrades,
    )
    
    # Initialize components
    frame_buffer = FrameBuffer(max_frames=config.capture.buffer_size)
    
    # Choose capture mode: relay (from Main V3) or direct (own RTSP capture)
    if config.capture.mode == "relay":
        # Relay mode: read from Main V3's video feed
        stream_capture = StreamCaptureRelay(
            config=config.capture,
            frame_buffer=frame_buffer,
            stream_url=config.capture.relay_url,
        )
    else:
        # Direct mode: own RTSP capture with YOLO detection
        capture_config = CaptureConfig(
            mode="direct",
            source=config.capture.source,
            width=config.capture.width,
            height=config.capture.height,
            target_fps=config.capture.target_fps,
            jpeg_quality=config.capture.jpeg_quality,
            detection_enabled=config.capture.detection_enabled,
            model_path=config.capture.model_path,
        )
        stream_capture = StreamCapture(capture_config, frame_buffer)
    
    # Initialize integrations
    sheets = None
    if config.sheets.enabled:
        sheets = SheetsIntegration(config.sheets)
    
    telegram_manager = TelegramStateManager()
    
    # Create app context
    app_context: Dict[str, Any] = {
        'frame_buffer': frame_buffer,
        'stream_capture': stream_capture,
        'sheets': sheets,
        'telegram_state': telegram_manager.get_state(),
        'telegram_manager': telegram_manager,
        'socketio': socketio,
        'config': config,
    }
    
    # Register API blueprint
    api_blueprint = create_api_blueprint(app_context)
    app.register_blueprint(api_blueprint)
    
    # Setup WebSocket handlers
    setup_websocket_handlers(socketio, app_context)
    
    # Store context on app for access in routes
    app.app_context_data = app_context
    
    return app, socketio, app_context


# Global state for TUI
_start_time = time.time()
_tui_context = {}


def _get_tui_stats() -> Dict[str, Any]:
    """Get stats for enhanced TUI display."""
    ctx = _tui_context
    config = ctx.get('config')
    stream_capture = ctx.get('stream_capture')
    sheets = ctx.get('sheets')
    telegram_manager = ctx.get('telegram_manager')
    frame_buffer = ctx.get('frame_buffer')
    
    uptime_seconds = int(time.time() - _start_time)
    
    # Stream status
    status = 'unknown'
    if stream_capture:
        raw_status = stream_capture.status
        if raw_status == "Streaming":
            status = 'streaming'
        elif "Error" in raw_status or "Failed" in raw_status:
            status = 'error'
        elif "Connecting" in raw_status or "Reconnecting" in raw_status:
            status = 'connecting'
        elif raw_status == "Stopped":
            status = 'stopped'
        else:
            status = raw_status.lower()
    
    # Mode and port
    mode = config.capture.mode.upper() if config else 'UNKNOWN'
    port = config.port if config else 5001
    
    # Source
    if config:
        source = config.capture.relay_url if config.capture.mode == "relay" else config.capture.source
    else:
        source = "N/A"
    
    # Performance stats
    fps_current = 0
    buffer_current = 0
    buffer_max = 10
    frames_total = 0
    clients = 0
    
    if frame_buffer:
        buffer_current = frame_buffer.size
        buffer_max = frame_buffer.max_frames if hasattr(frame_buffer, 'max_frames') else 10
    
    if stream_capture and hasattr(stream_capture, 'stats'):
        stats = stream_capture.stats
        fps_current = stats.get('fps', 0)
        frames_total = stats.get('frames_captured', 0)
        clients = stats.get('clients', 0)
    
    # Sheets integration
    sheets_connected = False
    sheets_latest = ''
    sheets_age = 0
    if sheets:
        sheets_connected = getattr(sheets, 'is_connected', False)
        if hasattr(sheets, 'get_latest_data'):
            sheets_data = sheets.get_latest_data()
            sheets_latest = sheets_data.get('latest_plate', '')
            sheets_age = sheets_data.get('age_seconds', 0)
    
    # Telegram integration
    tg_active = False
    tg_plate = ''
    tg_status = 'IDLE'
    if telegram_manager:
        tg_state = telegram_manager.get_state()
        tg_status = tg_state.get('status', 'IDLE')
        tg_plate = tg_state.get('plate', '')
        tg_active = tg_status not in ('IDLE', 'UNKNOWN')
    
    return {
        'status': status,
        'mode': mode,
        'port': port,
        'uptime_seconds': uptime_seconds,
        'stream': {
            'status': status,
            'source': source[:30],
            'clients': clients,
            'frames_total': frames_total,
        },
        'performance': {
            'fps': {'current': fps_current, 'max': 30},
            'buffer': {'current': buffer_current, 'max': buffer_max},
            'latency_ms': 35,  # Placeholder - would need actual measurement
        },
        'integrations': {
            'sheets': {
                'connected': sheets_connected,
                'latest': sheets_latest,
                'age_seconds': sheets_age,
            },
            'telegram': {
                'active': tg_active,
                'plate': tg_plate,
                'status': tg_status,
            },
        },
        'urls': {
            'video': f'http://localhost:{port}/api/stream/video',
            'api': f'http://localhost:{port}/api/status',
            'ws': f'ws://localhost:{port}',
        },
    }


# ==============================================================================
# Server Runner
# ==============================================================================

def run_server(config: ServerConfig) -> None:
    """
    Run the unified stream server.
    
    Args:
        config: Server configuration
    """
    global _tui_context
    
    # Create Flask app
    app, socketio, app_context = create_app(config)
    
    # Get components
    frame_buffer = app_context['frame_buffer']
    stream_capture = app_context['stream_capture']
    sheets = app_context['sheets']
    telegram_manager = app_context['telegram_manager']
    
    # Store context for TUI
    _tui_context = {
        'config': config,
        'stream_capture': stream_capture,
        'sheets': sheets,
        'telegram_manager': telegram_manager,
        'frame_buffer': frame_buffer,
    }
    
    # Enable TUI if requested
    tui = None
    if config.enable_tui:
        try:
            from ..utils.tui import ServerTUI
            tui = ServerTUI(
                title=f"Unified Server - Port {config.port} ({config.capture.mode.upper()} mode)",
                get_stats=_get_tui_stats
            )
            if not tui.start():
                tui = None
                print("[TUI] Failed to start. Running without TUI.")
        except ImportError:
            print("[TUI] TUI module not available. Running without TUI.")
    
    # Setup shutdown handler
    def shutdown_handler(signum, frame):
        print("\n[Server] Shutting down...")
        stream_capture.stop()
        if sheets:
            sheets.stop_polling()
        telegram_manager.stop()
        if tui:
            tui.stop()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)
    
    # Print banner (only if TUI is disabled)
    if not tui:
        print("=" * 60)
        print("Unified Stream Server - Single Worker Architecture")
        print("=" * 60)
        print()
    
    # Start stream capture
    if config.capture.mode == "relay":
        print(f"[Capture] Mode: RELAY (from Main V3)")
        print(f"[Capture] Relay URL: {config.capture.relay_url}")
        print("[Capture] Detection: Handled by Main V3")
    else:
        print(f"[Capture] Mode: DIRECT (own RTSP capture)")
        print(f"[Capture] Source: {config.capture.source}")
        print(f"[Capture] Detection: {'Enabled' if config.capture.detection_enabled else 'Disabled'}")
        print(f"[Capture] Target FPS: {config.capture.target_fps}")
        print(f"[Capture] JPEG Quality: {config.capture.jpeg_quality}")
    
    if stream_capture.start():
        print("[Capture] Started successfully")
    else:
        print("[Capture] Failed to start")
    
    # Start sheets polling if enabled
    if sheets:
        print(f"[Sheets] Enabled, poll interval: {config.sheets.poll_interval}s")
        sheets.start_polling()
    else:
        print("[Sheets] Disabled")
    
    # Start telegram state manager
    telegram_manager.start()
    print("[Telegram] State manager started")
    
    # Setup WebSocket broadcaster for periodic updates
    broadcaster = WebSocketBroadcaster(socketio)
    broadcaster.start_stats_loop(frame_buffer, sheets, interval=1.0)
    
    # Print server info (only if TUI is disabled)
    if not tui:
        print()
        print("Server Information:")
        print(f"  - Host: {config.host}")
        print(f"  - Port: {config.port}")
        print(f"  - API: http://{config.host}:{config.port}/api")
        print(f"  - Video: http://{config.host}:{config.port}/api/stream/video")
        print(f"  - WebSocket: ws://{config.host}:{config.port}")
        print()
        print("Dashboard URLs:")
        print(f"  - Local: http://localhost:{config.port}")
        print(f"  - Configure VITE_API_URL in dashboard .env to point here")
        print()
        if config.capture.mode == "relay":
            print("NOTE: This server relays stream from Main V3.")
            print("      Make sure Main V3 is running (via Icetube Control Panel)")
            print(f"      before the stream will be available.")
        print()
        print("Press Ctrl+C to stop")
        print("=" * 60)
    else:
        print("[Server] TUI mode active. Use Ctrl+C to stop.")
    
    # Run server
    socketio.run(
        app,
        host=config.host,
        port=config.port,
        debug=config.debug,
        allow_unsafe_werkzeug=True
    )


# ==============================================================================
# CLI Entry Point
# ==============================================================================

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Unified Stream Server - Single Worker CCTV Backend",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m unified_server.main
  python -m unified_server.main --port 5003
  python -m unified_server.main --config my_config.json
  python -m unified_server.main --no-detection
        """
    )
    
    parser.add_argument(
        '--config', '-c',
        type=str,
        default=None,
        help='Path to configuration file (JSON)'
    )
    
    parser.add_argument(
        '--port', '-p',
        type=int,
        default=None,
        help='Server port (default: 5001)'
    )
    
    parser.add_argument(
        '--host', '-H',
        type=str,
        default=None,
        help='Server host (default: 0.0.0.0)'
    )
    
    parser.add_argument(
        '--source', '-s',
        type=str,
        default=None,
        help='Camera source (RTSP URL or device index) [direct mode only]'
    )
    
    parser.add_argument(
        '--relay',
        action='store_true',
        help='Enable relay mode (read from Main V3 at localhost:5002)'
    )
    
    parser.add_argument(
        '--relay-url',
        type=str,
        default=None,
        help='URL of Main V3 video feed (default: http://localhost:5002/video_feed)'
    )
    
    parser.add_argument(
        '--direct',
        action='store_true',
        help='Enable direct capture mode (own RTSP capture with YOLO)'
    )
    
    parser.add_argument(
        '--model', '-m',
        type=str,
        default=None,
        help='Path to YOLO model file'
    )
    
    parser.add_argument(
        '--fps',
        type=int,
        default=None,
        help='Target FPS (default: 15)'
    )
    
    parser.add_argument(
        '--quality', '-q',
        type=int,
        default=None,
        help='JPEG quality (30-95, default: 65)'
    )
    
    parser.add_argument(
        '--no-detection',
        action='store_true',
        help='Disable YOLO detection'
    )
    
    parser.add_argument(
        '--tui',
        action='store_true',
        help='Enable terminal UI dashboard'
    )
    
    parser.add_argument(
        '--debug',
        action='store_true',
        help='Enable debug mode'
    )
    
    return parser.parse_args()


def main():
    """Main entry point."""
    args = parse_args()
    
    # Load configuration
    config = load_config(args.config)
    
    # Apply CLI overrides
    if args.port is not None:
        config.port = args.port
    if args.host is not None:
        config.host = args.host
    if args.relay:
        config.capture.mode = "relay"
    if args.direct:
        config.capture.mode = "direct"
    if args.relay_url is not None:
        config.capture.relay_url = args.relay_url
        config.capture.mode = "relay"  # Implicitly enable relay mode
    if args.source is not None:
        config.capture.source = args.source
        if not args.relay:  # Only switch to direct if not explicitly in relay mode
            config.capture.mode = "direct"
    if args.model is not None:
        config.capture.model_path = args.model
    if args.fps is not None:
        config.capture.target_fps = args.fps
    if args.quality is not None:
        config.capture.jpeg_quality = args.quality
    if args.no_detection:
        config.capture.detection_enabled = False
    if args.tui:
        config.enable_tui = True
    if args.debug:
        config.debug = True
    
    # Run server
    run_server(config)


if __name__ == '__main__':
    main()