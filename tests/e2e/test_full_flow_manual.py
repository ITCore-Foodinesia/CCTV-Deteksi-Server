"""
Manual E2E Test Script: Full Loading Session Flow

This script simulates the full flow:
1. Create session via Supabase (simulating Flutter app)
2. Verify detection engine trigger (mock)
3. Simulate counting updates
4. Complete session
5. Verify final state

Run: python tests/e2e/test_full_flow_manual.py

Note: This is a manual test script, not automated pytest.
Use for verification during development.
"""

import os
import sys
import time
import json
from datetime import datetime
from typing import Optional
from dataclasses import dataclass

# =============================================================================
# CONFIGURATION
# =============================================================================

# Toggle between mock and real Supabase
USE_MOCK = True  # Set to False to test against real Supabase

# If using real Supabase, set these:
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://jqwitfnkdxomeeblhuqd.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_KEY', '')

# Test tenant (create this in your DB first)
TEST_TENANT_ID = 'test-tenant-001'

# =============================================================================
# TEST DATA
# =============================================================================

@dataclass
class TestSession:
    id: str
    driver_id: str
    truck_id: str
    dock_id: Optional[str]
    plate_number: str
    status: str
    loading_count: int = 0
    rehab_count: int = 0

TEST_DATA = {
    'driver_id': 'driver-test-001',
    'truck_id': 'truck-test-001',
    'dock_id': 'dock-test-001',
    'plate_number': 'TEST 1234 E2E',
}

# =============================================================================
# MOCK SUPABASE (for offline testing)
# =============================================================================

class MockSupabase:
    """Simple mock for testing without real Supabase"""
    
    def __init__(self):
        self.sessions = {}
        self.events = []
        self.listeners = []
    
    def insert_session(self, data):
        session_id = f"session-{datetime.now().timestamp()}"
        session = {
            'id': session_id,
            **data,
            'created_at': datetime.now().isoformat()
        }
        self.sessions[session_id] = session
        self._notify('INSERT', session, {})
        return session
    
    def update_session(self, session_id, updates):
        if session_id not in self.sessions:
            raise ValueError(f"Session {session_id} not found")
        
        old = dict(self.sessions[session_id])
        self.sessions[session_id].update(updates)
        self.sessions[session_id]['updated_at'] = datetime.now().isoformat()
        self._notify('UPDATE', self.sessions[session_id], old)
        return self.sessions[session_id]
    
    def get_session(self, session_id):
        return self.sessions.get(session_id)
    
    def add_listener(self, callback):
        self.listeners.append(callback)
    
    def _notify(self, event_type, new, old):
        for listener in self.listeners:
            listener({
                'eventType': event_type,
                'new': new,
                'old': old
            })

# =============================================================================
# REAL SUPABASE CLIENT
# =============================================================================

def get_real_supabase():
    """Get real Supabase client"""
    try:
        from supabase import create_client
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    except ImportError:
        print("ERROR: supabase-py not installed. Run: pip install supabase")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Failed to create Supabase client: {e}")
        sys.exit(1)

# =============================================================================
# TEST STEPS
# =============================================================================

class E2ETestRunner:
    """Runs the full E2E test flow"""
    
    def __init__(self, use_mock=True):
        self.use_mock = use_mock
        if use_mock:
            self.supabase = MockSupabase()
        else:
            self.supabase = get_real_supabase()
        
        self.session_id = None
        self.results = []
    
    def log(self, step, message, status='INFO'):
        timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
        emoji = {'PASS': '✅', 'FAIL': '❌', 'INFO': 'ℹ️', 'WAIT': '⏳'}
        print(f"[{timestamp}] {emoji.get(status, '•')} [{step}] {message}")
        self.results.append({
            'step': step,
            'message': message,
            'status': status,
            'time': timestamp
        })
    
    def step_1_create_session(self):
        """Step 1: Create loading session (simulating Flutter app)"""
        self.log('STEP 1', 'Creating loading session...')
        
        try:
            session_data = {
                'driver_id': TEST_DATA['driver_id'],
                'truck_id': TEST_DATA['truck_id'],
                'dock_id': TEST_DATA['dock_id'],
                'plate_number': TEST_DATA['plate_number'],
                'status': 'pending_dock',
                'loading_count': 0,
                'rehab_count': 0,
                'counting_active': False,
                'tenant_id': TEST_TENANT_ID,
            }
            
            if self.use_mock:
                result = self.supabase.insert_session(session_data)
                self.session_id = result['id']
            else:
                result = self.supabase.table('loading_sessions').insert(session_data).execute()
                self.session_id = result.data[0]['id']
            
            self.log('STEP 1', f'Session created: {self.session_id}', 'PASS')
            return True
        except Exception as e:
            self.log('STEP 1', f'Failed to create session: {e}', 'FAIL')
            return False
    
    def step_2_start_loading(self):
        """Step 2: Update status to 'loading' (triggers detection)"""
        self.log('STEP 2', 'Starting loading (status → loading)...')
        
        try:
            updates = {
                'status': 'loading',
                'counting_active': True,
                'started_at': datetime.now().isoformat()
            }
            
            if self.use_mock:
                result = self.supabase.update_session(self.session_id, updates)
            else:
                result = self.supabase.table('loading_sessions').update(updates).eq('id', self.session_id).execute()
            
            self.log('STEP 2', 'Status updated to loading', 'PASS')
            
            # Give time for realtime to propagate
            self.log('STEP 2', 'Waiting for realtime event...', 'WAIT')
            time.sleep(2)
            
            return True
        except Exception as e:
            self.log('STEP 2', f'Failed to start loading: {e}', 'FAIL')
            return False
    
    def step_3_simulate_counting(self, iterations=5):
        """Step 3: Simulate detection engine counting"""
        self.log('STEP 3', f'Simulating counting ({iterations} updates)...')
        
        loading_count = 0
        rehab_count = 0
        
        try:
            for i in range(iterations):
                loading_count += 3  # Simulate 3 items per cycle
                if i % 2 == 0:
                    rehab_count += 1  # Some rehab
                
                updates = {
                    'loading_count': loading_count,
                    'rehab_count': rehab_count
                }
                
                if self.use_mock:
                    self.supabase.update_session(self.session_id, updates)
                else:
                    self.supabase.table('loading_sessions').update(updates).eq('id', self.session_id).execute()
                
                self.log('STEP 3', f'Count update {i+1}: loading={loading_count}, rehab={rehab_count}', 'INFO')
                time.sleep(0.5)
            
            self.log('STEP 3', f'Counting complete: {loading_count} loaded, {rehab_count} rehab', 'PASS')
            return True
        except Exception as e:
            self.log('STEP 3', f'Failed during counting: {e}', 'FAIL')
            return False
    
    def step_4_verify_dashboard_sync(self):
        """Step 4: Verify data is accessible (simulating dashboard check)"""
        self.log('STEP 4', 'Verifying data sync...')
        
        try:
            if self.use_mock:
                session = self.supabase.get_session(self.session_id)
            else:
                result = self.supabase.table('loading_sessions').select('*').eq('id', self.session_id).single().execute()
                session = result.data
            
            if session:
                self.log('STEP 4', f'Session data: plate={session["plate_number"]}, loading={session["loading_count"]}, rehab={session["rehab_count"]}', 'PASS')
                return True
            else:
                self.log('STEP 4', 'Session not found', 'FAIL')
                return False
        except Exception as e:
            self.log('STEP 4', f'Failed to verify: {e}', 'FAIL')
            return False
    
    def step_5_complete_session(self):
        """Step 5: Complete the loading session"""
        self.log('STEP 5', 'Completing session...')
        
        try:
            updates = {
                'status': 'completed',
                'counting_active': False,
                'ended_at': datetime.now().isoformat()
            }
            
            if self.use_mock:
                result = self.supabase.update_session(self.session_id, updates)
            else:
                result = self.supabase.table('loading_sessions').update(updates).eq('id', self.session_id).execute()
            
            self.log('STEP 5', 'Session completed', 'PASS')
            return True
        except Exception as e:
            self.log('STEP 5', f'Failed to complete session: {e}', 'FAIL')
            return False
    
    def step_6_verify_final_state(self):
        """Step 6: Verify final session state"""
        self.log('STEP 6', 'Verifying final state...')
        
        try:
            if self.use_mock:
                session = self.supabase.get_session(self.session_id)
            else:
                result = self.supabase.table('loading_sessions').select('*').eq('id', self.session_id).single().execute()
                session = result.data
            
            checks = [
                ('status', session.get('status') == 'completed', session.get('status')),
                ('counting_active', session.get('counting_active') == False, session.get('counting_active')),
                ('loading_count', session.get('loading_count', 0) > 0, session.get('loading_count')),
                ('ended_at', session.get('ended_at') is not None, session.get('ended_at')),
            ]
            
            all_passed = True
            for check_name, passed, value in checks:
                status = 'PASS' if passed else 'FAIL'
                self.log('STEP 6', f'{check_name}: {value}', status)
                if not passed:
                    all_passed = False
            
            return all_passed
        except Exception as e:
            self.log('STEP 6', f'Failed to verify final state: {e}', 'FAIL')
            return False
    
    def cleanup(self):
        """Cleanup: Delete test session"""
        self.log('CLEANUP', 'Cleaning up test data...')
        
        try:
            if not self.use_mock and self.session_id:
                self.supabase.table('loading_sessions').delete().eq('id', self.session_id).execute()
                self.log('CLEANUP', 'Test session deleted', 'PASS')
        except Exception as e:
            self.log('CLEANUP', f'Failed to cleanup: {e}', 'FAIL')
    
    def run(self):
        """Run full E2E test"""
        print("\n" + "=" * 60)
        print("E2E TEST: Full Loading Session Flow")
        print("=" * 60)
        print(f"Mode: {'MOCK' if self.use_mock else 'REAL SUPABASE'}")
        print(f"Time: {datetime.now().isoformat()}")
        print("=" * 60 + "\n")
        
        steps = [
            self.step_1_create_session,
            self.step_2_start_loading,
            lambda: self.step_3_simulate_counting(5),
            self.step_4_verify_dashboard_sync,
            self.step_5_complete_session,
            self.step_6_verify_final_state,
        ]
        
        all_passed = True
        for step in steps:
            if not step():
                all_passed = False
                print("\n⚠️  Step failed. Stopping test.")
                break
            print()
        
        self.cleanup()
        
        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.results if r['status'] == 'PASS')
        failed = sum(1 for r in self.results if r['status'] == 'FAIL')
        
        print(f"Total Steps: {len(self.results)}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Result: {'✅ ALL PASSED' if all_passed else '❌ SOME FAILED'}")
        print("=" * 60 + "\n")
        
        return all_passed


# =============================================================================
# MAIN
# =============================================================================

if __name__ == '__main__':
    # Parse command line args
    use_mock = '--real' not in sys.argv
    
    if not use_mock and not SUPABASE_KEY:
        print("ERROR: Set SUPABASE_KEY environment variable for real tests")
        print("Or run with mock: python test_full_flow_manual.py")
        sys.exit(1)
    
    runner = E2ETestRunner(use_mock=use_mock)
    success = runner.run()
    
    sys.exit(0 if success else 1)
