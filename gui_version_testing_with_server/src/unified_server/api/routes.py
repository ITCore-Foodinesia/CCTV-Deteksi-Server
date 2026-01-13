"""
REST API routes for unified stream server.

All API endpoints compatible with existing dashboard frontend.
"""

import time
from flask import Blueprint, jsonify, request

from .streaming import create_video_response, create_snapshot_response


def create_api_blueprint(app_context: dict) -> Blueprint:
    """
    Create Flask Blueprint with all API routes.
    
    Args:
        app_context: Dictionary containing:
            - frame_buffer: FrameBuffer instance
            - stream_capture: StreamCapture instance
            - sheets: SheetsIntegration instance (optional)
            - telegram_state: Dict for telegram state
            
    Returns:
        Blueprint: Flask blueprint with routes
    """
    api = Blueprint('api', __name__, url_prefix='/api')
    
    # Get components from context
    frame_buffer = app_context['frame_buffer']
    stream_capture = app_context['stream_capture']
    sheets = app_context.get('sheets')
    telegram_state = app_context.get('telegram_state', {
        'plate': None,
        'status': 'IDLE',
        'operator': '-',
        'last_update': 0
    })
    
    # =========================================================================
    # Stream Endpoints
    # =========================================================================
    
    @api.route('/stream/video')
    def video_feed():
        """MJPEG video stream endpoint."""
        return create_video_response(frame_buffer)
    
    @api.route('/stream/video_raw')
    def video_feed_raw():
        """Raw MJPEG stream without detection overlay."""
        return create_video_response(frame_buffer, raw=True)
    
    @api.route('/stream/snapshot')
    def snapshot():
        """Single frame snapshot."""
        return create_snapshot_response(frame_buffer)
    
    @api.route('/stream/start')
    def start_stream():
        """Start video streaming."""
        if stream_capture.start():
            return jsonify({
                'status': 'success',
                'message': 'Streaming started'
            })
        return jsonify({
            'status': 'error',
            'message': 'Failed to start stream'
        }), 500
    
    @api.route('/stream/stop')
    def stop_stream():
        """Stop video streaming."""
        stream_capture.stop()
        return jsonify({
            'status': 'success',
            'message': 'Streaming stopped'
        })
    
    # =========================================================================
    # Status & Stats Endpoints
    # =========================================================================
    
    @api.route('/status')
    def get_status():
        """Get server and stream status."""
        buffer_stats = frame_buffer.get_stats()
        capture_stats = stream_capture.get_stats()
        
        return jsonify({
            'status': stream_capture.status,
            'running': stream_capture.is_running,
            'last_frame': buffer_stats.get('age_ms'),
            'fps': buffer_stats.get('fps', 0),
            'latency': buffer_stats.get('age_ms', 0),
            'stream_mode': 'unified',
            'detection_enabled': capture_stats.get('detection_enabled', False),
        })
    
    @api.route('/stats')
    def get_stats():
        """Get detection and warehouse stats."""
        buffer_stats = frame_buffer.get_stats()
        
        # Get sheets data if available
        inbound = 0
        outbound = 0
        if sheets:
            sheets_data = sheets.get_latest_data()
            # Use latest_loading/latest_rehab (last row) not loading_count/rehab_count (totals)
            inbound = sheets_data.get('latest_loading', 0)
            outbound = sheets_data.get('latest_rehab', 0)
        
        return jsonify({
            'inbound': inbound,
            'outbound': outbound,
            'total': inbound + outbound,
            'fps': buffer_stats.get('fps', 0),
            'plate': telegram_state.get('plate', '...'),
            'status': telegram_state.get('status', 'IDLE'),
            'trucks': 0,
            'detections': buffer_stats.get('total_detections', 0),
        })
    
    @api.route('/activities')
    def get_activities():
        """Get activity logs."""
        # TODO: Implement activity logging
        return jsonify([])
    
    @api.route('/health')
    def health_check():
        """Health check endpoint for monitoring."""
        return jsonify({
            'status': 'healthy',
            'timestamp': time.time(),
            'uptime': frame_buffer.get_stats().get('uptime', 0),
        })
    
    @api.route('/processes')
    def get_processes():
        """Get status of related processes."""
        return jsonify({
            'detector': stream_capture.is_running,
            'scanner': False,
            'uploader': False,
            'bot': False,
        })
    
    # =========================================================================
    # Settings Endpoints
    # =========================================================================
    
    @api.route('/settings')
    def get_settings():
        """Get current settings."""
        return jsonify({
            'frame_skip': 0,
            'jpeg_quality': stream_capture.config.jpeg_quality,
            'detection_enabled': stream_capture.config.detection_enabled,
            'target_fps': stream_capture.config.target_fps,
        })
    
    @api.route('/settings/quality/<int:quality>')
    def set_quality(quality):
        """Set JPEG quality (30-95)."""
        if 30 <= quality <= 95:
            stream_capture.set_quality(quality)
            return jsonify({'status': 'success', 'quality': quality})
        return jsonify({
            'status': 'error',
            'message': 'Quality must be between 30-95'
        }), 400
    
    @api.route('/settings/frameskip/<int:skip>')
    def set_frame_skip(skip):
        """Set frame skip (legacy, adjusts FPS instead)."""
        if 1 <= skip <= 5:
            new_fps = 30 // skip
            stream_capture.set_target_fps(new_fps)
            return jsonify({'status': 'success', 'frame_skip': skip})
        return jsonify({
            'status': 'error',
            'message': 'Frame skip must be between 1-5'
        }), 400
    
    @api.route('/settings/detection/<int:enabled>')
    def set_detection(enabled):
        """Enable/disable detection overlay."""
        stream_capture.set_detection_enabled(bool(enabled))
        return jsonify({
            'status': 'success',
            'detection_enabled': stream_capture.config.detection_enabled
        })
    
    @api.route('/settings/fps/<int:fps>')
    def set_fps(fps):
        """Set target FPS."""
        if 1 <= fps <= 60:
            stream_capture.set_target_fps(fps)
            return jsonify({'status': 'success', 'fps': fps})
        return jsonify({
            'status': 'error',
            'message': 'FPS must be between 1-60'
        }), 400
    
    # =========================================================================
    # Google Sheets Endpoints
    # =========================================================================
    
    @api.route('/sheets/status')
    def sheets_status():
        """Get Google Sheets connection status."""
        if not sheets:
            return jsonify({
                'connected': False,
                'message': 'Sheets integration not enabled'
            })
        
        return jsonify({
            'connected': sheets.is_connected,
            'last_update': sheets.last_update,
            'data': sheets.get_latest_data()
        })
    
    @api.route('/sheets/refresh')
    def sheets_refresh():
        """Manually refresh sheets data."""
        if not sheets:
            return jsonify({
                'status': 'error',
                'message': 'Sheets integration not enabled'
            }), 400
        
        data = sheets.fetch_data()
        if data:
            return jsonify({'status': 'success', 'data': data})
        return jsonify({
            'status': 'error',
            'message': 'Failed to fetch data'
        }), 500
    
    @api.route('/sheets/reconnect')
    def sheets_reconnect():
        """Reconnect to Google Sheets."""
        if not sheets:
            return jsonify({
                'status': 'error',
                'message': 'Sheets integration not enabled'
            }), 400
        
        if sheets.reconnect():
            return jsonify({
                'status': 'success',
                'message': 'Reconnected to Google Sheets'
            })
        return jsonify({
            'status': 'error',
            'message': 'Failed to connect'
        }), 500
    
    @api.route('/sheets/webhook', methods=['POST'])
    def sheets_webhook():
        """Webhook endpoint for Google Apps Script push notifications."""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'status': 'error',
                    'message': 'No data provided'
                }), 400
            
            if sheets:
                sheets.update_from_webhook(data)
            
            # Emit via WebSocket if socketio available
            socketio = app_context.get('socketio')
            if socketio:
                socketio.emit('sheets_update', data)
            
            return jsonify({
                'status': 'success',
                'message': 'Data received and broadcasted',
                'data': data
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 500
    
    # =========================================================================
    # Telegram Endpoints
    # =========================================================================
    
    @api.route('/telegram_update', methods=['POST'])
    def telegram_update():
        """Update status from Telegram Bot."""
        try:
            data = request.get_json()
            if not data:
                return jsonify({
                    'status': 'error',
                    'message': 'No data'
                }), 400
            
            telegram_state['plate'] = data.get('plate', 'UNKNOWN')
            telegram_state['status'] = data.get('status', 'IDLE')
            telegram_state['last_update'] = time.time()
            
            source = data.get('source', 'telegram')
            print(f"📢 [TELEGRAM] Update: {telegram_state['status']} for {telegram_state['plate']} (from {source})")
            
            # Emit via WebSocket if socketio available
            socketio = app_context.get('socketio')
            if socketio:
                socketio.emit('telegram_status', telegram_state)
            
            return jsonify({
                'status': 'success',
                'data': telegram_state
            })
            
        except Exception as e:
            return jsonify({
                'status': 'error',
                'message': str(e)
            }), 500
    
    @api.route('/state', methods=['GET'])
    def get_telegram_state():
        """Get current Telegram state (for Detector polling)."""
        return jsonify(telegram_state)
    
    return api