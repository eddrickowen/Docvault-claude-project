# Cara Kerja Bulk Import DocVault (v0.26)

Dokumen ini menjelaskan alur teknis proses impor data massal (Bulk Import) yang telah dioptimalkan untuk performa tinggi dan stabilitas UI.

## 🏗️ Arsitektur End-to-End

Proses ini melibatkan koordinasi antara Frontend (Zustand), Network (API), dan Backend (PocketBase JSVM).

### 1. Tahap Frontend (Client-Side)
Saat Anda menempelkan (Paste) data dari Excel/Spreadsheet:
- **TSV Parsing**: Data tab-separated diubah menjadi objek JSON.
- **ID Generation**: Fungsi `uid()` menghasilkan ID unik **tepat 15 karakter** (Syarat wajib PocketBase v0.26).
- **Payload Building**: Ribuan baris data dikelompokkan ke dalam satu objek besar (`importPayload`) yang berisi daftar `pos` dan `items`.

### 2. Pencegahan UI Freeze (Silencing)
Ini adalah bagian krusial yang baru saja kita tambahkan:
- Sebelum mengirim data, Frontend memanggil `_unsubscribeRealtime()`.
- **Mengapa?** Jika tidak dimatikan, setiap kali server menyimpan 1 baris data (dari total 7.000+), browser akan menerima sinyal update dan mencoba me-render ulang layar. 7.000 update dalam 1 detik akan membuat browser macet (freeze).
- Dengan mematikan koneksi sementara, browser tetap responsif selama proses upload berlangsung.

### 3. Tahap API (Request)
- Frontend mengirim **hanya 1 request POST** ke endpoint `/api/bulk-import`.
- Seluruh data (700+ PO, 7000+ Item) dikirim dalam satu paket JSON raksasa.

### 4. Tahap Backend (PocketBase Hook)
Hook `pocketbase/pb_hooks/bulk.pb.js` menerima paket tersebut:
- **Binding**: Menggunakan `new DynamicModel` dan `e.bindBody` untuk memindahkan data JSON ke memori server (Goja VM).
- **Database Transaction**: Menggunakan `$app.runInTransaction`. Ini memastikan:
    - **Kecepatan**: Operasi database dalam transaksi jauh lebih cepat daripada operasi satuan.
    - **Integritas**: Jika ada satu data yang rusak parah, seluruh proses dibatalkan (Rollback) sehingga database tidak "setengah terisi".
- **Upsert Logic**: Server memeriksa apakah No. PO atau ID sudah ada. Jika ada, data **diperbarui** (Update). Jika tidak ada, data **dibuat baru** (Create).

### 5. Tahap Finalisasi & Sinkronisasi
- Server mengirim respon `200 OK` dengan jumlah data yang berhasil diproses.
- Frontend menerima respon tersebut.
- **Full Refresh**: Frontend memanggil `init()` untuk mengambil status database terbaru dalam satu kali tarikan data (lebih efisien).
- **Resubscribe**: Frontend menyalakan kembali Real-time (`_subscribeToRealtime()`) untuk sinkronisasi live seperti biasa.

---

## 🚀 Ringkasan Performa
- **Dulu**: 7000 request individual (Sangat berat, sering timeout, browser freeze).
- **Sekarang**: 1 request paket + Transaction + RT Silencer (Sangat cepat, aman, browser lancar).

*Optimized for speed. Built for scale.* 🏎️🏢💎
