#!/usr/bin/env node
/*
  cek-tautan.js — pemeriksa tautan kartu untuk Mata Rantai Islam
  Jalankan dari folder utama repositori:

    node tools/cek-tautan.js            -> periksa
    node tools/cek-tautan.js --simpan   -> periksa lalu simpan patokan jumlah kisah per tokoh
                                           (ditolak bila masih ada galat; tambahkan --paksa
                                            bila galat itu memang sudah diketahui dan ditunda)

  Yang diperiksa:
   1. TAUTAN MATI   : @bio:... di kode, tetapi berkasnya tidak ada di data/bio   (galat)
   2. BERKAS YATIM  : berkas kisah di data/bio yang tidak dirujuk node mana pun  (peringatan)
   3. NAMA BERKAS   : tanpa .html, memakai spasi, atau berhuruf besar              (galat)
   4. PENURUNAN     : jumlah kisah satu tokoh berkurang dari patokan terakhir      (galat)
      -> inilah yang menangkap kasus "kisah tokoh tiba-tiba lepas".
  Kode keluar 1 bila ada galat.
*/
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const BIO = path.join(ROOT, 'data', 'bio');
const KODE = ['js/app-1.js', 'js/app-2.js', 'index.html']
  .map(f => path.join(ROOT, f)).filter(f => fs.existsSync(f));
const PATOKAN = path.join(ROOT, 'tools', 'patokan-tautan.json');

if (!fs.existsSync(BIO) || !KODE.length) {
  console.error('Jalankan dari folder utama repositori (harus ada data/bio dan js/app-1.js).');
  process.exit(2);
}

const kode = KODE.map(f => fs.readFileSync(f, 'utf8')).join('\n');

// --- kumpulkan semua berkas di data/bio ---
const semua = [];
(function jalan(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) jalan(p);
    else semua.push(path.relative(BIO, p).split(path.sep).join('/'));
  }
})(BIO);
const htmlFiles = semua.filter(f => f.endsWith('.html')).map(f => f.slice(0, -5));
const adaBerkas = new Set(htmlFiles);

// --- kumpulkan rujukan @bio:... (nilai sampai tanda kutip penutup) ---
const refs = new Set();
for (const m of kode.matchAll(/@bio:([^"'`]+)/g)) refs.add(m[1]);

const galat = [], peringatan = [];

// 1. tautan mati (kartu kategori dirakit lewat helper "00-kategori/"+slug, jadi dilewati)
for (const r of refs) {
  if (r === '00-kategori/' || r.endsWith('/')) continue;
  if (!adaBerkas.has(r)) galat.push(`TAUTAN MATI   ${r}`);
}

// 2. berkas yatim
const kategoriDirujuk = slug => new RegExp('"' + slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"').test(kode);
for (const f of htmlFiles) {
  if (f.startsWith('00-kategori/')) {
    if (!refs.has(f) && !kategoriDirujuk(f.split('/')[1])) peringatan.push(`BERKAS YATIM  ${f}`);
  } else if (!refs.has(f)) {
    peringatan.push(`BERKAS YATIM  ${f}`);
  }
}

// 3. nama berkas
for (const f of semua) {
  if (f.endsWith('.md')) continue;
  if (!f.endsWith('.html')) galat.push(`NAMA BERKAS   tanpa .html: ${f}`);
  else if (/\s/.test(f)) galat.push(`NAMA BERKAS   memakai spasi: ${f}`);
  else if (/[A-Z]/.test(f)) peringatan.push(`NAMA BERKAS   berhuruf besar: ${f}`);
}

// 4. jumlah kisah per tokoh dibanding patokan
const hitung = {};
for (const r of refs) {
  const i = r.indexOf('/');
  if (i < 0) continue;
  const folder = r.slice(0, i);
  if (folder === '00-kategori') continue;
  hitung[folder] = (hitung[folder] || 0) + 1;
}
if (fs.existsSync(PATOKAN)) {
  const lama = JSON.parse(fs.readFileSync(PATOKAN, 'utf8'));
  for (const [folder, n] of Object.entries(lama)) {
    const kini = hitung[folder] || 0;
    if (kini < n) galat.push(`PENURUNAN     ${folder}: ${n} -> ${kini} tautan (berkurang ${n - kini})`);
  }
} else {
  peringatan.push('Belum ada patokan. Jalankan "node tools/cek-tautan.js --simpan" sekali setelah semuanya benar.');
}

// --- laporan ---
console.log(`Rujukan @bio: ${refs.size} | berkas kartu: ${htmlFiles.length} | tokoh berfolder: ${Object.keys(hitung).length}`);
if (galat.length) { console.log(`\nGALAT (${galat.length})`); galat.forEach(x => console.log('  ✗ ' + x)); }
if (peringatan.length) { console.log(`\nPERINGATAN (${peringatan.length})`); peringatan.forEach(x => console.log('  ! ' + x)); }
if (!galat.length) console.log('\n✓ Tidak ada galat.');

if (process.argv.includes('--simpan')) {
  if (galat.length && !process.argv.includes('--paksa')) {
    console.log('\nPatokan TIDAK disimpan karena masih ada galat. Perbaiki dulu (atau pakai --paksa).');
  } else {
    const urut = Object.fromEntries(Object.entries(hitung).sort());
    fs.writeFileSync(PATOKAN, JSON.stringify(urut, null, 1) + '\n');
    console.log(`\nPatokan disimpan: ${path.relative(ROOT, PATOKAN)}`);
  }
}
process.exit(galat.length ? 1 : 0);
