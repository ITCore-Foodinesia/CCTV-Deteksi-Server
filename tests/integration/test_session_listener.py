"""
Integration Tests: Python Detector ↔ Supabase

Tests the SessionListener that triggers detection engine based on
loading_session status changes from Supabase.

Run: pytest tests/integration/test_session_listener.py -v
"""

import pytest
import os
import time
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

# =============================================================================
# MOCK FIXTURES
# =============================================================================

@pytest.fixture
def mock_supabase_client():
    """Mock Supabase client for testing"""
    mock = MagicMock()
    
    # Mock table operations
    mock.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[],
        error=None
    )
    mock.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data={'id': 'test-123'},
        error=None
    )
    mock.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
        data={'id': 'test-123'},
        error=None
    )
    
    # Mock realtime
    mock_channel = MagicMock()
    mock_channel.on.return_value = mock_channel
    mock_channel.subscribe.return_value = mock_channel
    mock.realtime.channel.return_value = mock_channel
    
    return mock


@pytest.fixture
def mock_session_data():
    """Sample loading session data"""
    return {
        'id': 'session-001',
        'driver_id': 'driver-001',
        'truck_id': 'truck-001',
        'dock_id': 'dock-001',
        'plate_number': 'B 1234 ABC',
        'status': 'loading',
        'loading_count': 0,
        'rehab_count': 0,
        'counting_active': True,
        'tenant_id': 'test-tenant-001',
        'created_at': datetime.now().isoformat()
    }


@pytest.fixture
def mock_callbacks():
    """Mock callbacks for session events"""
    return {
        'on_start': Mock(),
        'on_stop': Mock()
    }


# =============================================================================
# SESSION LISTENER MOCK (for testing before real implementation)
# =============================================================================

class MockSessionListener:
    """
    Mock implementation of SessionListener for testing.
    Replace with actual import when implementation is ready.
    """
    
    def __init__(self, on_session_start, on_session_stop, supabase_client=None):
        self.on_session_start = on_session_start
        self.on_session_stop = on_session_stop
        self.supabase = supabase_client or MagicMock()
        self.active_sessions = {}
        self._running = False
    
    def start(self):
        self._running = True
        self._fetch_active_sessions()
        return True
    
    def stop(self):
        self._running = False
    
    def _fetch_active_sessions(self):
        result = self.supabase.table('loading_sessions').select('*').eq('status', 'loading').execute()
        for session in (result.data or []):
            self.active_sessions[session['id']] = session
            self.on_session_start(session)
    
    def handle_change(self, payload):
        event_type = payload.get('eventType')
        new_data = payload.get('new', {})
        old_data = payload.get('old', {})
        
        session_id = new_data.get('id') or old_data.get('id')
        new_status = new_data.get('status')
        old_status = old_data.get('status')
        
        if new_status == 'loading' and old_status != 'loading':
            self.active_sessions[session_id] = new_data
            self.on_session_start(new_data)
        elif old_status == 'loading' and new_status != 'loading':
            if session_id in self.active_sessions:
                del self.active_sessions[session_id]
            self.on_session_stop(session_id)
    
    def update_counts(self, session_id, loading_count, rehab_count):
        return self.supabase.table('loading_sessions').update({
            'loading_count': loading_count,
            'rehab_count': rehab_count
        }).eq('id', session_id).execute()
    
    def log_event(self, session_id, event_type, data):
        return self.supabase.table('loading_events').insert({
            'session_id': session_id,
            'event_type': event_type,
            'event_data': str(data)
        }).execute()


# =============================================================================
# TEST CASES
# =============================================================================

class TestSessionListenerInit:
    """TC-PYINT-001: Session Listener Initialization"""
    
    def test_listener_starts_without_exception(self, mock_supabase_client, mock_callbacks):
        """Listener should start without throwing exceptions"""
        listener = MockSessionListener(
            mock_callbacks['on_start'],
            mock_callbacks['on_stop'],
            mock_supabase_client
        )
        
        result = listener.start()
        
        assert result is True
        assert listener._running is True
    
    def test_listener_fetches_active_sessions_on_start(self, mock_supabase_client, mock_callbacks, mock_session_data):
        """Should fetch existing active sessions when starting"""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[mock_session_data],
            error=None
        )
        
        listener = MockSessionListener(
            mock_callbacks['on_start'],
            mock_callbacks['on_stop'],
            mock_supabase_client
        )
        
        listener.start()
        
        # Should have called on_session_start for existing active session
        mock_callbacks['on_start'].assert_called_once_with(mock_session_data)
    
    def test_listener_tracks_active_sessions(self, mock_supabase_client, mock_callbacks, mock_session_data):
        """Should track active sessions in internal dict"""
        mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
            data=[mock_session_data],
            error=None
        )
        
        listener = MockSessionListener(
            mock_callbacks['on_start'],
            mock_callbacks['on_stop'],
            mock_supabase_client
        )
        
        listener.start()
        
        assert 'session-001' in listener.active_sessions
        assert listener.active_sessions['session-001']['plate_number'] == 'B 1234 ABC'


class TestSessionStartCallback:
    """TC-PYINT-002: On Session Start Callback"""
    
    def test_callback_fires_on_status_change_to_loading(self, mock_supabase_client, mock_callbacks, mock_session_data):
        """Callback should fire when status changes to 'loading'"""
        listener = MockSessionListener(
            mock_callbacks['on_start'],
            mock_callbacks['on_stop'],
            mock_supabase_client
        )
        listener.start()
        mock_callbacks['on_start'].reset_mock()  # Reset from initial fetch
        
        # Simulate realtime event
        payload = {
            'eventType': 'UPDATE',
            'new': mock_session_data,
            'old': {**mock_session_data, 'status': 'pending_dock'}
        }
        
        listener.handle_change(payload)
        
        mock_callbacks['on_start'].assert_called_once()
        call_args = mock_callbacks['on_start'].call_args[0][0]
        assert call_args['plate_number'] == 'B 1234 ABC'
    
    def test_callback_not_fired_if_already_loading(self, mock_supabase_client, mock_callbacks, mock_session_data):
        """Callback should NOT fire if status was already 'loading'"""
        listener = MockSessionListener(
            mock_callbacks['on_start'],
            mock_callbacks['on_stop'],
            mock_supabase_client
        )
        listener.start()
        mock_callbacks['on_start'].reset_mock()
        
        # Both old and new have status='loading'
        payload = {
            'eventType': 'UPDATE',
            'new': {**mock_session_data, 'loading_count': 5},
            'old': mock_session_data
        }
        
        listener.handle_change(payload)
        
        mock_callbacks['on_start'].assert_not_called()


class TestCountPush:
    """TC-PYINT-003: Count Push to Supabase"""
    
    def test_update_counts_calls_supabase(self, mock_supabase_client, mock_callbacks):
        """Should call Supabase update with correct values"""
        listener = MockSessionListener(
            mock_callbacks['on_start'],
            mock_callbacks['on_stop'],
            mock_supabase_client
        )
        
        listener.update_counts('session-001', 10, 5)
        
        mock_supabase_client.table.assert_called_with('loading_sessions')
        mock_supabase_client.table.return_value.update.assert_called_once()
        
        update_args = mock_supabase_client.table.return_value.update.call_args[0][0]
        assert update_args['loading_count'] == 10
        assert update_args['rehab_count'] == 5
    
    def test_log_event_inserts_to_loading_events(self, mock_supabase_client, mock_callbacks):
        """Should insert event log to loading_events table"""
        listener = MockSessionListener(
            mock_callbacks['on_start'],
            mock_callbacks['on_stop'],
            mock_supabase_client
        )
        
        listener.log_event('session-001', 'COUNT_UPDATE', {'loading': 10})
        
        # Verify insert was called on loading_events
        calls = mock_supabase_client.table.call_args_list
        assert any('loading_events' in str(call) for call in calls)


class TestSessionStopCallback:
    """TC-PYINT-004: On Session Stop Callback"""
    
    def test_callback_fires_on_status_change_from_loading(self, mock_supabase_client, mock_callbacks, mock_session_data):
        """Callback should fire when status changes FROM 'loading'"""
        listener = MockSessionListener(
            mock_callbacks['on_start'],
            mock_callbacks['on_stop'],
            mock_supabase_client
        )
        listener.start()
        
        # First, simulate start
        listener.active_sessions['session-001'] = mock_session_data
        
        # Then simulate stop
        payload = {
            'eventType': 'UPDATE',
            'new': {**mock_session_data, 'status': 'completed'},
            'old': mock_session_data
        }
        
        listener.handle_change(payload)
        
        mock_callbacks['on_stop'].assert_called_once_with('session-001')
    
    def test_session_removed_from_active_on_stop(self, mock_supabase_client, mock_callbacks, mock_session_data):
        """Session should be removed from active_sessions on stop"""
        listener = MockSessionListener(
            mock_callbacks['on_start'],
            mock_callbacks['on_stop'],
            mock_supabase_client
        )
        
        # Add to active
        listener.active_sessions['session-001'] = mock_session_data
        
        # Simulate stop
        payload = {
            'eventType': 'UPDATE',
            'new': {**mock_session_data, 'status': 'completed'},
            'old': mock_session_data
        }
        
        listener.handle_change(payload)
        
        assert 'session-001' not in listener.active_sessions


class TestErrorHandling:
    """Error handling scenarios"""
    
    def test_handles_empty_payload_gracefully(self, mock_supabase_client, mock_callbacks):
        """Should not crash on empty payload"""
        listener = MockSessionListener(
            mock_callbacks['on_start'],
            mock_callbacks['on_stop'],
            mock_supabase_client
        )
        
        # Should not raise
        listener.handle_change({})
        listener.handle_change({'eventType': 'UPDATE', 'new': {}, 'old': {}})
    
    def test_handles_missing_status_field(self, mock_supabase_client, mock_callbacks):
        """Should handle missing status field"""
        listener = MockSessionListener(
            mock_callbacks['on_start'],
            mock_callbacks['on_stop'],
            mock_supabase_client
        )
        
        payload = {
            'eventType': 'UPDATE',
            'new': {'id': 'session-001'},
            'old': {'id': 'session-001'}
        }
        
        # Should not raise
        listener.handle_change(payload)
        
        mock_callbacks['on_start'].assert_not_called()
        mock_callbacks['on_stop'].assert_not_called()


# =============================================================================
# INTEGRATION TESTS (require real Supabase - skip in unit test)
# =============================================================================

@pytest.mark.skip(reason="Requires real Supabase connection")
class TestRealSupabaseIntegration:
    """Integration tests with real Supabase - run separately"""
    
    def test_real_connection(self):
        """Test actual Supabase connection"""
        pass
    
    def test_real_realtime_subscription(self):
        """Test actual realtime subscription"""
        pass


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
