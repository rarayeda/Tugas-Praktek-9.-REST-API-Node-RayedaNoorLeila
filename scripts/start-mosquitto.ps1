$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$exe = Join-Path $env:ProgramFiles 'mosquitto\mosquitto.exe'
if (-not (Test-Path $exe)) { throw "Mosquitto belum ditemukan di $exe. Install Mosquitto Windows resmi dahulu." }
$portOpen = $false
$client = New-Object System.Net.Sockets.TcpClient
try {
  $connect = $client.BeginConnect('127.0.0.1', 1883, $null, $null)
  if ($connect.AsyncWaitHandle.WaitOne(900, $false)) {
    try { $client.EndConnect($connect); $portOpen = $true } catch { }
  }
} finally { $client.Close() }
if ($portOpen) {
  Write-Host 'Port 1883 SUDAH AKTIF: broker MQTT kemungkinan berjalan sebagai Windows Service.' -ForegroundColor Green
  Write-Host 'Tidak perlu menyalakan broker kedua. Lanjutkan 03-MULAI-NODERED.bat.'
  exit 0
}
Write-Host 'Menjalankan Mosquitto secara lokal pada 127.0.0.1:1883. Jangan tutup terminal ini.' -ForegroundColor Cyan
& $exe -c (Join-Path $root 'mosquitto\mosquitto-local.conf') -v
