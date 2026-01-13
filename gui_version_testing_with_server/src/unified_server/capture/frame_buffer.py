"""
Thread-safe frame buffer for video streaming.

Provides efficient frame storage with:
- Single writer (capture thread)
- Multiple readers (HTTP clients)
- Automatic FPS calculation
- Detection statistics tracking
"""

import threading
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List


@dataclass
class Frame:
    """Container for a single video frame with metadata."""
    data: bytes                    # JPEG encoded frame
    timestamp: float               # Capture time (Unix timestamp)
    detection_count: int = 0       # Number of objects detected
    fps: float = 0.0              # Current FPS at capture time
    detections: List[Dict] = field(default_factory=list)  # Detection details


class FrameBuffer:
    """
    Thread-safe circular buffer for video frames.
    
    Design:
    - Single writer (capture thread) uses push()
    - Multiple readers (HTTP clients) use get_latest()
    - Lock-free reads for latest frame using double buffering
    - Automatic FPS calculation over sliding window
    
    Usage:
        buffer = FrameBuffer(max_frames=3)
        
        # Writer (capture thread)
        buffer.push(jpeg_bytes, detection_count=2)
        
        # Reader (HTTP handler)
        frame = buffer.get_latest()
        if frame:
            send_to_client(frame.data)
    """
    
    def __init__(self, max_frames: int = 3, fps_window: float = 2.0):
        """
        Initialize frame buffer.
        
        Args:
            max_frames: Maximum frames to keep in buffer
            fps_window: Time window for FPS calculation (seconds)
        """
        self._frames: deque = deque(maxlen=max_frames)
        self._lock = threading.RLock()
        self._latest: Optional[Frame] = None
        
        # FPS tracking
        self._frame_count = 0
        self._start_time = time.time()
        self._fps_timestamps: deque = deque(maxlen=100)
        self._fps_window = fps_window
        
        # Statistics
        self._total_detections = 0
        self._last_detection_time = 0
    
    def push(
        self, 
        frame_data: bytes, 
        detection_count: int = 0,
        detections: Optional[List[Dict]] = None
    ) -> None:
        """
        Push new frame to buffer (called by capture thread).
        
        Args:
            frame_data: JPEG encoded frame bytes
            detection_count: Number of objects detected in frame
            detections: List of detection details (optional)
        """
        now = time.time()
        self._frame_count += 1
        self._fps_timestamps.append(now)
        
        # Calculate FPS over sliding window
        fps = self._calculate_fps(now)
        
        # Update detection stats
        if detection_count > 0:
            self._total_detections += detection_count
            self._last_detection_time = now
        
        frame = Frame(
            data=frame_data,
            timestamp=now,
            detection_count=detection_count,
            fps=round(fps, 1),
            detections=detections or []
        )
        
        with self._lock:
            self._frames.append(frame)
            self._latest = frame
    
    def get_latest(self) -> Optional[Frame]:
        """
        Get the latest frame (called by HTTP handlers).
        
        Returns:
            Frame: Latest frame or None if buffer is empty
        """
        # Optimistic read without lock for performance
        latest = self._latest
        if latest is not None:
            return latest
        
        # Fallback to locked read
        with self._lock:
            return self._latest
    
    def get_frame_after(self, timestamp: float) -> Optional[Frame]:
        """
        Get the next frame after given timestamp.
        
        Useful for streaming clients to avoid duplicate frames.
        
        Args:
            timestamp: Unix timestamp of last received frame
            
        Returns:
            Frame: Next frame or None if no new frame available
        """
        with self._lock:
            if self._latest and self._latest.timestamp > timestamp:
                return self._latest
            return None
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get buffer statistics.
        
        Returns:
            dict: Statistics including FPS, frame count, etc.
        """
        with self._lock:
            now = time.time()
            return {
                'frame_count': self._frame_count,
                'buffer_size': len(self._frames),
                'fps': self._latest.fps if self._latest else 0,
                'last_update': self._latest.timestamp if self._latest else 0,
                'age_ms': int((now - self._latest.timestamp) * 1000) if self._latest else None,
                'total_detections': self._total_detections,
                'last_detection': self._last_detection_time,
                'uptime': now - self._start_time,
            }
    
    def clear(self) -> None:
        """Clear all frames from buffer."""
        with self._lock:
            self._frames.clear()
            self._latest = None
    
    def _calculate_fps(self, now: float) -> float:
        """Calculate FPS over sliding window."""
        # Remove old timestamps outside window
        cutoff = now - self._fps_window
        while self._fps_timestamps and self._fps_timestamps[0] < cutoff:
            self._fps_timestamps.popleft()
        
        # Calculate FPS
        if len(self._fps_timestamps) < 2:
            return 0.0
        
        elapsed = self._fps_timestamps[-1] - self._fps_timestamps[0]
        if elapsed <= 0:
            return 0.0
        
        return (len(self._fps_timestamps) - 1) / elapsed
    
    @property
    def is_empty(self) -> bool:
        """Check if buffer has any frames."""
        return self._latest is None
    
    @property
    def fps(self) -> float:
        """Get current FPS."""
        return self._latest.fps if self._latest else 0.0
    
    @property
    def frame_count(self) -> int:
        """Get total frame count since start."""
        return self._frame_count


class DoubleBuffer:
    """
    Double-buffered frame storage for lock-free reads.
    
    Provides even lower latency for single-frame access by
    eliminating lock contention between writer and readers.
    
    Note: This is a specialized optimization. Use FrameBuffer
    for most use cases.
    """
    
    def __init__(self):
        self._buffers = [None, None]
        self._read_idx = 0
        self._write_idx = 1
        self._swap_lock = threading.Lock()
    
    def write(self, frame: Frame) -> None:
        """Write to back buffer and swap."""
        self._buffers[self._write_idx] = frame
        with self._swap_lock:
            self._read_idx, self._write_idx = self._write_idx, self._read_idx
    
    def read(self) -> Optional[Frame]:
        """Read from front buffer (lock-free)."""
        return self._buffers[self._read_idx]