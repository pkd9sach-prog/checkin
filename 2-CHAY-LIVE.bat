@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Chua cai Node.js. Tai ban LTS tai https://nodejs.org roi chay lai file nay.
  pause
  exit /b
)
if not exist node_modules (
  echo Dang cai thu vien lan dau, doi vai chuc giay...
  call npm install
)
set /p U=Nhap ten TikTok dang live (khong co dau @): 
start "" cmd /c "timeout /t 4 >nul & start http://localhost:8080"
node server.js %U%
pause
