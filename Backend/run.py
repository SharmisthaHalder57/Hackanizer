"""
run.py — Start both FastAPI and Flask servers simultaneously
Usage: python Backend/run.py
"""
import os
import sys
import subprocess
import threading
import time
from pathlib import Path

# Ensure we're running from the Backend directory
BACKEND_DIR = Path(__file__).parent
PROJECT_ROOT = BACKEND_DIR.parent
os.chdir(BACKEND_DIR)

# Add Backend to Python path
sys.path.insert(0, str(BACKEND_DIR))

# Use the virtual environment's Python interpreter if it exists
VENV_PYTHON = PROJECT_ROOT / ".venv" / ("Scripts" if os.name == "nt" else "bin") / ("python.exe" if os.name == "nt" else "python")
PYTHON_EXECUTABLE = str(VENV_PYTHON) if VENV_PYTHON.exists() else sys.executable

from dotenv import load_dotenv
load_dotenv()

FASTAPI_PORT = os.getenv("FASTAPI_PORT", "8000")
FLASK_PORT   = os.getenv("FLASK_PORT",   "5000")


def run_fastapi():
    """Start FastAPI with uvicorn."""
    print(f"\n[FastAPI] Starting on http://localhost:{FASTAPI_PORT}")
    print(f"   Docs: http://localhost:{FASTAPI_PORT}/api/docs\n")
    print(f"   Using Python: {PYTHON_EXECUTABLE}\n")
    subprocess.run([
        PYTHON_EXECUTABLE, "-m", "uvicorn",
        "fastapi_app.main:app",
        "--host", "0.0.0.0",
        "--port", FASTAPI_PORT,
        "--reload",
    ], cwd=str(BACKEND_DIR))


def run_flask():
    """Start Flask gateway."""
    time.sleep(2)  # Give FastAPI a moment to start first
    print(f"\n[Flask] Starting Gateway on http://localhost:{FLASK_PORT}")
    print(f"   Proxying /api/* -> http://localhost:{FASTAPI_PORT}/api/*\n")
    print(f"   Using Python: {PYTHON_EXECUTABLE}\n")
    subprocess.run([
        PYTHON_EXECUTABLE, "-m", "flask",
        "--app", "flask_gateway.app",
        "run",
        "--host", "0.0.0.0",
        "--port", FLASK_PORT,
    ], cwd=str(BACKEND_DIR), env={**os.environ, "FLASK_ENV": "development"})


if __name__ == "__main__":
    print("=" * 60)
    print("  HackAnizer Backend")
    print("=" * 60)
    print(f"  FastAPI  -> http://localhost:{FASTAPI_PORT}/api/docs")
    print(f"  Flask    -> http://localhost:{FLASK_PORT}")
    print(f"  Vite proxy should point to -> http://localhost:{FLASK_PORT}")
    print("=" * 60)
    print()

    # Run both in threads so they can be stopped together with Ctrl+C
    fastapi_thread = threading.Thread(target=run_fastapi, daemon=True)
    flask_thread   = threading.Thread(target=run_flask,   daemon=True)

    fastapi_thread.start()
    flask_thread.start()

    try:
        fastapi_thread.join()
    except KeyboardInterrupt:
        print("\n\n👋 Shutting down both servers...")
        sys.exit(0)
