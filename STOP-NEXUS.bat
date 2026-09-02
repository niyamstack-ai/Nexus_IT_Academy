@echo off
title Nexus IT Academy - Stop Website
echo Stopping Nexus website...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /F /PID %%a 2>nul
echo Done. Website stopped.
pause
