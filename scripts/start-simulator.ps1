$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$script=Join-Path $root 'simulator\simulasi_esp32.py'
$env:MQTT_HOST='127.0.0.1'
$env:MQTT_PORT='1883'
Write-Host 'Simulator akan mengirim data ke Mosquitto lokal setiap 3 detik.' -ForegroundColor Cyan
if (Get-Command py.exe -ErrorAction SilentlyContinue) {
  & py.exe -3 -u $script
} elseif (Get-Command python.exe -ErrorAction SilentlyContinue) {
  & python.exe -u $script
} else { throw 'Python belum terpasang. Install Python 3 lalu jalankan 01-INSTAL-DEPENDENSI.bat.' }
