/* ==========================================================================
   화면 공통 부품 — 페이지 머리 · 상태 단계 · 지도 대시보드 · 통계 표
   ========================================================================== */
(function (g) {
  'use strict';
  var D = g.DB, U = D.util, I = g.UI, esc = I.esc, ic = I.ic, n = I.n;

  function ph(title, desc, actions, kicker) {
    return '<div class="ph"><div class="ph-t">' + (kicker ? '<div class="kick">' + kicker + '</div>' : '') + '<h1>' + esc(title) + '</h1>' + (desc ? '<p>' + desc + '</p>' : '') + '</div>' +
      (actions ? '<div class="ph-a">' + actions + '</div>' : '') + '</div>';
  }
  function card(title, body, opt) {
    opt = opt || {};
    return '<section class="card ' + (opt.cls || '') + '"' + (opt.id ? ' id="' + opt.id + '"' : '') + '>' + (title ? '<div class="card-h"><h2>' + title + '</h2>' + (opt.act ? '<div class="card-a">' + opt.act + '</div>' : '') + '</div>' : '') +
      '<div class="card-b">' + body + '</div></section>';
  }
  /* 제출 상태 단계 표시 */
  function stepper(state) {
    var steps = ['작성 중', '제출', '확정', '마감'];
    var idx = state === '보완 요청' ? 1 : steps.indexOf(state);
    return '<ol class="steps" aria-label="제출 단계">' + steps.map(function (s, i) {
      var cls = i < idx ? 'done' : i === idx ? 'now' : '';
      var lab = s, sub = '';
      if (i === 1 && state === '보완 요청') { cls = 'now warn'; lab = '보완 요청'; sub = '회원사 수정 필요'; }
      return '<li class="' + cls + '"><span class="sd">' + (i < idx ? ic('check') : (i + 1)) + '</span><span class="sl">' + lab + (sub ? '<small>' + sub + '</small>' : '') + '</span></li>';
    }).join('') + '</ol>';
  }
  function pubMonths(k) { var l = D.MONTHS.filter(function (m) { return D.PUB[m]; }); return k ? l.slice(-k) : l; }
  function monthSel(name, val, list, label) {
    return '<label class="fr"><span>' + (label || '월') + '</span><select class="sel" name="' + name + '">' + list.slice().reverse().map(function (m) { return '<option value="' + m + '"' + (m === val ? ' selected' : '') + '>' + U.ymLabel(m) + '</option>'; }).join('') + '</select></label>';
  }
  function verBadge(m) { var v = D.latestV(m); return '<span class="ver" title="발행 버전">v' + v + (v > 1 ? ' · 정정 반영' : '') + '</span>'; }
  function label(dim, v) {
    if (dim === 'member') return D.MMAP[v] ? D.MMAP[v].name : v;
    if (dim === 'factory') return D.FMAP[v].name + ' (' + D.MMAP[D.FMAP[v].member].name + ')';
    if (dim === 'product') return D.PMAP[v].short;
    if (dim === 'region') return D.RMAP[v].name;
    if (dim === 'district') return D.DMAP[v] ? D.RMAP[D.DMAP[v].region].name + ' ' + D.DMAP[v].name : v;
    if (dim === 'month') return U.ymLabel(v);
    if (dim === 'year') return v + '년';
    return v;
  }
  /* 통계 결과 표 — 보호된 칸은 ◆ */
  function statTable(res, opt) {
    opt = opt || {};
    var by = res.meta.by, unit = D.MEASURES[res.meta.measure].unit;
    if (!res.rows.length) return '<div class="empty">' + ic('info') + '조건에 맞는 자료가 없습니다.</div>';
    var shown = 0, hid = 0;
    var body = res.rows.slice(0, opt.limit || 400).map(function (r) {
      var cell = r.sup ? '<span class="supc" data-tip="' + esc(r.sup === 'primary' ? '구성 회원사 ' + D.THRESHOLD + '개사 미만 — 비공개' : '다른 합계와의 차감으로 비공개 값을 알아낼 수 있어 함께 비공개') + '">◆ 비공개</span>' : n(r.value);
      if (r.sup) hid++; else shown++;
      return '<tr' + (r.sup ? ' class="sup"' : '') + '>' + by.map(function (d) { return '<td>' + esc(label(d, r[d])) + '</td>'; }).join('') +
        (opt.contrib ? '<td class="r num">' + r.contributors + '</td>' : '') + '<td class="r num">' + cell + '</td></tr>';
    }).join('');
    return '<div class="tw"><table class="tbl"><thead><tr>' + by.map(function (d) { return '<th>' + D.DIMS[d] + '</th>'; }).join('') +
      (opt.contrib ? '<th class="r">구성 회원사</th>' : '') + '<th class="r">' + D.MEASURES[res.meta.measure].name + ' (' + unit + ')</th></tr></thead><tbody>' + body +
      '</tbody><tfoot><tr><td colspan="' + (by.length + (opt.contrib ? 1 : 0)) + '">합계' + (hid ? ' <small>(비공개 칸 포함)</small>' : '') + '</td><td class="r num">' + n(res.total) + '</td></tr></tfoot></table></div>' +
      (res.rows.length > (opt.limit || 400) ? '<p class="cap">상위 ' + (opt.limit || 400) + '행만 표시 — 전체는 내려받기로 확인</p>' : '');
  }
  function metaLine(res) {
    var vs = res.meta.versions, ks = Object.keys(vs), multi = ks.filter(function (k) { return vs[k] > 1; });
    return '<div class="meta">' + ic('db') + '<span>단일 집계 서비스</span><span>' + esc(res.meta.basis) + '</span><span>발행 ' + (ks.length === 1 ? 'v' + vs[ks[0]] : ks.length + '개월' + (multi.length ? ' · 정정 반영 ' + multi.map(U.ymShort).join(', ') : '')) + '</span><span>대상 ' + n(res.meta.scanned) + '행</span><span class="hash" title="결과 지문 — 경로가 달라도 같은 조건이면 같은 값">#' + res.meta.hash + '</span>' + (res.protectedApplied ? '<span class="pt">' + ic('shield') + '소수 지역 보호 적용</span>' : '') + '</div>';
  }
  function csvFrom(res, cols) {
    var by = res.meta.by;
    var head = by.map(function (d) { return D.DIMS[d]; }).concat(cols && cols.code ? by.map(function (d) { return D.DIMS[d] + ' 코드'; }) : []).concat([D.MEASURES[res.meta.measure].name + '(톤)']);
    var rows = [head];
    res.rows.forEach(function (r) { rows.push(by.map(function (d) { return label(d, r[d]); }).concat(cols && cols.code ? by.map(function (d) { return r[d]; }) : []).concat([r.sup ? '비공개' : r.value])); });
    rows.push(['합계'].concat(new Array(head.length - 2).fill('')).concat([res.total]));
    return U.toCSV(rows);
  }

  /* ======================================================= 지도 대시보드 */
  var MS = { m: null, mode: 'seq', drill: null, prod: '', fac: true, preview: false, playing: null };
  function mapState() { if (!MS.m) MS.m = pubMonths().slice(-1)[0]; return MS; }
  function mapData(scope) {
    var s = mapState(), spec = { measure: 'd', from: s.m, to: s.m, by: ['region'], filter: s.prod ? { products: [s.prod] } : {} };
    if (scope === 'assoc') spec.preview = s.preview;
    var cur = D.API.pub(spec);
    var py = D.util.addM(s.m, -12), prev = D.PUB[py] ? D.aggregate({ measure: 'd', from: py, to: py, by: ['region'], filter: spec.filter }) : { rows: [] };
    var pm = {}; prev.rows.forEach(function (r) { pm[r.region] = r.value; });
    var vals = {};
    cur.rows.forEach(function (r) { vals[r.region] = { value: r.value, sup: r.sup, contributors: scope === 'assoc' ? r.contributors : undefined, prev: pm[r.region], rate: pm[r.region] ? (r.value - pm[r.region]) / pm[r.region] : null }; });
    /* 비공개 칸의 증감률도 비공개 */
    return { cur: cur, vals: vals, prevTotal: prev.rows.reduce(function (a, r) { return a + r.value; }, 0) };
  }
  function facPins(scope) {
    var u = APP.user(), s = mapState(), list = D.FACTORIES.filter(function (f) { return !f.closed || s.m <= f.closed; });
    if (scope !== 'assoc') list = list.filter(function (f) { return D.ownerOf(f.id, s.m) === u.org; });
    return list.map(function (f) {
      var mem = D.ownerOf(f.id, s.m);
      return { id: f.id, x: f.x, y: f.y, name: f.name, sub: esc(D.MMAP[mem].name) + ' · ' + D.RMAP[f.region].name + ' ' + esc(f.districtName) + '<br>' + f.products.map(function (p) { return D.PMAP[p].short; }).join(' · ') + '<br><span class="mute">클릭하면 공장 정보</span>' };
    });
  }
  function mapDash(scope) {
    var s = mapState(), md = mapData(scope), months = pubMonths(24);
    var km = I.koreaMap({ id: 'km', values: md.vals, mode: s.mode, labels: true, clickable: true, selected: s.drill, factories: s.fac ? facPins(scope) : [], title: U.ymLabel(s.m) + ' 시·도별 내수 출하' });
    var total = md.cur.total, rate = md.prevTotal ? (total - md.prevTotal) / md.prevTotal : null;
    var ranked = md.cur.rows.slice().sort(function (a, b) { return b.value - a.value; });
    var supN = ranked.filter(function (r) { return r.sup; }).length;
    var mi = months.indexOf(s.m);
    var ctrl = '<div class="mctl">' +
      '<div class="seg" role="group" aria-label="표시 지표"><button data-mm="seq" class="' + (s.mode === 'seq' ? 'on' : '') + '">출하량</button><button data-mm="div" class="' + (s.mode === 'div' ? 'on' : '') + '">전년 동월 대비 증감</button></div>' +
      '<label class="fr in"><span>품목</span><select class="sel" data-mp>' + '<option value="">전체 품목</option>' + D.PRODUCTS.map(function (p) { return '<option value="' + p.code + '"' + (s.prod === p.code ? ' selected' : '') + '>' + p.short + '</option>'; }).join('') + '</select></label>' +
      '<label class="ck"><input type="checkbox" data-mf' + (s.fac ? ' checked' : '') + '> 공장 위치</label>' +
      (scope === 'assoc' ? '<label class="ck"><input type="checkbox" data-mpv' + (s.preview ? ' checked' : '') + '> 공표 기준 미리보기</label>' : '') +
      '<button class="btn sm g" data-msave>' + ic('image') + '이미지 저장</button></div>';
    var play = '<div class="play"><button class="btn-ic pl" data-mplay aria-label="' + (s.playing ? '재생 멈춤' : '월별 변화 재생') + '">' + ic(s.playing ? 'pause' : 'play') + '</button>' +
      '<input type="range" min="0" max="' + (months.length - 1) + '" value="' + mi + '" data-mr aria-label="월 선택" class="rng">' +
      '<b class="pm">' + U.ymLabel(s.m) + '</b>' + verBadge(s.m) + '</div>';
    var rank = '<div class="tw sm"><table class="tbl compact"><thead><tr><th>시·도</th><th class="r">내수 출하</th><th class="r">전년 대비</th>' + (scope === 'assoc' ? '<th class="r">회원사</th>' : '') + '</tr></thead><tbody>' +
      ranked.map(function (r) {
        var v = md.vals[r.region];
        return '<tr class="' + (s.drill === r.region ? 'on ' : '') + (r.sup ? 'sup' : '') + '" data-rc="' + r.region + '"><td><button class="lnk" data-rc="' + r.region + '">' + D.RMAP[r.region].name + '</button></td><td class="r num">' + (r.sup ? '<span class="supc">◆</span>' : n(r.value)) + '</td><td class="r num ' + (v.rate > 0 ? 'up' : v.rate < 0 ? 'dn' : '') + '">' + (r.sup ? '◆' : I.pctTxt(v.rate)) + '</td>' + (scope === 'assoc' ? '<td class="r num">' + r.contributors + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>';
    var drill = '';
    if (s.drill) {
      var spec = { measure: 'd', from: s.m, to: s.m, by: ['district'], filter: { regions: [s.drill] } };
      if (s.prod) spec.filter.products = [s.prod];
      if (scope === 'assoc') spec.preview = s.preview;
      var dres = D.API.pub(spec), regV = md.vals[s.drill];
      var tl = I.districtTiles(s.drill, dres.rows, 'seq');
      drill = '<section class="card drill" id="drill"><div class="card-h"><h2>' + ic('map') + D.RMAP[s.drill].name + ' — 시·군·구 확대</h2><div class="card-a"><button class="btn sm g" data-mx>' + ic('x') + '닫기</button></div></div><div class="card-b">' +
        (regV && regV.sup ? '<div class="alert warn">' + ic('shield') + '<div><b>시·도 합계가 비공개인 지역입니다.</b> 하위 시·군·구도 공표하지 않습니다.</div></div>' :
          '<p class="mute">' + U.ymLabel(s.m) + ' · ' + (s.prod ? D.PMAP[s.prod].short : '전체 품목') + ' · 시·도 합계 <b class="num">' + n(dres.total) + '</b>톤 · 시·군·구 ' + GEO.districts[s.drill].length + '개' + (dres.protectedApplied ? ' · 구성 회원사 ' + D.THRESHOLD + '개사 미만 칸과 차감 유추 칸은 ◆ 비공개' : '') + '</p>' + tl.html + tl.legend) +
        '<p class="cap">시·군·구별 출하량을 타일로 표시합니다. 비공개 대상 지역은 ◆로 표시합니다.</p></div></section>';
    }
    var html = '<div class="mapgrid">' +
      '<section class="card mapc"><div class="card-h"><h2>' + ic('map') + '지역별 내수 출하 — 시·도</h2><div class="card-a">' + play + '</div></div><div class="card-b">' + ctrl +
      '<div class="mapbox">' + km.svg + '</div>' + km.legend +
      (supN ? '<div class="note">' + ic('shield') + '<div><b>◆ 비공개 ' + supN + '곳</b> — 구성 회원사 ' + D.THRESHOLD + '개사 미만 지역과, 전국 합계에서 빼면 그 값을 알 수 있는 지역은 함께 공표하지 않습니다' + (scope === 'assoc' && s.preview ? ' (회원사 화면과 동일한 공표 기준 미리보기)' : '') + '.</div></div>' : '') +
      '</div></section>' +
      '<div class="mapside"><div class="kpis k2"><div class="kpi"><div class="l">전국 내수 출하</div><div class="v">' + I.compact(total) + '<em>톤</em></div><div class="d ' + (rate >= 0 ? 'up' : 'dn') + '">전년 동월 대비 ' + I.pctTxt(rate) + '</div></div>' +
      '<div class="kpi"><div class="l">시·도</div><div class="v">' + ranked.length + '<em>곳</em></div><div class="d">' + (supN ? '비공개 ' + supN + '곳' : '전 지역 공표') + '</div></div></div>' +
      card('시·도 순위 <small>표 보기</small>', rank, { cls: 'flat' }) + '</div></div>' + drill;
    return html;
  }
  function mountMap(root, scope) {
    var s = mapState(), months = pubMonths(24);
    function re() { APP.rerender(); }
    root.addEventListener('click', function (e) {
      var t = e.target.closest('[data-mm],[data-rc],[data-mx],[data-mplay],[data-msave],.fac'); if (!t) return;
      if (t.hasAttribute('data-mm')) { s.mode = t.getAttribute('data-mm'); re(); }
      else if (t.classList.contains('fac')) { facInfo(t.getAttribute('data-fid'), scope); }
      else if (t.hasAttribute('data-rc')) { s.drill = t.getAttribute('data-rc'); APP.rerender(); var d = document.getElementById('drill'); if (d) d.scrollIntoView({ block: 'nearest' }); }
      else if (t.hasAttribute('data-mx')) { s.drill = null; re(); }
      else if (t.hasAttribute('data-msave')) { I.saveSvgPng(root.querySelector('svg.kmap'), '시도별_내수출하_' + s.m + (s.mode === 'div' ? '_전년대비' : '') + '.png'); }
      else if (t.hasAttribute('data-mplay')) {
        if (s.playing) { clearInterval(s.playing); s.playing = null; re(); return; }
        var i = months.indexOf(s.m); if (i >= months.length - 1) i = -1;
        s.m = months[i + 1];
        s.playing = setInterval(function () {
          var k = months.indexOf(s.m);
          if (k >= months.length - 1 || !document.querySelector('[data-mplay]')) { clearInterval(s.playing); s.playing = null; if (document.querySelector('[data-mplay]')) re(); return; }
          s.m = months[k + 1]; re();
        }, 850);
        re();
      }
    });
    root.addEventListener('keydown', function (e) {
      var t = e.target.closest && e.target.closest('path.rg'); if (!t) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s.drill = t.getAttribute('data-rc'); re(); }
    });
    root.addEventListener('change', function (e) {
      var t = e.target;
      if (t.hasAttribute('data-mp')) { s.prod = t.value; re(); }
      if (t.hasAttribute('data-mf')) { s.fac = t.checked; re(); }
      if (t.hasAttribute('data-mpv')) { s.preview = t.checked; re(); }
    });
    root.addEventListener('input', function (e) {
      if (e.target.hasAttribute('data-mr')) { if (s.playing) { clearInterval(s.playing); s.playing = null; } s.m = months[+e.target.value]; re(); }
    });
  }
  function facInfo(fid, scope) {
    var f = D.FMAP[fid], s = mapState(), mem = D.ownerOf(fid, s.m);
    var u = APP.user(), mine = scope === 'assoc' || mem === u.org;
    var res = mine ? D.aggregate({ measure: 'pr', from: s.m, to: s.m, by: ['product'], filter: { factories: [fid] } }) : null;
    I.modal({ title: f.name + ' — 공장 정보', size: 'md', body:
      '<dl class="dl"><dt>회원사</dt><dd>' + esc(D.MMAP[mem].name) + '</dd><dt>소재지</dt><dd>' + D.RMAP[f.region].name + ' ' + esc(f.districtName) + ' (시군구 코드 ' + f.district + ')</dd>' +
      '<dt>좌표</dt><dd class="num">' + f.lat.toFixed(4) + ', ' + f.lon.toFixed(4) + ' <small class="mute">주소 → 좌표 변환 결과</small></dd>' +
      '<dt>생산 품목</dt><dd>' + f.products.map(function (p) { return D.PMAP[p].name; }).join(', ') + '</dd>' +
      (f.owner.length > 1 ? '<dt>소유 이력</dt><dd>' + f.owner.map(function (o) { return esc(D.MMAP[o.member].name) + ' ' + U.ymShort(o.from) + '~' + (o.to ? U.ymShort(o.to) : ''); }).join(' → ') + '</dd>' : '') +
      (res ? '<dt>' + U.ymLabel(s.m) + ' 생산</dt><dd class="num">' + n(res.total) + '톤</dd>' : '') + '</dl>' +
      (scope === 'assoc' ? '<div class="note">' + ic('pin') + '<div>주소가 바뀌면 「좌표 다시 변환」으로 지도 위치를 갱신합니다. 변환 결과는 기준정보 변경 이력에 남습니다.</div></div>' : ''),
      foot: (scope === 'assoc' ? '<button class="btn" data-geocode>' + ic('refresh') + '좌표 다시 변환</button>' : '') + '<button class="btn p" data-mclose>닫기</button>',
      onOpen: function (m) { var b = m.querySelector('[data-geocode]'); if (b) b.addEventListener('click', function () { D.audit('좌표 변환', f.name, '허용', '주소 → 좌표 재변환 (변경 없음)'); I.toast('좌표를 다시 변환했습니다', 'ok', '변경 없음 · 이력 기록'); }); } });
  }

  g.CM = { ph: ph, card: card, stepper: stepper, pubMonths: pubMonths, monthSel: monthSel, verBadge: verBadge, label: label, statTable: statTable, metaLine: metaLine, csvFrom: csvFrom, mapDash: mapDash, mountMap: mountMap, mapState: mapState };
})(window);
