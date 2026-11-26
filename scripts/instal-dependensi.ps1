$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Write-Host '=== PERSIAPAN PRAKTIKUM 9 TANPA DOCKER ===' -ForegroundColor Cyan
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { throw 'Node.js belum ada. Install Node.js LTS dari https://nodejs.org lalu buka terminal baru.' }
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'npm belum dikenali. Install ulang Node.js LTS, buka terminal baru.' }
Write-Host 'Versi Node.js:'
& node.exe --version
Write-Host 'Memasang Node-RED secara global...'
& npm.cmd install -g node-red
if ($LASTEXITCODE -ne 0) { throw 'npm install -g node-red gagal. Kirim screenshot outputnya.' }
Write-Host 'Memasang node SQLite ke folder proyek node-red...'
& npm.cmd install --prefix (Join-Path $root 'node-red')
if ($LASTEXITCODE -ne 0) { throw 'Pemasangan SQLite gagal. Ini mungkin butuh build tools; kirim output error npm.' }
if (Get-Command py.exe -ErrorAction SilentlyContinue) {
  & py.exe -3 -m pip install -r (Join-Path $root 'simulator\requirements.txt')
} elseif (Get-Command python.exe -ErrorAction SilentlyContinue) {
  & python.exe -m pip install -r (Join-Path $root 'simulator\requirements.txt')
} else {
  throw 'Python 3 belum ada. Install dari https://python.org/downloads/windows/ lalu jalankan file ini lagi.'
}
if ($LASTEXITCODE -ne 0) { throw 'Install paho-mqtt gagal. Kirim screenshot hasilnya.' }
Write-Host 'SELESAI. Berikutnya hidupkan Mosquitto, Node-RED, dan simulator.' -ForegroundColor Green
