#!/usr/bin/env python3
"""
Backend Server Launcher for Duplicate Image Remover
This script starts the Flask backend server that processes duplicate detection.
"""

import sys
import os

# Add the Backend directory to the path
backend_dir = os.path.join(os.path.dirname(__file__), 'Backend')
sys.path.insert(0, backend_dir)

# Import and run the server
from server import app

if __name__ == '__main__':
    print("=" * 60)
    print("  Duplicate Image Remover - Backend Server")
    print("=" * 60)
    print("\nServer starting on http://127.0.0.1:5000")
    print("Press Ctrl+C to stop the server\n")
    print("=" * 60)
    
    try:
        app.run(host='127.0.0.1', port=5000, debug=False)
    except KeyboardInterrupt:
        print("\n\nServer stopped by user")
        sys.exit(0)
