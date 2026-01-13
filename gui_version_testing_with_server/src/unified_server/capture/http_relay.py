"""
HTTP Stream Relay - Receives stream from Main V3 and relays to dashboard.

This module reads from Main V3's MJPEG output (port 5002) and makes it 
available on port 5001 for the dashboard via Cloudflare Tunnel.

Key difference from StreamCapture:
- NO YOLO detection (Main V3 already does it)
- Reads HTTP MJPEG stream instead of RTSP
- Lower overhead, pure relay
"""

import requests
import threading
import time
from typing import Optional, Dict, Any

from .frame_buffer import FrameBuffer


DEFAULT_MAIN_V3_URL = "http://localhost:5002/video_feed"
DEFAULT_STATS_URL = "http://localhost:5002/stats"


class HTTPStreamRelay:
    """
    Relays MJPEG stream from Main V3 to the unified server.
    
    Main V3 does the YOLO detection and outputs an annotated MJPEG stream.
    This class simply reads that stream and pushes frames to the buffer
    for the dashboard to consume.
    
    Usage:
        buffer = FrameBuffer()
        relay = HTTPStreamRelay(buffer)
        relay.start()
        
        # Later...
        relay.stop()
    """
    
    def __init__(
        self,
        frame_buffer: FrameBuffer,
        stream_url: str = DEFAULT_MAIN_V3_URL,
        stats_url: str = DEFAULT_STATS_URL,
        reconnect_delay: float = 2.0,
        timeout: float = 5.0
    ):
        """
        Initialize HTTP stream relay.
        
        Args:
            frame_buffer: Buffer to store relayed frames
            stream_url: URL of Main V3's video_feed endpoint
            stats_url: URL of Main V3's stats endpoint
            reconnect_delay: Delay between reconnection attempts
            timeout: HTTP request timeout
        """
        self.buffer = frame_buffer
        self.stream_url = stream_url
        self.stats_url = stats_url
        self.reconnect_delay = reconnect_delay
        self.timeout = timeout
        
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._stats_thread: Optional[threading.Thread] = None
        self._status = "Stopped"
        self._error: Optional[str] = None
        
        # Statistics
        self._frames_received = 0
        self._reconnect_count = 0
        self._last_frame_time = 0
        self._latest_stats: Dict[str, Any] = {}
    
    def start(self) -> bool:
        """
        Start relay threads.
        
        Returns:
            bool: True if started successfully
        """
        if self._running:
            return True
        
        self._running = True
        self._error = None
        
        # Start main stream relay thread
        self._thread = threading.Thread(target=self._relay_loop, daemon=True)
        self._thread.start()
        
        # Start stats polling thread
        self._stats_thread = threading.Thread(target=self._stats_loop, daemon=True)
        self._stats_thread.start()
        
        return True
    
    def stop(self) -> None:
        """Stop relay threads."""
        self._running = False
        self._status = "Stopping..."
        
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=3.0)
        if self._stats_thread and self._stats_thread.is_alive():
            self._stats_thread.join(timeout=1.0)
        
        self._status = "Stopped"
    
    @property
    def status(self) -> str:
        """Get current status string."""
        return self._status
    
    @property
    def is_running(self) -> bool:
        """Check if relay is running."""
        return self._running and self._thread is not None and self._thread.is_alive()
    
    @property
    def error(self) -> Optional[str]:
        """Get last error message."""
        return self._error
    
    @property
    def latest_stats(self) -> Dict[str, Any]:
        """Get latest stats from Main V3."""
        return self._latest_stats
    
    def get_stats(self) -> Dict[str, Any]:
        """Get relay statistics."""
        return {
            'status': self._status,
            'mode': 'relay',
            'source': self.stream_url,
            'frames_received': self._frames_received,
            'reconnect_count': self._reconnect_count,
            'last_frame_age': time.time() - self._last_frame_time if self._last_frame_time else None,
            'main_v3_stats': self._latest_stats,
        }
    
    def _relay_loop(self) -> None:
        """Main relay loop (runs in separate thread)."""
        self._status = "Connecting..."
        
        while self._running:
            try:
                self._run_relay_session()
            except Exception as e:
                self._status = f"Error: {str(e)[:50]}"
                self._error = str(e)
                print(f"[HTTPRelay] Error: {e}")
            
            if self._running:
                self._status = "Reconnecting..."
                self._reconnect_count += 1
                print(f"[HTTPRelay] Reconnecting in {self.reconnect_delay}s...")
                time.sleep(self.reconnect_delay)
        
        self._status = "Stopped"
    
    def _run_relay_session(self) -> None:
        """Run a single relay session (until disconnect)."""
        print(f"[HTTPRelay] Connecting to {self.stream_url}...")
        
        try:
            # Open streaming connection
            response = requests.get(
                self.stream_url,
                stream=True,
                timeout=self.timeout
            )
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            self._status = "Connection failed"
            self._error = f"Cannot connect to Main V3: {e}"
            print(f"[HTTPRelay] {self._error}")
            return
        
        self._status = "Connected"
        print(f"[HTTPRelay] Connected to Main V3")
        
        bytes_data = b''
        
        try:
            for chunk in response.iter_content(chunk_size=4096):
                if not self._running:
                    break
                
                bytes_data += chunk
                
                # Find JPEG markers (SOI and EOI)
                while True:
                    start = bytes_data.find(b'\xff\xd8')  # Start of Image
                    end = bytes_data.find(b'\xff\xd9')    # End of Image
                    
                    if start == -1 or end == -1 or end <= start:
                        break
                    
                    # Extract JPEG frame
                    jpg_data = bytes_data[start:end + 2]
                    bytes_data = bytes_data[end + 2:]
                    
                    # Push to buffer (already JPEG encoded, already has detection overlay)
                    self.buffer.push(jpg_data, detection_count=0, detections=[])
                    
                    self._frames_received += 1
                    self._last_frame_time = time.time()
                    self._status = "Streaming"
        
        except Exception as e:
            self._status = "Stream interrupted"
            self._error = str(e)
            print(f"[HTTPRelay] Stream interrupted: {e}")
        finally:
            response.close()
    
    def _stats_loop(self) -> None:
        """Poll stats from Main V3 periodically."""
        while self._running:
            try:
                response = requests.get(self.stats_url, timeout=2.0)
                if response.status_code == 200:
                    self._latest_stats = response.json()
            except Exception:
                # Stats polling failure is not critical
                pass
            
            time.sleep(2.0)  # Poll every 2 seconds


class StreamCaptureRelay:
    """
    Wrapper class that provides same interface as StreamCapture but uses HTTPStreamRelay.
    
    This allows drop-in replacement in the unified server.
    """
    
    def __init__(
        self,
        config,  # CaptureConfig (for compatibility)
        frame_buffer: FrameBuffer,
        stream_url: str = DEFAULT_MAIN_V3_URL,
        **kwargs
    ):
        """
        Initialize relay wrapper.
        
        Args:
            config: CaptureConfig (ignored, for compatibility)
            frame_buffer: Buffer to store frames
            stream_url: URL of Main V3's video_feed
        """
        self.config = config
        self._relay = HTTPStreamRelay(
            frame_buffer=frame_buffer,
            stream_url=stream_url,
            **kwargs
        )
    
    def start(self) -> bool:
        """Start relay."""
        return self._relay.start()
    
    def stop(self) -> None:
        """Stop relay."""
        self._relay.stop()
    
    @property
    def status(self) -> str:
        """Get status."""
        return self._relay.status
    
    @property
    def is_running(self) -> bool:
        """Check if running."""
        return self._relay.is_running
    
    @property
    def error(self):
        """Get error."""
        return self._relay.error
    
    def get_stats(self) -> Dict[str, Any]:
        """Get stats."""
        return self._relay.get_stats()
    
    # Methods for compatibility with StreamCapture interface
    def set_detection_enabled(self, enabled: bool) -> None:
        """No-op: detection is handled by Main V3."""
        pass
    
    def set_quality(self, quality: int) -> None:
        """No-op: quality is set by Main V3."""
        pass
    
    def set_target_fps(self, fps: int) -> None:
        """No-op: FPS is controlled by Main V3."""
        pass