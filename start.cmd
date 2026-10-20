@echo off
cd /d "%~dp0"
set NODE_ENV=production
node scripts/launch.mjs start
pause
