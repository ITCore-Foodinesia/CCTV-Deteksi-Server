"""
Supabase Integration Module

Provides Supabase Realtime listener for CCTV Detection Engine integration.

Main Components:
- SessionListener: Subscribes to loading_sessions changes and triggers detection

Usage:
    from src.integrations.supabase import SessionListener
    
    listener = SessionListener(
        on_session_start=my_start_handler,
        on_session_stop=my_stop_handler
    )
    listener.start()
"""

from .supabase_listener import SessionListener

__all__ = ['SessionListener']
