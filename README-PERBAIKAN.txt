PERBAIKAN INTEGRASI KARTU — MAULANA-ISHAQ
Basis: ZIP terbaru yang diunggah dari GitHub pada percakapan ini.

ISI PAKET
- Maulana-Ishaq-main/index.html
- 13 salinan kisah yang sebelumnya hanya ada di data/bio/ datar, kini disediakan di folder khusus tokoh:
  - data/bio/hafshah-binti-umar/
  - data/bio/zainab-binti-khuzaimah/
- LAPORAN-AUDIT-INTEGRASI.md

PERUBAHAN
1. Mengarahkan 30 token @bio: yang sebelumnya menggunakan nama datar ke satu file bersarang yang unik dan sesuai folder tokoh.
2. Mendaftarkan 192 file HTML yang sudah ada di subfolder tetapi belum memiliki token kartu, sebagai children dari kartu tokoh yang sesuai.
3. Menyalin 13 kisah Hafshah dan Zainab binti Khuzaimah ke folder khusus dan mendaftarkannya sebagai children dari tokoh masing-masing. File datar asli sengaja tidak dihapus.
4. Tidak mengubah redaksi isi kisah yang sudah ada.
5. Tidak menghapus file apa pun.

CARA PAKAI
1. Buat backup folder D:\GitHub\Maulana-Ishaq.
2. Ekstrak ZIP ini ke folder sementara.
3. Salin index.html dan folder data ke D:\GitHub\Maulana-Ishaq, dengan mempertahankan struktur folder di dalam ZIP.
4. Buka GitHub Desktop, periksa Changes sebelum commit.
5. Jangan gunakan ZIP ini untuk mengganti seluruh folder repository; paket ini adalah overlay/perbaikan terarah.

VALIDASI STATIS
- Semua referensi literal @bio: yang terdeteksi di index.html memiliki target berdasarkan mekanisme jalur utama/fallback yang ada.
- Semua file HTML di subfolder data/bio terjangkau oleh setidaknya satu token setelah perubahan.
- Kedua blok JavaScript inline lulus pemeriksaan sintaks Node.js.
- Belum dilakukan pengujian visual/pemuatan aktual di browser.
- Referensi yang muncul lebih dari sekali tidak otomatis dianggap ID ganda; beberapa kemungkinan merupakan referensi silang.
