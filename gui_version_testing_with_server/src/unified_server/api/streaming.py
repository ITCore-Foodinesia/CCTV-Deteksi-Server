"""
MJPEG video streaming for web clients.

Provides efficient MJPEG (Motion JPEG) streaming with:
- Adaptive frame rate
- Proper HTTP headers
- Client disconnect detection
- Optional placeholder for offline state
"""

import time
import cv2
import numpy as np
from typing import Generator, Optional

from flask import Response

from ..capture.frame_buffer import FrameBuffer


def generate_mjpeg_stream(
    frame_buffer: FrameBuffer,
    max_empty_reads: int = 100,
    min_interval: float = 0.01
) -> Generator[bytes, None, None]:
    """
    Generator for MJPEG video stream.
    
    Yields MJPEG frames with proper headers for browser consumption.
    Implements adaptive frame rate based on buffer state.
    
    Args:
        frame_buffer: FrameBuffer instance to read frames from
        max_empty_reads: Max consecutive empty reads before disconnect
        min_interval: Minimum time between frames (seconds)
        
    Yields:
        bytes: MJPEG frame with headers
    """
    last_timestamp = 0
    consecutive_empty = 0
    
    # Create placeholder frame for initial connection
    placeholder = _create_placeholder_frame("Connecting...")
    
    while True:
        frame = frame_buffer.get_latest()
        
        if frame and frame.timestamp > last_timestamp:
            # New frame available
            last_timestamp = frame.timestamp
            consecutive_empty = 0
            
            # Yield MJPEG frame with proper headers
            yield _format_mjpeg_frame(frame.data)
            
        elif frame:
            # Same frame as before, skip
            consecutive_empty += 1
            time.sleep(min_interval)
            
        else:
            # No frame available
            consecutive_empty += 1
            
            if consecutive_empty == 1:
                # Send placeholder on first empty
                yield _format_mjpeg_frame(placeholder)
            
            if consecutive_empty > max_empty_reads:
                # Too many empty reads, client likely disconnected
                break
            
            # Wait longer when no data
            time.sleep(min_interval * 5)
        
        # Adaptive sleep based on buffer state
        time.sleep(min_interval)


def generate_mjpeg_stream_raw(
    frame_buffer: FrameBuffer
) -> Generator[bytes, None, None]:
    """
    Simplified MJPEG stream generator without detection overlay.
    
    Args:
        frame_buffer: FrameBuffer instance
        
    Yields:
        bytes: MJPEG frame
    """
    last_timestamp = 0
    
    while True:
        frame = frame_buffer.get_latest()
        
        if frame and frame.timestamp > last_timestamp:
            last_timestamp = frame.timestamp
            yield _format_mjpeg_frame(frame.data)
        
        time.sleep(0.01)


def create_video_response(
    frame_buffer: FrameBuffer,
    raw: bool = False
) -> Response:
    """
    Create Flask Response for video streaming.
    
    Args:
        frame_buffer: FrameBuffer to stream from
        raw: If True, use raw stream without processing
        
    Returns:
        Response: Flask streaming response
    """
    generator = generate_mjpeg_stream_raw(frame_buffer) if raw else \
                generate_mjpeg_stream(frame_buffer)
    
    return Response(
        generator,
        mimetype='multipart/x-mixed-replace; boundary=frame',
        headers={
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Accel-Buffering': 'no',  # Disable nginx buffering
            'Access-Control-Allow-Origin': '*',
        }
    )


def _format_mjpeg_frame(jpeg_data: bytes) -> bytes:
    """
    Format JPEG data as MJPEG frame with proper headers.
    
    Args:
        jpeg_data: Raw JPEG bytes
        
    Returns:
        bytes: Formatted MJPEG frame
    """
    return (
        b'--frame\r\n'
        b'Content-Type: image/jpeg\r\n'
        b'Content-Length: ' + str(len(jpeg_data)).encode() + b'\r\n'
        b'\r\n' + jpeg_data + b'\r\n'
    )


def _create_placeholder_frame(
    message: str = "Loading...",
    width: int = 640,
    height: int = 480,
    quality: int = 65
) -> bytes:
    """
    Create a placeholder JPEG frame with text message.
    
    Args:
        message: Text to display
        width: Frame width
        height: Frame height
        quality: JPEG quality
        
    Returns:
        bytes: JPEG encoded placeholder
    """
    # Create dark background
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    frame[:] = (30, 30, 30)  # Dark gray
    
    # Calculate text position (center)
    font = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.8
    thickness = 2
    text_size, _ = cv2.getTextSize(message, font, font_scale, thickness)
    text_x = (width - text_size[0]) // 2
    text_y = (height + text_size[1]) // 2
    
    # Draw text with shadow
    cv2.putText(frame, message, (text_x + 2, text_y + 2),
                font, font_scale, (0, 0, 0), thickness + 1)
    cv2.putText(frame, message, (text_x, text_y),
                font, font_scale, (200, 200, 200), thickness)
    
    # Add loading indicator (spinning dots)
    center_y = text_y + 40
    for i in range(8):
        angle = i * 45
        import math
        x = int(width // 2 + 20 * math.cos(math.radians(angle)))
        y = int(center_y + 20 * math.sin(math.radians(angle)))
        brightness = 100 + int(155 * (i / 8))
        cv2.circle(frame, (x, y), 4, (brightness, brightness, brightness), -1)
    
    # Encode to JPEG
    encode_params = [cv2.IMWRITE_JPEG_QUALITY, quality]
    _, jpeg = cv2.imencode('.jpg', frame, encode_params)
    
    return jpeg.tobytes()


def create_snapshot_response(frame_buffer: FrameBuffer) -> Response:
    """
    Create single frame snapshot response.
    
    Args:
        frame_buffer: FrameBuffer to get frame from
        
    Returns:
        Response: Flask response with single JPEG
    """
    frame = frame_buffer.get_latest()
    
    if frame:
        return Response(
            frame.data,
            mimetype='image/jpeg',
            headers={
                'Cache-Control': 'no-cache',
                'X-Frame-Timestamp': str(frame.timestamp),
                'X-Detection-Count': str(frame.detection_count),
            }
        )
    else:
        # Return placeholder
        placeholder = _create_placeholder_frame("No Signal")
        return Response(
            placeholder,
            mimetype='image/jpeg',
            headers={'Cache-Control': 'no-cache'}
        )