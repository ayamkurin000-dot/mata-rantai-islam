# Aturan folder dan kartu kisah per tokoh

Di website ini, **struktur kartu yang terlihat ditentukan oleh `children` dalam `index.html`**. File HTML di `data/bio/` hanya menyimpan isi kartu.

## Tata letak file (satu aturan untuk semua tokoh)

```
data/bio/
  <slug-tokoh>/
    <slug-tokoh>.html      biografi tokoh itu sendiri
    <slug-kisah>.html      tiap kartu kisah milik tokoh itu
    <subfolder>/...        (opsional) pengelompokan kisah, mis. karamah/ atau perjalanan-hidup/
  00-kategori/<slug>.html    kartu kategori/periode (bukan tokoh)
  00-arsip-duplikat/         salinan lama yang tidak dipakai website; periksa lalu hapus bila sudah tidak perlu
```

Di `index.html`, tiap tokoh ditulis `infoNote:"@bio:<slug-tokoh>/<slug-tokoh>"` dan tiap kisah `infoNote:"@bio:<slug-tokoh>/<slug-kisah>"`.
Tidak boleh ada file `.html` lepas langsung di `data/bio/`.

## Menambahkan kisah baru (metode aman)

1. Pastikan `data/bio/SLUG-TOKOH/SLUG-TOKOH.html` ada dan `index.html` memuat `infoNote:"@bio:SLUG-TOKOH/SLUG-TOKOH"` tepat satu kali.
2. Simpan isi kartu kisah dalam HTML UTF-8 terpisah, misalnya `kisah-baru.html`.
3. Dari akar repository, jalankan:

   ```bash
   python tools/tambah_kisah.py --tokoh al-junaid-al-baghdadi --slug nasihat-keikhlasan --judul "NASIHAT TENTANG KEIKHLASAN" --html-file kisah-baru.html --dry-run
   python tools/tambah_kisah.py --tokoh al-junaid-al-baghdadi --slug nasihat-keikhlasan --judul "NASIHAT TENTANG KEIKHLASAN" --html-file kisah-baru.html
   ```

4. Hasilnya ada di `data/bio/al-junaid-al-baghdadi/nasihat-keikhlasan.html`, dan kartu masuk ke `children` milik **Al-Junaid**.
5. Jalankan `python tools/pindah_ke_folder_tokoh.py --cek` untuk audit, periksa `git diff`, lalu uji lewat server lokal (bukan `file://`).

## Menambahkan tokoh baru

1. Buat folder `data/bio/<slug-tokoh>/` dan simpan biografinya sebagai `data/bio/<slug-tokoh>/<slug-tokoh>.html`.
2. Di `index.html`, tulis `infoNote:"@bio:<slug-tokoh>/<slug-tokoh>"` pada node tokoh itu.
3. Jalankan `python tools/pindah_ke_folder_tokoh.py --cek`.

## Audit kapan saja

`python tools/pindah_ke_folder_tokoh.py --cek` memeriksa: setiap rujukan `@bio:` punya file, tidak ada file yatim, tidak ada html lepas, dan setiap kisah berada di folder pemiliknya (butuh Node.js).

## Kebijakan untuk AI atau kontributor berikutnya

- Kenali tokoh induk berdasarkan `infoNote` unik sebelum menulis kartu; semua kisah baru ditulis ke `data/bio/<slug-tokoh>/` lewat `tools/tambah_kisah.py`.
- Semua node kisah harus berada dalam `children` tokoh tersebut; jangan masukkan ke `children` kategori atau sejajar dengan tokoh lain.
- Jika nama tokoh/slug ambigu, **jangan menebak** atau mengubah struktur; identifikasi tokoh yang benar lebih dulu.
- Jangan menaruh file `.html` lepas di `data/bio/` dan jangan membuat salinan kisah di dua tempat.
- Edit manual langsung pada `index.html` tetap dapat membuat kesalahan; selalu jalankan `--cek` sesudahnya.
