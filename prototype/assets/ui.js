/* ==========================================================================
   셸 · 공통 UI · 차트 · 지도 — 외부 의존성 없음
   ========================================================================== */
(function (g) {
  'use strict';
  var D = g.DB, U = D.util;

  /* ------------------------------------------------------------ 유틸 */
  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function n(v) { return U.n(v); }
  function t(v) { return v === null || v === undefined ? '—' : n(v) + '<span class="u">톤</span>'; }
  function compact(v) {
    var a = Math.abs(v);
    if (a >= 100000000) return (v / 100000000).toFixed(2) + '억';
    if (a >= 10000) return (v / 10000).toFixed(a >= 1000000 ? 0 : 1) + '만';
    return n(v);
  }
  function pctTxt(r, dg) { if (r === null || !isFinite(r)) return '—'; return (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r * 100).toFixed(dg === undefined ? 1 : dg) + '%'; }
  function delta(cur, prev) { return prev ? (cur - prev) / prev : null; }

  var ICON = {
    home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5', grid: 'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z',
    table: 'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14', upload: 'M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4',
    download: 'M12 4v12m-5-5 5 5 5-5M4 20h16', bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
    flame: 'M12 22a7 7 0 0 0 7-7c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8a7 7 0 0 0 7 7',
    ship: 'M3 17l2 4h14l2-4M5 17V9h14v8M9 9V4h6v5M2 21c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1',
    send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z', inbox: 'M3 12h5l2 3h4l2-3h5M5 5h14l2 7v7H3v-7z',
    chart: 'M4 20V10m5 10V4m5 16v-7m5 7V8', compare: 'M4 20V8m4 12V4m8 16v-9m4 9V6', map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zm0 0v14m6-12v14',
    users: 'M16 21v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m13 9v-1a4 4 0 0 0-3-3.9M16 4.1a4 4 0 0 1 0 7.8',
    check: 'm5 13 4 4L19 7', checkc: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0', x: 'M6 6l12 12M18 6 6 18',
    alert: 'M12 8v5m0 3h.01M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0',
    info: 'M12 16v-5m0-3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0', lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z',
    shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z', layers: 'm12 3 9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
    db: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3m0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
    cloud: 'M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z', list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    bell: 'M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6M13.7 20a2 2 0 0 1-3.4 0', key: 'M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0m-1.2 2.8L21 17v4h-4v-2h-2v-2h-2l-1.2-1.2',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12m10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6', play: 'M7 4v16l13-8z', pause: 'M7 4h3v16H7zm7 0h3v16h-3z',
    plus: 'M12 5v14M5 12h14', back: 'M19 12H5m7-7-7 7 7 7', menu: 'M4 7h16M4 12h16M4 17h16', sun: 'M12 3v2m0 14v2m9-9h-2M5 12H3m14.4-6.4-1.4 1.4M7 17l-1.4 1.4m0-12.8L7 7m10 10 1.4 1.4M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8',
    clock: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0', refresh: 'M20 11a8 8 0 0 0-14.3-4.9L4 8m0-5v5h5M4 13a8 8 0 0 0 14.3 4.9L20 16m0 5v-5h-5',
    pin: 'M12 22s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12m0-9a3 3 0 1 0 0-6 3 3 0 0 0 0 6', file: 'M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7zm0 0v4h4',
    copy: 'M9 9h11v11H9zM5 15H4V4h11v1', star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z',
    flag: 'M4 22V4m0 0h13l-2 4 2 4H4', image: 'M3 5h18v14H3zm0 11 5-5 4 4 3-3 6 6M15 9h.01', printer: 'M6 9V3h12v6M6 18H4v-6h16v6h-2M8 14h8v7H8z',
    logout: 'M15 4h4v16h-4M10 17l5-5-5-5m5 5H3', swap: 'M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4m4 4H7', spark: 'M12 3v3m0 12v3m9-9h-3M6 12H3m14.5-6.5-2 2m-7 7-2 2m0-11 2 2m7 7 2 2'
  };
  function ic(name, cls) { return '<svg class="i ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (ICON[name] || ICON.info) + '"/></svg>'; }

  /* 상태 칩 — 색만으로 구분하지 않도록 아이콘 + 글자를 함께 */
  var SICON = { '작성 중': 'file', '제출': 'send', '보완 요청': 'alert', '확정': 'checkc', '마감': 'lock', '미착수': 'clock',
    '요청': 'clock', '승인': 'checkc', '반려': 'x', '반영': 'checkc', '검수 대기': 'eye', '실패': 'alert', '허용': 'check', '차단': 'shield', '체험 기록': 'file' };
  function chip(s, extra) { return '<span class="chip" data-s="' + esc(s) + '">' + ic(SICON[s] || 'info') + esc(s) + (extra ? ' ' + extra : '') + '</span>'; }

  /* ------------------------------------------------------------ 토스트 · 모달 */
  function toast(msg, kind, sub) {
    var w = $('#toasts'); if (!w) return;
    var d = document.createElement('div');
    d.className = 'toast ' + (kind || '');
    d.setAttribute('role', kind === 'dg' ? 'alert' : 'status');
    d.innerHTML = ic(kind === 'dg' ? 'alert' : kind === 'ok' ? 'checkc' : 'info') + '<div><b>' + esc(msg) + '</b>' + (sub ? '<div class="m">' + esc(sub) + '</div>' : '') + '</div>';
    w.appendChild(d);
    setTimeout(function () { d.classList.add('out'); setTimeout(function () { d.remove(); }, 300); }, kind === 'dg' ? 5600 : 3600);
  }
  var stack = [], seq = 0;
  function modal(o) {
    var root = $('#modal-root'), m = document.createElement('div'), id = 'mt' + (++seq);
    m.className = 'mask'; m.__opener = document.activeElement;
    m.innerHTML = '<div class="modal ' + (o.size || '') + '" role="dialog" aria-modal="true" aria-labelledby="' + id + '" tabindex="-1">' +
      '<div class="modal-h"><h3 id="' + id + '">' + esc(o.title) + '</h3><button class="x" data-mclose aria-label="닫기">' + ic('x') + '</button></div>' +
      '<div class="modal-b">' + o.body + '</div>' +
      (o.foot === null ? '' : '<div class="modal-f">' + (o.foot || '<button class="btn" data-mclose>닫기</button>') + '</div>') + '</div>';
    root.appendChild(m); stack.push(m);
    m.addEventListener('click', function (e) { if (e.target === m || e.target.closest('[data-mclose]')) close(); });
    m.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      var f = $$('a[href],button:not([disabled]),input:not([disabled]),select,textarea', m).filter(function (x) { return x.offsetParent; });
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    });
    if (o.onOpen) o.onOpen(m);
    setTimeout(function () { var x = $('.modal-b input,.modal-b textarea,.modal-b select', m) || $('.modal-f .btn.p', m) || $('.modal', m); if (x) x.focus(); }, 30);
    return m;
  }
  function close() { var m = stack.pop(); if (!m) return; var op = m.__opener; m.remove(); if (op && op.focus) try { op.focus(); } catch (e) {} }
  function apiError(e) {
    if (!(e instanceof D.ApiError)) { console.error(e); toast('처리 중 오류', 'dg', String(e)); return; }
    toast(e.message, 'dg', 'HTTP ' + e.status + ' · ' + e.code);
  }
  function download(name, text, mime) {
    try {
      var blob = new Blob([text], { type: mime || 'text/csv;charset=utf-8' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
    } catch (e) { toast('내려받기를 지원하지 않는 환경입니다', 'dg'); }
  }

  /* ------------------------------------------------------------ 테마 */
  var THEME_ORDER = ['system', 'light', 'dark'];
  function themeGet() { try { return localStorage.getItem('cs-theme') || 'system'; } catch (e) { return 'system'; } }
  function themeSet(v) { try { localStorage.setItem('cs-theme', v); } catch (e) {} applyTheme(v); }
  function applyTheme(v) {
    var r = document.documentElement;
    var dark = v === 'dark' || (v === 'system' && g.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    r.setAttribute('data-theme', dark ? 'dark' : 'light'); r.setAttribute('data-pref', v);
  }
  function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }
  applyTheme(themeGet());
  if (g.matchMedia) { var mq = matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', function () { if (themeGet() === 'system') { applyTheme('system'); APP.render(); } }); }

  /* --------------------------------------------- 데이터 시각화 팔레트
     categorical slot1·2 · sequential(파랑 1색) · diverging(파랑↔빨강 + 회색 중립) — 검증된 기준 팔레트 */
  function PAL() {
    var d = isDark();
    return {
      s1: d ? '#3987e5' : '#2a78d6', s2: d ? '#d95926' : '#eb6834',
      seq: d ? ['#1a3a66', '#1d4f8e', '#2a6bc0', '#3987e5', '#6da7ec', '#b7d3f6'] : ['#cde2fb', '#9ec5f4', '#5598e7', '#2a78d6', '#1c5cab', '#104281'],
      div: d ? ['#6da7ec', '#2a6bc0', '#383835', '#c23d3d', '#e66767'] : ['#256abf', '#86b6ef', '#f0efec', '#f19a99', '#c93636'],
      grid: d ? '#2c2c2a' : '#e1e0d9', axis: d ? '#4a4a46' : '#c3c2b7', ink: d ? '#ffffff' : '#0b0b0b', ink2: d ? '#c3c2b7' : '#52514e', mute: '#898781',
      surf: d ? '#1a1a19' : '#ffffff', none: d ? '#2a2a28' : '#ecebe7', sup: d ? '#3a3a37' : '#d9d8d2'
    };
  }

  /* ------------------------------------------------------------ 차트 */
  var tipEl = null;
  function tip(html, ev) {
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'vtip'; tipEl.setAttribute('role', 'tooltip'); document.body.appendChild(tipEl); }
    if (!html) { tipEl.style.opacity = 0; return; }
    tipEl.innerHTML = html; tipEl.style.opacity = 1;
    var x = ev.clientX + 14, y = ev.clientY + 14, w = tipEl.offsetWidth, h = tipEl.offsetHeight;
    if (x + w > innerWidth - 8) x = ev.clientX - w - 14;
    if (y + h > innerHeight - 8) y = ev.clientY - h - 14;
    tipEl.style.transform = 'translate(' + x + 'px,' + y + 'px)';
  }
  function niceMax(v) {
    if (v <= 0) return 1;
    var p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p;
    var nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return nf * p;
  }
  /* 화면 폭에 맞춘 그래프 좌표 폭 — 글자가 눌리지 않게 */
  function autoW() { var w = window.innerWidth || 1200; return Math.round(Math.max(330, Math.min(760, w < 980 ? w - 70 : (w - 300) * 0.62))); }
  /* 선 그래프 — series:[{name, color, values:[]}], labels:[] */
  function lineChart(o) {
    var P = PAL(), W = o.w || autoW(), H = o.h || 240, L = 54, R = 16, T = 14, B = 30;
    var all = []; o.series.forEach(function (s) { s.values.forEach(function (v) { if (v !== null) all.push(v); }); });
    var max = niceMax(Math.max.apply(null, all.concat([1])) * 1.05), min = 0;
    var X = function (i) { return L + (W - L - R) * (o.labels.length === 1 ? .5 : i / (o.labels.length - 1)); };
    var Y = function (v) { return T + (H - T - B) * (1 - (v - min) / (max - min)); };
    var s = '<svg class="viz" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.title || '선 그래프') + '">';
    for (var k = 0; k <= 4; k++) {
      var gv = min + (max - min) * k / 4, gy = Y(gv);
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + gy + '" y2="' + gy + '" stroke="' + (k ? P.grid : P.axis) + '" stroke-width="1"/>' +
        '<text x="' + (L - 8) + '" y="' + (gy + 4) + '" text-anchor="end" class="vt">' + compact(gv) + '</text>';
    }
    var step = Math.ceil(o.labels.length / (W < 500 ? 6 : 12));
    o.labels.forEach(function (lb, i) { if (i % step === 0 || i === o.labels.length - 1) s += '<text x="' + X(i) + '" y="' + (H - 9) + '" text-anchor="middle" class="vt">' + esc(lb) + '</text>'; });
    o.series.forEach(function (se) {
      var d = '';
      se.values.forEach(function (v, i) { if (v === null) return; d += (d ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1); });
      var fi = 0; while (fi < se.values.length && se.values[fi] === null) fi++;
      var la = se.values.length - 1; while (la > 0 && se.values[la] === null) la--;
      if (se.area && d) s += '<path d="' + d + 'L' + X(la) + ' ' + Y(0) + 'L' + X(fi) + ' ' + Y(0) + 'Z" fill="' + se.color + '" opacity=".1"/>';
      s += '<path d="' + d + '" fill="none" stroke="' + se.color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"' + (se.dash ? ' stroke-dasharray="5 4"' : '') + '/>';
      var li = se.values.length - 1; while (li > 0 && se.values[li] === null) li--;
      s += '<circle cx="' + X(li) + '" cy="' + Y(se.values[li]) + '" r="4.5" fill="' + se.color + '" stroke="' + P.surf + '" stroke-width="2"/>';
    });
    /* 호버 레이어 — 열 단위 넓은 판정 영역 */
    var cw = (W - L - R) / Math.max(1, o.labels.length - 1);
    o.labels.forEach(function (lb, i) {
      s += '<rect class="hit" data-i="' + i + '" x="' + (X(i) - cw / 2) + '" y="' + T + '" width="' + cw + '" height="' + (H - T - B) + '" fill="transparent"/>';
    });
    s += '<line class="xh" x1="0" x2="0" y1="' + T + '" y2="' + (H - B) + '" stroke="' + P.axis + '" stroke-width="1" opacity="0"/>';
    s += '</svg>';
    var legend = o.series.length > 1 ? '<div class="lg">' + o.series.map(function (se) { return '<span><i style="background:' + se.color + '"></i>' + esc(se.name) + '</span>'; }).join('') + '</div>' : '';
    var id = 'lc' + (++seq);
    REG[id] = { kind: 'line', o: o, X: X, W: W };
    return '<div class="chart" data-chart="' + id + '">' + legend + s + '</div>';
  }
  /* 가로 막대 — items:[{label, value, note}] 단일 계열 */
  function barList(o) {
    var P = PAL(), max = Math.max.apply(null, o.items.map(function (x) { return x.value; }).concat([1]));
    return '<div class="bars">' + o.items.map(function (it) {
      var w = Math.max(0.5, it.value / max * 100);
      return '<div class="bar-r" data-tip="' + esc('<b>' + it.label + '</b><br>' + n(it.value) + ' ' + (o.unit || '톤') + (it.note ? '<br>' + it.note : '')) + '">' +
        '<span class="bl">' + esc(it.label) + '</span><span class="bt"><i style="width:' + w + '%;background:' + (it.color || P.s1) + '"></i></span>' +
        '<span class="bv num">' + (o.fmt ? o.fmt(it.value) : compact(it.value)) + (it.share !== undefined ? '<em>' + (it.share * 100).toFixed(1) + '%</em>' : '') + '</span></div>';
    }).join('') + '</div>';
  }
  /* 세로 막대 (전년 동기 비교) — groups:[{label, a, b}] */
  function columnPair(o) {
    var P = PAL(), W = o.w || autoW(), H = o.h || 240, L = 54, R = 12, T = 12, B = 30;
    var max = niceMax(Math.max.apply(null, o.groups.map(function (gq) { return Math.max(gq.a || 0, gq.b || 0); }).concat([1])));
    var gw = (W - L - R) / o.groups.length, bw = Math.min(16, (gw - 8) / 2);
    var Y = function (v) { return T + (H - T - B) * (1 - v / max); };
    var s = '<svg class="viz" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.title || '막대 그래프') + '">';
    for (var k = 0; k <= 4; k++) { var gy = Y(max * k / 4); s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + gy + '" y2="' + gy + '" stroke="' + (k ? P.grid : P.axis) + '"/><text x="' + (L - 8) + '" y="' + (gy + 4) + '" text-anchor="end" class="vt">' + compact(max * k / 4) + '</text>'; }
    o.groups.forEach(function (gq, i) {
      var cx = L + gw * i + gw / 2;
      [['b', P.s2, -1], ['a', P.s1, 1]].forEach(function (z) {
        var v = gq[z[0]]; if (v === null || v === undefined) return;
        var x = z[2] < 0 ? cx - bw - 1 : cx + 1, y = Y(v), h = Y(0) - y;
        var r = Math.min(4, h);
        s += '<path d="M' + x + ' ' + Y(0) + 'V' + (y + r) + 'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y + 'H' + (x + bw - r) + 'Q' + (x + bw) + ' ' + y + ' ' + (x + bw) + ' ' + (y + r) + 'V' + Y(0) + 'Z" fill="' + z[1] + '"/>';
      });
      s += '<text x="' + cx + '" y="' + (H - 9) + '" text-anchor="middle" class="vt">' + esc(gq.label) + '</text>';
      s += '<rect class="hit" x="' + (L + gw * i) + '" y="' + T + '" width="' + gw + '" height="' + (H - T - B) + '" fill="transparent" data-tip="' +
        esc('<b>' + gq.label + '</b><br><i class="sw" style="background:' + P.s1 + '"></i>' + o.aName + ' ' + n(gq.a) + '<br><i class="sw" style="background:' + P.s2 + '"></i>' + o.bName + ' ' + n(gq.b) + '<br>증감 ' + pctTxt(delta(gq.a, gq.b))) + '"/>';
    });
    s += '</svg>';
    return '<div class="chart"><div class="lg"><span><i style="background:' + P.s1 + '"></i>' + esc(o.aName) + '</span><span><i style="background:' + P.s2 + '"></i>' + esc(o.bName) + '</span></div>' + s + '</div>';
  }
  var REG = {};
  document.addEventListener('mousemove', function (e) {
    var el = e.target.closest && e.target.closest('[data-tip]');
    if (el) { tip(el.getAttribute('data-tip'), e); return; }
    var hit = e.target.closest && e.target.closest('.chart rect.hit[data-i]');
    if (hit) {
      var box = hit.closest('.chart'), R = REG[box.getAttribute('data-chart')];
      if (R) {
        var i = +hit.getAttribute('data-i'), o = R.o, xh = $('.xh', box);
        xh.setAttribute('x1', R.X(i)); xh.setAttribute('x2', R.X(i)); xh.setAttribute('opacity', 1);
        tip('<b>' + esc(o.labels[i]) + '</b>' + o.series.map(function (se) { return '<br><i class="sw" style="background:' + se.color + '"></i>' + esc(se.name) + ' <span class="num">' + n(se.values[i]) + '</span>'; }).join('') + (o.extra ? o.extra(i) : ''), e);
        return;
      }
    }
    $$('.chart .xh').forEach(function (x) { x.setAttribute('opacity', 0); });
    tip(null);
  }, { passive: true });

  /* ------------------------------------------------------------ 지도 */
  function breaks(vals, k) {
    var v = vals.filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; });
    if (!v.length) return [];
    var out = [];
    for (var i = 1; i < k; i++) {
      var q = v[Math.min(v.length - 1, Math.floor(v.length * i / k))];
      var p = Math.pow(10, Math.max(0, Math.floor(Math.log10(q)) - 1));
      q = Math.round(q / p) * p;
      if (!out.length || q > out[out.length - 1]) out.push(q);
    }
    return out;
  }
  function dark(hex) { if (!hex || hex[0] !== '#') return false; var r = parseInt(hex.substr(1, 2), 16) / 255, g2 = parseInt(hex.substr(3, 2), 16) / 255, b = parseInt(hex.substr(5, 2), 16) / 255; return 0.2126 * r + 0.7152 * g2 + 0.0722 * b < 0.42; }
  function classOf(v, br) { var i = 0; while (i < br.length && v >= br[i]) i++; return i; }
  var DIVB = [-0.15, -0.05, 0.05, 0.15];
  /* o: {values:{rc:{value, sup, prev, rate}}, mode:'seq'|'div', factories:[], selected, id} */
  function koreaMap(o) {
    var P = PAL(), vals = Object.keys(o.values).map(function (k) { return o.values[k].value; });
    var br = o.mode === 'div' ? DIVB : breaks(vals, 6);
    var s = '<svg class="kmap" viewBox="' + GEO.viewBox + '" role="img" aria-label="' + esc(o.title || '시·도별 지도') + '" data-map="' + (o.id || '') + '">' +
      '<defs><pattern id="hatch-' + (o.id || 'm') + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="' + P.sup + '"/><line x1="0" y1="0" x2="0" y2="6" stroke="' + P.mute + '" stroke-width="1.4"/></pattern></defs>';
    GEO.regions.forEach(function (r) {
      var v = o.values[r.code], fill, label;
      if (!v) { fill = P.none; label = '자료 없음'; }
      else if (v.sup) { fill = 'url(#hatch-' + (o.id || 'm') + ')'; label = v.sup === 'primary' ? '비공개 · 구성 회원사 ' + D.THRESHOLD + '개사 미만' : '비공개 · 차감 유추 방지'; }
      else if (o.mode === 'div') { fill = v.rate === null ? P.none : P.div[classOf(v.rate, br)]; label = pctTxt(v.rate) + ' (' + n(v.value) + '톤)'; }
      else { fill = P.seq[classOf(v.value, br)]; label = n(v.value) + '톤'; }
      var tipHtml = '<b>' + r.name + '</b><br>' + label + (v && !v.sup && v.prev !== undefined && o.mode !== 'div' ? '<br>전년 동월 ' + n(v.prev) + '톤 · ' + pctTxt(v.rate) : '') + (v && v.contributors !== undefined && !v.sup ? '<br>구성 회원사 ' + v.contributors + '개사' : '') + (o.clickable ? '<br><span class="mute">클릭하면 시·군·구로 확대</span>' : '');
      s += '<path class="rg' + (o.selected === r.code ? ' sel' : '') + '" data-rc="' + r.code + '" d="' + r.path + '" fill="' + fill + '" stroke="' + P.surf + '" stroke-width="1.2" data-tip="' + esc(tipHtml) + '"' + (o.clickable ? ' tabindex="0" role="button" aria-label="' + esc(r.name + ' ' + label) + '"' : '') + '/>';
    });
    GEO.regions.forEach(function (r) {
      var v = o.values[r.code]; if (!o.labels) return;
      var fillc = !v || v.sup ? null : o.mode === 'div' ? (v.rate === null ? null : P.div[classOf(v.rate, br)]) : P.seq[classOf(v.value, br)];
      var cls = fillc ? (dark(fillc) ? 'ml inv' : 'ml ink') : 'ml';
      var txt = !v ? '' : v.sup ? '◆' : o.mode === 'div' ? pctTxt(v.rate, 0) : compact(v.value);
      s += '<text class="' + cls + '" x="' + r.lx + '" y="' + r.ly + '" text-anchor="middle">' + r.name + '</text>' +
        (txt ? '<text class="' + cls + ' mv" x="' + r.lx + '" y="' + (r.ly + 13) + '" text-anchor="middle">' + txt + '</text>' : '');
    });
    (o.factories || []).forEach(function (f) {
      s += '<g class="fac" data-fid="' + f.id + '" data-tip="' + esc('<b>' + f.name + '</b><br>' + f.sub) + '"><circle cx="' + f.x + '" cy="' + f.y + '" r="5.5" fill="' + (f.color || P.s2) + '" stroke="' + P.surf + '" stroke-width="2"/></g>';
    });
    s += '</svg>';
    return { svg: s, breaks: br, legend: legend(o.mode, br, P) };
  }
  function legend(mode, br, P) {
    var items = [];
    if (mode === 'div') {
      var lb = ['−15% 미만', '−15 ~ −5%', '−5 ~ +5%', '+5 ~ +15%', '+15% 이상'];
      lb.forEach(function (x, i) { items.push([P.div[i], x]); });
    } else {
      var lo = 0;
      for (var i = 0; i <= br.length; i++) { items.push([P.seq[i], i === br.length ? compact(lo) + ' 이상' : compact(lo) + ' ~ ' + compact(br[i])]); lo = br[i]; }
    }
    return '<div class="mlg">' + items.map(function (x) { return '<span><i style="background:' + x[0] + '"></i>' + x[1] + '</span>'; }).join('') +
      '<span><i class="hatch"></i>비공개 (◆)</span><span><i style="background:' + P.none + '"></i>자료 없음</span></div>';
  }
  /* 시·군·구 타일 — 확대 화면 */
  function districtTiles(rc, rows, mode) {
    var P = PAL(), ds = GEO.districts[rc], map = {};
    rows.forEach(function (r) { map[r.district] = r; });
    var vals = rows.filter(function (r) { return !r.sup; }).map(function (r) { return r.value; });
    var br = breaks(vals, 6);
    var html = '<div class="tiles">' + ds.map(function (d) {
      var r = map[d.code], fill, txt, cls = '';
      if (!r) { fill = P.none; txt = '—'; }
      else if (r.sup) { fill = ''; txt = '◆'; cls = ' hatch'; }
      else { fill = P.seq[classOf(r.value, br)]; txt = compact(r.value); cls = dark(fill) ? ' inv' : ' ink'; }
      var tipHtml = '<b>' + D.RMAP[rc].name + ' ' + d.name + '</b><br>' + (!r ? '출하 없음' : r.sup ? (r.sup === 'primary' ? '비공개 · 구성 회원사 ' + D.THRESHOLD + '개사 미만' : '비공개 · 차감 유추 방지') : n(r.value) + '톤 · 구성 회원사 ' + r.contributors + '개사');
      return '<div class="tile' + cls + '" style="' + (fill ? 'background:' + fill : '') + '" data-tip="' + esc(tipHtml) + '"><b>' + esc(d.name) + '</b><span class="num">' + txt + '</span></div>';
    }).join('') + '</div>';
    var unknown = map[rc + '000'];
    return { html: html + (unknown ? '<p class="cap">시·군·구 미상 ' + n(unknown.value) + '톤 (상세 미제출분)</p>' : ''), legend: legend('seq', br, P) };
  }
  /* SVG → PNG 저장 (차트·지도 이미지 저장) */
  function saveSvgPng(svgEl, name) {
    try {
      var clone = svgEl.cloneNode(true), vb = svgEl.viewBox.baseVal, scale = 2;
      clone.setAttribute('width', vb.width); clone.setAttribute('height', vb.height);
      var cs = getComputedStyle(svgEl);
      $$('text', clone).forEach(function (tx) { tx.setAttribute('font-family', cs.fontFamily); tx.setAttribute('font-size', tx.classList.contains('mv') ? 10 : 11); tx.setAttribute('fill', tx.classList.contains('inv') ? '#fff' : tx.classList.contains('ink') ? '#0b0b0b' : PAL().ink); tx.setAttribute('font-weight', tx.classList.contains('mv') ? 700 : 600); });
      var xml = new XMLSerializer().serializeToString(clone);
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas'); c.width = vb.width * scale; c.height = vb.height * scale;
        var ctx = c.getContext('2d'); ctx.fillStyle = PAL().surf; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; a.click(); });
      };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
      toast('이미지로 저장했습니다', 'ok', name);
    } catch (e) { toast('이미지 저장 실패', 'dg', String(e)); }
  }

  /* ------------------------------------------------------------ 앱 · 라우터 */
  var APP = { screens: {}, list: [], cur: null, params: {} };
  function screen(def) { APP.screens[def.path] = def; APP.list.push(def); }
  function go(path) { if (location.hash === '#' + path) render(); else location.hash = path; }
  function parse() {
    var h = (location.hash || '').replace(/^#/, '') || '/m/login';
    var q = h.split('?'), params = {};
    (q[1] || '').split('&').forEach(function (kv) { if (!kv) return; var p = kv.split('='); params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); });
    return { path: q[0], params: params };
  }
  function user() { return D.SESSION.user; }
  function login(uid, silent) {
    D.SESSION.user = D.UMAP[uid];
    D.audit('로그인', D.SESSION.user.org === 'assoc' ? '협회 관리자 웹' : '회원사 웹', '허용', '체험 계정');
    if (!silent) toast(D.SESSION.user.name + ' 님으로 접속했습니다', 'ok', D.ROLEMAP[D.SESSION.user.role].name + (D.SESSION.user.org !== 'assoc' ? ' · ' + D.MMAP[D.SESSION.user.org].name : ''));
  }
  var AUTH_ACCOUNTS = [
    { uid: 'u-m04a', side: 'member', label: '회원사 관리자', email: 'member@demo.cement', password: 'member2026' },
    { uid: 'u-m04s1', side: 'member', label: '회원사 직원', email: 'staff@demo.cement', password: 'staff2026' },
    { uid: 'u-a1', side: 'assoc', label: '협회 관리자', email: 'admin@demo.cement', password: 'admin2026' },
    { uid: 'u-a2', side: 'assoc', label: '협회 통계 담당', email: 'stat@demo.cement', password: 'stat2026' }
  ].concat(D.ACTIVE.filter(function (m) { return m.id !== 'm04'; }).map(function (m) {
    return { uid: 'u-' + m.id + 'a', side: 'member', label: m.name + ' 관리자', email: 'member' + m.id.slice(1) + '@demo.cement', password: 'member2026' };
  }));
  function authCard(a) {
    return '<button type="button" class="auth-account" data-auth-fill="' + a.uid + '"><span><b>' + esc(a.label) + '</b><small>' + esc(a.email) + '</small></span><code>' + esc(a.password) + '</code></button>';
  }
  function authAccountList(side) {
    var accounts = AUTH_ACCOUNTS.filter(function (a) { return a.side === side; });
    if (side === 'assoc') return accounts.map(authCard).join('');
    return accounts.slice(0, 2).map(authCard).join('') +
      '<details class="auth-more"><summary>다른 회원사 계정 ' + (accounts.length - 2) + '개 보기</summary>' + accounts.slice(2).map(authCard).join('') + '</details>';
  }
  function authPage(defaultSide) {
    return '<div class="login auth-page"><div class="lg-art"><img class="lg-photo" src="assets/cement-login.jpg" alt="" aria-hidden="true">' +
      '<div class="lg-in"><span class="auth-eyebrow">시멘트 통계 포털</span><h1>월간 통계 업무를<br>한곳에서 시작하세요.</h1><p>자료 입력부터 확정 통계 조회까지, 역할에 맞는 업무를 이어서 처리하세요.</p></div></div>' +
      '<div class="lg-form"><div class="lg-box"><div class="auth-brand"><span class="bm" aria-hidden="true"><i></i><i></i><i></i></span><b>시멘트 통계 포털</b></div>' +
      '<h2>로그인</h2><p class="auth-sub">업무 영역을 선택하고 계정 정보를 입력해 주세요.</p>' +
      '<form class="auth-form" data-auth-form><label for="loginRole">업무 영역</label><select id="loginRole" name="role" class="sel">' +
      '<option value="member"' + (defaultSide === 'member' ? ' selected' : '') + '>회원사</option><option value="assoc"' + (defaultSide === 'assoc' ? ' selected' : '') + '>협회</option></select>' +
      '<label for="loginId">이메일</label><input id="loginId" name="email" class="inp" type="email" autocomplete="username" placeholder="이메일을 입력해 주세요" required>' +
      '<label for="loginPw">비밀번호</label><input id="loginPw" name="password" class="inp" type="password" autocomplete="current-password" placeholder="비밀번호를 입력해 주세요" required>' +
      '<p class="auth-error" role="alert" aria-live="polite"></p><button class="btn p auth-submit" type="submit">로그인</button></form>' +
      '<div class="auth-trial"><div class="auth-trial-head"><b>체험 계정</b><span>계정을 누르면 입력란에 채워집니다.</span></div>' +
      '<div class="auth-account-list" aria-live="polite">' + authAccountList(defaultSide) + '</div>' +
      '<p class="auth-disclaimer">이 화면의 회사명과 통계 수치는 체험용 가상 자료입니다. 변경 내용은 이 브라우저에만 저장됩니다.</p>' +
      '<button type="button" class="btn sm" data-reset-demo>체험 데이터 초기화</button></div></div></div></div>';
  }
  function mountAuth(root) {
    root.querySelector('#loginRole').addEventListener('change', function (e) {
      root.querySelector('.auth-account-list').innerHTML = authAccountList(e.target.value);
      root.querySelector('#loginId').value = '';
      root.querySelector('#loginPw').value = '';
      root.querySelector('.auth-error').textContent = '';
    });
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-reset-demo]')) {
        if (window.confirm('이 브라우저에 저장된 체험 데이터와 로그인 상태를 모두 초기화할까요?')) {
          if (D.resetState()) { persistDisabled = true; clearTimeout(persistTimer); window.location.reload(); }
          else toast(D.storageError(), 'dg');
        }
        return;
      }
      var b = e.target.closest('[data-auth-fill]'); if (!b) return;
      var a = AUTH_ACCOUNTS.filter(function (x) { return x.uid === b.getAttribute('data-auth-fill'); })[0]; if (!a) return;
      root.querySelector('#loginRole').value = a.side;
      root.querySelector('#loginId').value = a.email;
      root.querySelector('#loginPw').value = a.password;
      root.querySelector('.auth-error').textContent = '';
      root.querySelector('#loginId').focus();
    });
    root.addEventListener('submit', function (e) {
      if (!e.target.matches('[data-auth-form]')) return;
      e.preventDefault();
      var side = root.querySelector('#loginRole').value;
      var email = root.querySelector('#loginId').value.trim().toLowerCase();
      var pw = root.querySelector('#loginPw').value;
      var a = AUTH_ACCOUNTS.filter(function (x) { return x.side === side && x.email === email && x.password === pw; })[0];
      if (!a) { root.querySelector('.auth-error').textContent = '업무 영역, 이메일 또는 비밀번호를 확인해 주세요.'; root.querySelector('#loginPw').focus(); return; }
      login(a.uid); go(a.side === 'assoc' ? '/a/home' : '/m/home');
    });
  }
  function logout() {
    var side = D.side() || 'member';
    if (D.SESSION.user) D.audit('로그아웃', side === 'assoc' ? '협회 관리자 웹' : '회원사 웹', '허용', '');
    D.SESSION.user = null;
    go(side === 'assoc' ? '/a/login' : '/m/login');
  }
  var NAV = {
    member: [
      { g: '', items: [['/m/home', '요약 대시보드', 'home']] },
      { g: '자료 입력', items: [['/m/input', '대량 입력표', 'table'], ['/m/upload', '엑셀 업로드·일괄 등록', 'upload'], ['/m/flash', '속보 입력', 'bolt'], ['/m/coal', '유연탄 입력', 'flame'], ['/m/trade', '수출입 입력', 'ship']] },
      { g: '제출', items: [['/m/status', '제출·보완 요청 현황', 'send']] },
      { g: '통계', items: [['/m/stats', '통계 조회·다운로드', 'chart'], ['/m/yoy', '전년 동기 비교', 'compare'], ['/m/map', '지도 대시보드', 'map']] },
      { g: '관리', items: [['/m/staff', '계정·직원 권한', 'users']] }
    ],
    assoc: [
      { g: '', items: [['/a/home', '운영 대시보드', 'home']] },
      { g: '자료 관리', items: [['/a/board', '회원사별 제출 현황판', 'grid'], ['/a/review', '검증 결과·예외 처리', 'alert'], ['/a/close', '확정·마감 처리', 'lock'], ['/a/corr', '정정 이력', 'layers']] },
      { g: '통계', items: [['/a/stats', '통계 조회·보고서', 'chart'], ['/a/custom', '맞춤 보고서 만들기', 'table'], ['/a/map', '지도 대시보드(전체)', 'map']] },
      { g: '운영', items: [['/a/collect', '외부 데이터 수집·검수', 'cloud'], ['/a/migrate', '이관 검증 결과', 'db'], ['/a/master', '기준정보 관리', 'list'], ['/a/users', '사용자 계정·권한', 'key'], ['/a/audit', '감사 로그', 'shield'], ['/a/noti', '알림 이력', 'bell']] }
    ]
  };
  function badge(path) {
    var S = D.SUB[D.CUR];
    if (path === '/a/review') { var c = 0; D.ACTIVE.forEach(function (m) { if (S[m.id].state === '제출') c++; }); return c; }
    if (path === '/a/corr') return D.CORR.filter(function (x) { return x.state === '요청'; }).length;
    if (path === '/a/collect') return D.EXT.runs.filter(function (x) { return x.status === '검수 대기'; }).length;
    if (path === '/m/status') { var u = user(); return u && u.org !== 'assoc' && S[u.org].state === '보완 요청' ? 1 : 0; }
    return 0;
  }
  function shell(def, body) {
    var u = user(), sd = def.side, mem = u && u.org !== 'assoc' ? D.MMAP[u.org] : null;
    var S = mem ? D.SUB[D.CUR][mem.id] : null;
    var today = new Date(), due = D.DEADLINE.split('-').map(Number);
    var dl = Math.round((Date.UTC(due[0], due[1] - 1, due[2]) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
    var deadlineText = dl > 0 ? 'D-' + dl : dl === 0 ? 'D-DAY' : 'D+' + Math.abs(dl);
    var nav = NAV[sd].map(function (grp) {
      return (grp.g ? '<div class="ng">' + grp.g + '</div>' : '') + grp.items.map(function (it) {
        var b = badge(it[0]);
        return '<a class="ni' + (APP.cur === it[0] ? ' on' : '') + '" href="#' + it[0] + '"' + (APP.cur === it[0] ? ' aria-current="page"' : '') + '>' + ic(it[2]) + '<span>' + it[1] + '</span>' + (b ? '<em class="nb">' + b + '</em>' : '') + '</a>';
      }).join('');
    }).join('');
    var pref = document.documentElement.getAttribute('data-pref');
    return '<div class="shell' + (APP.navOpen ? ' nav-open' : '') + '">' +
      '<aside class="side" aria-label="주 메뉴"><div class="side-top"><a class="brand" href="#' + (sd === 'assoc' ? '/a/home' : '/m/home') + '"><span class="bm" aria-hidden="true"><i></i><i></i><i></i></span><span><b>시멘트 통계 포털</b><small>' + (sd === 'assoc' ? '협회 관리자 웹' : '회원사 웹') + '</small></span></a></div>' +
      '<nav class="nav">' + nav + '</nav>' +
      '<div class="side-foot"><div class="sf-l">예시 통계 데이터</div><div class="sf-v">지도 자료: ' + esc(GEO.credit) + '</div></div></aside>' +
      '<div class="mainw"><header class="top"><button class="btn-ic mnav" data-act="nav" aria-label="메뉴 열기">' + ic('menu') + '</button>' +
      '<div class="period"><span class="pd-k">작성 대상</span><b>' + U.ymLabel(D.CUR) + ' 자료</b><span class="pd-d">마감 10월 10일 · ' + deadlineText + '</span></div>' +
      (S ? '<div class="period hide-s"><span class="pd-k">우리 회사</span>' + chip(S.state) + '</div>' : '') +
      '<div class="top-r"><button class="btn-ic" data-act="theme" aria-label="화면 테마: ' + ({ system: '시스템', light: '라이트', dark: '다크' })[pref] + '" title="테마 — ' + ({ system: '시스템', light: '라이트', dark: '다크' })[pref] + '">' + ic(pref === 'dark' ? 'eye' : 'sun') + '</button>' +
      '<a class="btn-ic" href="#' + (sd === 'assoc' ? '/a/noti' : '/m/status') + '" aria-label="알림">' + ic('bell') + '</a>' +
      '<button class="who" data-act="profile" aria-label="내 계정"><span class="av">' + esc(u.name.slice(0, 1)) + '</span><span class="who-t"><b>' + esc(u.name) + '</b><small>' + esc(mem ? mem.name + ' · ' + D.ROLEMAP[u.role].name : D.ROLEMAP[u.role].name) + '</small></span>' + ic('users') + '</button></div></header>' +
      '<main class="page" id="main" tabindex="-1">' + body + '</main></div><div class="scrim" data-act="nav"></div></div>';
  }
  var persistTimer = null, warnedStorage = false, persistDisabled = false;
  function persistNow() {
    if (persistDisabled) return;
    if (persistTimer) { clearTimeout(persistTimer); persistTimer = null; }
    if (!D.saveState() && !warnedStorage) { warnedStorage = true; toast(D.storageError(), 'dg'); }
  }
  function persistSoon() {
    if (persistDisabled) return;
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(persistNow, 250);
  }
  function render() {
    var r = parse(), def = APP.screens[r.path];
    if (!def) { go('/m/login'); return; }
    var u = user();
    if (!def.public && !u) { location.hash = def.side === 'assoc' ? '/a/login' : '/m/login'; return; }
    if (!def.public && u && D.ROLEMAP[u.role].side !== def.side) {
      /* 다른 쪽 웹으로 들어오면 로그인 화면으로 */
      location.hash = def.side === 'assoc' ? '/a/login' : '/m/login'; return;
    }
    APP.cur = r.path; APP.params = r.params; APP.navOpen = false;
    var body;
    try { body = def.render(r.params); } catch (e) { console.error(e); body = '<div class="alert err">' + ic('alert') + '<div>화면 오류: ' + esc(e.message) + '</div></div>'; if (e instanceof D.ApiError) body = '<div class="alert err">' + ic('shield') + '<div><b>HTTP ' + e.status + '</b> ' + esc(e.message) + '</div></div>'; }
    var app = $('#app');
    app.innerHTML = def.public ? body : shell(def, body);
    document.body.classList.toggle('auth-view', !!def.public);
    document.title = def.title + ' — 시멘트 통계 포털';
    if (def.mount) try { def.mount($('#main') || $('#app').firstElementChild, r.params); } catch (e) { console.error(e); }
    var sc = APP.scrollTo; APP.scrollTo = null;
    window.scrollTo(0, sc || 0);
    var pg = $('#main'); if (pg && !APP.keepFocus) pg.focus({ preventScroll: true });
    APP.keepFocus = false;
    persistSoon();
  }
  function rerender(keepScroll) { APP.scrollTo = keepScroll === false ? 0 : window.scrollY; APP.keepFocus = true; render(); }
  window.addEventListener('hashchange', render);

  /* 공통 클릭 위임 */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-act]'); if (!a) return;
    var act = a.getAttribute('data-act');
    if (act === 'nav') { $('.shell') && $('.shell').classList.toggle('nav-open'); return; }
    if (act === 'theme') { var cur = themeGet(); themeSet(THEME_ORDER[(THEME_ORDER.indexOf(cur) + 1) % 3]); rerender(); toast('화면 테마: ' + ({ system: '시스템 설정', light: '라이트', dark: '다크' })[themeGet()]); return; }
    if (act === 'profile') { accountProfile(); return; }
    if (act === 'logout') { close(); logout(); return; }
    if (APP.onAct) APP.onAct(act, a, e);
  });
  function accountProfile() {
    var u = user(); if (!u) return;
    var demoAccount = AUTH_ACCOUNTS.filter(function (a) { return a.uid === u.id; })[0];
    modal({ title: '내 계정', size: 'md', body: '<dl class="dl"><dt>이름</dt><dd>' + esc(u.name) + '</dd><dt>소속</dt><dd>' + esc(u.org === 'assoc' ? '협회' : D.MMAP[u.org].name) + '</dd><dt>업무 권한</dt><dd>' + esc(D.ROLEMAP[u.role].name) + '</dd><dt>이메일</dt><dd>' + esc(demoAccount ? demoAccount.email : u.email) + '</dd></dl>',
      foot: '<button class="btn" data-mclose>닫기</button><button class="btn p" data-act="logout">' + ic('logout') + '로그아웃</button>' });
  }
  function grantName(c) { return ({ STAT_VIEW: '조회', DATA_INPUT: '입력', DATA_EDIT: '수정', DATA_SUBMIT: '제출' })[c] || c; }

  /* ------------------------------------------------------------ 시연 도우미 */
  var DEMO = { open: false, scenarios: [] };
  function renderDemo() {
    var el = $('#demo'); if (!el) return;
    var u = user();
    el.className = 'demo' + (DEMO.open ? ' open' : '');
    el.innerHTML = '<button class="demo-h" data-demo="toggle" aria-expanded="' + DEMO.open + '">' + ic('spark') + '<span>시연 도우미 · 핵심 기능 ' + DEMO.scenarios.length + '가지</span>' + ic(DEMO.open ? 'x' : 'plus') + '</button>' +
      (DEMO.open ? '<div class="demo-b"><p class="demo-n">필요한 계정으로 자동 전환한 뒤 해당 화면을 엽니다.' + (u ? ' 현재: <b>' + esc(u.name) + '</b>' : '') + '</p>' +
        DEMO.scenarios.map(function (s, i) { return '<button class="demo-i" data-demo="' + i + '"><span class="demo-no">' + (i + 1) + '</span><span><b>' + esc(s.t) + '</b><small>' + esc(s.d) + '</small></span></button>'; }).join('') + '</div>' : '');
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-demo]'); if (!b) return;
    var k = b.getAttribute('data-demo');
    if (k === 'toggle') { DEMO.open = !DEMO.open; renderDemo(); return; }
    var s = DEMO.scenarios[+k]; DEMO.open = false;
    if (s.as && (!user() || user().id !== s.as)) login(s.as, true);
    s.run();
  });

  g.UI = { esc: esc, $: $, $$: $$, n: n, t: t, compact: compact, pctTxt: pctTxt, delta: delta, ic: ic, chip: chip, toast: toast, modal: modal, close: close, apiError: apiError, download: download,
    authPage: authPage, mountAuth: mountAuth,
    PAL: PAL, lineChart: lineChart, barList: barList, columnPair: columnPair, koreaMap: koreaMap, districtTiles: districtTiles, saveSvgPng: saveSvgPng, breaks: breaks, isDark: isDark, grantName: grantName };
  g.APP = APP; APP.screen = screen; APP.go = go; APP.render = render; APP.rerender = rerender; APP.login = login; APP.user = user; APP.DEMO = DEMO; APP.renderDemo = renderDemo;
  APP.start = function () {
    var loaded = D.restoreState();
    if (D.SESSION.user && !location.hash) location.hash = D.side() === 'assoc' ? '/a/home' : '/m/home';
    render();
    ['click', 'change', 'input', 'submit'].forEach(function (eventName) {
      document.addEventListener(eventName, persistSoon);
    });
    window.addEventListener('pagehide', persistNow);
    if (!loaded && D.storageError()) { warnedStorage = true; toast(D.storageError(), 'dg'); }
  };
})(window);
