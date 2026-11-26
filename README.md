# Tugas Praktikum 9 - REST API Node-RED 

**Mata kuliah:** Pemrograman Internet of Things (SIF1502)  
**Nama:** Rayeda Noor Leila 
**NIM:** 2410010369
**Kelas:** %D TI Reguler Pagi Banjarmasin

Implementasi praktikum : **REST API Node-RED untuk Sistem IoT** (Bagian A-E) dan **REST API & Antarmuka Web IoT** (Pertemuan 9). Aplikasi dijalankan Mosquitto MQTT, Node-RED sebagai backend, dan simulator ESP32 menggunakan Python. ESP32/DHT22 fisik tidak wajib karena modul mengizinkan simulasi.

## Komponen dan fitur

| Komponen | Realisasi |
|---|---|
| MQTT | Mosquitto pada `127.0.0.1:1883` |
| Simulasi ESP32 | Python mengirim `iot/sensor` setiap ±3 detik, menerima `iot/kontrol` |
| Node-RED REST API | Endpoint `GET /api/suhu`, `GET /api/history`, `POST /api/kontrol` |
| Dashboard | HTML/CSS/JS di `http://localhost:1880/dashboard/` |
| Threshold + notifikasi | `PUT /api/threshold`, notifikasi saat suhu beralih dari normal ke melebihi batas |
| Grafik | Chart.js, diperbarui menggunakan WebSocket |
| API key | Header `X-API-Key` diperlukan untuk REST selain `/api/health` |
| WebSocket | `ws://localhost:1880/ws/sensor` dengan autentikasi pesan pertama |
| SQLite | File `node-red/db/iot.sqlite`, menyimpan readings, settings, alerts |

**Penting:** Kode ini telah diperiksa secara statis, tetapi keberhasilan saat dijalankan di laptop Anda wajib dibuktikan melalui pengujian. Jangan mengklaim fitur berhasil sebelum diuji.

## Petunjuk lengkap

Baca **[Panduan Windows Tanpa Docker](docs/PANDUAN_TANPA_DOCKER_WINDOWS.md)**. Ringkasan:

1. Instal **Node.js LTS**, **Python 3**, dan **Mosquitto untuk Windows** dari situs resmi.
2. Ekstrak ZIP, buka folder proyek.
3. Jalankan `01-INSTAL-DEPENDENSI.bat` (memasang Node-RED, node SQLite, dan Paho MQTT).
4. Salin `.env.example` menjadi `.env`, isi dua nilai rahasia (bukan placeholder).
5. Jalankan `02-MULAI-MOSQUITTO.bat`, atau jika service Mosquitto sudah mendengarkan di port 1883, lewati.
6. Jalankan `03-MULAI-NODERED.bat`. Biarkan jendelanya terbuka.
7. Setelah Node-RED aktif, jalankan `04-MULAI-SIMULATOR.bat`. Biarkan jendelanya terbuka.
8. Buka http://localhost:1880/dashboard/, masukkan nilai `IOT_API_KEY`, klik **Hubungkan**.
9. Buka http://localhost:1880/red/ untuk meninjau flow.

Tidak perlu `docker compose`, tidak perlu import flow secara manual jika launcher berhasil membaca `node-red/flows.json`. **Jangan menjalankan perintah `node-red` sendirian** untuk paket ini, karena launcher menyiapkan environment API key dan path SQLite.

## Endpoint utama

Semua alamat di bawah dimulai dengan `http://localhost:1880`.

| Metode | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/health` | Cek Node-RED tanpa API key |
| GET | `/api/suhu` | Sensor terakhir |
| GET | `/api/history` | 50 readings dari SQLite |
| GET | `/api/threshold` | Batas suhu tersimpan |
| PUT | `/api/threshold` | `{ "threshold": 30 }` |
| POST | `/api/kontrol` | `{ "device": "lamp", "action": "on" }` / `off` |
| GET | `/api/status` | Status lampu |
| GET | `/api/alerts` | 20 alert terakhir |

Contoh menguji REST API di PowerShell pada folder proyek:

```powershell
$key = (Get-Content .env | Where-Object { $_ -match '^IOT_API_KEY=' }) -replace '^IOT_API_KEY=', ''
Invoke-RestMethod 'http://localhost:1880/api/suhu' -Headers @{ 'X-API-Key' = $key }
Invoke-RestMethod 'http://localhost:1880/api/history' -Headers @{ 'X-API-Key' = $key }
Invoke-RestMethod 'http://localhost:1880/api/threshold' -Method Put -Headers @{ 'X-API-Key' = $key } -ContentType 'application/json' -Body '{"threshold":30}'
Invoke-RestMethod 'http://localhost:1880/api/kontrol' -Method Post -Headers @{ 'X-API-Key' = $key } -ContentType 'application/json' -Body '{"device":"lamp","action":"on"}'
py -3 scripts/smoke_test.py --key $key
```

Script smoke test memakai Python standard library, tidak perlu package tambahan. Hasil yang diharapkan: `SEMUA SMOKE TEST LULUS.` Jika tidak muncul, catat pesan kesalahan dan perbaiki dulu.

## Tes notifikasi dengan nilai tertentu

Hentikan sementara simulator otomatis (Ctrl+C di jendela simulator), kemudian dari PowerShell folder proyek jalankan:

```powershell
py -3 simulator/simulasi_esp32.py --once --suhu 25 --kelembaban 65
py -3 simulator/simulasi_esp32.py --once --suhu 36 --kelembaban 65
```

Pastikan threshold = 30 °C, kemudian lihat dashboard dan `/api/alerts`. Start `04-MULAI-SIMULATOR.bat` lagi setelah pengujian. Nilai dikirim ke Mosquitto yang sedang berjalan pada komputer lokal.

## Struktur proyek

```text
01-INSTAL-DEPENDENSI.bat
02-MULAI-MOSQUITTO.bat
03-MULAI-NODERED.bat
04-MULAI-SIMULATOR.bat
.env.example               <-- disalin ke .env (rahasia lokal)
mosquitto/mosquitto-local.conf
node-red/flows.json        <-- 57 node; MQTT, REST, SQLite, WS
node-red/settings.js       <-- UI /red, dashboard /dashboard, API key
node-red/package.json      <-- node-red-node-sqlite
node-red/public/           <-- dashboard
node-red/db/               <-- SQLite dibuat ketika berjalan
simulator/simulasi_esp32.py
scripts/                   <-- launchers dan test
scripts/smoke_test.py
docs/LAPORAN_PRAKTIKUM.md
docs/PANDUAN_TANPA_DOCKER_WINDOWS.md
```

## Catatan penggunaan dan keamanan

- `node-red/settings.js` mengikat Node-RED hanya ke `127.0.0.1` untuk praktikum lokal. Dashboard di komputer lain tidak dapat diakses tanpa konfigurasi tambahan.
- Broker lokal menggunakan koneksi anonim untuk demonstrasi **lokal saja**; jangan expose port 1883 ke internet.
- File `.env` dan `node-red/db/iot.sqlite` **tidak boleh** diunggah ke repository publik.
- Jika Windows menjalankan **Mosquitto Service** pada port 1883, jangan menyalakan `mosquitto.exe` kedua di port yang sama.
- Jika node SQLite gagal dipasang di Windows, lihat error `npm` dan dokumentasi [node-red-node-sqlite](https://flows.nodered.org/node/node-red-node-sqlite). Komponen SQLite mengandung modul native dan terkadang membutuhkan build tools. Jangan menganggap install berhasil jika `npm install` gagal.
- Grafik Chart.js diambil dari CDN; browser membutuhkan internet saat pertama memuat script chart.
- `Ctrl+C` pada terminal Node-RED/simulator menghentikan proses. Database SQLite tetap ada di folder `node-red/db`.

