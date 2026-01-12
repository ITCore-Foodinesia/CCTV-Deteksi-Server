
import requests
import json

url = "https://script.google.com/macros/s/AKfycbyhZwx1prCzO9u25d_zi2U88R-A1NWfDkKoVbVDxWG_XDN6DmxYC--k2aJqR5ICoZvhKw/exec"

try:
    print(f"Fetching data from: {url}...")
    response = requests.get(url, allow_redirects=True, timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        print("-" * 50)
        print("WEB APP RESPONSE:")
        print("-" * 50)
        
        # Pretty print JSON utama
        print(json.dumps(data, indent=2))
        
        # Highlight Last Row Data
        if 'data' in data:
            d = data['data']
            print("-" * 50)
            print("SUMMARY (YANG DITAMPILKAN DASHBOARD):")
            print(f"Latest Plate   : {d.get('latest_plate')}")
            print(f"Loading Masuk  : {d.get('latest_loading')}")
            print(f"Rehab Keluar   : {d.get('latest_rehab')}")
            print(f"Jam Datang     : {d.get('jam_datang')}")
            print(f"Jam Selesai    : {d.get('jam_selesai')}")
            print(f"Total Records  : {d.get('total_records')}")
    else:
        print(f"Error: {response.status_code}")
        print(response.text)

except Exception as e:
    print(f"Exception: {e}")
