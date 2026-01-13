"""
Telegram state management for loading status.

Manages the state received from Telegram bot for tracking
truck loading operations.
"""

import time
import threading
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass, field


@dataclass
class TelegramState:
    """
    Container for Telegram bot state.
    
    Tracks the current loading operation status from Telegram bot.
    """
    plate: Optional[str] = None
    status: str = "IDLE"
    operator: str = "-"
    last_update: float = field(default_factory=time.time)
    
    # Status options
    STATUS_IDLE = "IDLE"
    STATUS_START = "START"
    STATUS_LOADING = "LOADING"
    STATUS_STOP = "STOP"
    STATUS_STOPPED = "STOPPED"
    STATUS_READY = "READY"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'plate': self.plate,
            'status': self.status,
            'operator': self.operator,
            'last_update': self.last_update,
        }
    
    def update(
        self,
        plate: Optional[str] = None,
        status: Optional[str] = None,
        operator: Optional[str] = None
    ) -> None:
        """Update state with new values."""
        if plate is not None:
            self.plate = plate
        if status is not None:
            self.status = status
        if operator is not None:
            self.operator = operator
        self.last_update = time.time()
    
    def reset(self) -> None:
        """Reset to idle state."""
        self.plate = None
        self.status = self.STATUS_IDLE
        self.operator = "-"
        self.last_update = time.time()
    
    @property
    def is_active(self) -> bool:
        """Check if there's an active loading operation."""
        return self.status in [
            self.STATUS_START,
            self.STATUS_LOADING,
            self.STATUS_READY
        ]
    
    @property
    def age_seconds(self) -> float:
        """Get age of last update in seconds."""
        return time.time() - self.last_update
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TelegramState':
        """Create from dictionary."""
        return cls(
            plate=data.get('plate'),
            status=data.get('status', 'IDLE'),
            operator=data.get('operator', '-'),
            last_update=data.get('last_update', time.time()),
        )


class TelegramStateManager:
    """
    Thread-safe manager for Telegram state.
    
    Provides:
    - Thread-safe state updates
    - Auto-reset after inactivity
    - Callback on state changes
    
    Usage:
        manager = TelegramStateManager(auto_reset_seconds=300)
        manager.start()
        
        # Update from API
        manager.update(plate="B 1234 XY", status="LOADING")
        
        # Get current state
        state = manager.get_state()
    """
    
    def __init__(
        self,
        auto_reset_seconds: float = 300,
        on_update: Optional[Callable[[TelegramState], None]] = None
    ):
        """
        Initialize state manager.
        
        Args:
            auto_reset_seconds: Reset to IDLE after this many seconds of inactivity
            on_update: Callback when state changes
        """
        self._state = TelegramState()
        self._lock = threading.RLock()
        self._auto_reset_seconds = auto_reset_seconds
        self._on_update = on_update
        self._reset_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
    
    def start(self) -> None:
        """Start auto-reset monitoring thread."""
        if self._reset_thread and self._reset_thread.is_alive():
            return
        
        self._stop_event.clear()
        self._reset_thread = threading.Thread(
            target=self._reset_loop,
            daemon=True
        )
        self._reset_thread.start()
    
    def stop(self) -> None:
        """Stop auto-reset monitoring."""
        self._stop_event.set()
        if self._reset_thread and self._reset_thread.is_alive():
            self._reset_thread.join(timeout=1.0)
    
    def get_state(self) -> Dict[str, Any]:
        """Get current state as dictionary."""
        with self._lock:
            return self._state.to_dict()
    
    def get_state_object(self) -> TelegramState:
        """Get current state object (copy)."""
        with self._lock:
            return TelegramState(
                plate=self._state.plate,
                status=self._state.status,
                operator=self._state.operator,
                last_update=self._state.last_update,
            )
    
    def update(
        self,
        plate: Optional[str] = None,
        status: Optional[str] = None,
        operator: Optional[str] = None,
        source: str = "api"
    ) -> Dict[str, Any]:
        """
        Update state with new values.
        
        Args:
            plate: Truck plate number
            status: Loading status
            operator: Operator name
            source: Update source (for logging)
            
        Returns:
            dict: Updated state
        """
        with self._lock:
            old_status = self._state.status
            self._state.update(plate=plate, status=status, operator=operator)
            new_state = self._state.to_dict()
            
            if self._on_update and (status != old_status or plate):
                try:
                    self._on_update(self._state)
                except Exception as e:
                    print(f"[Telegram] Callback error: {e}")
            
            print(f"[Telegram] State updated from {source}: {status} for {plate}")
            return new_state
    
    def reset(self) -> None:
        """Reset to idle state."""
        with self._lock:
            self._state.reset()
            print("[Telegram] State reset to IDLE")
    
    def _reset_loop(self) -> None:
        """Background loop to auto-reset after inactivity."""
        while not self._stop_event.is_set():
            with self._lock:
                if self._state.is_active:
                    age = self._state.age_seconds
                    if age > self._auto_reset_seconds:
                        print(f"[Telegram] Auto-reset after {age:.0f}s inactivity")
                        self._state.reset()
                        if self._on_update:
                            try:
                                self._on_update(self._state)
                            except Exception:
                                pass
            
            # Check every 10 seconds
            self._stop_event.wait(10)