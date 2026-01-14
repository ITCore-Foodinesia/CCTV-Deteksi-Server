"""
Test script for Unified Server components.

Tests:
1. FrameBuffer - size, max_frames properties
2. StreamCaptureRelay - stats property
3. TUI stats function - proper data access

Usage:
    python -m tests.test_unified_server
"""

import sys
import os
import time
import threading

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.unified_server.capture.frame_buffer import FrameBuffer
from src.unified_server.capture.http_relay import StreamCaptureRelay
from src.unified_server.config import CaptureConfig


def test_frame_buffer():
    """Test FrameBuffer properties."""
    print("\n" + "=" * 50)
    print("Testing FrameBuffer...")
    print("=" * 50)
    
    buffer = FrameBuffer(max_frames=5)
    
    # Test initial state
    assert buffer.size == 0, f"Expected size 0, got {buffer.size}"
    assert buffer.max_frames == 5, f"Expected max_frames 5, got {buffer.max_frames}"
    assert buffer.is_empty == True, "Expected is_empty True"
    assert buffer.fps == 0.0, f"Expected fps 0.0, got {buffer.fps}"
    assert buffer.frame_count == 0, f"Expected frame_count 0, got {buffer.frame_count}"
    
    print("[OK] Initial state correct")
    
    # Push some frames
    for i in range(3):
        buffer.push(b"fake_jpeg_data", detection_count=i)
        time.sleep(0.1)  # Small delay for FPS calculation
    
    assert buffer.size == 3, f"Expected size 3, got {buffer.size}"
    assert buffer.frame_count == 3, f"Expected frame_count 3, got {buffer.frame_count}"
    assert buffer.is_empty == False, "Expected is_empty False"
    
    print("[OK] After pushing 3 frames: size=3, frame_count=3")
    
    # Test get_stats
    stats = buffer.get_stats()
    assert 'fps' in stats, "Expected 'fps' in stats"
    assert 'frame_count' in stats, "Expected 'frame_count' in stats"
    assert 'buffer_size' in stats, "Expected 'buffer_size' in stats"
    
    print(f"[OK] Stats: {stats}")
    
    # Test max_frames limit
    for i in range(5):
        buffer.push(b"more_data", detection_count=0)
    
    assert buffer.size == 5, f"Expected size capped at 5, got {buffer.size}"
    
    print("[OK] Buffer size capped at max_frames=5")
    print("[OK] FrameBuffer tests PASSED")


def test_stream_capture_relay():
    """Test StreamCaptureRelay stats property."""
    print("\n" + "=" * 50)
    print("Testing StreamCaptureRelay...")
    print("=" * 50)
    
    buffer = FrameBuffer()
    config = CaptureConfig(mode="relay")
    
    relay = StreamCaptureRelay(
        config=config,
        frame_buffer=buffer,
        stream_url="http://localhost:5002/video_feed"
    )
    
    # Test stats property exists
    assert hasattr(relay, 'stats'), "Expected 'stats' property"
    
    stats = relay.stats
    assert isinstance(stats, dict), f"Expected stats to be dict, got {type(stats)}"
    assert 'status' in stats, "Expected 'status' in stats"
    assert 'mode' in stats, "Expected 'mode' in stats"
    assert stats['mode'] == 'relay', f"Expected mode 'relay', got {stats['mode']}"
    
    print(f"[OK] Stats property: {stats}")
    
    # Test get_stats method also works
    stats2 = relay.get_stats()
    assert stats == stats2, "get_stats() should return same as stats property"
    
    print("[OK] get_stats() matches stats property")
    
    # Test other properties
    assert hasattr(relay, 'status'), "Expected 'status' property"
    assert hasattr(relay, 'is_running'), "Expected 'is_running' property"
    assert hasattr(relay, 'error'), "Expected 'error' property"
    
    print(f"[OK] status={relay.status}, is_running={relay.is_running}")
    print("[OK] StreamCaptureRelay tests PASSED")


def test_tui_stats_access():
    """Test that TUI stats function can access all required properties."""
    print("\n" + "=" * 50)
    print("Testing TUI Stats Access Pattern...")
    print("=" * 50)
    
    buffer = FrameBuffer(max_frames=10)
    config = CaptureConfig(mode="relay")
    
    relay = StreamCaptureRelay(
        config=config,
        frame_buffer=buffer,
        stream_url="http://localhost:5002/video_feed"
    )
    
    # Simulate what _get_tui_stats does
    fps_current = 0
    buffer_current = 0
    buffer_max = 10
    frames_total = 0
    
    # Test frame_buffer access
    if buffer:
        buffer_current = buffer.size if hasattr(buffer, 'size') else 0
        buffer_max = buffer.max_frames if hasattr(buffer, 'max_frames') else 10
        buffer_stats = buffer.get_stats() if hasattr(buffer, 'get_stats') else {}
        fps_current = buffer_stats.get('fps', 0)
        frames_total = buffer_stats.get('frame_count', 0)
    
    print(f"[OK] FrameBuffer access: size={buffer_current}, max={buffer_max}, fps={fps_current}")
    
    # Test stream_capture access (relay mode)
    if relay:
        if hasattr(relay, 'stats'):
            stats = relay.stats
            if isinstance(stats, dict):
                fps_from_relay = stats.get('fps', fps_current) or fps_current
                frames_from_relay = stats.get('frames_received', frames_total) or frames_total
                print(f"[OK] Relay stats via property: fps={fps_from_relay}, frames={frames_from_relay}")
        elif hasattr(relay, 'get_stats'):
            stats = relay.get_stats()
            print(f"[OK] Relay stats via method: {stats}")
    
    # Test status access
    status = relay.status if hasattr(relay, 'status') else 'unknown'
    print(f"[OK] Status access: {status}")
    
    print("[OK] TUI Stats Access tests PASSED")


def run_all_tests():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("UNIFIED SERVER COMPONENT TESTS")
    print("=" * 60)
    
    try:
        test_frame_buffer()
        test_stream_capture_relay()
        test_tui_stats_access()
        
        print("\n" + "=" * 60)
        print("ALL TESTS PASSED [OK]")
        print("=" * 60)
        return True
        
    except AssertionError as e:
        print(f"\n[FAIL] TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"\n[FAIL] UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)