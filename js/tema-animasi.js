/* Pengaturan animasi & warna latar, dipasang sebagai bagian tambahan di panel Tema
   (ikon palet di bawah tombol RESET -> kata sandi -> pilih).
   - Animasi latar   : daun, salju, bintang berkerlip (boleh dipilih lebih dari satu)  -> js/animasi.js
   - Aliran energi   : kartu Nabi Muhammad SAW mengalirkan listrik / cahaya / air / api / nur ke kartu-kartu
                       berikutnya, kartu yang terkena aliran bergetar dan menyala bergantian        -> js/energi.js
   - Warna latar     : pilihan warna + pemilih warna bebas; motif lingkaran ikut menyesuaikan.
   Pilihan disimpan di perangkat (localStorage) dan dikabarkan ke modul lain lewat window.MRI_ANIM. */
(function () {
  'use strict';
  var KUNCI = 'mri-tema-anim';
  var ASLI = '#f8eeda';
  var BAWAAN = { daun: true, salju: false, bintang: false, energi: 'listrik', kuat: 2, latar: 'asli' };

  var ENERGI = [
    ['mati', '⛔', 'Mati'], ['listrik', '⚡', 'Listrik'], ['cahaya', '✨', 'Cahaya'], ['air', '💧', 'Air'],
    ['api', '🔥', 'Api'], ['nur', '💚', 'Nur'], ['campur', '🌈', 'Campur']
  ];
  var KUAT = [[1, 'Halus'], [2, 'Sedang'], [3, 'Kuat']];
  var LATAR = [
    ['asli', ASLI, 'Krem (asli)'], ['#ffffff', '#ffffff', 'Putih'], ['#e9edf2', '#e9edf2', 'Abu terang'],
    ['#dcefdc', '#dcefdc', 'Hijau muda'], ['#dbeafe', '#dbeafe', 'Biru muda'], ['#fde4ec', '#fde4ec', 'Merah muda'],
    ['#0f1b33', '#0f1b33', 'Biru malam'], ['#0a3426', '#0a3426', 'Hijau tua'], ['#2a1646', '#2a1646', 'Ungu tua'],
    ['#0a0a0f', '#0a0a0f', 'Hitam']
  ];

  /* ---------- warna ---------- */
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function hex(c) { return '#' + c.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function campur(h, t, x) { var a = rgb(h), b = rgb(t); return hex([0, 1, 2].map(function (i) { return a[i] + (b[i] - a[i]) * x; })); }
  function lum(h) { var c = rgb(h); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; }

  /* ---------- keadaan ---------- */
  function baca() {
    var k = {}, o = null, i;
    for (i in BAWAAN) k[i] = BAWAAN[i];
    try { o = JSON.parse(localStorage.getItem(KUNCI) || 'null'); } catch (e) {}
    if (o && typeof o === 'object') {
      ['daun', 'salju', 'bintang'].forEach(function (n) { if (typeof o[n] === 'boolean') k[n] = o[n]; });
      if (ENERGI.some(function (x) { return x[0] === o.energi; })) k.energi = o.energi;
      if (o.kuat === 1 || o.kuat === 2 || o.kuat === 3) k.kuat = o.kuat;
      if (o.latar === 'asli' || /^#[0-9a-f]{6}$/i.test(String(o.latar))) k.latar = String(o.latar).toLowerCase();
    }
    return k;
  }
  var keadaan = baca();
  function bg() { return keadaan.latar === 'asli' ? ASLI : keadaan.latar; }
  function gelap() { return lum(bg()) < 0.42; }
  function simpan() { try { localStorage.setItem(KUNCI, JSON.stringify(keadaan)); } catch (e) {} }

  /* ---------- pengabaran ke modul lain ---------- */
  var pendengar = [];
  function publik() {
    return { daun: keadaan.daun, salju: keadaan.salju, bintang: keadaan.bintang, energi: keadaan.energi,
             kuat: keadaan.kuat, latar: keadaan.latar, bg: bg(), gelap: gelap() };
  }
  window.MRI_ANIM = {
    get: publik,
    on: function (fn) { if (typeof fn === 'function') pendengar.push(fn); }
  };
  function siarkan() {
    var s = publik();
    pendengar.forEach(function (f) { try { f(s); } catch (e) {} });
  }

  /* ---------- warna latar ---------- */
  function polaSvg(warna, gl) {
    var garis = gl ? campur(warna, '#ffffff', 0.16) : campur(warna, '#7a5a1a', 0.16);
    var t = gl ? 0.2 : 0.75;
    var d1 = campur(warna, '#f7cfe0', t), d2 = campur(warna, '#bdead2', t), d3 = campur(warna, '#fdf1c7', t);
    var c = function (x, y, r, f) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '"' + (f ? ' fill="' + f + '"' : '') + '/>'; };
    return '<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140">' +
      '<g fill="none" stroke="' + garis + '" stroke-width="1" opacity="0.55">' +
      c(35, 35, 16) + c(105, 35, 16) + c(35, 105, 16) + c(105, 105, 16) + c(70, 70, 16) + '</g>' +
      '<g opacity="0.5">' + c(35, 35, 4.5, d1) + c(105, 35, 4.5, d2) + c(35, 105, 4.5, d2) + c(105, 105, 4.5, d1) + c(70, 70, 4.5, d3) + '</g></svg>';
  }
  function terapkanLatar() {
    var warna = bg(), gl = gelap(), asli = keadaan.latar === 'asli';
    document.body.style.backgroundColor = asli ? '' : warna;
    document.body.classList.toggle('latar-gelap', gl);
    var st = document.getElementById('mri-latar-css');
    if (!st) { st = document.createElement('style'); st.id = 'mri-latar-css'; document.head.appendChild(st); }
    var css =
      'body.latar-gelap .connector{background:#e2e8f0!important}' +
      'body.latar-gelap .desc-link:not([stroke-dasharray]){stroke:rgba(255,255,255,.75)!important}';
    if (!asli) css += 'body:before{background-image:url("data:image/svg+xml,' + encodeURIComponent(polaSvg(warna, gl)) + '")!important}';
    st.textContent = css;
    var awal = document.getElementById('mri-latar-awal');
    if (awal) awal.remove();
  }

  function ubah(kv) {
    for (var i in kv) keadaan[i] = kv[i];
    simpan();
    if (kv.latar !== undefined) terapkanLatar();
    siarkan();
    gambar();
  }

  /* ---------- antarmuka (di dalam panel Tema) ---------- */
  var CSS = [
    '#ta-wadah{margin-top:2px}',
    '#ta-wadah .ta-judul{font-size:.76rem;font-weight:800;color:#3a2a06;margin:0 2px 8px;letter-spacing:.2px}',
    '#ta-wadah .ta-sub{font-size:.68rem;font-weight:700;color:#6b5320;margin:10px 2px 6px}',
    '#ta-wadah .ta-grid{display:grid;gap:8px}',
    '#ta-wadah .ta-g3{grid-template-columns:repeat(3,1fr)}',
    '#ta-wadah .ta-g4{grid-template-columns:repeat(4,1fr)}',
    '#ta-wadah .ta-b{border:2px solid transparent;border-radius:12px;background:#ffffff80;padding:7px 2px 6px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;font:700 .62rem/1.2 Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#3a2a06;touch-action:manipulation}',
    '#ta-wadah .ta-b .ik{font-size:1.25rem;line-height:1.15}',
    '#ta-wadah .ta-b:hover{background:#fff}',
    '#ta-wadah .ta-b.pilih{border-color:#b8912f;background:#fff;box-shadow:0 0 0 2px #f4e4bc}',
    '#ta-wadah .ta-warna{display:grid;grid-template-columns:repeat(6,1fr);gap:9px}',
    '#ta-wadah .ta-w{position:relative;aspect-ratio:1;border-radius:50%;border:2px solid #0000004d;cursor:pointer;padding:0;touch-action:manipulation;box-shadow:0 2px 3px #0003}',
    '#ta-wadah .ta-w.pilih{outline:3px solid #b8912f;outline-offset:2px}',
    '#ta-wadah .ta-w.pilih:after{content:"✓";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:900;color:#fff;text-shadow:0 0 3px #000,0 0 2px #000}',
    '#ta-wadah .ta-w input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;border:0;padding:0}',
    '#ta-wadah .ta-nama{margin:8px 2px 0;font-size:.66rem;font-weight:700;color:#6b5320;text-align:center}',
    '#ta-wadah .ta-aksi{width:100%;margin-top:12px;padding:9px 10px;border:none;border-radius:9px;font:800 .78rem Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#fff;cursor:pointer;touch-action:manipulation;background:linear-gradient(#3aa84a,#1b7a2c 55%,#0c4a18);box-shadow:0 0 0 1px #0c1f0a,0 2px 5px #0006;text-shadow:0 1px 0 #000a}',
    '#ta-wadah .ta-aksi.kecil{margin-top:8px;background:#ffffff99;color:#3a2a06;text-shadow:none;box-shadow:0 0 0 1px #a9873a80;font-size:.68rem;padding:7px 10px}'
  ].join('');

  var gPart, gEnergi, gKuat, gLatar, gNama;

  function tombol(ik, label, aktif, aksi) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'ta-b' + (aktif ? ' pilih' : '');
    b.setAttribute('aria-pressed', aktif ? 'true' : 'false');
    var i = document.createElement('span'); i.className = 'ik'; i.textContent = ik;
    var t = document.createElement('span'); t.textContent = label;
    b.appendChild(i); b.appendChild(t);
    b.addEventListener('click', aksi);
    return b;
  }
  function gambar() {
    if (!gPart) return;
    gPart.innerHTML = ''; gEnergi.innerHTML = ''; gKuat.innerHTML = ''; gLatar.innerHTML = '';
    [['daun', '🍃', 'Daun'], ['salju', '❄️', 'Salju'], ['bintang', '🌟', 'Bintang']].forEach(function (x) {
      gPart.appendChild(tombol(x[1], x[2], keadaan[x[0]], function () { var o = {}; o[x[0]] = !keadaan[x[0]]; ubah(o); }));
    });
    ENERGI.forEach(function (x) {
      gEnergi.appendChild(tombol(x[1], x[2], keadaan.energi === x[0], function () { ubah({ energi: x[0] }); }));
    });
    KUAT.forEach(function (x) {
      var b = tombol(['🌱', '🔆', '💥'][x[0] - 1], x[1], keadaan.kuat === x[0], function () { ubah({ kuat: x[0] }); });
      b.style.opacity = keadaan.energi === 'mati' ? '.45' : '';
      gKuat.appendChild(b);
    });
    var nama = 'Warna bebas', adaDaftar = false;
    LATAR.forEach(function (x) {
      var aktif = keadaan.latar === x[0];
      if (aktif) { nama = x[2]; adaDaftar = true; }
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'ta-w' + (aktif ? ' pilih' : '');
      b.style.background = x[1]; b.setAttribute('aria-label', x[2]);
      b.addEventListener('click', function () { ubah({ latar: x[0] }); });
      gLatar.appendChild(b);
    });
    var bebas = document.createElement('label');
    bebas.className = 'ta-w' + (!adaDaftar ? ' pilih' : '');
    bebas.setAttribute('aria-label', 'Pilih warna sendiri');
    bebas.style.background = adaDaftar ? 'conic-gradient(#ef4444,#f59e0b,#eab308,#22c55e,#06b6d4,#3b82f6,#a855f7,#ef4444)' : keadaan.latar;
    var inp = document.createElement('input');
    inp.type = 'color'; inp.value = bg();
    inp.addEventListener('input', function () { ubah({ latar: inp.value.toLowerCase() }); });
    bebas.appendChild(inp);
    gLatar.appendChild(bebas);
    gNama.textContent = 'Warna latar: ' + nama + (adaDaftar ? '' : ' (' + keadaan.latar + ')');
  }

  function bangunUI() {
    var pilih = document.getElementById('tema-pilih');
    if (!pilih) return;
    var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    var w = document.createElement('div'); w.id = 'ta-wadah';
    w.innerHTML =
      '<hr><div class="ta-judul">🍃 Animasi Latar</div><div class="ta-grid ta-g3" id="ta-part"></div>' +
      '<hr><div class="ta-judul">⚡ Aliran Energi dari Nabi Muhammad SAW</div><div class="ta-grid ta-g4" id="ta-energi"></div>' +
      '<div class="ta-sub">Kekuatan getar &amp; nyala</div><div class="ta-grid ta-g3" id="ta-kuat"></div>' +
      '<button type="button" class="ta-aksi" id="ta-coba">▶ Lihat aliran energinya sekarang</button>' +
      '<hr><div class="ta-judul">🎨 Warna Latar</div><div class="ta-warna" id="ta-latar"></div><div class="ta-nama" id="ta-nama"></div>' +
      '<button type="button" class="ta-aksi kecil" id="ta-reset">↺ Kembalikan animasi &amp; warna latar ke bawaan</button>';
    pilih.appendChild(w);
    gPart = w.querySelector('#ta-part'); gEnergi = w.querySelector('#ta-energi');
    gKuat = w.querySelector('#ta-kuat'); gLatar = w.querySelector('#ta-latar'); gNama = w.querySelector('#ta-nama');
    w.querySelector('#ta-coba').addEventListener('click', function () {
      var tutup = document.getElementById('tema-close');
      if (tutup) tutup.click();
      if (keadaan.energi === 'mati') ubah({ energi: 'listrik' });
      setTimeout(function () { if (window.MRI_ENERGI) window.MRI_ENERGI.picu(); }, 250);
    });
    w.querySelector('#ta-reset').addEventListener('click', function () {
      var b = {}; for (var i in BAWAAN) b[i] = BAWAAN[i];
      ubah(b);
    });
    gambar();
  }

  function mulai() {
    terapkanLatar();
    try { bangunUI(); } catch (e) {}
  }
  /* skrip ada di akhir <body>: elemen sudah ada, jadi langsung dijalankan */
  try { mulai(); } catch (e) {}
})();
