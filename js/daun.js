/* Animasi daun hijau melayang diterpa angin.
   Kanvas ada di atas peta tetapi di bawah header, dan tidak menangkap sentuhan (pointer-events: none),
   jadi pengguna tetap bisa menggeser, memperbesar, dan mengetuk kartu seperti biasa. */
(function () {
  'use strict';
  if (window.__daunJalan) return;
  window.__daunJalan = true;

  var cv = document.createElement('canvas');
  cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:50';
  document.body.appendChild(cv);
  var cx = cv.getContext('2d');
  var W = 0, H = 0, dpr = 1, daun = [];

  /* Bentuk daun (panjang 1, lebar sekitar 0.5) dan tulang daun, digambar sekali lalu dipakai ulang. */
  var BENTUK = new Path2D('M0,-0.5 C0.34,-0.3 0.34,0.22 0,0.5 C-0.34,0.22 -0.34,-0.3 0,-0.5 Z');
  var TULANG = new Path2D('M0,-0.44 L0,0.5');
  var WARNA = [
    ['#2e7d32', '#1b5e20'], ['#43a047', '#2e7d32'], ['#66bb6a', '#388e3c'],
    ['#388e3c', '#1b5e20'], ['#7cb342', '#558b2f'], ['#4caf50', '#2e7d32'], ['#9ccc65', '#689f38']
  ];

  function acak(a, b) { return a + Math.random() * (b - a); }

  function buat(awal) {
    var u = acak(10, 38);                          /* berbagai ukuran */
    var w = WARNA[(Math.random() * WARNA.length) | 0];
    return {
      x: awal ? acak(-40, W + 40) : acak(-80, W * 0.6),
      y: awal ? acak(-40, H + 40) : acak(-120, -20),
      u: u,
      vy: acak(22, 52) * (0.6 + u / 50),           /* daun besar jatuh sedikit lebih cepat */
      vx: acak(10, 30),
      rot: acak(0, 6.283), vrot: acak(-1.1, 1.1),
      fase: acak(0, 6.283), kib: acak(1.2, 3.2),   /* kibasan/lenggokan daun */
      goy: acak(0.6, 1.6),                         /* ayunan ke samping */
      a: acak(0.55, 0.92),
      w1: w[0], w2: w[1]
    };
  }

  function ukur() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    var n = Math.max(14, Math.min(30, Math.round(W * H / 22000)));
    while (daun.length < n) daun.push(buat(true));
    daun.length = n;
  }

  var t0 = 0;
  function bingkai(t) {
    requestAnimationFrame(bingkai);
    var dt = Math.min(0.05, (t - t0) / 1000 || 0.016); t0 = t;
    var d = t / 1000;
    /* Angin: hembusan datang dan pergi (gabungan beberapa gelombang) */
    var angin = 0.55 + 0.45 * Math.sin(d * 0.35) + 0.3 * Math.sin(d * 0.93 + 1.3) + 0.2 * Math.sin(d * 2.1);
    if (angin < 0) angin *= 0.3;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx.clearRect(0, 0, W, H);
    for (var i = 0; i < daun.length; i++) {
      var l = daun[i];
      l.fase += dt * l.kib;
      l.x += (l.vx * (0.5 + angin * 2.2) + Math.sin(l.fase) * 18 * l.goy) * dt;
      l.y += (l.vy * (0.7 + angin * 0.5) + Math.cos(l.fase * 0.8) * 10) * dt;
      l.rot += (l.vrot + angin * 0.9 + Math.sin(l.fase) * 0.8) * dt;
      if (l.y > H + 50 || l.x > W + 60 || l.x < -140) { daun[i] = buat(false); if (Math.random() < 0.4) { daun[i].x = acak(-60, W); daun[i].y = -40; } continue; }
      var balik = Math.cos(l.fase * 1.3);            /* daun berputar sehingga tampak menipis */
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

  ukur();
  window.addEventListener('resize', ukur);
  requestAnimationFrame(function (t) { t0 = t; bingkai(t); });
})();
