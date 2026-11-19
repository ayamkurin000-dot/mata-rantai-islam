/* Aliran energi dari kartu NABI MUHAMMAD SAW.
   Kartu Nabi "mengisi daya", lalu memancarkan energi (listrik / cahaya / air / api / nur) yang mengalir lewat
   garis-garis penghubung ke kartu berikutnya, satu per satu. Setiap kartu yang terkena aliran bergetar dan
   menyala, lalu meneruskan aliran ke kartu di bawah/di cabangnya. Gelombang diulang terus-menerus.

   Cara kerja (app-1.js tidak diubah):
   - Susunan kartu dibaca dari DOM yang sedang tampil: rantai utama (.node-block + .connector), kotak TOKOH,
     dan cabang keturunan (.desc-anchor.open dengan path.desc-link). Hanya yang terbuka yang ikut dialiri.
   - Aliran digambar di kanvas di atas peta (pointer-events: none), kartu digetarkan dengan properti CSS
     `translate` (tidak mengganggu atribut transform milik app-1.js).
   - Jenis & kekuatan energi diatur di panel Tema (js/tema-animasi.js). */
(function () {
  'use strict';
  if (window.__energiJalan) return;
  window.__energiJalan = true;
  var cont = document.getElementById('chart-container');
  if (!cont) return;

  var S = (window.MRI_ANIM && window.MRI_ANIM.get()) || { energi: 'listrik', kuat: 2 };
  var DUKUNG_T = !!(window.CSS && CSS.supports && CSS.supports('translate', '1px 1px'));

  /* ---------- konstanta ---------- */
  var KEC = 380;          /* kecepatan aliran (px peta per detik) */
  var MINHOP = 0.28, MAXHOP = 0.85;
  var GESER = 0.09;       /* jeda antar kartu bersaudara, agar bergantian */
  var DUR_HIT = 1.15;     /* lama kartu bergetar/menyala */
  var DUR_AKAR = 2.3;     /* lama kartu Nabi (mengisi daya lalu memancar) */
  var CHARGE = 0.8;       /* lama pengisian daya sebelum aliran keluar */
  var TAHAN = 0.8;        /* lama garis tetap menyala setelah aliran lewat */
  var MAXP = 240;         /* batas partikel */
  var KM = [0.6, 1, 1.5]; /* pengali kekuatan: halus / sedang / kuat */
  var JENIS = ['listrik', 'cahaya', 'air', 'api', 'nur'];
  var RGB = {
    listrik: { a: [56, 189, 248], b: [224, 242, 254], c: [253, 224, 71] },
    cahaya: { a: [251, 191, 36], b: [255, 251, 235], c: [253, 230, 138] },
    air: { a: [14, 165, 233], b: [186, 230, 253], c: [125, 211, 252] },
    api: { a: [249, 115, 22], b: [253, 224, 71], c: [239, 68, 68] },
    nur: { a: [16, 185, 129], b: [209, 250, 229], c: [251, 191, 36] }
  };
  var AURA = [[3.5, 17, 0.07], [2.5, 10, 0.13], [1.8, 6, 0.22], [0.8, 3, 0.5]];
  var SEGI4 = new Path2D('M0,-1 Q0.1,-0.1 1,0 Q0.1,0.1 0,1 Q-0.1,0.1 -1,0 Q-0.1,-0.1 0,-1 Z');

  /* ---------- kanvas ---------- */
  var cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:49';
  document.body.appendChild(cv);
  var cx = cv.getContext('2d');
  var W = 0, H = 0, dpr = 1;
  function ukur() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }

  /* ---------- alat kecil ---------- */
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function batas(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function rg(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + batas(a, 0, 1).toFixed(3) + ')'; }
  function skala() { var r = cont.getBoundingClientRect(), w = cont.offsetWidth || 1; return (r.width / w) || 1; }
  function tampak(el) { var r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1; }
  function kelihatan(r, m) { return !(r.right < -m || r.left > W + m || r.bottom < -m || r.top > H + m); }

  function jalurRR(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    cx.beginPath();
    cx.moveTo(x + r, y);
    cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r);
    cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r);
    cx.closePath();
  }
  /* titik di keliling kapsul/lingkaran: t 0..1 -> [x, y, normalX, normalY] */
  function keliling(x, y, w, h, t) {
    var r = Math.min(w, h) / 2, s = Math.max(0, w - 2 * r), P = 2 * s + 2 * Math.PI * r, d = t * P, a;
    if (d < s) return [x + r + d, y, 0, -1];
    d -= s;
    if (d < Math.PI * r) { a = -Math.PI / 2 + d / r; return [x + w - r + Math.cos(a) * r, y + r + Math.sin(a) * r, Math.cos(a), Math.sin(a)]; }
    d -= Math.PI * r;
    if (d < s) return [x + w - r - d, y + h, 0, 1];
    d -= s;
    a = Math.PI / 2 + d / r;
    return [x + r + Math.cos(a) * r, y + r + Math.sin(a) * r, Math.cos(a), Math.sin(a)];
  }
  function panjangPoli(p) {
    var L = 0, i; p.cum = [0];
    for (i = 1; i < p.length; i++) { L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); p.cum.push(L); }
    p.L = L; return L;
  }
  /* titik-titik sepanjang [s0,s1] pada garis patah: [x, y, normalX, normalY] */
  function ambil(p, s0, s1, langkah) {
    var out = [], n = Math.max(2, Math.ceil((s1 - s0) / Math.max(1, langkah)) + 1), j = 1, i;
    for (i = 0; i < n; i++) {
      var s = s0 + (s1 - s0) * i / (n - 1);
      while (j < p.length - 1 && p.cum[j] < s) j++;
      var a = p[j - 1], b = p[j], seg = (p.cum[j] - p.cum[j - 1]) || 1;
      var f = batas((s - p.cum[j - 1]) / seg, 0, 1);
      out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, -(b[1] - a[1]) / seg, (b[0] - a[0]) / seg]);
    }
    return out;
  }
  function jalurDari(seg, simpang) {
    var P = new Path2D(), i, o;
    for (i = 0; i < seg.length; i++) {
      o = simpang ? simpang(i, seg.length) : 0;
      var x = seg[i][0] + seg[i][2] * o, y = seg[i][1] + seg[i][3] * o;
      if (i === 0) P.moveTo(x, y); else P.lineTo(x, y);
    }
    return P;
  }
  function garis3(P, lw, kol) {   /* tiga lapis goresan: sinar lebar, tengah, inti */
    cx.lineJoin = 'round'; cx.lineCap = 'round';
    for (var i = 0; i < lw.length; i++) { cx.lineWidth = lw[i]; cx.strokeStyle = kol[i]; cx.stroke(P); }
  }

  /* ---------- partikel ---------- */
  var partikel = [];
  function lahir(tp, x, y, vx, vy, m, r, c) {
    if (partikel.length >= MAXP) return;
    partikel.push({ tp: tp, x: x, y: y, vx: vx, vy: vy, u: 0, m: m, r: r, c: c, ph: Math.random() * 6.283 });
  }
  function langkahPartikel(dt) {
    for (var i = partikel.length - 1; i >= 0; i--) {
      var q = partikel[i];
      q.u += dt;
      if (q.u >= q.m) { partikel[i] = partikel[partikel.length - 1]; partikel.pop(); continue; }
      var f = q.u / q.m, a = 1 - f;
      q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.tp === 'percik') {
        q.vx *= 0.94; q.vy = q.vy * 0.94 + 120 * dt;
        cx.strokeStyle = rg(q.c, a); cx.lineWidth = q.r; cx.lineCap = 'round';
        cx.beginPath(); cx.moveTo(q.x, q.y); cx.lineTo(q.x - q.vx * 0.04, q.y - q.vy * 0.04); cx.stroke();
      } else if (q.tp === 'tetes') {
        q.vy += 520 * dt;
        cx.fillStyle = rg(q.c, a * 0.9);
        cx.beginPath(); cx.arc(q.x, q.y, q.r * (1 - 0.3 * f), 0, 6.283); cx.fill();
        cx.fillStyle = 'rgba(255,255,255,' + (0.7 * a).toFixed(3) + ')';
        cx.beginPath(); cx.arc(q.x - q.r * 0.3, q.y - q.r * 0.3, q.r * 0.3, 0, 6.283); cx.fill();
      } else if (q.tp === 'api') {
        q.vy -= 60 * dt; q.x += Math.sin(q.u * 18 + q.ph) * 16 * dt;
        var col = f < 0.3 ? RGB.api.b : (f < 0.65 ? RGB.api.a : RGB.api.c);
        cx.fillStyle = rg(col, a * 0.9);
        cx.beginPath(); cx.arc(q.x, q.y, Math.max(0.3, q.r * (1 - f * 0.75)), 0, 6.283); cx.fill();
      } else {   /* bintang kecil berkilau */
        q.vx *= 0.98; q.vy -= 10 * dt;
        var s = q.r * (0.5 + 1.1 * (1 - Math.abs(0.5 - f) * 2));
        cx.save(); cx.translate(q.x, q.y); cx.rotate(q.ph + q.u * 2); cx.scale(s, s);
        cx.fillStyle = rg(q.c, Math.min(1, a * 1.6)); cx.fill(SEGI4);
        cx.restore();
      }
    }
  }

  /* ================= GRAF KARTU (dibaca dari DOM) ================= */
  var idNode = 0;
  function bangunGraf() {
    var nodes = [], peta = new Map();
    function node(el, html) {
      var n = peta.get(el);
      if (!n) { n = { el: el, html: !!html, kids: [], par: null, edgeIn: null, id: ++idNode }; peta.set(el, n); nodes.push(n); }
      return n;
    }
    function sambung(a, b, e) {
      if (!a || !b || a === b || b.par) return;
      e.a = a; e.b = b; b.par = a; b.edgeIn = e; a.kids.push(b);
    }
    /* 1) rantai utama: Nabi -> Fatimah -> ... -> Syekh Jumadil Qubro */
    var blok = [].filter.call(cont.children, function (e) { return e.classList.contains('node-block'); });
    var prev = null, akhirBlok = null;
    blok.forEach(function (b) {
      var sh = b.querySelector(':scope > svg > g.node-shape');
      if (!sh) return;
      var n = node(sh, false);
      if (prev) {
        var k = b.querySelector(':scope > .connector');
        sambung(prev, n, k ? { kind: 'div', el: k, len: k.offsetHeight || 18 } : { kind: 'virt', len: 30 });
      }
      prev = n; akhirBlok = b;
    });
    /* 2) kotak TOKOH ISLAM NUSANTARA & DUNIA di bawah kartu terakhir */
    if (prev && akhirBlok) {
      var pp = prev;
      ['#tokoh-root-box', '#tokoh-dunia-root-box'].forEach(function (sel) {
        var kb = akhirBlok.querySelector(sel);
        if (!kb || !tampak(kb)) return;
        var n = node(kb, true);
        sambung(pp, n, { kind: 'virt', len: 36 });
        pp = n;
      });
    }
    /* 3) cabang keturunan yang sedang terbuka: induknya = kartu di sebelah lencana +/- */
    function telusur(anchor) {
      var badge = anchor.previousElementSibling;
      if (!badge || !badge.classList.contains('expand-badge') || !tampak(anchor)) return;
      var host = badge.parentElement, rb = badge.getBoundingClientRect();
      var bx = rb.left + rb.width / 2, by = rb.top + rb.height / 2;
      var cand = host.querySelectorAll(':scope > svg g.node-shape, :scope > [id$="root-box"]');
      var best = null, bd = 1e12, j;
      for (j = 0; j < cand.length; j++) {
        var r = cand[j].getBoundingClientRect();
        if (r.width < 1) continue;
        var dx = r.right - bx, dy = (r.top + r.height / 2) - by, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = cand[j]; }
      }
      if (!best) return;
      var pn = peta.get(best) || node(best, /root-box$/.test(best.id || ''));
      var svg = anchor.querySelector(':scope > svg'), g = svg && svg.querySelector(':scope > g');
      if (!g) return;
      var lp = null;
      for (var c = g.firstElementChild; c; c = c.nextElementSibling) {
        if (c.tagName.toLowerCase() === 'path' && c.classList.contains('desc-link')) lp = c;
        else if (c.classList.contains('node-shape')) {
          var cn = node(c, false);
          sambung(pn, cn, lp ? { kind: 'path', el: lp, svg: svg, len: lp.getTotalLength() + 28 } : { kind: 'virt', len: 60 });
          lp = null;
        }
      }
    }
    var an = cont.querySelectorAll('.desc-anchor.open');
    for (var i = 0; i < an.length; i++) telusur(an[i]);
    return { nodes: nodes };
  }

  /* jadwal gelombang: kapan tiap garis mulai dialiri dan kapan tiap kartu terkena */
  function susun(graf) {
    var akar = graf.nodes[0];
    if (!akar) return null;
    var N = [{ n: akar, t: 0, d: DUR_AKAR, akar: true }], E = [], antri = [akar], tmax = DUR_AKAR;
    akar.arr = 0;
    while (antri.length) {
      var n = antri.shift(), t0 = (n === akar) ? CHARGE : n.arr + 0.05;
      for (var i = 0; i < n.kids.length; i++) {
        var c = n.kids[i], e = c.edgeIn;
        if (!e) continue;
        var mulai = t0 + Math.min(i * GESER, 0.7), dur = batas(e.len / KEC, MINHOP, MAXHOP);
        c.arr = mulai + dur;
        E.push({ e: e, t: mulai, d: dur });
        N.push({ n: c, t: c.arr, d: DUR_HIT });
        if (c.arr + DUR_HIT > tmax) tmax = c.arr + DUR_HIT;
        antri.push(c);
      }
    }
    var urut = function (a, b) { return a.t - b.t; };
    N.sort(urut); E.sort(urut);
    return { N: N, E: E, tmax: tmax };
  }

  /* garis patah (koordinat layar) sebuah penghubung, dihitung ulang tiap bingkai agar ikut geser/zoom */
  function cuplik(path) {
    var L = path.getTotalLength(), pts = [], i, q;
    for (i = 0; i <= 14; i++) { q = path.getPointAtLength(L * i / 14); pts.push([q.x, q.y]); }
    return pts;
  }
  function poliEdge(e) {
    var ra, rb, p;
    if (e.kind === 'div') {
      var r = e.el.getBoundingClientRect();
      if (!r.height) return null;
      var xm = r.left + r.width / 2;
      p = [[xm, r.top - 1], [xm, r.bottom + 1]];
    } else if (e.kind === 'virt') {
      ra = e.a.el.getBoundingClientRect(); rb = e.b.el.getBoundingClientRect();
      if (!ra.width || !rb.width) return null;
      p = [[ra.left + ra.width / 2, ra.bottom - ra.height * 0.25], [rb.left + rb.width / 2, rb.top + rb.height * 0.25]];
    } else {
      var svg = e.svg, rs = svg.getBoundingClientRect(), vb = svg.viewBox && svg.viewBox.baseVal, m = e.el.getCTM();
      if (!m || !rs.width) return null;
      var vw = (vb && vb.width) || rs.width, vh = (vb && vb.height) || rs.height, vx = (vb && vb.x) || 0, vy = (vb && vb.y) || 0;
      var loc = e.loc || (e.loc = cuplik(e.el));
      ra = e.a.el.getBoundingClientRect();
      p = [[ra.right, ra.top + ra.height / 2]];
      for (var i = 0; i < loc.length; i++) {
        var x = m.a * loc[i][0] + m.c * loc[i][1] + m.e, y = m.b * loc[i][0] + m.d * loc[i][1] + m.f;
        p.push([rs.left + (x - vx) * rs.width / vw, rs.top + (y - vy) * rs.height / vh]);
      }
    }
    panjangPoli(p);
    return p.L > 1 ? p : null;
  }

  /* ================= GAMBAR ALIRAN DI GARIS ================= */
  function kepala(seg) { return seg[seg.length - 1]; }
  function alirListrik(pts, s1, p, fade, k, km, c) {
    var seg = ambil(pts, 0, s1, 7 * k), amp = (2.6 + 2.4 * km) * k;
    var P = jalurDari(seg, function (i, n) { return (i === 0 || i === n - 1) ? 0 : (Math.random() * 2 - 1) * amp; });
    garis3(P, [7 * k, 3.2 * k, 1.4 * k], [rg(c.a, 0.26 * fade), rg(c.a, 0.85 * fade), rg(c.b, fade)]);
    var h = kepala(seg);
    if (p < 1) {
      cx.fillStyle = rg(c.b, 0.9); cx.beginPath(); cx.arc(h[0], h[1], (3.5 + 2.5 * km) * k, 0, 6.283); cx.fill();
      cx.fillStyle = rg(c.a, 0.3); cx.beginPath(); cx.arc(h[0], h[1], (9 + 5 * km) * k, 0, 6.283); cx.fill();
      if (Math.random() < 0.7) lahir('percik', h[0], h[1], rnd(-140, 140), rnd(-140, 140), rnd(0.2, 0.45), 1.6 * k + 0.4, c.b);
    }
  }
  function orb(x, y, r, c, inti) {
    var g = cx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rg(inti || c.b, 0.98)); g.addColorStop(0.3, rg(c.c, 0.6)); g.addColorStop(1, rg(c.a, 0));
    cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r, 0, 6.283); cx.fill();
  }
  function alirCahaya(pts, s1, p, fade, k, km, c, tt) {
    var seg = ambil(pts, 0, s1, 10 * k), P = jalurDari(seg);
    garis3(P, [10 * k, 5.5 * k, 2.4 * k], [rg(c.a, 0.1 * fade), rg(c.a, 0.26 * fade), rg(c.b, 0.92 * fade)]);
    var h = kepala(seg);
    if (p < 1) {
      var r = (13 + 7 * km) * k;
      orb(h[0], h[1], r, c);
      cx.strokeStyle = rg(c.b, 0.75); cx.lineWidth = 1.4 * k; cx.lineCap = 'round';
      var a = tt * 3;
      cx.beginPath();
      cx.moveTo(h[0] - Math.cos(a) * r * 1.7, h[1] - Math.sin(a) * r * 1.7); cx.lineTo(h[0] + Math.cos(a) * r * 1.7, h[1] + Math.sin(a) * r * 1.7);
      cx.moveTo(h[0] - Math.sin(a) * r * 1.2, h[1] + Math.cos(a) * r * 1.2); cx.lineTo(h[0] + Math.sin(a) * r * 1.2, h[1] - Math.cos(a) * r * 1.2);
      cx.stroke();
      if (Math.random() < 0.35 * km) lahir('bintang', h[0] + rnd(-8, 8) * k, h[1] + rnd(-8, 8) * k, rnd(-20, 20), rnd(-30, 5), rnd(0.5, 0.9), rnd(2.5, 4.5) * k, Math.random() < 0.5 ? c.b : c.c);
    }
  }
  function alirAir(pts, s1, p, fade, k, km, c, tt) {
    var seg = ambil(pts, 0, s1, 6 * k), amp = (2.2 + 1.4 * km) * k;
    var P = jalurDari(seg, function (i, n) { return (i === 0) ? 0 : Math.sin(i * 0.95 - tt * 10) * amp; });
    garis3(P, [7 * k, 3.4 * k, 1.2 * k], [rg(c.a, 0.24 * fade), rg(c.c, 0.78 * fade), rg(c.b, 0.85 * fade)]);
    var h = kepala(seg);
    if (p < 1) {
      for (var i = 0; i < 4; i++) {
        var s = Math.max(0, s1 - i * 9 * k), q = ambil(pts, s, s, 1)[0], rr = (5.5 + 2 * km - i * 1.1) * k;
        cx.fillStyle = rg(i === 0 ? c.a : c.c, 0.9 - i * 0.15);
        cx.beginPath(); cx.arc(q[0], q[1], Math.max(1, rr), 0, 6.283); cx.fill();
        if (i === 0) { cx.fillStyle = 'rgba(255,255,255,.75)'; cx.beginPath(); cx.arc(q[0] - rr * 0.3, q[1] - rr * 0.3, rr * 0.35, 0, 6.283); cx.fill(); }
      }
      if (Math.random() < 0.3 * km) lahir('tetes', h[0], h[1], rnd(-40, 40), rnd(-120, -30), rnd(0.4, 0.7), rnd(1.8, 3.2) * k, c.c);
    }
  }
  function alirApi(pts, s1, p, fade, k, km, c) {
    var seg = ambil(pts, 0, s1, 8 * k), P = jalurDari(seg, function (i, n) { return (Math.random() * 2 - 1) * 1.6 * k; });
    var fl = 0.85 + Math.random() * 0.3;
    garis3(P, [9 * k * fl, 5 * k, 2 * k], [rg(c.c, 0.17 * fade), rg(c.a, 0.55 * fade), rg(c.b, 0.95 * fade)]);
    var h = kepala(seg);
    if (p < 1) {
      orb(h[0], h[1], (9 + 5 * km) * k * (0.85 + Math.random() * 0.3), c);
      var n = 1 + Math.round(2 * km * Math.random() + 1);
      while (n--) lahir('api', h[0] + rnd(-4, 4) * k, h[1] + rnd(-3, 3) * k, rnd(-18, 18), rnd(-70, -25), rnd(0.35, 0.7), rnd(2.2, 4.2) * k, c.a);
    } else if (Math.random() < 0.5 * fade) {
      var t = Math.random(), z = ambil(pts, pts.L * t, pts.L * t, 1)[0];
      lahir('api', z[0], z[1], rnd(-10, 10), rnd(-50, -20), rnd(0.3, 0.55), rnd(1.6, 3) * k, c.a);
    }
  }
  function alirNur(pts, s1, p, fade, k, km, c, tt) {
    var seg = ambil(pts, 0, s1, 10 * k), P = jalurDari(seg);
    garis3(P, [9 * k, 4.5 * k, 1.8 * k], [rg(c.a, 0.15 * fade), rg(c.a, 0.38 * fade), rg(c.b, 0.95 * fade)]);
    var h = kepala(seg);
    if (p < 1) {
      var r = (10 + 5 * km) * k;
      orb(h[0], h[1], r, c, c.b);
      cx.strokeStyle = rg(c.c, 0.7 + 0.2 * Math.sin(tt * 9)); cx.lineWidth = 1.4 * k;
      cx.beginPath(); cx.arc(h[0], h[1], r * (0.55 + 0.2 * Math.sin(tt * 7)), 0, 6.283); cx.stroke();
      if (Math.random() < 0.4 * km) lahir('bintang', h[0] + rnd(-9, 9) * k, h[1] + rnd(-9, 9) * k, rnd(-15, 15), rnd(-25, 5), rnd(0.6, 1.0), rnd(2.2, 4) * k, Math.random() < 0.6 ? c.c : c.b);
    }
  }
  function gambarAliran(jenis, pts, p, fade, k, km, tt) {
    var s1 = Math.max(0.5, Math.min(1, p) * pts.L), c = RGB[jenis];
    if (jenis === 'listrik') alirListrik(pts, s1, p, fade, k, km, c);
    else if (jenis === 'cahaya') alirCahaya(pts, s1, p, fade, k, km, c, tt);
    else if (jenis === 'air') alirAir(pts, s1, p, fade, k, km, c, tt);
    else if (jenis === 'api') alirApi(pts, s1, p, fade, k, km, c);
    else alirNur(pts, s1, p, fade, k, km, c, tt);
  }

  /* ================= EFEK PADA KARTU ================= */
  function aura(x, y, w, h, col, env, s, flik) {
    var r0 = Math.min(w, h) / 2;
    for (var i = 0; i < AURA.length; i++) {
      var L = AURA[i], pad = L[0] * s;
      jalurRR(x - pad, y - pad, w + 2 * pad, h + 2 * pad, r0 + pad);
      cx.lineWidth = L[1] * s; cx.strokeStyle = rg(col, L[2] * env * flik); cx.stroke();
    }
  }
  function busur(px, py, nx, ny, len, c) {
    var P = new Path2D(), x = px, y = py, n = 4, i, sx = -ny, sy = nx;
    P.moveTo(x, y);
    for (i = 1; i <= n; i++) {
      var o = (Math.random() * 2 - 1) * len * 0.34;
      x = px + nx * len * i / n + sx * o; y = py + ny * len * i / n + sy * o;
      P.lineTo(x, y);
    }
    garis3(P, [4, 1.6], [rg(c.a, 0.45), rg(c.b, 0.95)]);
    return [x, y];
  }
  function efekKartu(jenis, r, u, env, tt, km, k, akar) {
    var x = r.left, y = r.top, w = r.width, h = r.height, cr = Math.min(w, h) / 2, c = RGB[jenis];
    var mx = x + w / 2, my = y + h / 2, i, q, M = akar ? km * 1.35 : km, s = k * (0.8 + 0.5 * M);
    cx.save();
    if (akar) {   /* cincin yang memancar dari kartu Nabi */
      for (i = 0; i < 3; i++) {
        var rr = (tt * 0.8 - i * 0.28) / 1.4;
        if (rr <= 0 || rr >= 1) continue;
        cx.beginPath(); cx.arc(mx, my, cr + cr * 2.6 * rr, 0, 6.283);
        cx.lineWidth = (5 - 3 * rr) * k; cx.strokeStyle = rg(c.a, (1 - rr) * 0.6); cx.stroke();
      }
    }
    if (jenis === 'listrik') {
      jalurRR(x, y, w, h, cr); cx.fillStyle = rg(c.b, 0.34 * env * Math.min(1.3, M)); cx.fill();
      var N = 26;
      cx.beginPath();
      for (i = 0; i <= N; i++) { q = keliling(x, y, w, h, i / N); var o = (Math.random() * 3.4 - 0.7) * k * M; cx.lineTo(q[0] + q[2] * o, q[1] + q[3] * o); }
      cx.closePath(); cx.lineJoin = 'round';
      cx.lineWidth = 6 * s; cx.strokeStyle = rg(c.a, 0.38 * env); cx.stroke();
      cx.lineWidth = 1.9 * s; cx.strokeStyle = rg(c.b, 0.95 * env); cx.stroke();
      var nb = Math.round((1.5 + 2.5 * M) * env) + 1;
      for (i = 0; i < nb; i++) {
        q = keliling(x, y, w, h, Math.random());
        var ujung = busur(q[0], q[1], q[2], q[3], rnd(13, 30) * k * M, c);
        if (Math.random() < 0.25) lahir('percik', ujung[0], ujung[1], q[2] * rnd(60, 200), q[3] * rnd(60, 200), rnd(0.25, 0.5), 1.6 * k + 0.4, c.c);
      }
    } else if (jenis === 'cahaya') {
      aura(x, y, w, h, c.a, env, s, 1);
      jalurRR(x, y, w, h, cr); cx.fillStyle = rg(c.b, 0.36 * env); cx.fill();
      cx.save(); jalurRR(x, y, w, h, cr); cx.clip();
      var bx = x - w * 0.35 + batas(u, 0, 1) * 1.7 * w, g = cx.createLinearGradient(bx - w * 0.22, y, bx + w * 0.22, y + h);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,' + (0.8 * env).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      cx.fillStyle = g; cx.fillRect(x, y, w, h); cx.restore();
      if (Math.random() < 0.5 * env * M) { q = keliling(x, y, w, h, Math.random()); lahir('bintang', q[0], q[1], q[2] * rnd(5, 30), q[3] * rnd(5, 30) - 8, rnd(0.5, 0.9), rnd(2.5, 5) * k, Math.random() < 0.5 ? c.b : c.c); }
    } else if (jenis === 'air') {
      jalurRR(x, y, w, h, cr); cx.fillStyle = rg(c.a, 0.22 * env); cx.fill();
      jalurRR(x, y, w, h, cr);
      cx.lineWidth = 3.4 * s; cx.strokeStyle = rg(c.a, 0.55 * env); cx.stroke();
      cx.lineWidth = 1.3 * s; cx.strokeStyle = rg(c.b, 0.9 * env); cx.stroke();
      for (i = 0; i < 3; i++) {
        var z = batas(u, 0, 1) * 1.5 - i * 0.25;
        if (z <= 0 || z >= 1) continue;
        cx.beginPath(); cx.ellipse(mx, my, w * 0.5 + w * 0.42 * z, h * 0.5 + h * 0.9 * z, 0, 0, 6.283);
        cx.lineWidth = (2.6 - 1.4 * z) * k; cx.strokeStyle = rg(c.c, (1 - z) * 0.8 * Math.min(1, env * 2)); cx.stroke();
      }
      if (Math.random() < 0.55 * env * M) { q = keliling(x, y, w, h, Math.random() * 0.45); lahir('tetes', q[0], q[1], rnd(-45, 45), rnd(-150, -60), rnd(0.45, 0.8), rnd(1.8, 3.4) * k, c.c); }
    } else if (jenis === 'api') {
      var fk = 0.8 + Math.random() * 0.4;
      jalurRR(x, y, w, h, cr); cx.fillStyle = rg(c.a, 0.2 * env * fk); cx.fill();
      aura(x, y, w, h, c.a, env, s, fk);
      var nf = Math.round((1 + 3 * M) * env * Math.random() + 1);
      while (nf--) { q = keliling(x, y, w, h, Math.random()); lahir('api', q[0] + q[2] * 2 * k, q[1] + q[3] * 2 * k, q[2] * rnd(0, 18), -rnd(30, 85), rnd(0.35, 0.8), rnd(2.4, 4.8) * k, c.a); }
    } else {   /* nur: aura hijau zamrud dengan kilau emas */
      var br = 0.8 + 0.2 * Math.sin(tt * 8);
      jalurRR(x, y, w, h, cr); cx.fillStyle = rg(c.a, 0.2 * env * br); cx.fill();
      aura(x, y, w, h, c.a, env, s, br);
      jalurRR(x - 3 * k, y - 3 * k, w + 6 * k, h + 6 * k, cr + 3 * k);
      cx.lineWidth = 1.5 * k; cx.strokeStyle = rg(c.c, 0.75 * env * br); cx.stroke();
      if (Math.random() < 0.55 * env * M) { q = keliling(x, y, w, h, Math.random()); lahir('bintang', q[0], q[1], q[2] * rnd(5, 25), q[3] * rnd(5, 25) - 14, rnd(0.7, 1.2), rnd(2.4, 4.6) * k, Math.random() < 0.6 ? c.c : c.b); }
    }
    cx.restore();
  }

  /* getaran kartu (satuan px peta). Hasil dijumlahkan bila beberapa gelombang mengenai kartu yang sama. */
  function getar(jenis, u, env, km, tt, id, k) {
    var A = 2.4 * km * env / Math.max(k, 0.5), dx = 0, dy = 0, uu = batas(u, 0, 1);
    if (jenis === 'listrik') { dx = (Math.random() * 2 - 1) * A; dy = (Math.random() * 2 - 1) * A * 0.55; }
    else if (jenis === 'cahaya') { dy = -Math.sin(uu * Math.PI) * 1.7 * km; dx = Math.sin(tt * 70) * 0.4 * km * env; }
    else if (jenis === 'air') { dx = Math.sin(tt * 15 + id) * A * 1.1; dy = Math.sin(tt * 10 + id * 2) * A * 0.35; }
    else if (jenis === 'api') { dx = (Math.random() * 2 - 1) * A * 0.5; dy = A * 0.2 - Math.random() * A * 0.7; }
    else { dy = -Math.sin(uu * Math.PI) * 1.4 * km; dx = Math.sin(tt * 9 + id) * 0.55 * km * env; }
    return [dx, dy];
  }
  function envelope(x, tt) {
    var u = (tt - x.t) / x.d;
    if (x.akar) { var a = CHARGE / x.d; return u < a ? u / a : Math.max(0, 1 - (u - a) / (1 - a)); }
    if (u < 0.12) return u / 0.12;
    return Math.pow(Math.max(0, 1 - (u - 0.12) / 0.88), 1.4);
  }

  /* ================= GELOMBANG & PENGATUR ================= */
  var gel = [], terpasang = new Set();
  var raf = 0, last = 0, berikut = 0, mulaiAkhir = 0, jenisAkhir = 'cahaya', akarEl = null;

  function pilihJenis() {
    if (S.energi === 'campur') {
      var j;
      do { j = JENIS[(Math.random() * JENIS.length) | 0]; } while (j === jenisAkhir);
      return j;
    }
    return RGB[S.energi] ? S.energi : 'cahaya';
  }
  function mulaiGelombang(now) {
    var graf = bangunGraf(), akar = graf.nodes[0];
    if (!akar || !tampak(akar.el)) { berikut = now + 2.5; return; }
    var w = susun(graf);
    if (!w) { berikut = now + 2.5; return; }
    var jenis = pilihJenis();
    jenisAkhir = jenis; akarEl = akar.el; mulaiAkhir = now;
    gel.push({ t0: now, jenis: jenis, N: w.N, E: w.E, ni: 0, ei: 0, aN: [], aE: [], tmax: w.tmax });
    if (gel.length > 4) gel.shift();
    berikut = now + batas(w.tmax * 0.5 + 2.2, 5.5, 10);
  }
  function pangkas(arr, simpan) {
    var j = 0;
    for (var i = 0; i < arr.length; i++) if (simpan(arr[i])) arr[j++] = arr[i];
    arr.length = j;
  }
  function lepasGetar() {
    terpasang.forEach(function (el) { el.style.translate = ''; });
    terpasang = new Set();
  }

  function bingkai(ms) {
    raf = requestAnimationFrame(bingkai);
    var now = ms / 1000, dt = Math.min(0.05, now - last); last = now;
    if (now >= berikut) mulaiGelombang(now);

    var k = skala(), km = KM[batas((S.kuat | 0) - 1, 0, 2)], gi, i;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, W, H);

    /* aura napas di kartu Nabi: sumber energi selalu "hidup" */
    if (akarEl && akarEl.isConnected) {
      var ra = akarEl.getBoundingClientRect();
      if (ra.width > 1 && kelihatan(ra, 60)) {
        var br = 0.5 + 0.5 * Math.sin(now * 2.2);
        aura(ra.left, ra.top, ra.width, ra.height, RGB[jenisAkhir].a, 0.45 + 0.4 * br, k * (0.75 + 0.3 * br), 1);
      }
    }

    /* 1) aliran di garis penghubung */
    for (gi = 0; gi < gel.length; gi++) {
      var g = gel[gi], tt = now - g.t0;
      while (g.ei < g.E.length && g.E[g.ei].t <= tt) g.aE.push(g.E[g.ei++]);
      while (g.ni < g.N.length && g.N[g.ni].t <= tt) g.aN.push(g.N[g.ni++]);
      pangkas(g.aE, function (x) { return tt < x.t + x.d + TAHAN; });
      pangkas(g.aN, function (x) { return tt < x.t + x.d; });
      for (i = 0; i < g.aE.length; i++) {
        var x = g.aE[i], el = x.e.el;
        if (el && !el.isConnected) continue;
        var pts = poliEdge(x.e);
        if (!pts) continue;
        var bb = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
        for (var q = 0; q < pts.length; q++) {
          if (pts[q][0] < bb.left) bb.left = pts[q][0]; if (pts[q][0] > bb.right) bb.right = pts[q][0];
          if (pts[q][1] < bb.top) bb.top = pts[q][1]; if (pts[q][1] > bb.bottom) bb.bottom = pts[q][1];
        }
        if (!kelihatan(bb, 40)) continue;
        var p = (tt - x.t) / x.d, fade = p >= 1 ? batas(1 - (tt - x.t - x.d) / TAHAN, 0, 1) : 1;
        gambarAliran(g.jenis, pts, p, fade, k, km, tt);
      }
    }

    /* 2) efek pada kartu yang terkena (bacaan ukuran dulu, tulisan getar sesudahnya) */
    var peta = new Map(), tergambar = 0;
    for (gi = 0; gi < gel.length; gi++) {
      var g2 = gel[gi], t2 = now - g2.t0;
      for (i = 0; i < g2.aN.length; i++) {
        var y = g2.aN[i], nd = y.n, e2 = nd.el;
        if (!e2.isConnected) continue;
        var r = e2.getBoundingClientRect();
        if (r.width < 1 || !kelihatan(r, 50)) continue;
        var u = (t2 - y.t) / y.d, env = envelope(y, t2) * (y.akar ? 1.15 : 1);
        if (tergambar < 80) { efekKartu(g2.jenis, r, u, env, t2 - y.t, km, k, !!y.akar); tergambar++; }
        if (DUKUNG_T) {
          var v = getar(g2.jenis, u, env * (y.akar ? 1.35 : 1), km, t2 - y.t, nd.id, k), a = peta.get(e2);
          if (a) { a[0] += v[0]; a[1] += v[1]; } else peta.set(e2, v);
        }
      }
    }
    pangkas(gel, function (g3) { return (now - g3.t0) < g3.tmax + TAHAN + 0.3; });

    langkahPartikel(dt);

    if (DUKUNG_T) {
      peta.forEach(function (v, el) { el.style.translate = v[0].toFixed(2) + 'px ' + v[1].toFixed(2) + 'px'; });
      terpasang.forEach(function (el) { if (!peta.has(el)) el.style.translate = ''; });
      terpasang = new Set(peta.keys());
    }
  }

  function sinkron() {
    var aktif = S.energi && S.energi !== 'mati';
    if (aktif) {
      if (!raf) { last = performance.now() / 1000; berikut = last + 0.9; raf = requestAnimationFrame(bingkai); }
    } else berhenti();
  }
  function berhenti() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; gel.length = 0; partikel.length = 0; akarEl = null;
    lepasGetar();
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height);
  }

  /* tiap kali pengguna membuka/menutup cabang, aliran segera menyusul ke kartu yang baru muncul */
  var tundaMut = 0;
  try {
    new MutationObserver(function () {
      clearTimeout(tundaMut);
      tundaMut = setTimeout(function () {
        var n = performance.now() / 1000;
        if (raf && n - mulaiAkhir > 2.5) berikut = Math.min(berikut, n + 0.6);
      }, 450);
    }).observe(cont, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  } catch (e) {}

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && raf) berikut = Math.min(berikut, performance.now() / 1000 + 0.5);
  });

  if (window.MRI_ANIM) {
    window.MRI_ANIM.on(function (s) {
      var ganti = s.energi !== S.energi || s.kuat !== S.kuat;
      S = s;
      if (ganti && raf) {
        gel.length = 0; partikel.length = 0; lepasGetar();
        berikut = performance.now() / 1000 + 0.6;
      }
      sinkron();
    });
  }
  window.MRI_ENERGI = {
    picu: function () {   /* mulai satu gelombang sekarang juga */
      if (!S.energi || S.energi === 'mati') return;
      if (!raf) sinkron();
      berikut = 0;
    }
  };

  ukur();
  window.addEventListener('resize', ukur);
  sinkron();
})();
