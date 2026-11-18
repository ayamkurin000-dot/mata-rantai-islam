/* Pengaturan model kartu (kapsul 3D). Ikon palet di bawah tombol RESET -> kata sandi -> pilih model.
   Model dipasang sebagai lapisan tambahan di atas kartu yang sudah digambar (app-1.js tidak diubah),
   dan otomatis dipasang lagi pada kartu baru saat cabang dibuka. Pilihan disimpan di perangkat. */
(function () {
  'use strict';
  var KATA_SANDI = '21';
  var KUNCI = 'mri-tema-kartu';
  var NS = 'http://www.w3.org/2000/svg';

  /* Palet: n = warna kartu biasa, w = warna kartu anggota Wali-9 (selalu beda dari n) */
  var PAL = [
    { id: 'biru-merah',      n: ['#2b95dd', '#d32f2f'], w: ['#f2b01e', '#2e7d32'] },
    { id: 'teal-merah',      n: ['#2f9fb0', '#d32f2f'], w: ['#f2b01e', '#7b3fa0'] },
    { id: 'putih-merah',     n: ['#f3f1ee', '#d6392b'], w: ['#1e6fc8', '#f2b01e'] },
    { id: 'putih-biru',      n: ['#f3f1ee', '#2b8fd6'], w: ['#d6392b', '#f2b01e'] },
    { id: 'biru-muda-merah', n: ['#a9cde3', '#d32f2f'], w: ['#2e7d32', '#f2b01e'] },
    { id: 'hijau-kuning',    n: ['#3aa84a', '#f2b01e'], w: ['#d32f2f', '#2b95dd'] },
    { id: 'ungu-pink',       n: ['#8e44ad', '#ec5fa0'], w: ['#f2b01e', '#1e88e5'] }
  ];
  /* 1 warna | 2 warna | 1 warna gradasi | 2 warna gradasi */
  var MODE = ['solid', 'split', 'grad1', 'grad2'];

  function el(n, a) {
    var e = document.createElementNS(NS, n);
    for (var k in a) e.setAttribute(k, a[k]);
    return e;
  }
  function f(n) { return Math.max(0, Math.min(1, n)).toFixed(4); }
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function hex(c) { return '#' + c.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function campur(h, t, x) { var a = rgb(h), b = rgb(t); return hex([0, 1, 2].map(function (i) { return a[i] + (b[i] - a[i]) * x; })); }
  function lum(h) { var c = rgb(h); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; }

  function grad(id, horiz, stops) {
    var g = el('linearGradient', { id: id, x1: 0, y1: 0, x2: horiz ? 1 : 0, y2: horiz ? 0 : 1 });
    stops.forEach(function (s) {
      g.appendChild(el('stop', { offset: f(s[0]), 'stop-color': s[1], 'stop-opacity': s[2] == null ? 1 : s[2] }));
    });
    return g;
  }
  function stopsTone(mode, c) {
    var A = c[0], B = c[1], s = 0.5;
    if (mode === 'solid') return [[0, A], [1, A]];
    if (mode === 'split') return [[0, A], [s, A], [s, B], [1, B]];
    if (mode === 'grad1') return [[0, campur(A, '#ffffff', 0.32)], [1, campur(A, '#000000', 0.22)]];
    return [[0, A], [1, B]];
  }
  function warnaPakai(mode, c) {
    return stopsTone(mode, c).map(function (x) { return x[1]; });
  }
  function terang(mode, c) {
    return warnaPakai(mode, c).some(function (h) { return lum(h) > 0.6; });
  }
  /* ujung kapsul agak gelap (+ garis sambungan bila 2 warna) */
  function stopsEdge(mode) {
    var e0 = [[0, '#000000', 0.30], [0.06, '#000000', 0.06], [0.12, '#000000', 0]];
    var e1 = [[0.88, '#000000', 0], [0.94, '#000000', 0.06], [1, '#000000', 0.30]];
    if (mode !== 'split') return e0.concat(e1);
    var s = 0.5;
    return e0.concat([
      [s - 0.14, '#000000', 0], [s - 0.012, '#000000', 0.10],
      [s - 0.012, '#000000', 0.40], [s, '#000000', 0.40],
      [s, '#ffffff', 0.55], [s + 0.008, '#ffffff', 0.55],
      [s + 0.008, '#000000', 0.10], [s + 0.07, '#000000', 0]
    ], e1);
  }
  var SHADE = [[0, '#ffffff', 0.34], [0.22, '#ffffff', 0.08], [0.5, '#000000', 0], [0.8, '#000000', 0.16], [1, '#000000', 0.42]];

  /* ---------- keadaan ---------- */
  var KUNCI2 = 'mri-tema-kartu-2';
  var keadaan = { p: 'asli', m: 'split' };
  try {
    var simpan = localStorage.getItem(KUNCI2);
    if (simpan) { var o = JSON.parse(simpan); if (o && o.p) keadaan = { p: o.p, m: o.m || 'split' }; }
    else { var lama = localStorage.getItem(KUNCI); if (lama) keadaan = { p: lama, m: 'split' }; }
  } catch (e) {}
  function palet(id) { for (var i = 0; i < PAL.length; i++) if (PAL[i].id === id) return PAL[i]; return null; }
  if (keadaan.p !== 'asli' && !palet(keadaan.p)) keadaan.p = 'asli';
  if (MODE.indexOf(keadaan.m) < 0) keadaan.m = 'split';
  function sig() { return keadaan.p + '|' + keadaan.m; }

  /* ---------- gradien global (dibuat ulang tiap pilihan berubah) ---------- */
  var defs;
  function isiDefs() {
    while (defs.firstChild) defs.removeChild(defs.firstChild);
    defs.appendChild(grad('tm-shade', false, SHADE));
    var pl = palet(keadaan.p);
    if (!pl) return;
    ['n', 'w'].forEach(function (k) {
      defs.appendChild(grad('tm-tone-' + k, true, stopsTone(keadaan.m, pl[k])));
      defs.appendChild(grad('tm-edge-' + k, true, stopsEdge(keadaan.m)));
    });
  }
  function bangunDefs() {
    var svg = el('svg', { width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false' });
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    defs = el('defs', {});
    svg.appendChild(defs);
    document.body.appendChild(svg);
    isiDefs();
  }

  /* ---------- pasang / lepas pada kartu ---------- */
  function lepas(g) {
    var ov = g.querySelectorAll('.tm-ov');
    for (var i = 0; i < ov.length; i++) ov[i].remove();
    var rim = g.querySelector('path[data-tmk="rim"]');
    if (rim) { rim.setAttribute('fill', rim.getAttribute('data-tmf')); rim.setAttribute('stroke', rim.getAttribute('data-tms')); }
    var wl = g.querySelector('path[data-tmk="well"]');
    if (wl) wl.removeAttribute('display');
    g.classList.remove('tm-terang');
    g.removeAttribute('data-tm');
  }

  function pasang(g, pl) {
    var paths = g.querySelectorAll('path.aged-ov');
    var rim = null, well = null, wali = false;
    for (var i = 0; i < paths.length; i++) {
      var p = paths[i], fl = p.getAttribute('fill'), k = p.getAttribute('data-tmk');
      if (!k) {
        if (fl === 'url(#btn-rim-g)' || fl === 'url(#btn-rim)') {
          k = 'rim'; p.setAttribute('data-tmk', k); p.setAttribute('data-tmf', fl);
          p.setAttribute('data-tms', p.getAttribute('stroke') || 'none');
          if (fl === 'url(#btn-rim)') p.setAttribute('data-tmw', '1');
        } else if (fl === 'url(#btn-well-g)' || fl === 'url(#btn-well)') {
          k = 'well'; p.setAttribute('data-tmk', k);
        }
      }
      if (k === 'rim') { rim = p; wali = p.getAttribute('data-tmw') === '1'; }
      else if (k === 'well') { well = p; if (p.getAttribute('fill') === 'url(#btn-well)') wali = true; }
    }
    if (!well) return;               /* lingkaran Nabi dan bentuk lain: dilewati */
    var lama = g.querySelectorAll('.tm-ov');
    for (var j = 0; j < lama.length; j++) lama[j].remove();
    var dasar = rim || well;
    if (rim) { rim.setAttribute('fill', 'none'); rim.setAttribute('stroke', 'none'); }
    well.setAttribute('display', 'none');
    var kk = wali ? 'w' : 'n';
    var d = dasar.getAttribute('d'), tr = dasar.getAttribute('transform'), ref = dasar;
    ['tm-tone-' + kk, 'tm-shade', 'tm-edge-' + kk].forEach(function (id) {
      var c = el('path', { d: d, fill: 'url(#' + id + ')', 'pointer-events': 'none', class: 'tm-ov' });
      if (tr) c.setAttribute('transform', tr);
      ref.parentNode.insertBefore(c, ref.nextSibling);
      ref = c;
    });
    g.classList.toggle('tm-terang', terang(keadaan.m, pl[kk]));
    g.setAttribute('data-tm', sig());
  }

  var sibuk = false, jadwal = 0, pengamat = null, wadah = null;
  function terapkan() {
    jadwal = 0;
    if (!wadah) return;
    sibuk = true;
    if (pengamat) pengamat.disconnect();
    var pl = palet(keadaan.p), sg = sig();
    var semua = wadah.querySelectorAll('g.node-shape');
    for (var i = 0; i < semua.length; i++) {
      var g = semua[i];
      if (!pl) { if (g.getAttribute('data-tm')) lepas(g); }
      else if (g.getAttribute('data-tm') !== sg) pasang(g, pl);
    }
    if (pengamat) pengamat.observe(wadah, { childList: true, subtree: true });
    sibuk = false;
  }
  function tunda() {
    if (sibuk || jadwal) return;
    jadwal = requestAnimationFrame(terapkan);
  }

  /* kotak TOKOH ISLAM (HTML biasa) ikut tema dengan CSS */
  function rgba(h, a) { var c = rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  function cssG(dir, st) {
    return 'linear-gradient(' + dir + ',' + st.map(function (x) {
      return rgba(x[1], x[2] == null ? 1 : x[2]) + ' ' + (x[0] * 100).toFixed(2) + '%';
    }).join(',') + ')';
  }
  function temaTokoh() {
    var st = document.getElementById('tm-tokoh-css'), pl = palet(keadaan.p);
    if (!pl) { if (st) st.remove(); return; }
    if (!st) { st = document.createElement('style'); st.id = 'tm-tokoh-css'; document.head.appendChild(st); }
    var B = '#tokoh-root-box,#tokoh-dunia-root-box';
    var gelap = terang(keadaan.m, pl.n);
    st.textContent =
      B + '{background:' + [cssG('to right', stopsEdge(keadaan.m)), cssG('to bottom', SHADE), cssG('to right', stopsTone(keadaan.m, pl.n))].join(',') + '!important;border:none!important;border-radius:9999px!important;box-shadow:0 2px 6px #0004!important}' +
      B.split(',').map(function (x) { return x + ':before'; }).join(',') + '{inset:3px 9px!important;border-radius:9999px!important;box-shadow:none!important;background:linear-gradient(#ffffff59,#ffffff00) top / 100% 46% no-repeat!important}' +
      B.split(',').map(function (x) { return x + ' .tokoh-root-text'; }).join(',') + '{' +
      (gelap ? 'color:#0b1220!important;text-shadow:none!important;-webkit-text-stroke:2.6px #fff;paint-order:stroke fill' : 'color:#fff!important') + '}';
  }

  function ubah(p, m) {
    if (p) keadaan.p = p;
    if (m) { keadaan.m = m; if (keadaan.p === 'asli') keadaan.p = PAL[0].id; }
    try { localStorage.setItem(KUNCI2, JSON.stringify(keadaan)); } catch (e) {}
    isiDefs();
    temaTokoh();
    terapkan();
    gambarPanel();
  }

  /* ---------- antarmuka ---------- */
  var css = [
    '#tema-btn{padding:3px 8px!important;line-height:1;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}',
    '#tema-btn svg{width:15px;height:15px;display:block}',
    '.node-shape[data-tm] .body-stroke,.node-shape[data-tm] .real-body{stroke:none}',
    '.node-shape.tm-terang text{fill:#0b1220!important;filter:none!important;stroke:#fff;stroke-width:2.6px;paint-order:stroke fill;stroke-linejoin:round}',
    '.node-shape.tm-terang .wali9-badge text{fill:#dc2626!important;stroke:none}',
    '#tema-overlay{position:fixed;inset:0;background:#0f172a8c;z-index:27000;display:none;align-items:center;justify-content:center;padding:16px}',
    '#tema-overlay.open{display:flex}',
    '#tema-card{position:relative;width:360px;max-width:94vw;max-height:94vh;overflow-y:auto;background:linear-gradient(175deg,#fffdf7,#fbf3e1 55%,#f6ead0);border:4px double #a9873a;border-radius:14px;box-shadow:0 14px 34px #00000080;padding:22px 16px 18px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif}',
    '#tema-close{position:absolute;top:8px;right:8px;width:34px;height:34px;border-radius:8px;border:1px solid #a9873a;background:#fff8;color:#3a2a06;font-weight:800;cursor:pointer;touch-action:manipulation;z-index:2}',
    '#tema-pass{text-align:center}',
    '#tema-pass p{font-size:.8rem;font-weight:700;color:#3a2a06;margin:6px 0 12px}',
    '#tema-pass input{width:140px;text-align:center;font-size:1.3rem;letter-spacing:6px;padding:8px 10px;border:1.5px solid #a9873a;border-radius:8px;background:#fff;outline:none}',
    '#tema-pass input:focus{box-shadow:0 0 0 3px #d4af3766}',
    '#tema-pass .tm-err{height:16px;margin-top:8px;font-size:.7rem;font-weight:700;color:#b91c1c}',
    '#tema-pass .tm-ok{margin-top:6px;padding:7px 26px;border:none;border-radius:8px;font-weight:800;font-size:.8rem;color:#fff;cursor:pointer;background:linear-gradient(#3aa84a,#1b7a2c 55%,#0c4a18);box-shadow:0 0 0 1px #0c1f0a,0 2px 5px #0006;text-shadow:0 1px 0 #000a}',
    '#tema-pass.salah input{animation:tmGoyang .35s}',
    '@keyframes tmGoyang{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}',
    '#tema-pilih{display:none;padding-top:18px}',
    '#tema-card.terbuka #tema-pass{display:none}',
    '#tema-card.terbuka #tema-pilih{display:block}',
    '#tema-mode{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}',
    '#tema-pal{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}',
    '#tema-pilih hr{border:none;height:2px;margin:14px 0;background:linear-gradient(90deg,transparent,#c9a227,transparent)}',
    '.tm-sw{border:2px solid transparent;border-radius:12px;background:#ffffff80;padding:6px 3px;cursor:pointer;display:flex;align-items:center;justify-content:center;touch-action:manipulation}',
    '.tm-sw svg{width:100%;height:auto;display:block;filter:drop-shadow(0 2px 2px #0004)}',
    '.tm-sw:hover{background:#fff}',
    '.tm-sw.pilih{border-color:#b8912f;background:#fff;box-shadow:0 0 0 2px #f4e4bc}'
  ].join('');

  var overlay, kartu, input, galat, gridMode, gridPal, nomor = 0;

  /* kapsul kecil untuk ikon; gradien dibuat di dalam svg-nya sendiri */
  function kapsul(svg, ld, y, h, mode, c) {
    var id = 'tmx' + (++nomor), rx = h / 2;
    ld.appendChild(grad(id + 't', true, stopsTone(mode, c)));
    ld.appendChild(grad(id + 'e', true, stopsEdge(mode)));
    [id + 't', 'tm-shade', id + 'e'].forEach(function (u) {
      svg.appendChild(el('rect', { x: 1, y: y, width: 70, height: h, rx: rx, fill: 'url(#' + u + ')' }));
    });
    svg.appendChild(el('rect', { x: h * 0.45, y: y + h * 0.16, width: 72 - h * 0.9 - 2, height: h * 0.26, rx: h * 0.13, fill: '#fff', opacity: 0.38 }));
  }
  function ikonMode(mode) {
    var pl = palet(keadaan.p) || PAL[0];
    var svg = el('svg', { viewBox: '0 0 72 30', 'aria-hidden': 'true' }), ld = el('defs', {});
    svg.appendChild(ld);
    kapsul(svg, ld, 1, 28, mode, pl.n);
    return svg;
  }
  function ikonPalet(pl) {
    var svg = el('svg', { viewBox: '0 0 72 44', 'aria-hidden': 'true' }), ld = el('defs', {});
    svg.appendChild(ld);
    if (!pl) {
      svg.appendChild(el('rect', { x: 1, y: 1, width: 70, height: 19, rx: 9.5, fill: 'url(#btn-well-g)', stroke: '#0c2a0a', 'stroke-width': 1.2 }));
      svg.appendChild(el('rect', { x: 1, y: 24, width: 70, height: 19, rx: 9.5, fill: 'url(#btn-well)', stroke: '#2a0f04', 'stroke-width': 1.2 }));
      svg.appendChild(el('rect', { x: 9, y: 4, width: 54, height: 5, rx: 2.5, fill: '#fff', opacity: 0.38 }));
      svg.appendChild(el('rect', { x: 9, y: 27, width: 54, height: 5, rx: 2.5, fill: '#fff', opacity: 0.38 }));
    } else {
      kapsul(svg, ld, 1, 19, keadaan.m, pl.n);
      kapsul(svg, ld, 24, 19, keadaan.m, pl.w);
    }
    return svg;
  }
  function tombol(svg, aktifIni, aksi, label) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tm-sw' + (aktifIni ? ' pilih' : ''); b.setAttribute('aria-label', label);
    b.appendChild(svg); b.addEventListener('click', aksi);
    return b;
  }
  function gambarPanel() {
    if (!gridMode) return;
    gridMode.innerHTML = ''; gridPal.innerHTML = '';
    MODE.forEach(function (m) {
      gridMode.appendChild(tombol(ikonMode(m), keadaan.p !== 'asli' && keadaan.m === m, function () { ubah(null, m); }, m));
    });
    gridPal.appendChild(tombol(ikonPalet(null), keadaan.p === 'asli', function () { ubah('asli', null); }, 'asli'));
    PAL.forEach(function (pl) {
      gridPal.appendChild(tombol(ikonPalet(pl), keadaan.p === pl.id, function () { ubah(pl.id, null); }, pl.id));
    });
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
      gambarPanel();
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
      '<div id="tema-pilih"><div id="tema-mode"></div><hr><div id="tema-pal"></div></div></div>';
    document.body.appendChild(overlay);
    kartu = overlay.querySelector('#tema-card');
    input = overlay.querySelector('#tema-input');
    galat = overlay.querySelector('.tm-err');
    gridMode = overlay.querySelector('#tema-mode');
    gridPal = overlay.querySelector('#tema-pal');

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
    temaTokoh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mulai);
  else mulai();
})();
