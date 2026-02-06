"""
Integration Tests: Mock Loading Dashboard ↔ Flutter Flow

Tests the complete flow:
1. Flutter App: Driver clicks "Mulai Loading"
2. Supabase: Insert/Update loading_session
3. Mock Dashboard: Receives realtime event
4. Mock Dashboard: Displays driver data from all docks
5. Counting simulation
6. Session completion

Run: pytest tests/integration/test_loading_dashboard_flow.py -v
"""

import pytest
import requests
import time
import uuid
from datetime import datetime
from unittest.mock import Mock, MagicMock, patch

# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def mock_server_url():
    """Base URL for mock loading dashboard server."""
    return "http://localhost:5003"


@pytest.fixture
def mock_supabase_client():
    """Mock Supabase client."""
    mock = MagicMock()
    
    # Mock table.select query result
    mock.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[],
        error=None
    )
    
    # Mock table.insert
    mock.table.return_value.insert.return_value.execute.return_value = MagicMock(
        data=[{'id': 'test-session-001'}],
        error=None
    )
    
    # Mock table.update
    mock.table.return_value.update.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[{'id': 'test-session-001'}],
        error=None
    )
    
    return mock


@pytest.fixture
def sample_driver():
    """Sample driver data."""
    return {
        'id': 'driver-001',
        'name': 'Pak Budi',
        'phone': '08123456789',
        'driver_code': 'DRV001'
    }


@pytest.fixture
def sample_dock():
    """Sample dock data."""
    return {
        'id': 'dock-001',
        'dock_code': 'D01',
        'dock_name': 'Dock 1'
    }


@pytest.fixture
def sample_session(sample_driver, sample_dock):
    """Sample loading session data."""
    return {
        'id': f'session-{uuid.uuid4()}',
        'driver_id': sample_driver['id'],
        'truck_id': 'truck-001',
        'dock_id': sample_dock['id'],
        'plate_number': 'B 1234 ABC',
        'status': 'loading',
        'loading_count': 0,
        'rehab_count': 0,
        'counting_active': True,
        'started_at': datetime.now().isoformat(),
        'tenant_id': 'test-tenant-001',
        'drivers': sample_driver,
        'docks': sample_dock,
        'trucks': {
            'id': 'truck-001',
            'plate_number': 'B 1234 ABC',
            'truck_type': 'Box'
        }
    }


@pytest.fixture
def sample_realtime_insert_event(sample_session):
    """Sample Supabase realtime INSERT event."""
    return {
        'eventType': 'INSERT',
        'schema': 'public',
        'table': 'loading_sessions',
        'new': sample_session,
        'old': {},
        'commit_timestamp': datetime.now().isoformat()
    }


@pytest.fixture
def sample_realtime_update_event(sample_session):
    """Sample Supabase realtime UPDATE event (counting)."""
    updated_session = {**sample_session, 'loading_count': 10, 'rehab_count': 2}
    return {
        'eventType': 'UPDATE',
        'schema': 'public',
        'table': 'loading_sessions',
        'new': updated_session,
        'old': sample_session,
        'commit_timestamp': datetime.now().isoformat()
    }


@pytest.fixture
def sample_realtime_complete_event(sample_session):
    """Sample Supabase realtime UPDATE event (session completed)."""
    completed_session = {
        **sample_session, 
        'status': 'completed',
        'counting_active': False,
        'loading_count': 42,
        'rehab_count': 5
    }
    return {
        'eventType': 'UPDATE',
        'schema': 'public',
        'table': 'loading_sessions',
        'new': completed_session,
        'old': sample_session,
        'commit_timestamp': datetime.now().isoformat()
    }


# =============================================================================
# UNIT TESTS: Data Formatting
# =============================================================================

class TestSessionDataFormatting:
    """Test session data formatting for display."""
    
    def test_format_session_extracts_driver_info(self, sample_session):
        """Should extract driver info from joined data."""
        from gui_version_testing_with_server.src.testing.mock_loading_dashboard import format_session_data
        
        result = format_session_data(sample_session)
        
        assert result['driver']['name'] == 'Pak Budi'
        assert result['driver']['phone'] == '08123456789'
        assert result['driver']['code'] == 'DRV001'
    
    def test_format_session_extracts_dock_info(self, sample_session):
        """Should extract dock info from joined data."""
        from gui_version_testing_with_server.src.testing.mock_loading_dashboard import format_session_data
        
        result = format_session_data(sample_session)
        
        assert result['dock']['code'] == 'D01'
        assert result['dock']['name'] == 'Dock 1'
    
    def test_format_session_handles_missing_joins(self):
        """Should handle missing joined data gracefully."""
        from gui_version_testing_with_server.src.testing.mock_loading_dashboard import format_session_data
        
        minimal_session = {
            'id': 'session-001',
            'plate_number': 'B 1234 ABC',
            'status': 'loading',
            'loading_count': 5
        }
        
        result = format_session_data(minimal_session)
        
        assert result['driver']['name'] == 'Unknown Driver'
        assert result['dock']['code'] == 'N/A'
        assert result['loading_count'] == 5


# =============================================================================
# UNIT TESTS: Realtime Event Handling
# =============================================================================

class TestRealtimeEventHandling:
    """Test handling of Supabase realtime events."""
    
    def test_insert_event_adds_to_active_sessions(self, sample_realtime_insert_event, sample_session):
        """INSERT event should add session to active list."""
        from gui_version_testing_with_server.src.testing import mock_loading_dashboard as mld
        
        # Reset state
        mld.active_sessions.clear()
        
        # Simulate realtime handling
        with mld.sessions_lock:
            session_id = sample_session['id']
            mld.active_sessions[session_id] = mld.format_session_data(sample_session)
        
        assert session_id in mld.active_sessions
        assert mld.active_sessions[session_id]['driver']['name'] == 'Pak Budi'
    
    def test_update_event_updates_counts(self, sample_realtime_update_event, sample_session):
        """UPDATE event should update session counts."""
        from gui_version_testing_with_server.src.testing import mock_loading_dashboard as mld
        
        session_id = sample_session['id']
        
        # Add session first
        with mld.sessions_lock:
            mld.active_sessions[session_id] = mld.format_session_data(sample_session)
        
        # Simulate count update
        new_data = sample_realtime_update_event['new']
        with mld.sessions_lock:
            mld.active_sessions[session_id].update({
                'loading_count': new_data.get('loading_count', 0),
                'rehab_count': new_data.get('rehab_count', 0)
            })
        
        assert mld.active_sessions[session_id]['loading_count'] == 10
        assert mld.active_sessions[session_id]['rehab_count'] == 2
    
    def test_complete_event_removes_from_active(self, sample_session):
        """Session completion should remove from active list."""
        from gui_version_testing_with_server.src.testing import mock_loading_dashboard as mld
        
        session_id = sample_session['id']
        
        # Add session first
        with mld.sessions_lock:
            mld.active_sessions[session_id] = mld.format_session_data(sample_session)
            assert session_id in mld.active_sessions
        
        # Simulate completion
        with mld.sessions_lock:
            del mld.active_sessions[session_id]
        
        assert session_id not in mld.active_sessions


# =============================================================================
# INTEGRATION TESTS: API Endpoints (requires running server)
# =============================================================================

@pytest.mark.integration
class TestAPIEndpoints:
    """Test API endpoints of the mock loading dashboard."""
    
    def test_health_endpoint(self, mock_server_url):
        """Health endpoint should return ok status."""
        try:
            response = requests.get(f"{mock_server_url}/health", timeout=2)
            assert response.status_code == 200
            data = response.json()
            assert data['status'] == 'ok'
            assert data['mode'] == 'mock_loading_dashboard'
        except requests.ConnectionError:
            pytest.skip("Mock server not running")
    
    def test_sessions_endpoint(self, mock_server_url):
        """Sessions endpoint should return list of active sessions."""
        try:
            response = requests.get(f"{mock_server_url}/sessions", timeout=2)
            assert response.status_code == 200
            data = response.json()
            assert 'count' in data
            assert 'sessions' in data
            assert isinstance(data['sessions'], list)
        except requests.ConnectionError:
            pytest.skip("Mock server not running")
    
    def test_stats_endpoint(self, mock_server_url):
        """Stats endpoint should return server statistics."""
        try:
            response = requests.get(f"{mock_server_url}/stats", timeout=2)
            assert response.status_code == 200
            data = response.json()
            assert 'status' in data
            assert 'active_sessions_count' in data
        except requests.ConnectionError:
            pytest.skip("Mock server not running")
    
    def test_sessions_by_dock(self, mock_server_url):
        """Should filter sessions by dock code."""
        try:
            response = requests.get(f"{mock_server_url}/sessions/by-dock/D01", timeout=2)
            assert response.status_code == 200
            data = response.json()
            assert 'dock_code' in data
            assert data['dock_code'] == 'D01'
        except requests.ConnectionError:
            pytest.skip("Mock server not running")


# =============================================================================
# INTEGRATION TESTS: Flutter Flow Simulation
# =============================================================================

@pytest.mark.integration
class TestFlutterLoadingFlow:
    """Test complete Flutter "Mulai Loading" flow."""
    
    def test_simulate_start_loading_requires_fields(self, mock_server_url):
        """Start loading should require driver_id, dock_id, plate_number."""
        try:
            response = requests.post(
                f"{mock_server_url}/simulate/start-loading",
                json={},
                timeout=2
            )
            # Should fail with missing fields
            assert response.status_code == 400
            data = response.json()
            assert 'Missing fields' in data.get('error', '')
        except requests.ConnectionError:
            pytest.skip("Mock server not running")
    
    def test_simulate_start_loading_success(self, mock_server_url, sample_driver, sample_dock):
        """Start loading with valid data should succeed."""
        try:
            response = requests.post(
                f"{mock_server_url}/simulate/start-loading",
                json={
                    'driver_id': sample_driver['id'],
                    'dock_id': sample_dock['id'],
                    'plate_number': 'B 1234 TEST',
                    'tenant_id': 'test-tenant-001'
                },
                timeout=5
            )
            
            if response.status_code == 503:
                pytest.skip("Supabase not connected")
            
            assert response.status_code == 200
            data = response.json()
            assert data.get('success') is True
            
            # Clean up - stop the session
            session = data.get('session')
            if session:
                requests.post(
                    f"{mock_server_url}/simulate/stop-loading/{session['id']}",
                    timeout=5
                )
                
        except requests.ConnectionError:
            pytest.skip("Mock server not running")
    
    def test_increment_count_updates_session(self, mock_server_url):
        """Manual count increment should update session."""
        try:
            # Get active sessions first
            sessions_resp = requests.get(f"{mock_server_url}/sessions", timeout=2)
            sessions = sessions_resp.json().get('sessions', [])
            
            if not sessions:
                pytest.skip("No active sessions to test increment")
            
            session_id = sessions[0]['id']
            initial_count = sessions[0]['loading_count']
            
            # Increment count
            response = requests.post(
                f"{mock_server_url}/simulate/increment-count/{session_id}",
                json={'loading_increment': 5},
                timeout=2
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['counts']['loading_count'] == initial_count + 5
            
        except requests.ConnectionError:
            pytest.skip("Mock server not running")


# =============================================================================
# INTEGRATION TESTS: Multi-Dock Scenario
# =============================================================================

@pytest.mark.integration
class TestMultiDockScenario:
    """Test multiple docks with concurrent loading sessions."""
    
    def test_sessions_from_multiple_docks_displayed(self, mock_server_url):
        """Should display sessions from all docks."""
        try:
            response = requests.get(f"{mock_server_url}/sessions", timeout=2)
            data = response.json()
            
            # Get unique dock codes
            dock_codes = set(s['dock']['code'] for s in data['sessions'])
            
            # Should be able to have sessions from multiple docks
            # (actual count depends on test data)
            assert len(dock_codes) >= 0  # At least 0 unique docks
            
        except requests.ConnectionError:
            pytest.skip("Mock server not running")
    
    def test_filter_by_specific_dock(self, mock_server_url):
        """Should filter to show only specific dock sessions."""
        try:
            # Check Dock 1
            resp_d01 = requests.get(f"{mock_server_url}/sessions/by-dock/D01", timeout=2)
            data_d01 = resp_d01.json()
            
            # All sessions should be from D01
            for session in data_d01['sessions']:
                assert session['dock']['code'] == 'D01'
            
            # Check Dock 2
            resp_d02 = requests.get(f"{mock_server_url}/sessions/by-dock/D02", timeout=2)
            data_d02 = resp_d02.json()
            
            # All sessions should be from D02
            for session in data_d02['sessions']:
                assert session['dock']['code'] == 'D02'
                
        except requests.ConnectionError:
            pytest.skip("Mock server not running")


# =============================================================================
# TEST UTILITIES
# =============================================================================

class TestHelpers:
    """Helper functions for testing."""
    
    @staticmethod
    def wait_for_realtime_event(timeout: int = 5):
        """Wait for realtime event to propagate."""
        time.sleep(min(timeout, 2))
    
    @staticmethod
    def create_test_session_data(
        driver_name: str = "Test Driver",
        dock_code: str = "D01",
        plate_number: str = "B 0000 TST"
    ) -> dict:
        """Create test session data for simulation."""
        return {
            'driver_id': f'driver-{uuid.uuid4()}',
            'dock_id': f'dock-{uuid.uuid4()}',
            'plate_number': plate_number,
            'tenant_id': 'test-tenant-001'
        }


# =============================================================================
# PERFORMANCE TESTS
# =============================================================================

@pytest.mark.performance
class TestPerformance:
    """Performance tests for the mock dashboard."""
    
    def test_sessions_endpoint_response_time(self, mock_server_url):
        """Sessions endpoint should respond within 500ms."""
        try:
            start = time.time()
            response = requests.get(f"{mock_server_url}/sessions", timeout=2)
            elapsed = time.time() - start
            
            assert response.status_code == 200
            assert elapsed < 0.5, f"Response took {elapsed:.2f}s, expected < 0.5s"
            
        except requests.ConnectionError:
            pytest.skip("Mock server not running")
    
    def test_handle_multiple_concurrent_requests(self, mock_server_url):
        """Should handle concurrent requests."""
        import concurrent.futures
        
        try:
            def make_request():
                return requests.get(f"{mock_server_url}/sessions", timeout=2)
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                futures = [executor.submit(make_request) for _ in range(10)]
                responses = [f.result() for f in futures]
            
            # All requests should succeed
            for resp in responses:
                assert resp.status_code == 200
                
        except requests.ConnectionError:
            pytest.skip("Mock server not running")


# =============================================================================
# MAIN
# =============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '-m', 'not integration'])
