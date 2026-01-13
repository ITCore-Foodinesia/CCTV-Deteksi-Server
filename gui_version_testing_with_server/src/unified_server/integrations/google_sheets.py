"""
Google Sheets integration for warehouse data.

Supports two modes:
1. WebApp mode: Fetch data from Google Apps Script Web App
2. gspread mode: Direct access via gspread library

WebApp mode is recommended for production (less API calls, faster).
"""

import os
import time
import threading
import requests
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass, field

from ..config import SheetsConfig


@dataclass
class SheetsData:
    """Container for sheets data with timestamp."""
    loading_count: int = 0
    rehab_count: int = 0
    latest_plate: str = "N/A"
    latest_loading: int = 0
    latest_rehab: int = 0
    latest_driver: str = "Driver"
    latest_items: str = "Items"
    jam_datang: str = ""
    jam_selesai: str = ""
    total_records: int = 0
    last_update: float = field(default_factory=time.time)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'loading_count': self.loading_count,
            'rehab_count': self.rehab_count,
            'latest_plate': self.latest_plate,
            'latest_loading': self.latest_loading,
            'latest_rehab': self.latest_rehab,
            'latest_driver': self.latest_driver,
            'latest_items': self.latest_items,
            'jam_datang': self.jam_datang,
            'jam_selesai': self.jam_selesai,
            'total_records': self.total_records,
            'last_update': self.last_update,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SheetsData':
        """Create from dictionary."""
        return cls(
            loading_count=_safe_int(data.get('loading_count', 0)),
            rehab_count=_safe_int(data.get('rehab_count', 0)),
            latest_plate=str(data.get('latest_plate', 'N/A')),
            latest_loading=_safe_int(data.get('latest_loading', 0)),
            latest_rehab=_safe_int(data.get('latest_rehab', 0)),
            latest_driver=str(data.get('latest_driver', 'Driver')),
            latest_items=str(data.get('latest_items', 'Items')),
            jam_datang=str(data.get('jam_datang', '')),
            jam_selesai=str(data.get('jam_selesai', '')),
            total_records=_safe_int(data.get('total_records', 0)),
            last_update=data.get('last_update', time.time()),
        )


def _safe_int(value, default: int = 0) -> int:
    """Safely convert value to integer."""
    try:
        if value is None or value == '':
            return default
        return int(float(str(value)))
    except (ValueError, TypeError):
        return default


class SheetsIntegration:
    """
    Google Sheets integration for fetching warehouse data.
    
    Modes:
    - WebApp: Uses Google Apps Script Web App URL (recommended)
    - gspread: Direct Google Sheets API access
    
    Usage:
        config = SheetsConfig(enabled=True, webapp_url="https://...")
        sheets = SheetsIntegration(config)
        sheets.start_polling()
        
        # Get data
        data = sheets.get_latest_data()
        
        # Stop polling
        sheets.stop_polling()
    """
    
    def __init__(
        self,
        config: SheetsConfig,
        on_update: Optional[Callable[[SheetsData], None]] = None
    ):
        """
        Initialize sheets integration.
        
        Args:
            config: Sheets configuration
            on_update: Callback when data is updated
        """
        self.config = config
        self.on_update = on_update
        
        self._data = SheetsData()
        self._lock = threading.RLock()
        self._connected = False
        self._error: Optional[str] = None
        self._poll_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        
        # gspread client (lazy init)
        self._gspread_client = None
        self._worksheet = None
    
    @property
    def is_connected(self) -> bool:
        """Check if connected to sheets."""
        return self._connected
    
    @property
    def last_update(self) -> float:
        """Get timestamp of last update."""
        with self._lock:
            return self._data.last_update
    
    @property
    def error(self) -> Optional[str]:
        """Get last error message."""
        return self._error
    
    def get_latest_data(self) -> Dict[str, Any]:
        """Get latest sheets data as dictionary."""
        with self._lock:
            return self._data.to_dict()
    
    def start_polling(self) -> None:
        """Start background polling thread."""
        if self._poll_thread and self._poll_thread.is_alive():
            return
        
        self._stop_event.clear()
        self._poll_thread = threading.Thread(
            target=self._poll_loop,
            daemon=True
        )
        self._poll_thread.start()
        print("[Sheets] Polling started")
    
    def stop_polling(self) -> None:
        """Stop background polling."""
        self._stop_event.set()
        if self._poll_thread and self._poll_thread.is_alive():
            self._poll_thread.join(timeout=2.0)
        print("[Sheets] Polling stopped")
    
    def fetch_data(self) -> Optional[Dict[str, Any]]:
        """
        Fetch data from Google Sheets.
        
        Returns:
            dict: Sheets data or None if failed
        """
        if self.config.webapp_url:
            return self._fetch_from_webapp()
        else:
            return self._fetch_from_gspread()
    
    def reconnect(self) -> bool:
        """Reconnect to Google Sheets."""
        if self.config.webapp_url:
            # Test webapp connection
            data = self._fetch_from_webapp()
            return data is not None
        else:
            # Reconnect gspread
            self._gspread_client = None
            self._worksheet = None
            return self._init_gspread()
    
    def update_from_webhook(self, data: Dict[str, Any]) -> None:
        """Update data from webhook push."""
        with self._lock:
            self._data = SheetsData.from_dict(data)
            self._data.last_update = time.time()
            self._connected = True
        
        if self.on_update:
            self.on_update(self._data)
    
    def _poll_loop(self) -> None:
        """Background polling loop."""
        while not self._stop_event.is_set():
            try:
                data = self.fetch_data()
                if data:
                    with self._lock:
                        self._data = SheetsData.from_dict(data)
                        self._data.last_update = time.time()
                        self._connected = True
                    
                    if self.on_update:
                        self.on_update(self._data)
                else:
                    self._connected = False
                    
            except Exception as e:
                self._error = str(e)
                self._connected = False
                print(f"[Sheets] Poll error: {e}")
            
            # Wait for next poll
            self._stop_event.wait(self.config.poll_interval)
    
    def _fetch_from_webapp(self) -> Optional[Dict[str, Any]]:
        """Fetch data from Google Apps Script Web App."""
        if not self.config.webapp_url:
            return None
        
        try:
            response = requests.get(self.config.webapp_url, timeout=10)
            
            if response.status_code != 200:
                self._error = f"WebApp returned {response.status_code}"
                return None
            
            data = response.json()
            
            if data.get('status') != 'success':
                self._error = data.get('message', 'Unknown error')
                return None
            
            self._error = None
            return data.get('data', {})
            
        except requests.Timeout:
            self._error = "WebApp timeout"
            return None
        except Exception as e:
            self._error = str(e)
            return None
    
    def _fetch_from_gspread(self) -> Optional[Dict[str, Any]]:
        """Fetch data directly from Google Sheets using gspread."""
        if not self._init_gspread():
            return None
        
        try:
            records = self._worksheet.get_all_records()
            
            if not records:
                return None
            
            # Calculate totals
            loading_count = self._sum_or_count(records, 'Loading')
            rehab_count = self._sum_or_count(records, 'Rehab')
            
            # Find latest entry with Plat
            latest_plate = 'N/A'
            jam_datang = ''
            jam_selesai = ''
            
            for record in reversed(records):
                plat = record.get('Plat', '')
                if plat and str(plat).strip():
                    latest_plate = str(plat).strip()
                    jam_datang = str(record.get('Jam Datang', ''))
                    jam_selesai = str(record.get('Jam Selesai', ''))
                    break
            
            self._error = None
            return {
                'loading_count': loading_count,
                'rehab_count': rehab_count,
                'latest_plate': latest_plate,
                'jam_datang': jam_datang,
                'jam_selesai': jam_selesai,
                'total_records': len(records),
            }
            
        except Exception as e:
            self._error = str(e)
            return None
    
    def _init_gspread(self) -> bool:
        """Initialize gspread client."""
        if self._worksheet:
            return True
        
        if not self.config.creds_path or not self.config.sheet_id:
            self._error = "Missing credentials or sheet_id"
            return False
        
        if not os.path.exists(self.config.creds_path):
            self._error = f"Credentials file not found: {self.config.creds_path}"
            return False
        
        try:
            import gspread
            from oauth2client.service_account import ServiceAccountCredentials
            
            scope = [
                'https://spreadsheets.google.com/feeds',
                'https://www.googleapis.com/auth/drive'
            ]
            
            creds = ServiceAccountCredentials.from_json_keyfile_name(
                self.config.creds_path, scope
            )
            self._gspread_client = gspread.authorize(creds)
            
            sheet = self._gspread_client.open_by_key(self.config.sheet_id)
            self._worksheet = sheet.worksheet(self.config.worksheet)
            
            self._error = None
            return True
            
        except ImportError:
            self._error = "gspread not installed"
            return False
        except Exception as e:
            self._error = str(e)
            return False
    
    @staticmethod
    def _sum_or_count(records: list, key: str) -> int:
        """Sum numeric values or count non-empty values."""
        total = 0.0
        nonempty_count = 0
        has_numeric = False
        
        for row in records:
            value = row.get(key)
            if value is None:
                continue
            
            # Try to parse as number
            if isinstance(value, (int, float)):
                has_numeric = True
                total += float(value)
            else:
                text = str(value).strip().replace(",", ".")
                if text:
                    try:
                        total += float(text)
                        has_numeric = True
                    except ValueError:
                        nonempty_count += 1
        
        if has_numeric:
            return int(total) if total == int(total) else int(total)
        return nonempty_count