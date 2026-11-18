/* Pengaturan model kartu (kapsul 3D). Ikon palet di bawah tombol RESET -> kata sandi -> pilih model.
   Model dipasang sebagai lapisan tambahan di atas kartu yang sudah digambar (app-1.js tidak diubah),
   dan otomatis dipasang lagi pada kartu baru saat cabang dibuka. Pilihan disimpan di perangkat. */
(function () {
  'use strict';
  var KATA_SANDI = '21';
  var KUNCI = 'mri-tema-kartu';
  var NS = 'http://www.w3.org/2000/svg';

  /* L = warna separuh kiri, R = separuh kanan, s = posisi sambungan kapsul, t = true bila teks harus gelap */
  var TEMA = [
    { id: 'asli' },
    { id: 'biru-merah',   L: '#2b95dd', R: '#d32f2f', s: 0.5,  t: false },
    { id: 'teal-merah',   L: '#2f9fb0', R: '#d32f2f', s: 0.5,  t: false },
    { id: 'putih-merah',  L: '#f3f1ee', R: '#d6392b', s: 0.48, t: true },
    { id: 'putih-biru',   L: '#f3f1ee', R: '#2b8fd6', s: 0.48, t: true },
    { id: 'biru-muda-merah', L: '#a9cde3', R: '#d32f2f', s: 0.5, t: true }
  ];

  function el(n, a) {
    var e = document.createElementNS(NS, n);
    for (var k in a) e.setAttribute(k, a[k]);
    return e;
  }
  function grad(id, horiz, stops) {
    var g = el('linearGradient', { id: id, x1: 0, y1: 0, x2: horiz ? 1 : 0, y2: horiz ? 0 : 1 });
    stops.forEach(function (s) {
      g.appendChild(el('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] }));
    });
    return g;
  }
  function f(n) { return Math.max(0, Math.min(1, n)).toFixed(4); }

  /* ---------- gradien global ---------- */
  var defs;
  function bangunDefs() {
    var svg = el('svg', { width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' });
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    defs = el('defs', {});
    svg.appendChild(defs);

    /* bayangan atas-bawah, sama untuk semua model */
    defs.appendChild(grad('tm-shade', false, [
      [0, '#ffffff', 0.34], [0.22, '#ffffff', 0.08], [0.5, '#000000', 0],
      [0.8, '#000000', 0.16], [1, '#000000', 0.42]
    ]));

    TEMA.forEach(function (t) {
      if (!t.L) return;
      var s = t.s;
      defs.appendChild(grad('tm-tone-' + t.id, true, [
        [0, t.L, 1], [f(s), t.L, 1], [f(s), t.R, 1], [1, t.R, 1]
      ]));
      /* ujung kapsul agak gelap + garis sambungan */
      defs.appendChild(grad('tm-seam-' + t.id, true, [
        [0, '#000000', 0.30], [0.06, '#000000', 0.06], [0.12, '#000000', 0],
        [f(s - 0.14), '#000000', 0],
        [f(s - 0.012), '#000000', 0.10],
        [f(s - 0.012), '#000000', 0.40], [f(s), '#000000', 0.40],
        [f(s), '#ffffff', 0.55], [f(s + 0.008), '#ffffff', 0.55],
        [f(s + 0.008), '#000000', 0.10],
        [f(s + 0.07), '#000000', 0],
        [0.88, '#000000', 0], [0.94, '#000000', 0.06], [1, '#000000', 0.30]
      ]));
      /* tepi luar (bingkai) lebih gelap */
      function gelap(hex) {
        var n = parseInt(hex.slice(1), 16);
        var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        return 'rgb(' + Math.round(r * 0.55) + ',' + Math.round(g * 0.55) + ',' + Math.round(b * 0.55) + ')';
      }
      defs.appendChild(grad('tm-rim-' + t.id, true, [
        [0, gelap(t.L), 1], [f(s), gelap(t.L), 1], [f(s), gelap(t.R), 1], [1, gelap(t.R), 1]
      ]));
    });
    document.body.appendChild(svg);
  }

  /* ---------- pasang / lepas pada kartu ---------- */
  var aktif = 'asli';
  try { aktif = localStorage.getItem(KUNCI) || 'asli'; } catch (e) {}
  if (!TEMA.some(function (t) { return t.id === aktif; })) aktif = 'asli';

  function cari(id) {
    for (var i = 0; i < TEMA.length; i++) if (TEMA[i].id === id) return TEMA[i];
    return TEMA[0];
  }

  function lepas(g) {
    var ov = g.querySelectorAll('.tm-ov');
    for (var i = 0; i < ov.length; i++) ov[i].remove();
    var rim = g.querySelector('path[data-tmk="rim"]');
    if (rim) rim.setAttribute('fill', 'url(#btn-rim-g)');
    g.classList.remove('tm-terang');
    g.removeAttribute('data-tm');
  }

  function pasang(g, t) {
    var paths = g.querySelectorAll('path.aged-ov');
    var rim = null, well = null;
    for (var i = 0; i < paths.length; i++) {
      var p = paths[i], fl = p.getAttribute('fill'), k = p.getAttribute('data-tmk');
      if (k === 'rim' || fl === 'url(#btn-rim-g)') { rim = p; p.setAttribute('data-tmk', 'rim'); }
      else if (k === 'well' || fl === 'url(#btn-well-g)') { well = p; p.setAttribute('data-tmk', 'well'); }
    }
    if (!well) return;               /* kartu Wali-9 / lingkaran: dilewati */
    var lama = g.querySelectorAll('.tm-ov');
    for (var j = 0; j < lama.length; j++) lama[j].remove();
    if (rim) rim.setAttribute('fill', 'url(#tm-rim-' + t.id + ')');

    var d = well.getAttribute('d'), tr = well.getAttribute('transform');
    var urut = ['tm-tone-', 'tm-shade', 'tm-seam-'], ref = well;
    urut.forEach(function (pre) {
      var id = pre === 'tm-shade' ? 'tm-shade' : pre + t.id;
      var c = el('path', { d: d, fill: 'url(#' + id + ')', 'pointer-events': 'none', class: 'tm-ov' });
      if (tr) c.setAttribute('transform', tr);
      ref.parentNode.insertBefore(c, ref.nextSibling);
      ref = c;
    });
    g.classList.toggle('tm-terang', !!t.t);
    g.setAttribute('data-tm', t.id);
  }

  var sibuk = false, jadwal = 0, pengamat = null, wadah = null;
  function terapkan() {
    jadwal = 0;
    if (!wadah) return;
    sibuk = true;
    if (pengamat) pengamat.disconnect();
    var t = cari(aktif);
    var semua = wadah.querySelectorAll('g.node-shape');
    for (var i = 0; i < semua.length; i++) {
      var g = semua[i];
      if (t.id === 'asli') { if (g.getAttribute('data-tm')) lepas(g); }
      else if (g.getAttribute('data-tm') !== t.id) pasang(g, t);
    }
    if (pengamat) pengamat.observe(wadah, { childList: true, subtree: true });
    sibuk = false;
  }
  function tunda() {
    if (sibuk || jadwal) return;
    jadwal = requestAnimationFrame(terapkan);
  }

  function pilih(id) {
    aktif = id;
    try { localStorage.setItem(KUNCI, id); } catch (e) {}
    terapkan();
    tandai();
  }

  /* ---------- antarmuka ---------- */
  var css = [
    '#tema-btn{padding:3px 8px!important;line-height:1;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}',
    '#tema-btn svg{width:15px;height:15px;display:block}',
    '.node-shape.tm-terang text{fill:#0b1220!important;filter:none!important;stroke:#fff;stroke-width:2.6px;paint-order:stroke fill;stroke-linejoin:round}',
    '#tema-overlay{position:fixed;inset:0;background:#0f172a8c;z-index:27000;display:none;align-items:center;justify-content:center;padding:16px}',
    '#tema-overlay.open{display:flex}',
    '#tema-card{position:relative;width:340px;max-width:94vw;background:linear-gradient(175deg,#fffdf7,#fbf3e1 55%,#f6ead0);border:4px double #a9873a;border-radius:14px;box-shadow:0 14px 34px #00000080;padding:22px 18px 20px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif}',
    '#tema-close{position:absolute;top:8px;right:8px;width:34px;height:34px;border-radius:8px;border:1px solid #a9873a;background:#fff8;color:#3a2a06;font-weight:800;cursor:pointer;touch-action:manipulation}',
    '#tema-pass{text-align:center}',
    '#tema-pass p{font-size:.8rem;font-weight:700;color:#3a2a06;margin:6px 0 12px}',
    '#tema-pass input{width:140px;text-align:center;font-size:1.3rem;letter-spacing:6px;padding:8px 10px;border:1.5px solid #a9873a;border-radius:8px;background:#fff;outline:none}',
    '#tema-pass input:focus{box-shadow:0 0 0 3px #d4af3766}',
    '#tema-pass .tm-err{height:16px;margin-top:8px;font-size:.7rem;font-weight:700;color:#b91c1c}',
    '#tema-pass .tm-ok{margin-top:6px;padding:7px 26px;border:none;border-radius:8px;font-weight:800;font-size:.8rem;color:#fff;cursor:pointer;background:linear-gradient(#3aa84a,#1b7a2c 55%,#0c4a18);box-shadow:0 0 0 1px #0c1f0a,0 2px 5px #0006;text-shadow:0 1px 0 #000a}',
    '#tema-pass.salah input{animation:tmGoyang .35s}',
    '@keyframes tmGoyang{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}',
    '#tema-pilih{display:none;grid-template-columns:1fr 1fr;gap:12px;padding-top:10px}',
    '#tema-card.terbuka #tema-pass{display:none}',
    '#tema-card.terbuka #tema-pilih{display:grid}',
    '.tm-sw{border:2px solid transparent;border-radius:14px;background:#ffffff80;padding:8px 4px;cursor:pointer;display:flex;align-items:center;justify-content:center;touch-action:manipulation}',
    '.tm-sw svg{width:100%;max-width:120px;height:auto;display:block;filter:drop-shadow(0 3px 3px #0004)}',
    '.tm-sw:hover{background:#fff}',
    '.tm-sw.pilih{border-color:#b8912f;background:#fff;box-shadow:0 0 0 2px #f4e4bc}'
  ].join('');

  var overlay, kartu, input, galat, tombolSw = {};

  function swatch(t) {
    var svg = el('svg', { viewBox: '0 0 72 30', 'aria-hidden': 'true' });
    if (!t.L) {
      svg.appendChild(el('rect', { x: 1, y: 1, width: 70, height: 28, rx: 14, fill: 'url(#btn-rim-g)', stroke: '#0c2a0a', 'stroke-width': 1.5 }));
      svg.appendChild(el('rect', { x: 5, y: 5, width: 62, height: 20, rx: 10, fill: 'url(#btn-well-g)', stroke: '#061c08', 'stroke-width': 1 }));
    } else {
      svg.appendChild(el('rect', { x: 1, y: 1, width: 70, height: 28, rx: 14, fill: 'url(#tm-rim-' + t.id + ')' }));
      ['tm-tone-' + t.id, 'tm-shade', 'tm-seam-' + t.id].forEach(function (id) {
        svg.appendChild(el('rect', { x: 3, y: 3, width: 66, height: 24, rx: 12, fill: 'url(#' + id + ')' }));
      });
    }
    svg.appendChild(el('rect', { x: 10, y: 5.5, width: 52, height: 7, rx: 3.5, fill: '#ffffff', opacity: 0.38 }));
    return svg;
  }

  function tandai() {
    for (var id in tombolSw) tombolSw[id].classList.toggle('pilih', id === aktif);
  }

  function buka() {
    kartu.classList.remove('terbuka');
    document.getElementById('tema-pass').classList.remove('salah');
    input.value = ''; galat.textContent = '';
    overlay.classList.add('open');
    setTimeout(function () { input.focus(); }, 50);
  }
  function tutup() { overlay.classList.remove('open'); input.blur(); }
  function cek() {
    if (input.value.trim() === KATA_SANDI) {
      kartu.classList.add('terbuka');
      input.value = ''; galat.textContent = '';
      tandai();
    } else {
      galat.textContent = 'Kata sandi salah';
      var p = document.getElementById('tema-pass');
      p.classList.remove('salah'); void p.offsetWidth; p.classList.add('salah');
      input.value = ''; input.focus();
    }
  }

  function bangunUI() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    /* tombol ikon palet: di baris kedua, tepat di bawah tombol RESET */
    var baris = document.querySelector('.controls .search-row');
    var btn = document.createElement('button');
    btn.className = 'btn'; btn.id = 'tema-btn'; btn.type = 'button';
    btn.setAttribute('aria-label', 'Pengaturan'); btn.title = '';
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5C6.8 2.5 2.5 6.6 2.5 11.7c0 5 4 8.8 8.6 8.8 1.5 0 2.3-.9 2.3-1.9 0-.6-.3-1.1-.6-1.5-.3-.4-.5-.8-.5-1.3 0-1 .8-1.8 1.9-1.8h2.4c2.4 0 4.4-1.9 4.4-4.3C21 5.9 17 2.5 12 2.5z" fill="#fff" stroke="#0c1f0a" stroke-width="1.2"/><circle cx="7.6" cy="11.4" r="1.7" fill="#e53935"/><circle cx="10.4" cy="7" r="1.7" fill="#fbc02d"/><circle cx="15.2" cy="7.2" r="1.7" fill="#1e88e5"/><circle cx="18" cy="11" r="1.7" fill="#43a047"/></svg>';
    btn.addEventListener('click', buka);
    if (baris) baris.insertBefore(btn, baris.firstChild);
    else document.querySelector('.controls-buttons').appendChild(btn);

    overlay = document.createElement('div'); overlay.id = 'tema-overlay';
    overlay.innerHTML =
      '<div id="tema-card"><button id="tema-close" type="button" aria-label="Tutup">✕</button>' +
      '<div id="tema-pass"><p>Masukkan kata sandi</p>' +
      '<input type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" id="tema-input">' +
      '<div class="tm-err"></div><button class="tm-ok" type="button">OK</button></div>' +
      '<div id="tema-pilih"></div></div>';
    document.body.appendChild(overlay);
    kartu = overlay.querySelector('#tema-card');
    input = overlay.querySelector('#tema-input');
    galat = overlay.querySelector('.tm-err');

    var grid = overlay.querySelector('#tema-pilih');
    TEMA.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'tm-sw'; b.setAttribute('aria-label', t.id);
      b.appendChild(swatch(t));
      b.addEventListener('click', function () { pilih(t.id); });
      grid.appendChild(b); tombolSw[t.id] = b;
    });

    overlay.addEventListener('click', function (e) { if (e.target === overlay) tutup(); });
    overlay.querySelector('#tema-close').addEventListener('click', tutup);
    overlay.querySelector('.tm-ok').addEventListener('click', cek);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') cek(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') tutup(); });
  }

  function mulai() {
    bangunDefs();
    bangunUI();
    wadah = document.getElementById('chart-container');
    if (wadah) {
      pengamat = new MutationObserver(tunda);
      pengamat.observe(wadah, { childList: true, subtree: true });
      terapkan();
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai);
  else mulai();
})();
