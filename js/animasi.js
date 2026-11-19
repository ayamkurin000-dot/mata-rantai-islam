/* Animasi latar: daun hijau melayang, salju turun, dan bintang berkerlip. Pilihannya diatur di panel Tema.
   Daun & salju digambar di atas peta; bintang digambar di BELAKANG peta (hanya tampak di latar langit).
   Semua kanvas tidak menangkap sentuhan (pointer-events: none), jadi pengguna tetap bisa menggeser,
   memperbesar, dan mengetuk kartu seperti biasa. Warna salju & bintang menyesuaikan terang/gelapnya latar. */
(function () {
  'use strict';
  if (window.__animJalan) return;
  window.__animJalan = true;

  var S = (window.MRI_ANIM && window.MRI_ANIM.get()) || { daun: true, salju: false, bintang: false, gelap: false };

  function kanvas(z) {
    var c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:' + z;
    return c;
  }
  var cvB = kanvas(0), cvD = kanvas(50);
  document.body.insertBefore(cvB, document.body.firstChild);   /* di belakang peta */
  document.body.appendChild(cvD);                              /* di atas peta, di bawah header */
  var xB = cvB.getContext('2d'), xD = cvD.getContext('2d');
  var W = 0, H = 0, dpr = 1;
  var daun = [], salju = [], bintang = [], meteor = null, meteorBerikut = 0;

  function acak(a, b) { return a + Math.random() * (b - a); }
  function batas(n, a, b) { return Math.max(a, Math.min(b, n)); }

  /* ================= DAUN ================= */
  var BENTUK = new Path2D('M0,-0.5 C0.34,-0.3 0.34,0.22 0,0.5 C-0.34,0.22 -0.34,-0.3 0,-0.5 Z');
  var TULANG = new Path2D('M0,-0.44 L0,0.5');
  var WARNA = [
    ['#2e7d32', '#1b5e20'], ['#43a047', '#2e7d32'], ['#66bb6a', '#388e3c'],
    ['#388e3c', '#1b5e20'], ['#7cb342', '#558b2f'], ['#4caf50', '#2e7d32'], ['#9ccc65', '#689f38']
  ];
  function buatDaun(awal) {
    var u = acak(10, 38);
    var w = WARNA[(Math.random() * WARNA.length) | 0];
    return {
      x: awal ? acak(-40, W + 40) : acak(-80, W * 0.6),
      y: awal ? acak(-40, H + 40) : acak(-120, -20),
      u: u,
      vy: acak(22, 52) * (0.6 + u / 50),
      vx: acak(10, 30),
      rot: acak(0, 6.283), vrot: acak(-1.1, 1.1),
      fase: acak(0, 6.283), kib: acak(1.2, 3.2),
      goy: acak(0.6, 1.6),
      a: acak(0.55, 0.92),
      w1: w[0], w2: w[1]
    };
  }
  function langkahDaun(dt, angin) {
    var cx = xD;
    for (var i = 0; i < daun.length; i++) {
      var l = daun[i];
      l.fase += dt * l.kib;
      l.x += (l.vx * (0.5 + angin * 2.2) + Math.sin(l.fase) * 18 * l.goy) * dt;
      l.y += (l.vy * (0.7 + angin * 0.5) + Math.cos(l.fase * 0.8) * 10) * dt;
      l.rot += (l.vrot + angin * 0.9 + Math.sin(l.fase) * 0.8) * dt;
      if (l.y > H + 50 || l.x > W + 60 || l.x < -140) {
        daun[i] = buatDaun(false);
        if (Math.random() < 0.4) { daun[i].x = acak(-60, W); daun[i].y = -40; }
        continue;
      }
      var balik = Math.cos(l.fase * 1.3);
      cx.save();
      cx.translate(l.x, l.y);
      cx.rotate(l.rot);
      cx.scale(l.u * (0.35 + 0.65 * Math.abs(balik)), l.u);
      cx.globalAlpha = l.a;
      cx.fillStyle = balik > 0 ? l.w1 : l.w2;
      cx.fill(BENTUK);
      cx.globalAlpha = l.a * 0.55;
      cx.lineWidth = 0.06; cx.strokeStyle = l.w2;
      cx.stroke(TULANG);
      cx.restore();
    }
  }

  /* ================= SALJU ================= */
  var KRISTAL = new Path2D();
  (function () {
    for (var i = 0; i < 6; i++) {
      var a = i * Math.PI / 3, c = Math.cos(a), s = Math.sin(a), bx = c * 0.55, by = s * 0.55;
      KRISTAL.moveTo(0, 0); KRISTAL.lineTo(c, s);
      KRISTAL.moveTo(bx, by); KRISTAL.lineTo(bx + Math.cos(a + 0.9) * 0.3, by + Math.sin(a + 0.9) * 0.3);
      KRISTAL.moveTo(bx, by); KRISTAL.lineTo(bx + Math.cos(a - 0.9) * 0.3, by + Math.sin(a - 0.9) * 0.3);
    }
  })();
  function buatSalju(awal) {
    var r = acak(1.3, 4.4);
    return {
      x: acak(-20, W + 20), y: awal ? acak(-10, H) : acak(-40, -5),
      r: r, vy: acak(20, 44) * (0.55 + r / 5.5),
      fase: acak(0, 6.283), kib: acak(0.6, 1.9), goy: acak(7, 22),
      a: acak(0.62, 0.96), rot: acak(0, 6.283), vrot: acak(-0.9, 0.9),
      kristal: r > 3.3
    };
  }
  function langkahSalju(dt, angin) {
    var cx = xD, gl = S.gelap;
    for (var i = 0; i < salju.length; i++) {
      var f = salju[i];
      f.fase += dt * f.kib;
      f.x += (angin * 22 + Math.sin(f.fase) * f.goy) * dt;
      f.y += f.vy * (0.85 + angin * 0.25) * dt;
      f.rot += f.vrot * dt;
      if (f.y > H + 10 || f.x > W + 30 || f.x < -40) { salju[i] = buatSalju(false); continue; }
      cx.globalAlpha = f.a;
      if (f.kristal) {
        var sk = f.r * 2.5;
        cx.save();
        cx.translate(f.x, f.y); cx.rotate(f.rot); cx.scale(sk, sk);
        cx.lineCap = 'round';
        cx.lineWidth = 1.5 / sk;
        cx.strokeStyle = gl ? '#ffffff' : 'rgba(64,124,196,.95)';
        cx.stroke(KRISTAL);
        cx.restore();
      } else {
        cx.beginPath(); cx.arc(f.x, f.y, f.r, 0, 6.283);
        cx.fillStyle = '#ffffff'; cx.fill();
        if (!gl) { cx.lineWidth = 0.9; cx.strokeStyle = 'rgba(80,136,200,.7)'; cx.stroke(); }
      }
    }
    cx.globalAlpha = 1;
  }

  /* ================= BINTANG ================= */
  var SEGI4 = new Path2D('M0,-1 Q0.1,-0.1 1,0 Q0.1,0.1 0,1 Q-0.1,0.1 -1,0 Q-0.1,-0.1 0,-1 Z');
  var WB_GELAP = ['#ffffff', '#fff3b0', '#cfe3ff', '#ffe08a'];
  var WB_TERANG = ['#f5b700', '#ff9f1c', '#e8a000', '#f2c230'];
  function buatBintang() {
    var besar = Math.random() < 0.28;
    return {
      px: Math.random(), py: Math.random(),
      r: besar ? acak(2.6, 4.6) : acak(0.8, 1.9),
      fase: acak(0, 6.283), kec: acak(0.7, 2.6),
      kilau: besar, w: (Math.random() * 4) | 0
    };
  }
  function langkahBintang(dt, d) {
    var cx = xB, gl = S.gelap, pal = gl ? WB_GELAP : WB_TERANG;
    for (var i = 0; i < bintang.length; i++) {
      var b = bintang[i];
      var tw = 0.5 + 0.5 * Math.sin(d * b.kec + b.fase);
      var al = 0.12 + 0.88 * tw * tw;
      var x = b.px * W, y = b.py * H, wr = pal[b.w];
      if (b.kilau) {
        var s = b.r * (1.6 + 2.2 * tw);
        cx.save();
        cx.translate(x, y); cx.rotate(0.2 * Math.sin(d * 0.3 + b.fase)); cx.scale(s, s);
        cx.globalAlpha = al; cx.fillStyle = wr; cx.fill(SEGI4);
        if (!gl) { cx.lineWidth = 0.07; cx.strokeStyle = 'rgba(150,92,0,.65)'; cx.stroke(SEGI4); }
        cx.restore();
        if (gl) {
          cx.globalAlpha = 0.1 * al; cx.beginPath(); cx.arc(x, y, b.r * 4, 0, 6.283); cx.fillStyle = wr; cx.fill();
        }
      } else {
        cx.globalAlpha = al; cx.beginPath(); cx.arc(x, y, b.r * (0.65 + 0.5 * tw), 0, 6.283);
        cx.fillStyle = wr; cx.fill();
        if (!gl) { cx.lineWidth = 0.6; cx.strokeStyle = 'rgba(150,92,0,.5)'; cx.stroke(); }
      }
    }
    cx.globalAlpha = 1;
    /* bintang jatuh sesekali */
    if (!meteor && d > meteorBerikut) {
      var ar = Math.random() < 0.5 ? 1 : -1;
      meteor = { x: acak(W * 0.15, W * 0.95), y: acak(-10, H * 0.35), vx: -ar * acak(380, 560), vy: acak(220, 340), u: 0, m: acak(0.8, 1.2) };
      if (meteor.vx > 0) meteor.x = acak(W * 0.05, W * 0.6);
    }
    if (meteor) {
      meteor.u += dt; meteor.x += meteor.vx * dt; meteor.y += meteor.vy * dt;
      var f = meteor.u / meteor.m;
      if (f >= 1 || meteor.y > H + 20) { meteor = null; meteorBerikut = d + acak(5, 11); }
      else {
        var a = Math.sin(f * Math.PI), ex = meteor.x - meteor.vx * 0.16, ey = meteor.y - meteor.vy * 0.16;
        var g = cx.createLinearGradient(ex, ey, meteor.x, meteor.y);
        var kol = gl ? '255,255,255' : '240,160,0';
        g.addColorStop(0, 'rgba(' + kol + ',0)'); g.addColorStop(1, 'rgba(' + kol + ',' + (0.95 * a).toFixed(3) + ')');
        cx.strokeStyle = g; cx.lineWidth = 2.2; cx.lineCap = 'round';
        cx.beginPath(); cx.moveTo(ex, ey); cx.lineTo(meteor.x, meteor.y); cx.stroke();
      }
    }
  }

  /* ================= PENGATUR ================= */
  function ukur() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    [cvB, cvD].forEach(function (c) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
    sesuaikan();
  }
  function sesuaikan() {
    var nD = S.daun ? batas(Math.round(W * H / 22000), 14, 30) : 0;
    var nS = S.salju ? batas(Math.round(W * H / 7500), 45, 125) : 0;
    var nB = S.bintang ? batas(Math.round(W * H / 9500), 34, 85) : 0;
    while (daun.length < nD) daun.push(buatDaun(true));
    daun.length = nD;
    while (salju.length < nS) salju.push(buatSalju(true));
    salju.length = nS;
    while (bintang.length < nB) bintang.push(buatBintang());
    bintang.length = nB;
    if (!nB) meteor = null;
  }

  var raf = 0, t0 = 0;
  function adaYangAktif() { return S.daun || S.salju || S.bintang; }
  function bersih() {
    xB.setTransform(1, 0, 0, 1, 0, 0); xB.clearRect(0, 0, cvB.width, cvB.height);
    xD.setTransform(1, 0, 0, 1, 0, 0); xD.clearRect(0, 0, cvD.width, cvD.height);
  }
  function bingkai(t) {
    if (!adaYangAktif()) { raf = 0; bersih(); return; }
    raf = requestAnimationFrame(bingkai);
    var dt = Math.min(0.05, (t - t0) / 1000 || 0.016); t0 = t;
    var d = t / 1000;
    /* Angin: hembusan datang dan pergi (gabungan beberapa gelombang) */
    var angin = 0.55 + 0.45 * Math.sin(d * 0.35) + 0.3 * Math.sin(d * 0.93 + 1.3) + 0.2 * Math.sin(d * 2.1);
    if (angin < 0) angin *= 0.3;
    xB.setTransform(dpr, 0, 0, dpr, 0, 0); xB.clearRect(0, 0, W, H);
    xD.setTransform(dpr, 0, 0, dpr, 0, 0); xD.clearRect(0, 0, W, H);
    if (bintang.length) langkahBintang(dt, d);
    if (salju.length) langkahSalju(dt, angin);
    if (daun.length) langkahDaun(dt, angin);
  }
  function jalan() {
    if (!raf && adaYangAktif()) { t0 = performance.now(); raf = requestAnimationFrame(bingkai); }
  }

  if (window.MRI_ANIM) {
    window.MRI_ANIM.on(function (s) {
      S = s;
      sesuaikan();
      if (adaYangAktif()) jalan();
      else if (raf) { cancelAnimationFrame(raf); raf = 0; bersih(); }
      else bersih();
    });
  }

  ukur();
  window.addEventListener('resize', ukur);
  jalan();
})();
