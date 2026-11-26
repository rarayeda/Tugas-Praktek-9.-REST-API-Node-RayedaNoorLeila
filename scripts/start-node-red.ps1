$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$envfile = Join-Path $root '.env'
if (-not (Test-Path $envfile)) {
  Copy-Item (Join-Path $root '.env.example') $envfile
  throw 'File .env baru dibuat dari template. Buka file .env dan isi API key serta secret, lalu jalankan lagi.'
}
foreach ($line in Get-Content -LiteralPath $envfile) {
  if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
    $key=$Matches[1]; $value=$Matches[2].Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) { $value=$value.Substring(1,$value.Length-2) }
    [Environment]::SetEnvironmentVariable($key,$value,'Process')
  }
}
if (-not $env:IOT_API_KEY -or $env:IOT_API_KEY -match 'GANTI|ganti' -or -not $env:NODE_RED_CREDENTIAL_SECRET -or $env:NODE_RED_CREDENTIAL_SECRET -match 'GANTI|ganti') {
  throw 'Isi IOT_API_KEY dan NODE_RED_CREDENTIAL_SECRET dalam .env dengan nilai acak pribadi; jangan biarkan placeholder.'
}
if (-not (Get-Command node-red.cmd -ErrorAction SilentlyContinue)) { throw 'Node-RED belum terpasang. Jalankan 01-INSTAL-DEPENDENSI.bat dahulu.' }
if (-not (Test-Path (Join-Path $root 'node-red\node_modules\node-red-node-sqlite'))) { throw 'Node SQLite belum terpasang. Jalankan 01-INSTAL-DEPENDENSI.bat dahulu.' }
$userDir = Join-Path $root 'node-red'
$dbDir = Join-Path $userDir 'db'
New-Item -ItemType Directory -Force $dbDir | Out-Null
$env:IOT_SQLITE_PATH = Join-Path $dbDir 'iot.sqlite'
Write-Host 'Node-RED akan memakai data folder proyek dan SQLite lokal.' -ForegroundColor Cyan
Write-Host "Database: $env:IOT_SQLITE_PATH"
Write-Host 'Editor: http://localhost:1880/red/'
Write-Host 'Dashboard: http://localhost:1880/dashboard/'
Write-Host 'Tunggu sampai muncul Server now running dan semua flow mulai. Jangan tutup terminal ini.'
& node-red.cmd --userDir $userDir --settings (Join-Path $userDir 'settings.js')
