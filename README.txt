CARA MENAMBAH TOKOH BARU (sahabat, tabiin, dll)
================================================
1. Tulis biografinya sebagai potongan HTML (<p>, <h5>, <b>, dst, seperti file lain)
   lalu simpan di:   data/bio/nama-tokoh/nama-tokoh.html   (satu folder per tokoh)
   (huruf kecil, pakai tanda hubung, tanpa spasi)

2. Di data pohon (index.html), pada tokoh itu tulis:
   infoNote: "@bio:nama-tokoh/nama-tokoh"

3. Upload ulang folder ke hosting. Selesai.
   Halaman awal tidak bertambah berat, karena isi biografi baru diunduh saat diklik.

CATATAN
- Wajib dibuka lewat hosting/server (https://...), bukan file:// langsung.
- Alamat setelah "@bio:" harus sama persis dengan path di data/bio (tanpa .html). Audit: python tools/pindah_ke_folder_tokoh.py --cek


PEMBARUAN ALBY — DZUN NUN AL-MISHRI
Halaman kisah Dzun Nun yang diberi label KISAH NARATIF telah dikembangkan menjadi narasi lebih panjang dengan pembuka, konflik/perjalanan, perenungan, hikmah, dan catatan kedudukan riwayat. Narasi orisinal diberi label jelas sebagai rekonstruksi/ilustrasi, bukan riwayat bersanad atau fakta sejarah yang terverifikasi. Index diperbarui pada label tokoh dan kisah; kunci infoNote tetap dipertahankan agar tautan internal tidak berubah.
