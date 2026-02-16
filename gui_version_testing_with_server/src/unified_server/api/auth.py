import hmac
from functools import wraps
from flask import request, jsonify, current_app

def require_auth(f):
    """
    Decorator to require API key authentication.
    
    Checks for key in:
    1. 'x-api-key' HTTP header
    2. 'auth' or 'key' query parameter
    
    If SERVER_AUTH_KEY is not set in config, authentication is disabled (open access).
    Uses hmac.compare_digest for timing-safe comparison (Fixes F-05).
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # Get config from app context
        app_context = getattr(current_app, 'app_context_data', {})
        config = app_context.get('config')
        
        # If no auth key is set in config/env, allow access (open mode)
        if not config or not config.auth_key:
            return f(*args, **kwargs)
            
        required_key = config.auth_key
        
        def is_valid(provided_key):
            if not provided_key:
                return False
            return hmac.compare_digest(provided_key, required_key)
        
        # 1. Check Header (Preferred for API/Code)
        if is_valid(request.headers.get('x-api-key')):
            return f(*args, **kwargs)
            
        # 2. Check Query Parameter (Preferred for Browser/Video/<img> tags)
        if is_valid(request.args.get('auth')) or is_valid(request.args.get('key')):
            return f(*args, **kwargs)
            
        # Auth failed
        return jsonify({
            'status': 'error',
            'message': 'Unauthorized', 
            'detail': 'Invalid or missing API key. Use x-api-key header or ?auth= query parameter.'
        }), 401
        
    return decorated
