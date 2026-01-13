"""
Unified Stream Server - Single Worker CCTV Dashboard Backend

This module provides a unified server that combines:
- Video capture from RTSP/camera sources
- YOLO object detection
- MJPEG streaming
- REST API endpoints
- WebSocket real-time updates
- Google Sheets integration
- Telegram integration

All in a single process for lower latency and simpler deployment.
"""

__version__ = "1.0.0"
__author__ = "CCTV Detection Team"