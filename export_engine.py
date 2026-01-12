from ultralytics import YOLO
import sys
import os

def export_model(model_path):
    if not os.path.exists(model_path):
        print(f"Error: Model file not found at {model_path}")
        return

    print(f"Loading model: {model_path}...")
    try:
        model = YOLO(model_path)
    except Exception as e:
        print(f"Error loading model: {e}")
        return

    print("Starting export to TensorRT engine...")
    print("Note: This process may take a few minutes and requires CUDA/GPU support.")
    
    try:
        # Export the model
        # device=0 uses the first GPU. dynamic=True allows dynamic input sizes if needed.
        path = model.export(format="engine", device=0, dynamic=True)
        print(f"✅ Export success! Engine saved at: {path}")
    except Exception as e:
        print(f"❌ Export failed: {e}")
        print("Ensure you have 'tensorrt' python package installed and compatible GPU drivers.")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        model_path = sys.argv[1]
    else:
        # Default to best.pt if not specified
        model_path = "models/best.pt"
        # Check current directory if models folder doesn't exist
        if not os.path.exists(model_path) and os.path.exists("best.pt"):
            model_path = "best.pt"
            
    export_model(model_path)
