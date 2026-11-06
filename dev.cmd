@echo off
setlocal
cd /d "%~dp0"
node scripts/launch.mjs dev
set "ARCADE_EXIT=%ERRORLEVEL%"
pause
exit /b %ARCADE_EXIT%
