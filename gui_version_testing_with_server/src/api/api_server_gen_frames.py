
def generate_frames(with_detection=True):
    """Generator for Flask video feed (ZMQ Proxy)"""
    while True:
        frame_bytes = stream.get_frame()
        if frame_bytes:
             yield (b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        else:
             time.sleep(0.1) # Wait for data
        time.sleep(0.01) # Max FPS limit of relay
