import os
import time
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing Supabase credentials in .env")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Session Data from Screenshot
PLATE_NUMBER = "KT 8550 UQ ELF"
LOADING_COUNT = 160
REHAB_COUNT = 11
ITEMS_IN = LOADING_COUNT
ITEMS_OUT = REHAB_COUNT

def manual_sync():
    print(f"--- Manual Sync for {PLATE_NUMBER} ---")
    
    # 1. Resolve Truck ID
    truck_id = None
    print("Resolving Truck ID...")
    try:
        res = supabase.table("trucks").select("id").eq("plate_number", PLATE_NUMBER).execute()
        if res.data:
            truck_id = res.data[0].get("id")
            print(f"Found Truck ID: {truck_id}")
        else:
            print("Truck not found in DB. Proceeding without Truck ID.")
    except Exception as e:
        print(f"Error resolving truck: {e}")

    # 2. Check for EXISTING active session
    print("Checking for existing active session...")
    existing_session = None
    try:
        res = supabase.table("loading_sessions")\
            .select("*")\
            .eq("plate_number", PLATE_NUMBER)\
            .eq("status", "loading")\
            .execute()
        
        if res.data:
            existing_session = res.data[0]
            print(f"Found existing active session ID: {existing_session['id']}")
    except Exception as e:
        print(f"Error checking session: {e}")

    # 3. Insert or Update
    data = {
        "plate_number": PLATE_NUMBER,
        "plate_detected": PLATE_NUMBER,
        "status": "loading",
        "counting_active": True,
        "loading_count": LOADING_COUNT,
        "rehab_count": REHAB_COUNT,
        "items_in": ITEMS_IN,
        "items_out": ITEMS_OUT,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    if truck_id: data["truck_id"] = truck_id

    try:
        if existing_session:
            # UPDATE
            print("Updating existing session...")
            res = supabase.table("loading_sessions").update(data).eq("id", existing_session['id']).execute()
            print("Update Success!")
        else:
            # INSERT
            print("Creating NEW session...")
            data["started_at"] = datetime.utcnow().isoformat()
            data["start_source"] = "manual_recovery"
            res = supabase.table("loading_sessions").insert(data).execute()
            print("Insert Success!")
            
    except Exception as e:
        print(f"Operation failed: {e}")

if __name__ == "__main__":
    manual_sync()
