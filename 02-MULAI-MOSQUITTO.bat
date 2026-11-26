@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-mosquitto.ps1"
if errorlevel 1 (
  echo.
  echo TERJADI ERROR. Screenshot pesan merah di atas untuk diperiksa.
  pause
)
