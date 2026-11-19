@echo off
setlocal
cd /d "%~dp0"
echo ===================================================
echo   Starting Pixelmorphic AI Studio (Local Workspace)
echo ===================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js not found in PATH.
  echo Please install Node.js LTS from https://nodejs.org/
  pause
  exit /b 1
)
start "" "http://127.0.0.1:3000"
node --env-file=.env server.mjs
if errorlevel 1 pause
