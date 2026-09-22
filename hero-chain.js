// WorkSigned hero — "living signed chain" background. A REAL TIMELINE.
// A plain chain of circular nodes scrolls slowly right->left. Each node is a day of
// research: it carries a DAILY DATE and a work label. Small lock-nodes rise from the
// bottom and attach to main nodes; they STAY attached while the node is on screen.
//
// DATES — the real-timeline model (no jitter, no mid-frame shift, no blanks):
//   - Every node's `day` is assigned ONCE at creation and NEVER changes.
//     (0 = today, 1 = yesterday, 2 = day before, ...  -1, -2 = the newest, "not yet
//     committed" leading edge.)
//   - It STARTS showing today (rightmost) with the past filling left.
//   - It then ADVANCES FORWARD like a real append-only log: when the oldest node
//     scrolls off the left, a new (newer) node enters on the right. The window rolls
//     forward day by day (Sep 15..22 -> 16..22.. -> 17..22.. -> ...).
//   - Because each node's day is fixed, a visible date NEVER changes under your eyes
//     (no "Sep 20 -> Sep 19" jitter). The only change is a NEW node appearing on the
//     right as the timeline advances — exactly like a real log.
//   - Leading (not-yet-committed) nodes display "today" until they commit, so the
//     date row is never blank.
// Theme-aware (light/dark via <html data-theme>), respects prefers-reduced-motion
// (renders a static frame), and pauses when the tab is hidden (no CPU/battery).
(function () {
  var cv = document.getElementById('hero-chain');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dark = (document.documentElement.getAttribute('data-theme') === 'dark');

  var BLUE = [70, 150, 255], TEAL = [40, 210, 175], GLOW = [170, 225, 255];
  function mix(a, b, t) { return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; }
  function rgba(c, a) { return 'rgba(' + (c[0]|0) + ',' + (c[1]|0) + ',' + (c[2]|0) + ',' + a + ')'; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function ease(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2; }

  var chainY = 0, spacing = 0, SPEED = 20; // px/sec
  var nodes = [];

  // ---- dates: fixed per-node day (0 = today, positive = past, negative = leading).
  var nowMs = Date.now();
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var DATE_CACHE = {};
  function buildDateCache() {
    nowMs = Date.now(); // re-anchor "today" (handles a page left open past midnight)
    DATE_CACHE = {};
    // cover past (r = +1..) and future (r = -1..) around today (r = 0)
    for (var r = -40; r <= 60; r++) { var d = new Date(nowMs - r * 86400000); DATE_CACHE[r] = MONTHS[d.getMonth()] + ' ' + d.getDate(); }
  }
  buildDateCache();
  function fmtDate(day) {
    if (day == null) return '';
    // day 0 = today, positive = past, negative = future (tomorrow, day after, ...).
    // A real forward timeline: the newest (leading) nodes show upcoming dates.
    return DATE_CACHE[day] != null ? DATE_CACHE[day] : '';
  }

  // mostly mundane daily research; major findings / milestones / funding are rare.
  var LABELS = [
    'RESEARCHED LEADS', 'SUBJECT SCOUTING', 'LITERATURE REVIEW', 'DATA CLEANED',
    'RAN EXPERIMENTS', 'HELD MEETING', 'RESEARCHED LEADS', 'SUBJECT SCOUTING',
    'LITERATURE REVIEW', 'DATA IMPORT', 'HELD MEETING', 'RESEARCHED LEADS',
    'RAN EXPERIMENTS', 'NOTES UPDATED', 'SUBJECT SCOUTING', 'LITERATURE REVIEW',
    'DATA CLEANED', 'RESEARCHED LEADS', 'SUBJECT SCOUTING', 'RAN EXPERIMENTS',
    'EXPENSES LOGGED', 'LITERATURE REVIEW', 'RESEARCHED LEADS', 'HELD MEETING',
    'FUNDING SPENT', 'RESEARCHED LEADS', 'SUBJECT SCOUTING', 'DATA CLEANED',
    'MILESTONE COMMIT', 'GRANT REPORT DUE', 'SUBJECT SCOUTING', 'NOTES UPDATED',
    'LITERATURE REVIEW', 'SUBJECT SCOUTING', 'MAJOR FINDING', 'RESEARCHED LEADS',
    'SUBJECT SCOUTING', 'RAN EXPERIMENTS'
  ];
  var seqCounter = 0;

  function freshNode(x, day) {
    var m = 1 + (Math.random() < 0.85 ? 1 : 0) + (Math.random() < 0.6 ? 1 : 0); // 1-3, bias to 2-3
    return { x: x, locks: [], nextSpawn: rand(2.0, 4.0), maxLocks: m, seq: seqCounter++, day: day };
  }

  // Seed the window: "today" (day 0) on the grid node nearest the right edge, the
  // past (positive day) filling to the left, plus a small right buffer of leading
  // nodes (negative day). Grid-anchored so days are consecutive (no gaps/dups).
  function seed() {
    spacing = Math.max(120, W / 7);
    nodes = [];
    var todayK = Math.floor(W / spacing); // grid index of "today"
    var x = -spacing;                      // start just off the left edge
    while (x < W + spacing * 3) {
      var d = todayK - Math.round(x / spacing); // >0 past, 0 today, <0 leading
      nodes.push(freshNode(x, d));
      x += spacing;
    }
  }

  function resize() {
    W = cv.clientWidth; H = cv.clientHeight;
    if (!W || !H) return;
    cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    chainY = H * 0.40;
    seed();
  }

  function drawLock(x, y, s, color, a) {
    var c = rgba(color, a), sw = Math.max(1, s * 0.16), r = s * 0.30, cx = x, cy = y - s * 0.35;
    ctx.strokeStyle = c; ctx.lineWidth = sw;
    ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 2 * Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r, cy); ctx.lineTo(cx - r, cy + s * 0.05);
    ctx.moveTo(cx + r, cy); ctx.lineTo(cx + r, cy + s * 0.05); ctx.stroke();
    var bw = s * 0.72, bh = s * 0.62, by0 = y - s * 0.05;
    ctx.fillStyle = c;
    roundRect(x - bw/2, by0, bw, bh, bw * 0.28); ctx.fill();
    ctx.fillStyle = rgba(dark ? [7, 8, 12] : [247, 248, 250], a);
    ctx.beginPath(); ctx.arc(x, by0 + bh * 0.40, s * 0.07, 0, 7); ctx.fill();
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function drawMain(x, color, a) {
    var R = 26;
    var g = ctx.createRadialGradient(x, chainY, 4, x, chainY, R * 2.6);
    g.addColorStop(0, rgba(color, a * (dark ? 0.35 : 0.18)));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, chainY, R * 2.6, 0, 7); ctx.fill();
    ctx.strokeStyle = rgba(color, a); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, chainY, R, 0, 7); ctx.stroke();
    ctx.fillStyle = rgba(mix(color, GLOW, 0.4), a * (dark ? 0.12 : 0.06));
    ctx.beginPath(); ctx.arc(x, chainY, R, 0, 7); ctx.fill();
  }

  function step(dt) {
    var dx = SPEED * dt; // everything moves left (timeline advances forward)
    for (var i = 0; i < nodes.length; i++) nodes[i].x -= dx;
    // Oldest node scrolls off the left -> the timeline advances. NO renumbering:
    // each remaining node keeps its fixed day (its date never changes under you).
    while (nodes.length && nodes[0].x < -spacing) nodes.shift();
    // Append newer (leading) nodes on the right so the timeline never runs out.
    // Each is one day "newer" than the last (day - 1). Fixed at creation.
    var g = 0;
    while (nodes.length && nodes[nodes.length - 1].x < W + spacing && g++ < 500) {
      var ln = nodes[nodes.length - 1];
      nodes.push(freshNode(ln.x + spacing, (ln.day == null ? 0 : ln.day) - 1));
    }
    // Locks attach and stay (never detach on-screen); live until the node is GC'd.
    nodes.forEach(function (n) {
      var onScreen = n.x < W - 10 && n.x > 30;
      if (onScreen && !n._on) { n._on = true; n.nextSpawn = 2.0; } // reset delay when it first enters the screen
      if (n.x > W) n._on = false; // off right edge (only right after spawn) -> will reset on next entry
      if (onScreen) n.nextSpawn -= dt;
      if (onScreen && n.nextSpawn <= 0 && n.locks.length < n.maxLocks) {
        n.locks.push({ t: 0, level: n.locks.length });
        n.nextSpawn = rand(2.4, 4.2);
      }
      n.locks.forEach(function (L) { if (L.t < 1) L.t = Math.min(1, L.t + dt * 0.5); });
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (!W || !H) return;
    var R = 26;
    var lineCol = mix(BLUE, TEAL, 0.5);
    var lineA = dark ? 0.30 : 0.62, glowA = dark ? 0.55 : 0.85;
    ctx.lineCap = 'round';
    ctx.textAlign = 'center'; // set once
    var fontDate = '600 13px "IBM Plex Mono", monospace';
    var fontLbl = '700 12px "IBM Plex Sans", sans-serif';
    function seg(x0, x1) {
      if (x1 - x0 < 2) return;
      ctx.strokeStyle = rgba(lineCol, lineA); ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(x0, chainY); ctx.lineTo(x1, chainY); ctx.stroke();
      ctx.strokeStyle = rgba(GLOW, glowA); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, chainY); ctx.lineTo(x1, chainY); ctx.stroke();
    }
    var vx = [];
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].x > -spacing && nodes[i].x < W + spacing) vx.push(nodes[i].x);
    }
    vx.sort(function (a, b) { return a - b; });
    var segStart = -10;
    for (var s = 0; s < vx.length; s++) { seg(segStart, vx[s] - R); segStart = vx[s] + R; }
    seg(segStart, W + 10);
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i], x = n.x;
      if (x < -spacing || x > W + spacing) continue;
      var t = x / W, col = mix(BLUE, TEAL, Math.max(0, Math.min(1, t)));
      for (var k = 0; k < n.locks.length; k++) {
        var L = n.locks[k], appear = L.t;
        var gap = 40 + L.level * 34, targetY = chainY + gap, startY = H + 30;
        var y = startY + (targetY - startY) * ease(appear);
        var lc = mix(col, GLOW, 0.35), la = appear * (dark ? 0.95 : 1.0);
        if (la <= 0.01) continue;
        ctx.strokeStyle = rgba(lc, la * 0.5); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, chainY + 30); ctx.lineTo(x, y - 16 * appear); ctx.stroke();
        drawLock(x, y, 20, lc, la);
      }
      drawMain(x, col, dark ? 0.9 : 0.8);
      var dTxt = fmtDate(n.day), lTxt = LABELS[n.seq % LABELS.length];
      ctx.font = fontDate;
      ctx.fillStyle = rgba(dark ? [155, 170, 190] : [90, 102, 120], dark ? 0.95 : 0.85);
      ctx.fillText(dTxt, x, chainY - 64);
      ctx.font = fontLbl;
      ctx.fillStyle = rgba(col, dark ? 0.9 : 0.95);
      ctx.fillText(lTxt, x, chainY - 48);
    }
  }

  new MutationObserver(function () { dark = document.documentElement.getAttribute('data-theme') === 'dark'; }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  var last = performance.now(), raf = null;
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    step(dt); draw();
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

  function staticPopulate() {
    nodes.forEach(function (n) {
      n.locks = [];
      for (var k = 0; k < n.maxLocks; k++) n.locks.push({ t: 1, level: k });
    });
  }

  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop();
    else { buildDateCache(); if (!reduced) start(); }
  });

  resize();
  if (reduced) { staticPopulate(); draw(); }
  else start();
})();
