@echo off
title Nexus - Go Live on Server
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0GO-LIVE.ps1"
