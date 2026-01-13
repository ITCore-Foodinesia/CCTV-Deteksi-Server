"""
Capture module for video streaming and detection.

Components:
- FrameBuffer: Thread-safe circular buffer for video frames
- StreamCapture: Camera capture with YOLO detection (direct mode)
- HTTPStreamRelay: Relay from Main V3's video feed (relay mode)

Two modes available:
- Direct mode: Own RTSP capture with YOLO detection
- Relay mode: Read from Main V3's video feed (no detection, Main V3 handles it)
"""

from .frame_buffer import FrameBuffer, Frame
from .stream_capture import StreamCapture
from .http_relay import HTTPStreamRelay, StreamCaptureRelay

__all__ = ['FrameBuffer', 'Frame', 'StreamCapture', 'HTTPStreamRelay', 'StreamCaptureRelay']