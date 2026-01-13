"""
Configuration module for Unified Stream Server.

Handles loading and validating configuration from:
1. JSON config file
2. Environment variables
3. CLI arguments
"""

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Dict, Any


@dataclass
class CaptureConfig:
    """Configuration for video capture and detection."""
    # Mode: "relay" (from Main V3) or "direct" (own RTSP capture)
    mode: str = "relay"
    
    # For relay mode: URL of Main V3's video feed
    relay_url: str = "http://localhost:5002/video_feed"
    relay_stats_url: str = "http://localhost:5002/stats"
    
    # For direct mode: RTSP/camera source
    source: str = "rtsp://admin:admin@192.168.1.100:554/stream1"
    width: int = 1280
    height: int = 720
    target_fps: int = 15
    jpeg_quality: int = 65
    detection_enabled: bool = True
    model_path: str = "best.engine"
    
    # Common settings
    reconnect_delay: float = 2.0
    buffer_size: int = 3


@dataclass
class SheetsConfig:
    """Configuration for Google Sheets integration."""
    enabled: bool = False
    webapp_url: str = ""
    creds_path: str = ""
    sheet_id: str = ""
    worksheet: str = "AUTO_ID"
    poll_interval: int = 5


@dataclass
class TelegramConfig:
    """Configuration for Telegram integration."""
    enabled: bool = False
    api_url: str = ""  # For receiving updates from external bot


@dataclass
class ServerConfig:
    """Main server configuration."""
    host: str = "0.0.0.0"
    port: int = 5001
    debug: bool = False
    enable_tui: bool = False
    
    capture: CaptureConfig = field(default_factory=CaptureConfig)
    sheets: SheetsConfig = field(default_factory=SheetsConfig)
    telegram: TelegramConfig = field(default_factory=TelegramConfig)


def load_config(config_path: Optional[str] = None) -> ServerConfig:
    """
    Load configuration from file and environment.
    
    Priority:
    1. Environment variables (highest)
    2. Config file
    3. Defaults (lowest)
    
    Args:
        config_path: Path to JSON config file
        
    Returns:
        ServerConfig: Validated configuration
    """
    config = ServerConfig()
    
    # Load from JSON file if provided
    if config_path:
        file_config = _load_json_config(config_path)
        config = _merge_config(config, file_config)
    else:
        # Try default locations
        default_paths = [
            Path("config.json"),
            Path("unified_server_config.json"),
            Path(__file__).parent.parent.parent / "config" / "unified_server.json",
        ]
        for path in default_paths:
            if path.exists():
                file_config = _load_json_config(str(path))
                config = _merge_config(config, file_config)
                break
    
    # Override with environment variables
    config = _apply_env_overrides(config)
    
    return config


def _load_json_config(path: str) -> Dict[str, Any]:
    """Load configuration from JSON file."""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Config file not found: {path}")
        return {}
    except json.JSONDecodeError as e:
        print(f"Invalid JSON in config file: {e}")
        return {}


def _merge_config(config: ServerConfig, file_data: Dict[str, Any]) -> ServerConfig:
    """Merge file configuration into ServerConfig."""
    # Server settings
    config.host = file_data.get('host', config.host)
    config.port = file_data.get('port', config.port)
    config.debug = file_data.get('debug', config.debug)
    config.enable_tui = file_data.get('enable_tui', config.enable_tui)
    
    # Capture settings
    capture_data = file_data.get('capture', {})
    
    # Mode: relay or direct
    config.capture.mode = capture_data.get('mode', file_data.get('capture_mode', config.capture.mode))
    
    # Relay mode settings
    config.capture.relay_url = capture_data.get('relay_url', file_data.get('relay_url', config.capture.relay_url))
    config.capture.relay_stats_url = capture_data.get('relay_stats_url', config.capture.relay_stats_url)
    
    # Direct mode settings
    config.capture.source = capture_data.get('source', file_data.get('camera_url', config.capture.source))
    config.capture.width = capture_data.get('width', config.capture.width)
    config.capture.height = capture_data.get('height', config.capture.height)
    config.capture.target_fps = capture_data.get('target_fps', file_data.get('target_fps', config.capture.target_fps))
    config.capture.jpeg_quality = capture_data.get('jpeg_quality', file_data.get('jpeg_quality', config.capture.jpeg_quality))
    config.capture.detection_enabled = capture_data.get('detection_enabled', file_data.get('detection_enabled', config.capture.detection_enabled))
    config.capture.model_path = capture_data.get('model_path', file_data.get('model_path', config.capture.model_path))
    config.capture.buffer_size = capture_data.get('buffer_size', config.capture.buffer_size)
    
    # Sheets settings
    sheets_data = file_data.get('sheets', file_data.get('sheets_config', {}))
    config.sheets.enabled = file_data.get('sheets_enabled', sheets_data.get('enabled', config.sheets.enabled))
    config.sheets.webapp_url = sheets_data.get('webapp_url', config.sheets.webapp_url)
    config.sheets.creds_path = sheets_data.get('creds_path', sheets_data.get('creds', config.sheets.creds_path))
    config.sheets.sheet_id = sheets_data.get('sheet_id', config.sheets.sheet_id)
    config.sheets.worksheet = sheets_data.get('worksheet', config.sheets.worksheet)
    config.sheets.poll_interval = sheets_data.get('poll_interval', config.sheets.poll_interval)
    
    # Telegram settings
    telegram_data = file_data.get('telegram', file_data.get('telegram_config', {}))
    config.telegram.enabled = file_data.get('telegram_enabled', telegram_data.get('enabled', config.telegram.enabled))
    config.telegram.api_url = telegram_data.get('api_url', config.telegram.api_url)
    
    return config


def _apply_env_overrides(config: ServerConfig) -> ServerConfig:
    """Apply environment variable overrides."""
    # Server
    config.host = os.getenv('UNIFIED_HOST', config.host)
    config.port = int(os.getenv('UNIFIED_PORT', config.port))
    config.debug = os.getenv('UNIFIED_DEBUG', '').lower() in ('true', '1', 'yes')
    
    # Capture mode
    capture_mode = os.getenv('CAPTURE_MODE', '').lower()
    if capture_mode in ('relay', 'direct'):
        config.capture.mode = capture_mode
    
    # Relay mode settings
    relay_url = os.getenv('RELAY_URL', os.getenv('MAIN_V3_URL', ''))
    if relay_url:
        config.capture.relay_url = relay_url
    
    # Direct mode settings
    config.capture.source = os.getenv('CAMERA_URL', os.getenv('RTSP_URL', config.capture.source))
    config.capture.target_fps = int(os.getenv('TARGET_FPS', config.capture.target_fps))
    config.capture.jpeg_quality = int(os.getenv('JPEG_QUALITY', config.capture.jpeg_quality))
    config.capture.detection_enabled = os.getenv('DETECTION_ENABLED', '').lower() not in ('false', '0', 'no')
    config.capture.model_path = os.getenv('MODEL_PATH', config.capture.model_path)
    
    # Sheets
    webapp_url = os.getenv('WEBAPP_URL', config.sheets.webapp_url)
    if webapp_url:
        config.sheets.enabled = True
        config.sheets.webapp_url = webapp_url
    
    return config


def save_config(config: ServerConfig, path: str) -> bool:
    """Save configuration to JSON file."""
    try:
        data = {
            'host': config.host,
            'port': config.port,
            'debug': config.debug,
            'enable_tui': config.enable_tui,
            'capture': {
                'mode': config.capture.mode,
                'relay_url': config.capture.relay_url,
                'relay_stats_url': config.capture.relay_stats_url,
                'source': config.capture.source,
                'width': config.capture.width,
                'height': config.capture.height,
                'target_fps': config.capture.target_fps,
                'jpeg_quality': config.capture.jpeg_quality,
                'detection_enabled': config.capture.detection_enabled,
                'model_path': config.capture.model_path,
                'buffer_size': config.capture.buffer_size,
            },
            'sheets': {
                'enabled': config.sheets.enabled,
                'webapp_url': config.sheets.webapp_url,
                'creds_path': config.sheets.creds_path,
                'sheet_id': config.sheets.sheet_id,
                'worksheet': config.sheets.worksheet,
                'poll_interval': config.sheets.poll_interval,
            },
            'telegram': {
                'enabled': config.telegram.enabled,
                'api_url': config.telegram.api_url,
            }
        }
        
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        print(f"Failed to save config: {e}")
        return False