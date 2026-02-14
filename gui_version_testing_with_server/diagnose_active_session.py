import os
import json
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing Supabase credentials")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("--- DIAGNOSTIC: ACTIVE SESSIONS ---")

try:
    # Fetch active sessions
    res = supabase.table("loading_sessions")\
        .select("*")\
        .eq("status", "loading")\
        .execute()
    
    if not res.data:
        print("No active 'loading' sessions found in Supabase.")
    else:
        for session in res.data:
            print(f"\n[ACTIVE SESSION FOUND]")
            print(f"ID: {session.get('id')}")
            print(f"Plate: {session.get('plate_number')}")
            print(f"Status: {session.get('status')}")
            print(f"Counts (DB): Loading={session.get('loading_count')}, Rehab={session.get('rehab_count')}")
            print(f"Items (DB): In={session.get('items_in')}, Out={session.get('items_out')}")
            print(f"Updated At: {session.get('updated_at')}")
            
except Exception as e:
    print(f"Error fetching sessions: {e}")
