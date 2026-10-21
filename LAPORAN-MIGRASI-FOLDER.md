# Laporan migrasi ke folder per tokoh

Hasil: setiap tokoh kini punya foldernya sendiri di `data/bio/<slug-tokoh>/` berisi biografi tokoh (`<slug-tokoh>.html`) dan semua kisahnya. Kartu kategori ada di `data/bio/00-kategori/`.

- Tokoh: 286 folder, kisah: 745 file, kartu kategori: 54 file.
- 913 file dipindah (termasuk 53 salinan lama). Isi semua file tidak berubah, hanya lokasinya.
- `index.html`: 1.085 alamat `@bio:` diperbarui; bentuk pohon (nama, urutan, jumlah anak) tetap identik dengan sebelum migrasi.
- Alat: `python tools/pindah_ke_folder_tokoh.py --cek` mengaudit struktur kapan saja. Peta lama→baru ada di `tools/peta-migrasi.json`.

## Butuh keputusan Anda: 53 salinan lama di `data/bio/00-arsip-duplikat/`

Ini file datar sisa migrasi sebelumnya yang tidak dirujuk `index.html`. Website memakai versi di folder tokoh. 33 file isinya identik dengan versi yang dipakai (aman dihapus). 20 file berikut **isinya berbeda**; bandingkan dulu, siapa tahu versi arsip lebih baik:

| Kisah | Ukuran arsip | Ukuran versi dipakai | Versi dipakai |
|---|---|---|---|
| abu-thalib-menerima-asuhan-rasulullah | 4633 | 5443 | `abu-thalib-bin-abdul-muthalib/abu-thalib-menerima-asuhan-rasulullah.html` |
| berguru-kepada-al-juwaini-di-naisabur | 4262 | 3405 | `al-ghazali-hujjatul-islam/berguru-kepada-al-juwaini-di-naisabur.html` |
| bertemu-waraqah-bin-naufal | 3768 | 4413 | `siti-khadijah-ummul-mukminin/bertemu-waraqah-bin-naufal.html` |
| cinta-yang-tak-pernah-pudar | 1462 | 1647 | `siti-khadijah-ummul-mukminin/cinta-yang-tak-pernah-pudar.html` |
| dari-majelis-nizham-al-mulk-ke-nizhamiyah-baghdad | 4610 | 3249 | `al-ghazali-hujjatul-islam/dari-majelis-nizham-al-mulk-ke-nizhamiyah-baghdad.html` |
| hari-hari-terakhir-dan-wafat-al-ghazali | 4733 | 5951 | `al-ghazali-hujjatul-islam/hari-hari-terakhir-dan-wafat-al-ghazali.html` |
| juwairiyah-binti-al-harits-ummul-mukminin | 8394 | 1924 | `juwairiyah-binti-al-harits-ummul-mukminin/juwairiyah-binti-al-harits-ummul-mukminin.html` |
| kembali-mengajar-di-naisabur | 4324 | 3417 | `al-ghazali-hujjatul-islam/kembali-mengajar-di-naisabur.html` |
| khadijah-menguji-kehadiran-malaikat-bukan-setan | 4255 | 4592 | `siti-khadijah-ummul-mukminin/khadijah-menguji-kehadiran-malaikat-bukan-setan.html` |
| krisis-keraguan-al-ghazali-dan-meninggalkan-baghdad | 4680 | 5860 | `al-ghazali-hujjatul-islam/krisis-keraguan-al-ghazali-dan-meninggalkan-baghdad.html` |
| masa-kecil-al-ghazali-yatim-di-thus | 4790 | 5914 | `al-ghazali-hujjatul-islam/masa-kecil-al-ghazali-yatim-di-thus.html` |
| pengembaraan-dan-uzlah-al-ghazali | 4472 | 5704 | `al-ghazali-hujjatul-islam/pengembaraan-dan-uzlah-al-ghazali.html` |
| penulisan-ihya-ulumiddin | 4216 | 3327 | `al-ghazali-hujjatul-islam/penulisan-ihya-ulumiddin.html` |
| rasulullah-selalu-mengenang-khadijah-kecemburuan-aisyah-dan-kisah-halah | 4929 | 5598 | `siti-khadijah-ummul-mukminin/rasulullah-selalu-mengenang-khadijah-kecemburuan-aisyah-dan-kisah-halah.html` |
| salam-dari-allah-dan-kabar-gembira-rumah-di-surga | 4097 | 5034 | `siti-khadijah-ummul-mukminin/salam-dari-allah-dan-kabar-gembira-rumah-di-surga.html` |
| sambutan-ulama-terhadap-ihya-ulumiddin | 5336 | 3235 | `al-ghazali-hujjatul-islam/sambutan-ulama-terhadap-ihya-ulumiddin.html` |
| sebaik-baik-wanita-pujian-rasulullah-untuk-khadijah | 4643 | 5305 | `siti-khadijah-ummul-mukminin/sebaik-baik-wanita-pujian-rasulullah-untuk-khadijah.html` |
| selimutilah-aku-khadijah-menenangkan-rasulullah-di-hari-wahyu-pertama | 4818 | 6047 | `siti-khadijah-ummul-mukminin/selimutilah-aku-khadijah-menenangkan-rasulullah-di-hari-wahyu-pertama.html` |
| siti-khadijah-ummul-mukminin | 2080 | 2265 | `siti-khadijah-ummul-mukminin/siti-khadijah-ummul-mukminin.html` |
| wanita-pertama-yang-beriman | 3792 | 4072 | `siti-khadijah-ummul-mukminin/wanita-pertama-yang-beriman.html` |

## Catatan

- `tools/tambah_kisah.py` menolak tokoh yang `infoNote`-nya muncul lebih dari sekali (mis. `sunan-ampel` tampil di pohon silsilah dan di daftar tokoh). Ini perilaku lama; kisah untuk tokoh seperti itu perlu ditambah manual atau pohonnya dirapikan dulu.
- Dokumen lama (`IBNU-ATHAILLAH-*.md`, `LAPORAN-AUDIT-INTEGRASI.md`, `README-PERBAIKAN*.txt`) masih menyebut path sebelum migrasi; isinya riwayat, tidak mempengaruhi website.
