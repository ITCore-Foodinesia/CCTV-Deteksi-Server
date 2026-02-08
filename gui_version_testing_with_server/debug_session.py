import os
import sys
import json
import time
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

# Import config and session manager logic
try:
    from src.detection.gui_version_partial.config import load_config
    from supabase import create_client
except ImportError as e:
    print(f"Import Error: {e}")
    print("Please run: pip install supabase")
    sys.exit(1)

def test_connection():
    print("="*50)
    print("DIAGNOSTIC TOOL: Supabase Connection & Session Check")
    print("="*50)

    # 1. Load Config
    config = load_config()
    url = config.supabase_url
    key = config.supabase_key
    
    if not url or not key:
        # Try env vars
        from dotenv import load_dotenv
        load_dotenv()
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    print(f"URL: {url}")
    print(f"Key: {key[:10]}..." if key else "Key: MISSING")

    if not url or not key:
        print("❌ ERROR: Missing Supabase credentials in config/control_panel_config.json or .env")
        return

    # 2. Connect
    try:
        client = create_client(url, key)
        print("✅ Supabase client initialized")
    except Exception as e:
        print(f"❌ Connection Failed: {e}")
        return

    # 3. Check Loading Sessions
    print("\n[Checking 'loading_sessions' table...]")
    try:
        # Fetch raw first to see what's there
        res = client.table('loading_sessions').select("*").eq('status', 'loading').execute()
        sessions = res.data
        
        if not sessions:
            print("⚠️ No active sessions found (status='loading').")
            print("   -> If Flutter app says 'Loading', check if it's actually sending status='loading'.")
        else:
            print(f"✅ Found {len(sessions)} active session(s):")
            for i, s in enumerate(sessions):
                print(f"   {i+1}. ID: {s.get('id')}")
                print(f"      Plate (Raw): {s.get('plate_number')}")
                print(f"      Truck ID:    {s.get('truck_id')}")
                print(f"      Created At:  {s.get('created_at')}")
                
                # 4. Test JOIN fetch (The Logic used in SessionManager)
                print(f"      [Testing JOIN Fetch...]")
                try:
                    join_res = client.table('loading_sessions').select(
                        'id, plate_number, truck_id, trucks(plate_number)'
                    ).eq('id', s.get('id')).execute()
                    
                    if join_res.data:
                        joined = join_res.data[0]
                        truck_data = joined.get('trucks')
                        joined_plate = truck_data.get('plate_number') if truck_data else None
                        print(f"      -> Trucks Join Data: {truck_data}")
                        print(f"      -> Resolved Plate:   {joined_plate}")
                        
                        if s.get('plate_number'):
                            print("      ✅ Plate exists in session record.")
                        elif joined_plate:
                            print("      ✅ Plate found via JOIN (SessionManager fix should work).")
                        else:
                            print("      ❌ Plate NOT found in session OR trucks table.")
                    else:
                        print("      ❌ Join query returned no data.")
                        
                except Exception as e:
                    print(f"      ❌ JOIN Query Failed: {e}")

    except Exception as e:
        print(f"❌ Failed to query loading_sessions: {e}")

if __name__ == "__main__":
    test_connection()

