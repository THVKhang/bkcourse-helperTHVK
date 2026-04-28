# BKCourse Helper — Dev Launcher
# Chạy cả Backend (FastAPI) + Frontend (Next.js) bằng 1 lệnh
# Usage: .\dev.ps1   hoặc   npm run dev (từ root)

Write-Host "`n🎓 BKCourse Helper — Starting..." -ForegroundColor Cyan

# Start Backend
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -PassThru
Write-Host "✅ Backend (port 8000) PID: $($backend.Id)" -ForegroundColor Green

# Start Frontend
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev" -PassThru
Write-Host "✅ Frontend (port 3000) PID: $($frontend.Id)" -ForegroundColor Green

Write-Host "`n🌐 Mở http://localhost:3000 để bắt đầu!" -ForegroundColor Yellow
Write-Host "Nhấn Ctrl+C rồi đóng 2 cửa sổ terminal để dừng.`n" -ForegroundColor DarkGray
