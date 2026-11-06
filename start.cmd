@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 or newer is required. Install Node.js, then reopen this window.
  pause
  exit /b 1
)
set NODE_ENV=production
node scripts/launch.mjs start
set "ARCADE_EXIT=%ERRORLEVEL%"
echo Server exited. Code: %ARCADE_EXIT%
pause
exit /b %ARCADE_EXIT%
