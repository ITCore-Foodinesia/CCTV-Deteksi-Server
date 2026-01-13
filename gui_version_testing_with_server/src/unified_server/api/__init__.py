"""
API module for unified stream server.

Components:
- streaming: MJPEG video streaming generator
- routes: REST API endpoints
- websocket: Socket.IO event handlers
"""

from .streaming import generate_mjpeg_stream, create_video_response

__all__ = ['generate_mjpeg_stream', 'create_video_response']