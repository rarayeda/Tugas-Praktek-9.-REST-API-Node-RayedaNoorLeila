# Panduan Pemula Windows - Praktikum 9 Node-RED Tanpa Docker

Paket ini dibuat untuk menjalankan **proyek lama yang sudah disesuaikan** secara native di Windows. Semua perintah dapat dijalankan melalui PowerShell di folder proyek, kecuali menginstal aplikasi melalui installer masing-masing. **Tidak perlu Docker Desktop maupun WSL.**

## Langkah 0. Gunakan ZIP yang benar

Nama folder dari ZIP baru: `Tugas-Praktek-9-NodeRED-TANPA-DOCKER`. **Jangan campur file dari ZIP Docker sebelumnya.**

Anda bisa mengekstrak ke Downloads. Kemudian di File Explorer masuk ke folder proyek, klik address bar, ketik `powershell`, dan tekan Enter. Untuk contoh pengguna sebelumnya:

```powershell
cd "C:\Users\abint\Downloads\Tugas-Praktek-9-NodeRED-TANPA-DOCKER"
```

Pastikan `dir` menampilkan `01-INSTAL-DEPENDENSI.bat`, `02-MULAI-MOSQUITTO.bat`, `03-MULAI-NODERED.bat`, `04-MULAI-SIMULATOR.bat`.

## Langkah 1. Instal aplikasi Windows dari situs resmi

1. **Node.js LTS**: https://nodejs.org/en/download . Pilih installer Windows yang sesuai; gunakan Node.js 24.x LTS sesuai rekomendasi Node-RED saat panduan dibuat. Jalankan installer, kemudian buka terminal baru.
2. **Python 3**: https://www.python.org/downloads/windows/ . Instal untuk Windows; aktifkan penambahan PATH jika opsi itu ada.
3. **Mosquitto**: https://mosquitto.org/download/ . Pilih Windows x64 untuk sebagian besar laptop Intel/AMD, instal. Sebagian instalasi memasang **Windows service** yang mungkin otomatis menjalankan broker.
4. **Browser**: Microsoft Edge atau Chrome.

Cek di PowerShell baru:

```powershell
node --version
npm.cmd --version
py -3 --version
```

Jika `py` tidak dikenal, coba `python --version`. Jika `node` dan `npm` belum ditemukan, tutup PowerShell lama dan buka lagi setelah instalasi. Node-RED harus dipasang setelah Node.js tersedia.

## Langkah 2. Instal Node-RED dan dependency dari paket

Buka PowerShell di folder proyek. Jalankan:

```powershell
.\01-INSTAL-DEPENDENSI.bat
```

File ini menjalankan:

- `npm.cmd install -g node-red`
- `npm.cmd install --prefix .\node-red` (memasang node `node-red-node-sqlite` dari package.json)
- `py -3 -m pip install -r .\simulator\requirements.txt` (memasang `paho-mqtt`)

**Perhatikan tulisan error** di akhir. Jika pemasangan SQLite gagal, terutama pada proses `node-gyp` atau native binary, **jangan lanjut dahulu**. Kirim pesan error lengkapnya. Pada beberapa mesin Windows, komponen native SQLite mungkin memerlukan Visual Studio Build Tools dan Python.

Tes:

```powershell
node-red.cmd --version
py -3 -m pip show paho-mqtt
```

## Langkah 3. Buat `.env` dan isi rahasia

Di PowerShell folder proyek:

```powershell
Copy-Item .env.example .env
notepad .env
```

Jangan menjalankan `Copy-Item` bila `.env` sudah ada dan sudah diisi; cukup gunakan `notepad .env`.

Isi kedua nilai dengan pilihan Anda sendiri, jangan seperti teks template. Contoh format (jangan salin nilai ini mentah-mentah):

```env
IOT_API_KEY=contoh-saja-acak-28592
NODE_RED_CREDENTIAL_SECRET=contoh-secret-lain-yang-lebih-panjang-59283
```

Tekan Ctrl+S. **Jangan mengunggah file `.env` ke GitHub**. Dashboard nanti membutuhkan nilai `IOT_API_KEY` (setelah tanda sama dengan).

## Langkah 4. Nyalakan Mosquitto (jendela PowerShell #1)

Di PowerShell folder proyek:

```powershell
.\02-MULAI-MOSQUITTO.bat
```

Jika port 1883 **sudah aktif**, script akan menyatakan broker kemungkinan sudah berjalan sebagai Windows Service. Itu tidak masalah; jangan jalankan dua broker pada port yang sama.

Jika broker belum aktif, script akan menjalankan `mosquitto.exe` dengan file `mosquitto/mosquitto-local.conf` yang membatasi koneksi hanya ke localhost. Biarkan jendela ini tetap terbuka.

Untuk cek port 1883 dari PowerShell lain:

```powershell
Test-NetConnection 127.0.0.1 -Port 1883
```

Hasil yang diharapkan: `TcpTestSucceeded : True`. Jika false, periksa apakah Mosquitto sudah terinstal dan service atau terminal broker sedang aktif. Jangan mengubah port dan jangan membuka firewall publik tanpa kebutuhan.

## Langkah 5. Nyalakan Node-RED (PowerShell #2)

Buka **PowerShell baru** dari folder proyek yang sama. Jalankan:

```powershell
.\03-MULAI-NODERED.bat
```

Script akan:

1. Membaca nilai rahasia dari `.env` untuk proses Node-RED.
2. Membuat folder `node-red/db` jika belum ada.
3. Menyiapkan variabel `IOT_SQLITE_PATH` ke file `node-red/db/iot.sqlite` (lokasi Windows yang benar).
4. Menjalankan Node-RED dengan **user directory** `node-red` dan **settings** dari proyek.
5. Secara otomatis membuka flow `node-red/flows.json` (tidak perlu import ulang).

Tunggu sampai ada log seperti `Server now running at http://127.0.0.1:1880/`, `Starting flows`, dan **tidak ada node merah/error SQLite**. Biarkan terminal Node-RED tetap terbuka.

Buka:

- Editor flow: http://localhost:1880/red/
- Cek API: http://localhost:1880/api/health
- Dashboard: http://localhost:1880/dashboard/

**Jangan hanya menjalankan `node-red` dari folder lain**: perintah biasa akan memakai folder `~/.node-red`, bukan flow dan secret proyek ini. Launcher `03-MULAI-NODERED.bat` penting.

## Langkah 6. Jalankan simulator ESP32 (PowerShell #3)

Buka PowerShell ketiga dari folder proyek, jalankan:

```powershell
.\04-MULAI-SIMULATOR.bat
```

Hasil yang diharapkan:

```text
[MQTT] Terhubung 127.0.0.1:1883
[SENSOR] {"suhu":29.4,"kelembaban":71.2,...}
[SENSOR] {"suhu":30.1,"kelembaban":70.6,...}
```

Nilai contoh tidak harus sama. Simulator mengirim data kira-kira setiap 3 detik. Koneksi Mosquitto, Node-RED, dan simulator harus berjalan bersamaan.

## Langkah 7. Hubungkan dashboard

1. Buka http://localhost:1880/dashboard/.
2. Di panel **Koneksi API**, masukkan **nilai setelah `IOT_API_KEY=`** dari file `.env`.
3. Klik **Hubungkan**.
4. Jika benar, indikator menampilkan `WEBSOCKET LIVE`; data suhu, kelembaban, grafik, riwayat, status lampu, dan notifikasi akan diperbarui.
5. Jika grafik tidak terlihat tetapi data sensor muncul, cek internet karena Chart.js di-load dari CDN.

Jangan memasukkan `NODE_RED_CREDENTIAL_SECRET` ke kolom dashboard; itu bukan API key.

## Langkah 8. Uji fitur dan ambil screenshot bukti

**A. Data dan grafik.** Lihat suhu/kelembaban berubah, grafik dan tabel history bertambah. Screenshot `docs/bukti/01-dashboard.png`.

**B. Kontrol lampu.** Klik **Nyalakan** lalu **Matikan**. Di terminal simulator cari `[AKTUATOR] Lampu: ON` dan `OFF`. Screenshot `02-kontrol-lampu.png`.

**C. Threshold.** Isi batas `30`, klik **Simpan**. Screenshot nilai baru.

**D. Notifikasi.** Hentikan simulator otomatis dengan Ctrl+C pada terminal #3. Lalu di PowerShell baru jalankan:

```powershell
py -3 .\simulator\simulasi_esp32.py --once --suhu 25 --kelembaban 65
py -3 .\simulator\simulasi_esp32.py --once --suhu 36 --kelembaban 65
```

Dengan threshold 30, peralihan suhu normal 25 ke tinggi 36 memicu notifikasi. Screenshot `03-alert.png`, lalu mulai `04-MULAI-SIMULATOR.bat` lagi. Sensor uji hanya untuk tes, jangan mengaku berasal dari DHT22 fisik.

**E. Tes endpoint dan API key** dari PowerShell folder proyek:

```powershell
$key = (Get-Content .env | Where-Object { $_ -match '^IOT_API_KEY=' }) -replace '^IOT_API_KEY=', ''
Invoke-RestMethod http://localhost:1880/api/suhu -Headers @{ 'X-API-Key' = $key }
Invoke-RestMethod http://localhost:1880/api/history -Headers @{ 'X-API-Key' = $key }
Invoke-RestMethod http://localhost:1880/api/threshold -Method Put -Headers @{ 'X-API-Key' = $key } -ContentType 'application/json' -Body '{"threshold":30}'
```

Jika buka `http://localhost:1880/api/suhu` langsung tanpa header, harus ditolak `401 Unauthorized` (bukti autentikasi bekerja).

**F. Smoke test** (Python standar):

```powershell
py -3 .\scripts\smoke_test.py --key $key
```

Target: `SEMUA SMOKE TEST LULUS.` Screenshot `04-smoke-test.png`. Script ini **tidak** menggantikan screenshot pemeriksaan dashboard dan flow.

**G. SQLite persisten.** Hentikan Node-RED dengan Ctrl+C di terminal #2 lalu mulai lagi `03-MULAI-NODERED.bat`. Lihat `/api/history` masih berisi pembacaan lama dan threshold tetap tersimpan. Screenshot `05-history-sqlite.png`. Data disimpan di `node-red/db/iot.sqlite` (jangan diupload ke GitHub).

**H. Flow Node-RED.** Buka http://localhost:1880/red/, lihat tab **Praktikum 9 - IoT Full Stack**, ambil screenshot `06-flow-node-red.png`.

## Langkah 9. Lengkapi laporan dan unggah GitHub

1. Edit bagian nama, NIM, kelas di README dan `docs/LAPORAN_PRAKTIKUM.md`.
2. Isi hasil pengujian dengan kondisi nyata, serta sisipkan/simpan screenshot dalam `docs/bukti/`.
3. Buat repo GitHub **Public** bernama misalnya `tugas-praktek-9-rest-api-nodered`.
4. Upload source code: semua `.bat`, `node-red/flows.json`, `node-red/settings.js`, `node-red/public`, `node-red/package.json`, `simulator`, `mosquitto`, `scripts`, `README.md`, `docs`, `.env.example`.
5. **Jangan upload** `.env`, `node_modules`, file `.sqlite`, `.config.*`, dan kredensial internal.
6. Di Google Classroom, buka tugas > Tambahkan atau buat > Link > tempel URL GitHub > Tambahkan > **Serahkan**. Pastikan status Diserahkan.

## Jika ada error

| Gejala | Yang harus dicek |
|---|---|
| `node`/`npm` tidak dikenali | Install Node.js LTS dan buka PowerShell baru |
| `node-red.cmd` tidak dikenali | Jalankan `01-INSTAL-DEPENDENSI.bat` dan pastikan selesai tanpa error |
| `node-red-node-sqlite` tidak terpasang | Periksa error npm; native SQLite kadang perlu build tools |
| Port 1883 gagal dibuka | Mosquitto service mungkin aktif; tidak boleh ada dua broker |
| Port 1880 sudah dipakai | Hentikan Node-RED lain yang memakai 1880 |
| Dashboard dapat dibuka tapi kosong | Periksa `.env`, lalu Hubungkan, periksa sensor terminal |
| `401 X-API-Key` | Gunakan nilai IOT_API_KEY yang sama; untuk PowerShell kirim header |
| `SQLITE_CANTOPEN` | Cek folder `node-red/db` tersedia; gunakan launcher 03, jangan `node-red` biasa |
| MQTT `connection refused` | Pastikan broker 127.0.0.1:1883 berjalan |
| `WEBSOCKET LIVE` tidak muncul | Lihat log Node-RED, key, dan browser Console |
| Grafik Chart.js kosong | Cek internet/CDN Chart.js |

**Kesesuaian materi:** Modul dosen meminta Mosquitto (lokal), simulasi ESP32 menggunakan Python bila tidak ada hardware, Node-RED REST API, dashboard HTML/CSS/JS, dan pengujian end-to-end. Semua ini sesuai urutan langkah di sini. Penggunaan SQLite/WebSocket/API key adalah tambahan tugas pengembangan, bukan keharusan dalam alur dasar modul.
