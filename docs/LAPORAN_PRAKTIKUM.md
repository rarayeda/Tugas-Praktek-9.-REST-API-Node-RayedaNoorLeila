# Laporan Praktikum 9 — REST API Node-RED untuk IoT

**Nama:** [ISI NAMA ANDA]  
**NIM:** [ISI NIM ANDA]  
**Kelas:** [ISI KELAS ANDA]  
**Mata kuliah:** Pemrograman Internet of Things (SIF1502)  
**Topik:** REST API & Antarmuka Web IoT

## 1. Tujuan
Membangun sistem monitoring suhu dan kelembaban serta kontrol lampu menggunakan MQTT, Node-RED sebagai backend REST API, dan dashboard web kustom. Pengembangan meliputi suhu batas, visualisasi grafik, API key, WebSocket, dan SQLite.

## 2. Alat dan bahan
Windows 10/11, Node.js LTS, Node-RED, Eclipse Mosquitto untuk Windows, Python 3 (paho-mqtt), node-red-node-sqlite, Chart.js, HTML/CSS/JavaScript, browser modern. Hardware ESP32/DHT22 disimulasikan menggunakan Python.

## 3. Desain arsitektur
Simulator ESP32 mengirim suhu/kelembaban tiap tiga detik ke topik `iot/sensor`. Node-RED memvalidasi lalu menyimpan data ke tabel SQLite `readings`, mengekspos REST API, dan mengirim WebSocket ke klien terautentikasi. Perintah kontrol dikirim lewat REST dan diteruskan menjadi MQTT `iot/kontrol` untuk mengubah status lampu simulator.

## 4. Hasil implementasi

| Fitur | Bukti implementasi |
|---|---|
| REST GET data suhu dan riwayat | `flows.json`, endpoint `/api/suhu`, `/api/history` |
| Kontrol lampu POST | `/api/kontrol` + topik `iot/kontrol` dan `iot/status` |
| Threshold suhu | GET/PUT `/api/threshold`; data di tabel `settings` |
| Alert suhu melewati batas | Deteksi transisi normal ke melewati batas, log SQLite, notifikasi WebSocket & MQTT |
| Grafik real-time | `public/app.js` menggunakan Chart.js |
| Auth API key | `settings.js`, header `X-API-Key`; WS memakai pesan auth awal |
| WebSocket | `/ws/sensor`; pembaruan sensor tanpa polling |
| SQLite | `readings`, `settings`, `alerts`, disimpan sebagai file `node-red/db/iot.sqlite` pada laptop (bukan Docker volume) |

## 5. Uji coba

Petunjuk pengujian ditulis pada README dan `docs/PANDUAN_TANPA_DOCKER_WINDOWS.md` (perintah `py -3 scripts/smoke_test.py --key ...`). **Isi tabel hasil setelah menjalankan sistem**, jangan mencantumkan hasil yang belum diperoleh.

| Pengujian | Hasil yang diharapkan | Hasil aktual |
|---|---|---|
| GET `/api/suhu` memakai key | 200 + JSON sensor | [ISI SETELAH TEST] |
| GET tanpa key | 401 Unauthorized | [ISI SETELAH TEST] |
| PUT threshold 30 | 200, nilai tersimpan | [ISI SETELAH TEST] |
| POST kontrol lampu | 200 dan status aktuator berubah | [ISI SETELAH TEST] |
| Uji suhu > threshold | Notifikasi baru di dashboard | [ISI SETELAH TEST] |
| Restart Node-RED | History tetap tersedia | [ISI SETELAH TEST] |
| WebSocket | Terhubung dan update tanpa polling | [ISI SETELAH TEST] |

## 6. Dokumentasi screenshot
Simpan screenshot asli pada `docs/bukti/` (buat folder jika belum ada). Tambahkan **screenshot asli** dari komputer saat proyek berjalan (disarankan):

- Dashboard: [BELUM DIAMBIL]
- Flow Node-RED: [BELUM DIAMBIL]
- Terminal / smoke test: [BELUM DIAMBIL]

## 7. Kesimpulan
Sistem dirancang untuk menghubungkan publisher MQTT ke backend Node-RED dan dashboard. Pengembangan tambahan menerapkan threshold dan notifikasi, Chart.js, autentikasi API, WebSocket, serta persistensi SQLite. Kesimpulan keberhasilan end-to-end harus dikonfirmasi setelah pengujian lokal selesai.
