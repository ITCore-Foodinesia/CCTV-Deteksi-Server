"""
Stream capture with YOLO object detection.

Handles:
- RTSP/camera video capture
- YOLO object detection (TensorRT/ONNX/PT)
- Frame encoding to JPEG
- Automatic reconnection
"""

import cv2
import threading
import time
from typing import Optional, Callable, List, Dict, Any
from dataclasses import dataclass
from pathlib import Path

from .frame_buffer import FrameBuffer
from ..config import CaptureConfig


# Detection class colors (BGR format)
CLASS_COLORS = {
    0: (0, 255, 0),    # Green - default
    1: (255, 0, 0),    # Blue
    2: (0, 0, 255),    # Red
    3: (255, 255, 0),  # Cyan
    4: (255, 0, 255),  # Magenta
    5: (0, 255, 255),  # Yellow
}


class StreamCapture:
    """
    Captures video from RTSP/camera and runs YOLO detection.
    
    Single thread handles:
    1. Frame capture from source
    2. Object detection (YOLO)
    3. Overlay drawing (bounding boxes, labels)
    4. JPEG encoding
    5. Buffer update
    
    Usage:
        config = CaptureConfig(source="rtsp://...", detection_enabled=True)
        buffer = FrameBuffer()
        
        capture = StreamCapture(config, buffer)
        capture.start()
        
        # Later...
        capture.stop()
    """
    
    def __init__(
        self, 
        config: CaptureConfig, 
        frame_buffer: FrameBuffer,
        on_detection: Optional[Callable[[List[Dict]], None]] = None
    ):
        """
        Initialize stream capture.
        
        Args:
            config: Capture configuration
            frame_buffer: Buffer to store captured frames
            on_detection: Callback when objects detected (optional)
        """
        self.config = config
        self.buffer = frame_buffer
        self.on_detection = on_detection
        
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._detector = None
        self._status = "Stopped"
        self._error: Optional[str] = None
        
        # Statistics
        self._frames_captured = 0
        self._detections_total = 0
        self._last_detection_count = 0
        self._reconnect_count = 0
        
    def start(self) -> bool:
        """
        Start capture thread.
        
        Returns:
            bool: True if started successfully
        """
        if self._running:
            return True
        
        self._running = True
        self._error = None
        self._thread = threading.Thread(target=self._capture_loop, daemon=True)
        self._thread.start()
        return True
    
    def stop(self) -> None:
        """Stop capture thread."""
        self._running = False
        self._status = "Stopping..."
        
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=3.0)
        
        self._status = "Stopped"
    
    @property
    def status(self) -> str:
        """Get current status string."""
        return self._status
    
    @property
    def is_running(self) -> bool:
        """Check if capture is running."""
        return self._running and self._thread is not None and self._thread.is_alive()
    
    @property
    def error(self) -> Optional[str]:
        """Get last error message."""
        return self._error
    
    def get_stats(self) -> Dict[str, Any]:
        """Get capture statistics."""
        return {
            'status': self._status,
            'frames_captured': self._frames_captured,
            'detections_total': self._detections_total,
            'last_detection_count': self._last_detection_count,
            'reconnect_count': self._reconnect_count,
            'detection_enabled': self.config.detection_enabled,
            'source': self.config.source,
        }
    
    def _capture_loop(self) -> None:
        """Main capture loop (runs in separate thread)."""
        self._status = "Initializing..."
        
        # Initialize YOLO detector if enabled
        if self.config.detection_enabled:
            if not self._init_detector():
                self._error = "Failed to load detection model"
                # Continue without detection
        
        while self._running:
            try:
                self._run_capture_session()
            except Exception as e:
                self._status = f"Error: {str(e)[:50]}"
                self._error = str(e)
                print(f"[StreamCapture] Error: {e}")
            
            if self._running:
                self._status = "Reconnecting..."
                self._reconnect_count += 1
                time.sleep(self.config.reconnect_delay)
        
        self._status = "Stopped"
    
    def _run_capture_session(self) -> None:
        """Run a single capture session (until disconnect)."""
        self._status = "Connecting..."
        
        # Open video capture
        cap = cv2.VideoCapture(self.config.source)
        
        # Set capture properties
        if self.config.width > 0:
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.config.width)
        if self.config.height > 0:
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.config.height)
        
        # Set buffer size to minimum for lower latency
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        
        if not cap.isOpened():
            self._status = "Failed to open source"
            self._error = f"Cannot open: {self.config.source}"
            cap.release()
            return
        
        self._status = "Connected"
        frame_interval = 1.0 / self.config.target_fps
        last_frame_time = 0
        
        try:
            while self._running:
                now = time.time()
                
                # Frame rate control
                elapsed = now - last_frame_time
                if elapsed < frame_interval:
                    # Sleep for remaining time minus small buffer
                    sleep_time = frame_interval - elapsed - 0.001
                    if sleep_time > 0:
                        time.sleep(sleep_time)
                    continue
                
                # Capture frame
                ret, frame = cap.read()
                if not ret:
                    self._status = "Frame capture failed"
                    break
                
                self._frames_captured += 1
                
                # Run detection
                detection_count = 0
                detections = []
                
                if self.config.detection_enabled and self._detector:
                    frame, detection_count, detections = self._run_detection(frame)
                    self._last_detection_count = detection_count
                    self._detections_total += detection_count
                    
                    # Trigger callback if detections found
                    if detections and self.on_detection:
                        try:
                            self.on_detection(detections)
                        except Exception as e:
                            print(f"[StreamCapture] Detection callback error: {e}")
                
                # Encode to JPEG
                encode_params = [cv2.IMWRITE_JPEG_QUALITY, self.config.jpeg_quality]
                success, jpeg = cv2.imencode('.jpg', frame, encode_params)
                
                if success:
                    # Push to buffer
                    self.buffer.push(jpeg.tobytes(), detection_count, detections)
                    last_frame_time = time.time()
                    self._status = "Streaming"
                
        finally:
            cap.release()
    
    def _init_detector(self) -> bool:
        """
        Initialize YOLO detector.
        
        Returns:
            bool: True if loaded successfully
        """
        model_path = Path(self.config.model_path)
        
        # Check if model exists
        if not model_path.exists():
            # Try relative paths
            alternative_paths = [
                Path(__file__).parent.parent.parent.parent.parent / self.config.model_path,
                Path.cwd() / self.config.model_path,
            ]
            for alt_path in alternative_paths:
                if alt_path.exists():
                    model_path = alt_path
                    break
        
        if not model_path.exists():
            print(f"[StreamCapture] Model not found: {self.config.model_path}")
            return False
        
        try:
            print(f"[StreamCapture] Loading model: {model_path}")
            from ultralytics import YOLO
            
            self._detector = YOLO(str(model_path), task='detect')
            
            # Warm up the model with a dummy image
            dummy = cv2.zeros((640, 640, 3), dtype='uint8') if hasattr(cv2, 'zeros') else \
                    __import__('numpy').zeros((640, 640, 3), dtype='uint8')
            self._detector(dummy, verbose=False)
            
            print(f"[StreamCapture] Model loaded successfully")
            return True
            
        except ImportError:
            print("[StreamCapture] ultralytics not installed. Run: pip install ultralytics")
            return False
        except Exception as e:
            print(f"[StreamCapture] Failed to load model: {e}")
            return False
    
    def _run_detection(self, frame) -> tuple:
        """
        Run YOLO detection on frame and draw overlays.
        
        Args:
            frame: OpenCV frame (BGR)
            
        Returns:
            tuple: (annotated_frame, detection_count, detections_list)
        """
        if not self._detector:
            return frame, 0, []
        
        try:
            results = self._detector(frame, verbose=False)
        except Exception as e:
            print(f"[StreamCapture] Detection error: {e}")
            return frame, 0, []
        
        detection_count = 0
        detections = []
        
        for result in results:
            boxes = result.boxes
            detection_count = len(boxes)
            
            for i, box in enumerate(boxes):
                # Get box coordinates
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                
                # Get class name
                class_name = result.names.get(cls, f"class_{cls}")
                label = f"{class_name} {conf:.2f}"
                
                # Get color for class
                color = CLASS_COLORS.get(cls % len(CLASS_COLORS), (0, 255, 0))
                
                # Draw bounding box
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                
                # Draw label background
                label_size, baseline = cv2.getTextSize(
                    label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1
                )
                y1_label = max(y1, label_size[1] + 10)
                cv2.rectangle(
                    frame,
                    (x1, y1_label - label_size[1] - 10),
                    (x1 + label_size[0], y1_label + baseline - 10),
                    color,
                    cv2.FILLED
                )
                
                # Draw label text
                cv2.putText(
                    frame, label,
                    (x1, y1_label - 7),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5, (255, 255, 255), 1
                )
                
                # Store detection info
                detections.append({
                    'class': class_name,
                    'class_id': cls,
                    'confidence': round(conf, 3),
                    'bbox': [x1, y1, x2, y2],
                })
        
        return frame, detection_count, detections
    
    def set_detection_enabled(self, enabled: bool) -> None:
        """Enable or disable detection."""
        self.config.detection_enabled = enabled
        if enabled and not self._detector:
            self._init_detector()
    
    def set_quality(self, quality: int) -> None:
        """Set JPEG quality (30-95)."""
        self.config.jpeg_quality = max(30, min(95, quality))
    
    def set_target_fps(self, fps: int) -> None:
        """Set target FPS (1-60)."""
        self.config.target_fps = max(1, min(60, fps))