"""
Enhanced Rich-based Terminal User Interface (TUI) for server monitoring.

Professional dashboard layout with:
- Status header with live indicator
- Progress bars for metrics
- Resource monitoring (CPU/Memory)
- Color-coded status indicators
- Large log area
- Interactive keybindings

Usage:
    from src.utils.tui import EnhancedServerTUI
    
    def get_stats():
        return {
            'status': 'streaming',  # streaming, connecting, error, stopped
            'mode': 'RELAY',
            'port': 5001,
            'uptime_seconds': 3600,
            'stream': {
                'source': 'Main V3 :5002',
                'clients': 3,
                'frames_total': 12456,
            },
            'performance': {
                'fps': {'current': 15.2, 'max': 30},
                'buffer': {'current': 2, 'max': 10},
                'latency_ms': 35,
            },
            'integrations': {
                'sheets': {'connected': True, 'latest': 'B 1234 AB', 'age_seconds': 2},
                'telegram': {'active': True, 'plate': 'B 5678 CD', 'status': 'READY'},
            },
            'urls': {
                'video': 'http://localhost:5001/api/stream/video',
                'api': 'http://localhost:5001/api/status',
                'ws': 'ws://localhost:5001',
                'tunnel': 'https://api.foodiserver.my.id',
            },
        }
    
    tui = EnhancedServerTUI(title="Unified Server", get_stats=get_stats)
    tui.start()
"""

import atexit
import io
import logging
import os
import queue
import sys
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Callable, Dict, Any, Optional, List, Tuple


# ==============================================================================
# Resource Monitoring
# ==============================================================================

def get_process_memory_mb() -> float:
    """Get current process memory usage in MB."""
    try:
        import psutil
        process = psutil.Process(os.getpid())
        return process.memory_info().rss / (1024 * 1024)
    except ImportError:
        return 0.0
    except Exception:
        return 0.0


def get_process_cpu_percent() -> float:
    """Get current process CPU usage percentage."""
    try:
        import psutil
        process = psutil.Process(os.getpid())
        return process.cpu_percent(interval=None)
    except ImportError:
        return 0.0
    except Exception:
        return 0.0


# ==============================================================================
# Queue-based IO Redirectors
# ==============================================================================

class QueueWriter(io.TextIOBase):
    """Custom TextIO that writes to a queue for TUI display."""
    
    def __init__(self, message_queue: queue.Queue, fallback_stream):
        super().__init__()
        self._queue = message_queue
        self._fallback = fallback_stream
        self._buffer = ""

    def write(self, s):
        if not s:
            return 0
        self._buffer += str(s)
        while "\n" in self._buffer:
            line, self._buffer = self._buffer.split("\n", 1)
            line = line.rstrip("\r")
            if line:
                try:
                    self._queue.put_nowait(line)
                except Exception:
                    self._safe_fallback_write(line)
        return len(s)

    def flush(self):
        if self._buffer:
            line = self._buffer.rstrip("\r\n")
            self._buffer = ""
            if line:
                try:
                    self._queue.put_nowait(line)
                except Exception:
                    pass
        try:
            self._fallback.flush()
        except Exception:
            pass

    def _safe_fallback_write(self, line):
        """Safely write to fallback stream."""
        try:
            self._fallback.write(line + "\n")
            self._fallback.flush()
        except Exception:
            pass

    @property
    def encoding(self):
        return getattr(self._fallback, "encoding", "utf-8")

    def isatty(self):
        return getattr(self._fallback, "isatty", lambda: False)()


class QueueLogHandler(logging.Handler):
    """Logging handler that writes to a queue for TUI display."""
    
    def __init__(self, message_queue: queue.Queue):
        super().__init__()
        self._queue = message_queue

    def emit(self, record):
        try:
            msg = self.format(record)
            if msg:
                self._queue.put_nowait(msg)
        except Exception:
            pass


# ==============================================================================
# Enhanced Server TUI
# ==============================================================================

class EnhancedServerTUI:
    """
    Professional Terminal User Interface for server monitoring.
    
    Features:
    - Status header with live indicator
    - Progress bars for FPS, buffer, latency
    - Resource monitoring (CPU/Memory)
    - Color-coded status indicators
    - Integrations panel (Sheets, Telegram)
    - Endpoints panel
    - Large log area
    """
    
    def __init__(
        self,
        title: str = "Server Monitor",
        get_stats: Optional[Callable[[], Dict[str, Any]]] = None,
        refresh_rate: int = 4,
        max_logs: int = 200
    ):
        """
        Initialize Enhanced TUI.
        
        Args:
            title: Application title
            get_stats: Callback that returns stats dict
            refresh_rate: Refresh rate in Hz
            max_logs: Maximum log lines to keep
        """
        self.title = title
        self.get_stats = get_stats or (lambda: {})
        self.refresh_rate = refresh_rate
        
        self._original_stdout = None
        self._original_stderr = None
        self._queue = queue.Queue(maxsize=2000)
        self._logs = deque(maxlen=max_logs)
        self._stop = threading.Event()
        self._console = None
        self._rich_available = False
        self._log_handler = None
        self._start_time = time.time()
        self._last_cpu_check = 0
        self._cached_cpu = 0.0
        
    @property
    def message_queue(self) -> queue.Queue:
        return self._queue
    
    def log(self, message: str) -> None:
        """Add a log message directly."""
        try:
            timestamp = time.strftime("%H:%M:%S")
            self._queue.put_nowait(f"{timestamp} {message}")
        except Exception:
            pass
    
    def start(self) -> bool:
        """
        Start the TUI.
        
        Returns:
            bool: True if started successfully
        """
        try:
            from rich.console import Console
            from rich.layout import Layout
            from rich.live import Live
            from rich.panel import Panel
            from rich.table import Table
            from rich.text import Text
            from rich.progress import BarColumn, Progress
        except ImportError:
            print("[TUI] Rich library not available. Install with: pip install rich")
            return False

        self._rich_available = True
        self._original_stdout = sys.stdout
        self._original_stderr = sys.stderr
        self._console = Console(file=self._original_stdout, force_terminal=True)
        
        # Redirect stdout/stderr to TUI
        sys.stdout = QueueWriter(self._queue, self._original_stdout)
        sys.stderr = QueueWriter(self._queue, self._original_stderr)
        
        # Setup logging handler
        self._log_handler = QueueLogHandler(self._queue)
        self._log_handler.setFormatter(logging.Formatter("[%(levelname)s] %(name)s: %(message)s"))
        root_logger = logging.getLogger()
        root_logger.addHandler(self._log_handler)
        root_logger.setLevel(logging.INFO)
        logging.getLogger("werkzeug").setLevel(logging.WARNING)
        
        # Start render thread
        threading.Thread(target=self._run_loop, daemon=True).start()
        
        # Register cleanup
        atexit.register(self._cleanup)
        
        self.log("[TUI] Dashboard started. Logs will appear below.")
        return True

    def stop(self) -> None:
        """Stop the TUI."""
        self._stop.set()
        self._cleanup()

    def _cleanup(self) -> None:
        """Cleanup TUI resources."""
        try:
            if self._log_handler:
                logging.getLogger().removeHandler(self._log_handler)
        except Exception:
            pass
        finally:
            if self._original_stdout:
                sys.stdout = self._original_stdout
            if self._original_stderr:
                sys.stderr = self._original_stderr

    def _run_loop(self) -> None:
        """Main TUI render loop."""
        from rich.live import Live
        
        with Live(
            self._render(),
            console=self._console,
            refresh_per_second=self.refresh_rate,
            screen=True
        ) as live:
            while not self._stop.is_set():
                self._drain_queue()
                live.update(self._render(), refresh=True)
                time.sleep(1.0 / self.refresh_rate)

    def _drain_queue(self, max_items: int = 200) -> None:
        """Drain messages from queue to logs."""
        drained = 0
        while drained < max_items:
            try:
                line = self._queue.get_nowait()
                # Add timestamp if not present
                if not line[:8].replace(":", "").replace(" ", "").isdigit():
                    timestamp = time.strftime("%H:%M:%S")
                    line = f"{timestamp} {line}"
                self._logs.append(line)
                drained += 1
            except queue.Empty:
                break

    def _get_status_indicator(self, status: str) -> Tuple[str, str]:
        """Get status indicator symbol and color."""
        status_lower = status.lower()
        if status_lower in ('streaming', 'running', 'connected', 'active'):
            return ("●", "bold green")
        elif status_lower in ('connecting', 'reconnecting', 'starting'):
            return ("◐", "yellow")
        elif status_lower in ('error', 'failed', 'disconnected'):
            return ("●", "bold red")
        elif status_lower in ('stopped', 'idle'):
            return ("○", "dim")
        else:
            return ("◌", "white")

    def _format_uptime(self, seconds: int) -> str:
        """Format uptime in human readable format."""
        if seconds < 60:
            return f"{seconds}s"
        elif seconds < 3600:
            return f"{seconds // 60}m {seconds % 60}s"
        else:
            hours = seconds // 3600
            minutes = (seconds % 3600) // 60
            return f"{hours}h {minutes}m"

    def _create_progress_bar(self, current: float, maximum: float, width: int = 20) -> str:
        """Create a text-based progress bar."""
        if maximum <= 0:
            return "░" * width
        ratio = min(current / maximum, 1.0)
        filled = int(width * ratio)
        return "█" * filled + "░" * (width - filled)

    def _render(self):
        """Render the enhanced TUI layout."""
        from rich.layout import Layout
        from rich.panel import Panel
        from rich.table import Table
        from rich.text import Text
        from rich.columns import Columns
        from rich import box

        # Get current stats
        stats = self.get_stats()
        
        # Extract values with defaults
        status = stats.get('status', 'unknown')
        mode = stats.get('mode', 'UNKNOWN')
        port = stats.get('port', 5001)
        uptime_seconds = stats.get('uptime_seconds', int(time.time() - self._start_time))
        
        stream = stats.get('stream', {})
        performance = stats.get('performance', {})
        integrations = stats.get('integrations', {})
        urls = stats.get('urls', {})
        
        # Resource monitoring (cache CPU to avoid high overhead)
        now = time.time()
        if now - self._last_cpu_check > 2:
            self._cached_cpu = get_process_cpu_percent()
            self._last_cpu_check = now
        cpu_percent = self._cached_cpu
        memory_mb = get_process_memory_mb()
        
        # Status indicator
        status_symbol, status_color = self._get_status_indicator(status)
        current_time = time.strftime("%H:%M:%S")
        
        # =====================================================================
        # Header
        # =====================================================================
        header_text = Text()
        header_text.append("  █ ", style="bold cyan")
        header_text.append(self.title.upper(), style="bold white")
        header_text.append("  │  ", style="dim")
        header_text.append(f"{status_symbol} ", style=status_color)
        header_text.append(status.upper(), style=status_color)
        header_text.append(f"  {current_time}", style="dim cyan")
        
        metrics_text = Text()
        metrics_text.append(f"  Mode: ", style="dim")
        metrics_text.append(mode, style="bold magenta" if mode == "RELAY" else "bold blue")
        metrics_text.append(f"  │  Port: ", style="dim")
        metrics_text.append(str(port), style="cyan")
        metrics_text.append(f"  │  Uptime: ", style="dim")
        metrics_text.append(self._format_uptime(uptime_seconds), style="green")
        metrics_text.append(f"  │  CPU: ", style="dim")
        metrics_text.append(f"{cpu_percent:.0f}%", style="yellow" if cpu_percent > 50 else "green")
        metrics_text.append(f"  MEM: ", style="dim")
        metrics_text.append(f"{memory_mb:.0f}MB", style="yellow" if memory_mb > 300 else "green")
        
        header_table = Table.grid(expand=True)
        header_table.add_column()
        header_table.add_row(header_text)
        header_table.add_row(metrics_text)
        
        header = Panel(header_table, box=box.DOUBLE, border_style="cyan", padding=(0, 1))
        
        # =====================================================================
        # Stream Panel
        # =====================================================================
        stream_table = Table.grid(expand=True, padding=(0, 1))
        stream_table.add_column(ratio=1)
        stream_table.add_column(ratio=2)
        
        stream_status = stream.get('status', status)
        ss_symbol, ss_color = self._get_status_indicator(stream_status)
        stream_table.add_row(
            Text("Status", style="dim"),
            Text(f"{ss_symbol} {stream_status.title()}", style=ss_color)
        )
        stream_table.add_row(
            Text("Source", style="dim"),
            Text(str(stream.get('source', 'N/A'))[:25], style="white")
        )
        stream_table.add_row(
            Text("Clients", style="dim"),
            Text(f"{stream.get('clients', 0)} connected", style="cyan")
        )
        stream_table.add_row(
            Text("Frames", style="dim"),
            Text(f"{stream.get('frames_total', 0):,} total", style="white")
        )
        
        stream_panel = Panel(
            stream_table,
            title="Stream",
            border_style="green",
            box=box.ROUNDED
        )
        
        # =====================================================================
        # Performance Panel (with progress bars)
        # =====================================================================
        perf_table = Table.grid(expand=True, padding=(0, 1))
        perf_table.add_column(ratio=1)
        perf_table.add_column(ratio=3)
        perf_table.add_column(ratio=1)
        
        # FPS bar
        fps_data = performance.get('fps', {})
        fps_current = fps_data.get('current', 0) if isinstance(fps_data, dict) else fps_data
        fps_max = fps_data.get('max', 30) if isinstance(fps_data, dict) else 30
        fps_bar = self._create_progress_bar(fps_current, fps_max, 16)
        fps_color = "green" if fps_current >= fps_max * 0.5 else "yellow" if fps_current >= fps_max * 0.25 else "red"
        perf_table.add_row(
            Text("FPS", style="dim"),
            Text(fps_bar, style=fps_color),
            Text(f"{fps_current:.1f}/{fps_max}", style="white")
        )
        
        # Buffer bar
        buffer_data = performance.get('buffer', {})
        buf_current = buffer_data.get('current', 0) if isinstance(buffer_data, dict) else buffer_data
        buf_max = buffer_data.get('max', 10) if isinstance(buffer_data, dict) else 10
        buf_bar = self._create_progress_bar(buf_current, buf_max, 16)
        perf_table.add_row(
            Text("Buffer", style="dim"),
            Text(buf_bar, style="cyan"),
            Text(f"{buf_current}/{buf_max}", style="white")
        )
        
        # Latency bar (inverted - lower is better)
        latency = performance.get('latency_ms', 0)
        latency_bar = self._create_progress_bar(min(latency, 200), 200, 16)
        latency_color = "green" if latency < 50 else "yellow" if latency < 100 else "red"
        perf_table.add_row(
            Text("Latency", style="dim"),
            Text(latency_bar, style=latency_color),
            Text(f"{latency}ms", style="white")
        )
        
        # Queue if available
        queue_data = performance.get('queue', {})
        if queue_data:
            q_current = queue_data.get('current', 0) if isinstance(queue_data, dict) else queue_data
            q_max = queue_data.get('max', 100) if isinstance(queue_data, dict) else 100
            q_bar = self._create_progress_bar(q_current, q_max, 16)
            perf_table.add_row(
                Text("Queue", style="dim"),
                Text(q_bar, style="blue"),
                Text(f"{q_current}", style="white")
            )
        
        perf_panel = Panel(
            perf_table,
            title="Performance",
            border_style="yellow",
            box=box.ROUNDED
        )
        
        # =====================================================================
        # Integrations Panel
        # =====================================================================
        integ_table = Table.grid(expand=True, padding=(0, 1))
        integ_table.add_column(ratio=1)
        
        # Sheets
        sheets = integrations.get('sheets', {})
        sheets_connected = sheets.get('connected', False)
        sheets_symbol, sheets_color = self._get_status_indicator('connected' if sheets_connected else 'disconnected')
        sheets_latest = sheets.get('latest', 'N/A')
        sheets_age = sheets.get('age_seconds', 0)
        
        sheets_text = Text()
        sheets_text.append("📊 Sheets: ", style="dim")
        sheets_text.append(f"{sheets_symbol} ", style=sheets_color)
        sheets_text.append("Connected" if sheets_connected else "Disconnected", style=sheets_color)
        if sheets_connected and sheets_latest:
            sheets_text.append(f"  │  Latest: ", style="dim")
            sheets_text.append(str(sheets_latest)[:15], style="cyan")
            if sheets_age:
                sheets_text.append(f" ({sheets_age}s ago)", style="dim")
        integ_table.add_row(sheets_text)
        
        # Telegram
        telegram = integrations.get('telegram', {})
        tg_active = telegram.get('active', False)
        tg_symbol, tg_color = self._get_status_indicator('active' if tg_active else 'idle')
        tg_plate = telegram.get('plate', '-')
        tg_status = telegram.get('status', 'IDLE')
        
        tg_text = Text()
        tg_text.append("📱 Telegram: ", style="dim")
        tg_text.append(f"{tg_symbol} ", style=tg_color)
        tg_text.append(tg_status, style=tg_color)
        if tg_plate and tg_plate != '-':
            tg_text.append(f"  │  Plate: ", style="dim")
            tg_text.append(str(tg_plate)[:12], style="magenta")
        integ_table.add_row(tg_text)
        
        integ_panel = Panel(
            integ_table,
            title="Integrations",
            border_style="magenta",
            box=box.ROUNDED
        )
        
        # =====================================================================
        # Endpoints Panel
        # =====================================================================
        urls_table = Table.grid(expand=True, padding=(0, 1))
        urls_table.add_column(ratio=1)
        urls_table.add_column(ratio=4)
        
        for name, url in urls.items():
            urls_table.add_row(
                Text(name.title(), style="dim"),
                Text(str(url)[:50], style="cyan")
            )
        
        # Add default URLs if not provided
        if not urls:
            urls_table.add_row(Text("Video", style="dim"), Text(f"http://localhost:{port}/api/stream/video", style="cyan"))
            urls_table.add_row(Text("API", style="dim"), Text(f"http://localhost:{port}/api/status", style="cyan"))
            urls_table.add_row(Text("WS", style="dim"), Text(f"ws://localhost:{port}", style="cyan"))
        
        urls_panel = Panel(
            urls_table,
            title="Endpoints",
            border_style="blue",
            box=box.ROUNDED
        )
        
        # =====================================================================
        # Logs Panel
        # =====================================================================
        log_lines = list(self._logs)[-30:]  # Show last 30 lines
        if log_lines:
            logs_text = "\n".join(log_lines)
        else:
            logs_text = "Waiting for logs..."
        
        logs_panel = Panel(
            Text(logs_text, style="white"),
            title=f"Logs [Last {len(log_lines)}]",
            border_style="yellow",
            box=box.ROUNDED
        )
        
        # =====================================================================
        # Footer with keybindings
        # =====================================================================
        footer_text = Text()
        footer_text.append("  Ctrl+C", style="bold cyan")
        footer_text.append(" Exit", style="dim")
        footer_text.append("  │  ", style="dim")
        footer_text.append("psutil", style="bold cyan")
        footer_text.append(" for CPU/MEM monitoring", style="dim")
        
        footer = Panel(footer_text, box=box.SIMPLE, border_style="dim", padding=(0, 1))
        
        # =====================================================================
        # Layout Assembly
        # =====================================================================
        layout = Layout()
        
        layout.split_column(
            Layout(header, name="header", size=5),
            Layout(name="top_panels", size=9),
            Layout(name="middle_panels", size=6),
            Layout(logs_panel, name="logs", ratio=1),
            Layout(footer, name="footer", size=3),
        )
        
        # Top panels: Stream + Performance
        layout["top_panels"].split_row(
            Layout(stream_panel, ratio=1),
            Layout(perf_panel, ratio=2),
        )
        
        # Middle panels: Integrations + Endpoints
        layout["middle_panels"].split_row(
            Layout(integ_panel, ratio=1),
            Layout(urls_panel, ratio=1),
        )
        
        return layout


# ==============================================================================
# Legacy ServerTUI (for backwards compatibility)
# ==============================================================================

class ServerTUI(EnhancedServerTUI):
    """
    Backwards-compatible alias for EnhancedServerTUI.
    
    Note: The stats callback format has changed. The new format expects:
    - status: str (streaming, connecting, error, stopped)
    - mode: str
    - port: int
    - uptime_seconds: int
    - stream: dict
    - performance: dict
    - integrations: dict
    - urls: dict
    
    If using the old format (dict of panels), it will be automatically converted.
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._original_get_stats = self.get_stats
        self.get_stats = self._convert_legacy_stats
    
    def _convert_legacy_stats(self) -> Dict[str, Any]:
        """Convert legacy panel-based stats to new format."""
        old_stats = self._original_get_stats()
        
        # Check if already in new format
        if 'status' in old_stats and 'mode' in old_stats:
            return old_stats
        
        # Convert from old panel-based format
        new_stats = {
            'status': 'unknown',
            'mode': 'UNKNOWN',
            'port': 5001,
            'uptime_seconds': 0,
            'stream': {},
            'performance': {},
            'integrations': {},
            'urls': {},
        }
        
        # Try to extract from old format
        for panel_name, panel_data in old_stats.items():
            if not isinstance(panel_data, dict):
                continue
                
            panel_lower = panel_name.lower()
            
            if 'server' in panel_lower:
                for key, value in panel_data.items():
                    key_lower = key.lower()
                    if 'status' in key_lower:
                        val = value[0] if isinstance(value, tuple) else value
                        new_stats['status'] = str(val).lower()
                    elif 'mode' in key_lower:
                        val = value[0] if isinstance(value, tuple) else value
                        new_stats['mode'] = str(val).upper()
                    elif 'port' in key_lower:
                        try:
                            new_stats['port'] = int(value)
                        except:
                            pass
                    elif 'uptime' in key_lower:
                        val = value[0] if isinstance(value, tuple) else value
                        # Parse uptime string like "5m 23s"
                        try:
                            parts = str(val).replace('s', '').replace('m', ' ').replace('h', ' ').split()
                            if len(parts) == 1:
                                new_stats['uptime_seconds'] = int(parts[0])
                            elif len(parts) == 2:
                                new_stats['uptime_seconds'] = int(parts[0]) * 60 + int(parts[1])
                            elif len(parts) == 3:
                                new_stats['uptime_seconds'] = int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
                        except:
                            pass
            
            elif 'stream' in panel_lower:
                for key, value in panel_data.items():
                    val = value[0] if isinstance(value, tuple) else value
                    key_lower = key.lower()
                    if 'source' in key_lower:
                        new_stats['stream']['source'] = str(val)
                    elif 'client' in key_lower:
                        try:
                            new_stats['stream']['clients'] = int(str(val).split()[0])
                        except:
                            pass
                    elif 'frame' in key_lower or 'fps' in key_lower:
                        try:
                            new_stats['stream']['frames_total'] = int(str(val).replace(',', '').split()[0])
                        except:
                            pass
            
            elif 'url' in panel_lower:
                for key, value in panel_data.items():
                    val = value[0] if isinstance(value, tuple) else value
                    new_stats['urls'][key.lower()] = str(val)
            
            elif 'sheet' in panel_lower or 'google' in panel_lower:
                for key, value in panel_data.items():
                    val = value[0] if isinstance(value, tuple) else value
                    key_lower = key.lower()
                    if 'connect' in key_lower:
                        new_stats['integrations']['sheets'] = new_stats['integrations'].get('sheets', {})
                        new_stats['integrations']['sheets']['connected'] = 'yes' in str(val).lower() or 'connect' in str(val).lower()
                    elif 'latest' in key_lower or 'plate' in key_lower:
                        new_stats['integrations']['sheets'] = new_stats['integrations'].get('sheets', {})
                        new_stats['integrations']['sheets']['latest'] = str(val)
            
            elif 'telegram' in panel_lower:
                for key, value in panel_data.items():
                    val = value[0] if isinstance(value, tuple) else value
                    key_lower = key.lower()
                    if 'status' in key_lower:
                        new_stats['integrations']['telegram'] = new_stats['integrations'].get('telegram', {})
                        new_stats['integrations']['telegram']['status'] = str(val)
                        new_stats['integrations']['telegram']['active'] = 'active' in str(val).lower() or 'ready' in str(val).lower()
                    elif 'plate' in key_lower:
                        new_stats['integrations']['telegram'] = new_stats['integrations'].get('telegram', {})
                        new_stats['integrations']['telegram']['plate'] = str(val)
        
        return new_stats


# ==============================================================================
# Convenience Function
# ==============================================================================

def enable_tui(
    title: str = "Server Monitor",
    get_stats: Optional[Callable[[], Dict[str, Any]]] = None
) -> Optional[EnhancedServerTUI]:
    """
    Enable TUI mode if Rich is available.
    
    Args:
        title: Header title
        get_stats: Callback that returns stats dict
        
    Returns:
        EnhancedServerTUI or None: TUI instance if enabled
    """
    tui = EnhancedServerTUI(title=title, get_stats=get_stats)
    if tui.start():
        return tui
    return None


# ==============================================================================
# Exports
# ==============================================================================

__all__ = [
    'EnhancedServerTUI',
    'ServerTUI',
    'QueueWriter',
    'QueueLogHandler',
    'enable_tui',
    'get_process_memory_mb',
    'get_process_cpu_percent',
]