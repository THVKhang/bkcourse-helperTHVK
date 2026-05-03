"""
BKCourse Helper — Dev Launcher
Chạy cả Backend (FastAPI) + Frontend (Next.js) bằng 1 lệnh:
    python run.py
"""
import subprocess
import sys
import os
import signal
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT, "backend")
FRONTEND_DIR = os.path.join(ROOT, "frontend")

# Detect venv python
if sys.platform == "win32":
    VENV_PYTHON = os.path.join(BACKEND_DIR, "venv", "Scripts", "python.exe")
else:
    VENV_PYTHON = os.path.join(BACKEND_DIR, "venv", "bin", "python")

if not os.path.exists(VENV_PYTHON):
    print(f"❌ Không tìm thấy venv tại: {VENV_PYTHON}")
    print("   Hãy chạy: cd backend && python -m venv venv && venv\\Scripts\\pip install -r requirements.txt")
    sys.exit(1)

processes = []

def cleanup(*_):
    print("\n🛑 Đang dừng servers...")
    for p in processes:
        try:
            if sys.platform == "win32":
                subprocess.call(['taskkill', '/F', '/T', '/PID', str(p.pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                p.terminate()
        except Exception:
            pass
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)

if __name__ == "__main__":
    print()
    print("🎓 BKCourse Helper — Starting...")
    print("=" * 45)

    # Backend
    backend = subprocess.Popen(
        [VENV_PYTHON, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
        cwd=BACKEND_DIR,
    )
    processes.append(backend)
    print("✅ Backend  → http://localhost:8000")

    # Frontend
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=FRONTEND_DIR,
    )
    processes.append(frontend)
    print("✅ Frontend → http://localhost:3000")

    print("=" * 45)
    print("🌐 Mở http://localhost:3000 để bắt đầu!")
    print("   Nhấn Ctrl+C để dừng cả 2 server.")
    print()

    try:
        while True:
            # Check if either process died
            if backend.poll() is not None:
                print("⚠️  Backend đã dừng! Tự động khởi động lại sau 2s...")
                time.sleep(2)
                backend = subprocess.Popen(
                    [VENV_PYTHON, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
                    cwd=BACKEND_DIR,
                )
                processes[0] = backend

            if frontend.poll() is not None:
                print("⚠️  Frontend đã dừng! Tự động khởi động lại sau 2s...")
                time.sleep(2)
                frontend = subprocess.Popen(
                    [npm_cmd, "run", "dev"],
                    cwd=FRONTEND_DIR,
                )
                processes[1] = frontend
            
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        cleanup()
