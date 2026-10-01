/* ==========================================================================
   회원사 웹 — 12화면
   M01 로그인 · M02 요약 대시보드 · M03 대량 입력표 · M04 엑셀 업로드·일괄 등록 · M05 속보
   M06 유연탄 · M07 수출입 · M08 제출·보완 요청 현황 · M09 통계 조회·다운로드
   M10 전년 동기 비교 · M11 지도 대시보드 · M12 계정·직원 권한
   ========================================================================== */
(function (g) {
  'use strict';
  var D = g.DB, U = D.util, I = g.UI, C = g.CM, esc = I.esc, ic = I.ic, n = I.n, $ = I.$, $$ = I.$$;
  var CUR = D.CUR;
  function me() { return APP.user(); }
  function org() { return me().org; }
  function S() { return D.SUB[CUR][org()]; }
  function lastPub() { return C.pubMonths().slice(-1)[0]; }
  function canEdit() { return S().state === '작성 중' && (D.can('DATA_INPUT') || D.can('DATA_EDIT')); }
  function num(v) { if (v === null || v === undefined) return null; v = String(v).replace(/[,\s]/g, ''); if (v === '') return null; return isNaN(v) ? v : +v; }
  function nonNegativeInt(v) {
    var raw = String(v).trim();
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(raw)) return null;
    raw = raw.replace(/,/g, '');
    var value = Number(raw);
    return Number.isSafeInteger(value) ? value : null;
  }
  function inputNotice() {
    var state = S().state;
    if (state === '보완 요청') return '<div class="alert info">' + ic('lock') + '<div><b>보완 요청 상태입니다.</b> 「대량 입력표」에서 수정 시작을 누르면 다시 입력할 수 있습니다.</div></div>';
    if (state === '제출') return '<div class="alert info">' + ic('lock') + '<div><b>제출 상태입니다.</b> 협회가 검토하는 동안에는 수정할 수 없습니다.</div></div>';
    if (state !== '작성 중') return '<div class="alert info">' + ic('lock') + '<div><b>' + esc(state) + ' 상태입니다.</b> 확정·마감된 자료는 「제출·보완 요청 현황」에서 정정을 요청해 주세요.</div></div>';
    return '<div class="alert info">' + ic('eye') + '<div><b>조회 전용 계정입니다.</b> 입력 권한은 회원사 관리자가 「계정·직원 권한」에서 부여합니다.</div></div>';
  }

  /* ======================================================= M01 로그인 */
  APP.screen({ path: '/m/login', side: 'member', title: '회원사 웹 로그인', public: true,
    render: function () { return I.authPage('member'); },
    mount: function (el) { I.mountAuth(el); } });

  /* ======================================================= M02 요약 대시보드 */
  APP.screen({ path: '/m/home', side: 'member', title: '요약 대시보드',
    render: function () {
      var mem = D.MMAP[org()], st = S(), m = lastPub(), pm = U.addM(m, -1), py = U.addM(m, -12);
      var iss = D.validate(org(), CUR, 'submit'), er = iss.filter(function (x) { return x.lv === 'error'; }).length, wr = iss.filter(function (x) { return x.lv === 'warn'; }).length;
      var keys = Object.keys(st.rows), filled = keys.filter(function (k) { var r = st.rows[k]; return ['pr', 'd', 'x', 'e'].every(function (f) { return r[f] !== null && r[f] !== ''; }); }).length;
      var q = function (meas, mm, by) { return D.API.own({ measure: meas, from: mm, to: mm, by: by || [] }); };
      var kp = ['pr', 'd', 'x', 'e'].map(function (meas) {
        var c = q(meas, m).total, p = q(meas, pm).total, y = D.PUB[py] ? q(meas, py).total : null;
        var spark = D.API.own({ measure: meas, from: U.addM(m, -11), to: m, by: ['month'] }).rows.map(function (r) { return r.value; });
        return { meas: meas, c: c, p: p, y: y, spark: spark };
      });
      var nat = D.API.pub({ measure: 'pr', from: m, to: m, by: [] }).total;
      var trendRes = D.API.own({ measure: 'pr', from: U.addM(m, -23), to: m, by: ['month'] }).rows;
      var labels = [], a = [], b = [];
      trendRes.slice(12).forEach(function (r, i) { labels.push(U.ymShort(r.month)); a.push(r.value); b.push(trendRes[i] ? trendRes[i].value : null); });
      var byP = q('pr', m, ['product']).rows.sort(function (x, y) { return y.value - x.value; });
      var tot = byP.reduce(function (s, r) { return s + r.value; }, 0);
      var byF = q('pr', m, ['factory']).rows.sort(function (x, y) { return y.value - x.value; });
      var last = st.history[st.history.length - 1];
      var hero = '<section class="hero"><div class="hero-l"><div class="kick">' + esc(mem.name) + ' · ' + U.ymLabel(CUR) + ' 자료</div>' +
        '<h1>' + (st.state === '작성 중' ? '입력을 마치고 <span>10월 10일</span>까지 제출해 주세요' : st.state === '보완 요청' ? '협회가 <span>보완을 요청</span>했습니다' : st.state === '제출' ? '제출 완료 — <span>협회 확인 중</span>입니다' : '<span>' + st.state + '</span>되었습니다') + '</h1>' +
        C.stepper(st.state) +
        (st.state === '보완 요청' ? '<div class="alert warn">' + ic('alert') + '<div><b>보완 요청 사유</b> ' + esc(last.note) + '</div></div>' : '') + '</div>' +
        '<div class="hero-r"><div class="ring" style="--p:' + Math.round(filled / Math.max(1, keys.length) * 100) + '"><b>' + filled + '<small>/' + keys.length + '</small></b><span>행 입력</span></div>' +
        '<div class="hstat"><span class="' + (er ? 'e' : '') + '">' + ic('alert') + '오류 <b>' + er + '</b></span><span class="' + (wr ? 'w' : '') + '">' + ic('info') + '경고 <b>' + wr + '</b></span></div>' +
        '<a class="btn p" href="#/m/input">' + ic('table') + (st.state === '작성 중' ? '대량 입력표 열기' : '입력 내용 보기') + '</a></div></section>';
      var kpis = '<div class="kpis">' + kp.map(function (k) {
        var dm = I.delta(k.c, k.p), dy = k.y ? I.delta(k.c, k.y) : null;
        return '<div class="kpi"><div class="l">' + D.MEASURES[k.meas].name + ' <small>' + U.ymLabel(m) + '</small></div><div class="v">' + I.compact(k.c) + '<em>톤</em></div>' +
          '<div class="d"><span class="' + (dm >= 0 ? 'up' : 'dn') + '">전월 ' + I.pctTxt(dm) + '</span><span class="' + (dy >= 0 ? 'up' : 'dn') + '">전년 동월 ' + I.pctTxt(dy) + '</span></div>' + spark(k.spark) + '</div>';
      }).join('') + '</div>';
      return C.ph('요약 대시보드', '발행된 최신 통계는 ' + U.ymLabel(m) + ' ' + C.verBadge(m) + ' 기준입니다. 당월 자료는 마감 후 통계에 반영됩니다.', '<a class="btn" href="#/m/stats">' + ic('chart') + '통계 조회</a>', '회원사 웹') +
        hero + kpis +
        '<div class="grid g21">' + C.card('월별 생산 추이 <small>' + esc(mem.name) + ' · 최근 12개월 vs 전년 같은 달</small>', I.lineChart({ title: '월별 생산 추이', labels: labels, series: [{ name: '최근 12개월', color: I.PAL().s1, values: a, area: true }, { name: '전년 같은 달', color: I.PAL().s2, values: b }] })) +
        C.card('업계 대비', '<div class="share"><div class="share-v">' + (nat ? (kp[0].c / nat * 100).toFixed(1) : '—') + '<em>%</em></div><p>' + U.ymLabel(m) + ' 전국 생산 <b class="num">' + I.compact(nat) + '</b>톤 중 귀사 비중</p><p class="cap">업계 합계는 공표 통계이며 회원사별로 나누어 볼 수 없습니다.</p></div>') + '</div>' +
        '<div class="grid g2">' + C.card('품목별 생산 비중 <small>' + U.ymLabel(m) + '</small>', I.barList({ items: byP.map(function (r) { return { label: D.PMAP[r.product].short, value: r.value, share: r.value / tot }; }) })) +
        C.card('공장별 생산 <small>' + U.ymLabel(m) + '</small>', I.barList({ items: byF.map(function (r) { return { label: D.FMAP[r.factory].name, value: r.value, share: r.value / tot }; }) })) + '</div>' +
        '<div class="grid g2">' + C.card('최근 처리 이력', timeline(st.history.slice(-4).reverse())) + C.card('속보 · 유연탄 · 수출입', sideStatus()) + '</div>';
    } });
  function spark(vals) {
    if (!vals.length) return '';
    var max = Math.max.apply(null, vals), min = Math.min.apply(null, vals), W = 120, H = 28;
    var pts = vals.map(function (v, i) { return (i * W / (vals.length - 1)).toFixed(1) + ',' + (H - 3 - (v - min) / Math.max(1, max - min) * (H - 6)).toFixed(1); });
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><polyline points="' + pts.join(' ') + '" fill="none" stroke="' + I.PAL().s1 + '" stroke-width="2"/><circle cx="' + pts[pts.length - 1].split(',')[0] + '" cy="' + pts[pts.length - 1].split(',')[1] + '" r="3" fill="' + I.PAL().s1 + '"/></svg>';
  }
  function timeline(h) {
    return '<ol class="tl">' + h.map(function (x) {
      return '<li><span class="tl-d">' + I.chip(x.to) + '</span><div><b>' + esc(x.from ? x.from + ' → ' + x.to : x.to) + '</b><small>' + U.fmtTime(x.at) + ' · ' + esc(x.by) + '</small>' + (x.note ? '<p>' + esc(x.note) + '</p>' : '') + '</div></li>';
    }).join('') + '</ol>';
  }
  function sideStatus() {
    var f = D.FLASH[org()]['2026-10'], c = D.COAL[org()][CUR] || [], t = D.TRADE[org()][CUR] || [];
    return '<ul class="mini"><li><span>' + ic('bolt') + '속보 10월 상순</span>' + I.chip(f[0].state) + '<a href="#/m/flash">입력</a></li>' +
      '<li><span>' + ic('flame') + '유연탄 9월</span>' + (c.length ? I.chip('작성 중') : '<span class="mute">대상 공장 없음</span>') + '<a href="#/m/coal">입력</a></li>' +
      '<li><span>' + ic('ship') + '수출입 9월</span>' + I.chip(t.length ? '작성 중' : '미착수') + '<a href="#/m/trade">입력</a></li></ul>';
  }

  /* ======================================================= M03 대량 입력표 */
  var COLS = ['pr', 'd', 'x', 'e'];
  APP.screen({ path: '/m/input', side: 'member', title: '대량 입력표',
    render: function (p) {
      var st = S(), fs = D.factoriesOf(org(), CUR), fid = p.f || fs[0].id, f = D.FMAP[fid];
      if (fid !== 'all' && !f) fid = fs[0].id;
      var ed = canEdit();
      var tabs = '<div class="tabs" role="tablist">' + fs.map(function (x) { return '<a role="tab" class="tab' + (x.id === fid ? ' on' : '') + '" href="#/m/input?f=' + x.id + '" aria-selected="' + (x.id === fid) + '">' + esc(x.name) + '<em class="tc" data-tc="' + x.id + '"></em></a>'; }).join('') +
        '<a role="tab" class="tab' + (fid === 'all' ? ' on' : '') + '" href="#/m/input?f=all">전체 요약</a></div>';
      var banner = '';
      if (st.state !== '작성 중') banner = st.state === '보완 요청' ?
        '<div class="alert warn">' + ic('alert') + '<div><b>협회 보완 요청</b> ' + esc(st.history[st.history.length - 1].note) + '</div><button class="btn sm" data-act2="reopen">' + ic('file') + '수정 시작</button></div>' :
        '<div class="alert info">' + ic('lock') + '<div><b>' + st.state + ' 상태입니다.</b> ' + (st.state === '제출' ? '협회 확인 중에는 수정할 수 없습니다. 협회가 보완을 요청하면 다시 수정할 수 있습니다.' : '확정·마감된 자료는 「마감 후 정정 요청」으로만 바꿀 수 있습니다.') + '</div></div>';
      else if (!D.can('DATA_INPUT') && !D.can('DATA_EDIT')) banner = '<div class="alert info">' + ic('eye') + '<div><b>조회 전용 계정입니다.</b> 입력 권한은 회원사 관리자가 「계정·직원 권한」에서 부여합니다.</div></div>';
      var body = fid === 'all' ? summaryAll(fs) : gridHTML(f, ed);
      var acts = ed ? '<button class="btn" data-act2="prev">' + ic('copy') + '전월 자료 불러오기</button><button class="btn" data-act2="save">' + ic('check') + '임시저장</button>' : '';
      return C.ph('대량 입력표', U.ymLabel(CUR) + ' · 공장별 품목 생산·출하·재고와 지역별 내수 출하를 입력합니다. 엑셀에서 여러 칸을 복사해 붙여넣을 수 있고, 방향키·Enter·Tab으로 이동합니다.', acts + '<a class="btn" href="#/m/upload">' + ic('upload') + '엑셀 업로드</a>', '자료 입력') +
        banner + tabs + '<div class="inwrap"><div class="inmain">' + body + '</div><aside class="inside" id="issues"></aside></div>' +
        '<div class="sbar" id="sbar"></div>';
    },
    mount: function (el, p) { mountGrid(el, p); } });

  function refsOf(f, pcode, fl) {
    var pm = D.refVal(f, pcode, U.addM(CUR, -1), fl), py = D.refVal(f, pcode, U.addM(CUR, -12), fl);
    return { pm: pm, py: py };
  }
  function gridHTML(f, ed) {
    var st = S(), prods = f.products, ro = ed ? '' : ' readonly tabindex="-1"';
    var rowsA = prods.map(function (pc, i) {
      var k = D.rowKey(f.id, pc), r = st.rows[k];
      return '<tr data-row="' + k + '"><th scope="row"><b>' + D.PMAP[pc].short + '</b><small>' + pc + '</small></th>' +
        '<td class="ro num" title="전월 확정 기말재고에서 자동">' + n(r.b) + '<small class="ref">자동</small></td>' +
        COLS.map(function (fl, j) {
          var rf = fl === 'e' ? null : refsOf(f.id, pc, fl);
          return '<td class="ci"><input class="cell num" data-t="a" data-r="' + i + '" data-c="' + j + '" data-k="' + k + '" data-fl="' + fl + '" value="' + (r[fl] === null ? '' : n(r[fl])) + '" inputmode="numeric" autocomplete="off" aria-label="' + esc(f.name + ' ' + D.PMAP[pc].short + ' ' + D.FIELDS[fl]) + '"' + ro + '>' +
            (rf ? '<small class="ref" title="전월 ' + n(rf.pm || 0) + ' · 전년 동월 ' + n(rf.py || 0) + '">' + I.compact(rf.pm || 0) + ' / ' + I.compact(rf.py || 0) + '</small>' : '<small class="ref">실사 재고</small>') + '</td>';
        }).join('') +
        '<td class="bal" data-bal="' + k + '"></td><td class="rs" data-rs="' + k + '"></td></tr>';
    }).join('');
    var regs = D.REGIONS.slice().sort(function (a, b) {
      var ia = D.RW[f.id].findIndex(function (w) { return w[0] === a.code; }), ib = D.RW[f.id].findIndex(function (w) { return w[0] === b.code; });
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.code.localeCompare(b.code);
    });
    var rowsB = regs.map(function (rg, i) {
      return '<tr data-rg="' + rg.code + '"><th scope="row">' + rg.name + '<button class="lnk xs" data-dist="' + rg.code + '">시·군·구</button></th>' + prods.map(function (pc, j) {
        var k = D.rowKey(f.id, pc), r = st.rows[k], s = D.regionSums(r.dm)[rg.code];
        return '<td class="ci"><input class="cell num" data-t="b" data-r="' + i + '" data-c="' + j + '" data-k="' + k + '" data-rgc="' + rg.code + '" value="' + (s ? n(s) : '') + '" inputmode="numeric" autocomplete="off" aria-label="' + esc(rg.name + ' ' + D.PMAP[pc].short + ' 내수 출하') + '"' + ro + '></td>';
      }).join('') + '</tr>';
    }).join('');
    var foot = '<tr class="sum"><th>지역 합계</th>' + prods.map(function (pc) { return '<td class="num" data-dsum="' + D.rowKey(f.id, pc) + '"></td>'; }).join('') + '</tr>' +
      '<tr class="sum"><th>내수 출하 총괄</th>' + prods.map(function (pc) { return '<td class="num" data-dtot="' + D.rowKey(f.id, pc) + '"></td>'; }).join('') + '</tr>' +
      '<tr class="sum chk"><th>상세 ↔ 총괄</th>' + prods.map(function (pc) { return '<td data-dchk="' + D.rowKey(f.id, pc) + '"></td>'; }).join('') + '</tr>';
    return '<section class="card"><div class="card-h"><h2>' + ic('table') + esc(f.name) + ' — 생산·출하·재고 <small>' + D.RMAP[f.region].name + ' ' + esc(f.districtName) + ' · 단위 톤</small></h2><div class="card-a"><span class="lgd"><i class="lg-e"></i>오류</span><span class="lgd"><i class="lg-w"></i>급변 경고</span></div></div>' +
      '<div class="card-b"><div class="tw xgw"><table class="xg"><thead><tr><th>품목</th><th>기초재고<small>전월 기말</small></th><th>생산<small>전월 / 전년 동월</small></th><th>내수 출하<small>전월 / 전년 동월</small></th><th>수출 출하<small>전월 / 전년 동월</small></th><th>기말재고</th><th>재고 수지<small>기초+생산−출하=기말</small></th><th>상태</th></tr></thead><tbody>' + rowsA + '</tbody></table></div></div></section>' +
      '<section class="card"><div class="card-h"><h2>' + ic('map') + '지역별 내수 출하 <small>시·도 × 품목 · 시·군·구 상세는 「시·군·구」 또는 엑셀 업로드</small></h2></div><div class="card-b"><div class="tw xgw"><table class="xg reg"><thead><tr><th>시·도</th>' +
      prods.map(function (pc) { return '<th>' + D.PMAP[pc].short + '</th>'; }).join('') + '</tr></thead><tbody>' + rowsB + '</tbody><tfoot>' + foot + '</tfoot></table></div></div></section>';
  }
  function summaryAll(fs) {
    var st = S(), iss = D.validate(org(), CUR, 'submit');
    return C.card('공장별 입력 현황', '<div class="tw"><table class="tbl"><thead><tr><th>공장</th><th>품목</th><th class="r">입력 완료 행</th><th class="r">오류</th><th class="r">경고</th><th class="r">생산 합계</th><th class="r">내수 출하 합계</th><th></th></tr></thead><tbody>' +
      fs.map(function (f) {
        var ks = f.products.map(function (p) { return D.rowKey(f.id, p); });
        var done = ks.filter(function (k) { var r = st.rows[k]; return COLS.every(function (c) { return r[c] !== null; }); }).length;
        var e = iss.filter(function (x) { return x.lv === 'error' && ks.indexOf(x.key) >= 0; }).length, w = iss.filter(function (x) { return x.lv === 'warn' && ks.indexOf(x.key) >= 0; }).length;
        var sp = 0, sd = 0; ks.forEach(function (k) { sp += +st.rows[k].pr || 0; sd += +st.rows[k].d || 0; });
        return '<tr><td><b>' + esc(f.name) + '</b></td><td>' + f.products.length + '종</td><td class="r num">' + done + ' / ' + ks.length + '</td><td class="r num">' + (e ? '<span class="tx-e">' + e + '</span>' : 0) + '</td><td class="r num">' + (w ? '<span class="tx-w">' + w + '</span>' : 0) + '</td><td class="r num">' + n(sp) + '</td><td class="r num">' + n(sd) + '</td><td><a class="btn sm" href="#/m/input?f=' + f.id + '">입력</a></td></tr>';
      }).join('') + '</tbody></table></div>');
  }
  function refresh(el) {
    var st = S(), iss = D.validate(org(), CUR, 'submit');
    var byCell = {};
    iss.forEach(function (x) { var k = x.key + '|' + x.field; if (!byCell[k] || x.lv === 'error') byCell[k] = x; });
    $$('input.cell[data-fl]', el).forEach(function (c) {
      var x = byCell[c.getAttribute('data-k') + '|' + c.getAttribute('data-fl')];
      var req = !!x && x.code === 'E01';
      c.classList.toggle('req', req); c.classList.toggle('err', !!x && x.lv === 'error' && !req); c.classList.toggle('warn', !!x && x.lv === 'warn');
      c.title = x ? x.msg : '';
    });
    $$('[data-bal]', el).forEach(function (td) {
      var r = st.rows[td.getAttribute('data-bal')];
      if (COLS.some(function (c) { return r[c] === null; })) { td.innerHTML = '<span class="mute">입력 대기</span>'; td.className = 'bal'; return; }
      var calc = (+r.b) + (+r.pr) - (+r.d) - (+r.x), diff = (+r.e) - calc;
      td.className = 'bal ' + (diff ? 'bad' : 'ok');
      td.innerHTML = diff ? ic('x') + '차이 <b class="num">' + (diff > 0 ? '+' : '−') + n(Math.abs(diff)) + '</b><small>계산 ' + n(calc) + '</small>' : ic('check') + '일치';
    });
    $$('[data-rs]', el).forEach(function (td) {
      var k = td.getAttribute('data-rs'), e = iss.filter(function (x) { return x.key === k && x.lv === 'error'; }).length, w = iss.filter(function (x) { return x.key === k && x.lv === 'warn'; }).length;
      td.innerHTML = e ? '<span class="tx-e">' + ic('alert') + e + '</span>' : w ? '<span class="tx-w">' + ic('info') + w + '</span>' : '<span class="tx-ok">' + ic('check') + '</span>';
    });
    $$('[data-dsum]', el).forEach(function (td) { var r = st.rows[td.getAttribute('data-dsum')]; td.textContent = n(D.dmTotal(r.dm)); });
    $$('[data-dtot]', el).forEach(function (td) { var r = st.rows[td.getAttribute('data-dtot')]; td.textContent = n(r.d); });
    $$('[data-dchk]', el).forEach(function (td) {
      var r = st.rows[td.getAttribute('data-dchk')], dt = D.dmTotal(r.dm);
      if (r.d === null) { td.innerHTML = '<span class="mute">—</span>'; return; }
      td.innerHTML = dt === +r.d ? '<span class="tx-ok">' + ic('check') + '일치</span>' : '<span class="tx-e">' + ic('x') + '차이 ' + n(dt - r.d) + '</span>';
      $$('input[data-rgc][data-k="' + td.getAttribute('data-dchk') + '"]', el).forEach(function (c) { c.classList.toggle('err', dt !== +r.d); });
    });
    /* 탭별 오류 개수 */
    $$('[data-tc]', el).forEach(function (t) { var fid = t.getAttribute('data-tc'), e = iss.filter(function (x) { return x.lv === 'error' && x.key.indexOf(fid + '|') === 0; }).length; t.textContent = e || ''; t.className = 'tc' + (e ? ' on' : ''); });
    var er = iss.filter(function (x) { return x.lv === 'error'; }), wr = iss.filter(function (x) { return x.lv === 'warn'; });
    var keys = Object.keys(st.rows), filled = keys.filter(function (k) { return COLS.every(function (c) { return st.rows[k][c] !== null; }); }).length;
    var ed = canEdit();
    var panel = $('#issues', el);
    if (panel) panel.innerHTML = '<div class="iss-h"><h3>' + ic('checkc') + '검증 결과</h3><span class="mute">입력 즉시 · 제출 시 재검증</span></div>' +
      '<div class="iss-c"><div class="' + (er.length ? 'e' : 'ok') + '"><b>' + er.length + '</b>오류<small>제출 차단</small></div><div class="' + (wr.length ? 'w' : 'ok') + '"><b>' + wr.length + '</b>급변 경고<small>사유 입력</small></div></div>' +
      (er.length ? '<div class="iss-l">' + groupE01(er).slice(0, 40).map(function (x) { return issueItem(x); }).join('') + '</div>' : '<div class="iss-ok">' + ic('checkc') + '필수 검증을 모두 통과했습니다</div>') +
      (wr.length ? '<div class="iss-sub">급변 경고 — 입력은 막지 않습니다. 협회 확인용 사유를 적어 주세요.</div><div class="iss-l">' + wr.map(function (x) { return issueItem(x, true, ed); }).join('') + '</div>' : '') +
      '<p class="cap">급변 기준: 전월 대비 ±' + D.SWING.mom * 100 + '% 또는 전년 동월 대비 ±' + D.SWING.yoy * 100 + '% (차이 ' + n(D.SWING.minAbs) + '톤 이상) · 협회 설정값</p>';
    var sbar = $('#sbar', el);
    if (sbar) sbar.innerHTML = '<div class="sb-l"><span>' + I.chip(st.state) + '</span><span>입력 <b class="num">' + filled + '/' + keys.length + '</b>행</span><span class="' + (er.length ? 'tx-e' : '') + '">오류 <b>' + er.length + '</b></span><span class="' + (wr.length ? 'tx-w' : '') + '">경고 <b>' + wr.length + '</b></span><span class="mute">마지막 저장 ' + U.fmtTime(st.savedAt, false) + '</span></div>' +
      '<div class="sb-r">' + (st.state === '작성 중' ? '<button class="btn p" data-act2="submit"' + (D.can('DATA_SUBMIT') ? '' : ' disabled title="제출 권한이 없습니다 — 회원사 관리자에게 요청"') + '>' + ic('send') + '제출하기</button>' + (D.can('DATA_SUBMIT') ? '' : '<span class="mute sm">제출 권한 없음</span>') : '<a class="btn" href="#/m/status">' + ic('send') + '제출 현황</a>') + '</div>';
  }
  /* 필수값 누락은 행 단위로 묶어 보여 준다 (나머지 오류는 그대로) */
  function groupE01(list) {
    var out = [], by = {};
    list.forEach(function (x) {
      if (x.code !== 'E01') { out.push(x); return; }
      if (!by[x.key]) { by[x.key] = { lv: 'error', code: 'E01', key: x.key, field: x.field, fields: [] }; out.push(by[x.key]); }
      by[x.key].fields.push(D.FIELDS[x.field]);
    });
    out.forEach(function (x) { if (x.fields) { var r = x.key.split('|'); x.msg = D.FMAP[r[0]].name + ' · ' + D.PMAP[r[1]].short + ' — 필수값 누락 ' + x.fields.length + '칸 (' + x.fields.join('·') + ')'; } });
    return out.sort(function (a, b) { return (a.code === 'E01') - (b.code === 'E01'); });
  }
  function issueItem(x, warn, ed) {
    var S0 = S(), k = x.key + '|' + x.field, f = x.key.split('|')[0];
    return '<div class="iss ' + x.lv + '"><button class="lnk" data-goto="' + x.key + '" data-gf="' + x.field + '" data-gfac="' + f + '"><span class="code">' + x.code + '</span>' + esc(x.msg) + '</button>' +
      (warn ? '<label class="rsn"><span>사유</span><input class="inp sm" data-why="' + esc(k) + '" value="' + esc(S0.warnAck[k] || '') + '" placeholder="예: 신규 현장 납품 개시"' + (ed ? '' : ' readonly') + '></label>' : '') + '</div>';
  }
  function mountGrid(el, p) {
    var st = S();
    refresh(el);
    function setVal(c, raw) {
      var k = c.getAttribute('data-k'), r = st.rows[k], v = num(raw);
      if (c.hasAttribute('data-fl')) { r[c.getAttribute('data-fl')] = v; }
      else {
        var rc = c.getAttribute('data-rgc'), known = 0;
        Object.keys(r.dm).forEach(function (dc) { if (dc.slice(0, 2) === rc && dc.slice(2) !== '000') known += +r.dm[dc]; });
        var vv = v === null ? 0 : +v;
        if (isNaN(vv)) return;
        if (vv < known) { Object.keys(r.dm).forEach(function (dc) { if (dc.slice(0, 2) === rc) delete r.dm[dc]; }); if (vv) r.dm[rc + '000'] = vv; I.toast('시·군·구 상세보다 작은 값이라 상세를 지웠습니다', '', D.RMAP[rc].name + ' — 시·군·구 미상으로 기록'); }
        else { delete r.dm[rc + '000']; if (vv - known) r.dm[rc + '000'] = vv - known; }
      }
    }
    el.addEventListener('input', function (e) {
      var c = e.target;
      if (c.classList.contains('cell')) { setVal(c, c.value); refresh(el); }
      if (c.hasAttribute('data-why')) { st.warnAck[c.getAttribute('data-why')] = c.value.trim(); }
    });
    el.addEventListener('focusin', function (e) { var c = e.target; if (c.classList.contains('cell') && !c.readOnly) { c.value = String(c.value).replace(/,/g, ''); c.select(); } });
    el.addEventListener('focusout', function (e) { var c = e.target; if (c.classList.contains('cell')) { var v = num(c.value); c.value = v === null ? '' : (isNaN(v) ? c.value : n(v)); } });
    el.addEventListener('keydown', function (e) {
      var c = e.target; if (!c.classList.contains('cell')) return;
      var r = +c.getAttribute('data-r'), cc = +c.getAttribute('data-c'), tt = c.getAttribute('data-t'), nr = r, nc = cc;
      if (e.key === 'ArrowDown' || e.key === 'Enter') nr = r + (e.shiftKey && e.key === 'Enter' ? -1 : 1);
      else if (e.key === 'ArrowUp') nr = r - 1;
      else if (e.key === 'ArrowRight' && c.selectionStart === c.value.length) nc = cc + 1;
      else if (e.key === 'ArrowLeft' && c.selectionStart === 0) nc = cc - 1;
      else return;
      var nx = el.querySelector('input.cell[data-t="' + tt + '"][data-r="' + nr + '"][data-c="' + nc + '"]');
      if (nx) { e.preventDefault(); nx.focus(); }
    });
    el.addEventListener('paste', function (e) {
      var c = e.target; if (!c.classList.contains('cell') || c.readOnly) return;
      var txt = (e.clipboardData || window.clipboardData).getData('text');
      if (!/[\t\n]/.test(txt.trim())) return;
      e.preventDefault();
      var lines = txt.replace(/\r/g, '').split('\n').filter(function (l) { return l.length; });
      var r0 = +c.getAttribute('data-r'), c0 = +c.getAttribute('data-c'), tt = c.getAttribute('data-t'), cnt = 0;
      lines.forEach(function (ln, i) { ln.split('\t').forEach(function (v, j) {
        var t = el.querySelector('input.cell[data-t="' + tt + '"][data-r="' + (r0 + i) + '"][data-c="' + (c0 + j) + '"]');
        if (t && !t.readOnly) { setVal(t, v); var nv = num(v); t.value = nv === null ? '' : isNaN(nv) ? v : n(nv); cnt++; }
      }); });
      refresh(el); I.toast(cnt + '칸을 붙여넣었습니다', 'ok', lines.length + '행 × ' + lines[0].split('\t').length + '열');
    });
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act2],[data-goto],[data-dist]'); if (!b) return;
      if (b.hasAttribute('data-goto')) {
        var fac = b.getAttribute('data-gfac'), k = b.getAttribute('data-goto'), fl = b.getAttribute('data-gf');
        var cell = el.querySelector('input[data-k="' + k + '"][data-fl="' + fl + '"]') || el.querySelector('input[data-k="' + k + '"][data-rgc]');
        if (cell) { cell.focus(); cell.scrollIntoView({ block: 'center' }); }
        else { APP.go('/m/input?f=' + fac); setTimeout(function () { var c2 = document.querySelector('input[data-k="' + k + '"][data-fl="' + fl + '"]') || document.querySelector('input[data-k="' + k + '"][data-rgc]'); if (c2) { c2.focus(); c2.scrollIntoView({ block: 'center' }); } }, 40); }
        return;
      }
      if (b.hasAttribute('data-dist')) { distModal(p.f || D.factoriesOf(org(), CUR)[0].id, b.getAttribute('data-dist'), el); return; }
      var a = b.getAttribute('data-act2');
      if (a === 'save') { st.savedAt = D.util.tick(1); D.audit('자료 임시저장', U.ymLabel(CUR) + ' · ' + D.MMAP[org()].name, '허용', Object.keys(st.rows).length + '개 행'); refresh(el); I.toast('임시저장했습니다', 'ok', '임시저장 값은 제출 전까지 협회에 보이지 않습니다'); }
      if (a === 'prev') prevModal(el, p);
      if (a === 'submit') submitModal(el);
      if (a === 'reopen') { try { D.transition(CUR, org(), '작성 중', '보완 요청에 따라 수정 시작'); I.toast('수정할 수 있습니다', 'ok', '수정 후 다시 제출하세요'); APP.rerender(); } catch (er) { I.apiError(er); } }
    });
  }
  function prevModal(el, p) {
    var fid = p.f && p.f !== 'all' ? p.f : D.factoriesOf(org(), CUR)[0].id, f = D.FMAP[fid], st = S(), pm = U.addM(CUR, -1);
    var empty = f.products.filter(function (pc) { var r = st.rows[D.rowKey(fid, pc)]; return COLS.every(function (c) { return r[c] === null; }); });
    I.modal({ title: '전월 자료 불러오기 — ' + f.name, size: 'md', body:
      '<p>' + U.ymLabel(pm) + ' 확정값(' + C.verBadge(pm) + ')의 생산·내수·수출 출하와 지역별 출하를 <b>빈 행에만</b> 복사합니다. 기말재고는 재고 수지 계산값으로 채우니 실제 재고와 다르면 고쳐 주세요.</p>' +
      '<ul class="mini">' + f.products.map(function (pc) { var on = empty.indexOf(pc) >= 0; return '<li><span>' + D.PMAP[pc].short + '</span>' + (on ? '<b class="tx-ok">복사 대상</b>' : '<span class="mute">입력값 있음 — 건너뜀</span>') + '</li>'; }).join('') + '</ul>' +
      '<p class="cap">직전 1개월만 불러옵니다. 그 이전 달 값은 「통계 조회」에서 확인 후 붙여넣으세요.</p>',
      foot: '<button class="btn" data-mclose>취소</button><button class="btn p" data-go' + (empty.length ? '' : ' disabled') + '>' + empty.length + '개 행 불러오기</button>',
      onOpen: function (m) { var b = m.querySelector('[data-go]'); b && b.addEventListener('click', function () {
        var l = D.recsOf(pm);
        empty.forEach(function (pc) { var r = st.rows[D.rowKey(fid, pc)], src = l.filter(function (x) { return x.f === fid && x.p === pc; })[0]; if (!src) return;
          r.pr = src.pr; r.d = src.d; r.x = src.x; r.e = r.b + r.pr - r.d - r.x; r.dm = U.clone(D.dmOf(src, pm)); });
        D.audit('전월 자료 불러오기', f.name + ' · ' + U.ymLabel(pm) + ' → ' + U.ymLabel(CUR), '허용', empty.length + '개 행');
        I.close(); APP.rerender(); I.toast(empty.length + '개 행을 불러왔습니다', 'ok', '달라진 값만 고쳐 주세요'); }); } });
  }
  function distModal(fid, rc, el) {
    var f = D.FMAP[fid], st = S(), ds = GEO.districts[rc], ed = canEdit();
    var head = '<tr><th>시·군·구</th>' + f.products.map(function (pc) { return '<th>' + D.PMAP[pc].short + '</th>'; }).join('') + '</tr>';
    var rows = ds.concat([{ code: rc + '000', name: '시·군·구 미상' }]).map(function (d, i) {
      return '<tr><th>' + esc(d.name) + '<small class="mute"> ' + d.code + '</small></th>' + f.products.map(function (pc, j) {
        var v = st.rows[D.rowKey(fid, pc)].dm[d.code];
        return '<td class="ci"><input class="cell num" data-t="d" data-r="' + i + '" data-c="' + j + '" data-dk="' + D.rowKey(fid, pc) + '" data-dc="' + d.code + '" value="' + (v ? v : '') + '" inputmode="numeric"' + (ed ? '' : ' readonly') + '></td>';
      }).join('') + '</tr>';
    }).join('');
    I.modal({ title: f.name + ' · ' + D.RMAP[rc].name + ' 시·군·구별 내수 출하', size: 'lg', body: '<p class="mute">시·군·구 합계가 시·도 값이 됩니다. 시·군·구 확대 지도는 이 값으로 그립니다.</p><div class="tw xgw" style="max-height:52vh"><table class="xg">' + head + rows + '</table></div>',
      foot: '<button class="btn" data-mclose>닫기</button>' + (ed ? '<button class="btn p" data-dsave>적용</button>' : ''),
      onOpen: function (m) {
        var b = m.querySelector('[data-dsave]'); if (!b) return;
        b.addEventListener('click', function () {
          f.products.forEach(function (pc) { var r = st.rows[D.rowKey(fid, pc)]; Object.keys(r.dm).forEach(function (dc) { if (dc.slice(0, 2) === rc) delete r.dm[dc]; }); });
          $$('input[data-dk]', m).forEach(function (c) { var v = num(c.value); if (v && !isNaN(v)) st.rows[c.getAttribute('data-dk')].dm[c.getAttribute('data-dc')] = +v; });
          I.close(); APP.rerender(); I.toast(D.RMAP[rc].name + ' 시·군·구 상세를 적용했습니다', 'ok');
        });
      } });
  }
  function submitModal(el) {
    var st = S(), iss = D.validate(org(), CUR, 'submit'), er = iss.filter(function (x) { return x.lv === 'error'; }), wr = iss.filter(function (x) { return x.lv === 'warn'; });
    var miss = wr.filter(function (w) { return !st.warnAck[w.key + '|' + w.field]; });
    var body = '<div class="chk3">' +
      '<div class="' + (er.filter(function (x) { return x.at === 'input'; }).length ? 'bad' : 'ok') + '"><b>① 입력 검증</b><small>필수값 · 정수 · 음수 · 코드</small>' + (er.filter(function (x) { return x.at === 'input'; }).length ? ic('x') : ic('check')) + '</div>' +
      '<div class="' + (er.filter(function (x) { return x.at === 'submit'; }).length ? 'bad' : 'ok') + '"><b>② 제출 검증</b><small>재고 수지 · 상세 합계 ↔ 총괄 · 기초재고</small>' + (er.filter(function (x) { return x.at === 'submit'; }).length ? ic('x') : ic('check')) + '</div>' +
      '<div class="' + (miss.length ? 'warn' : 'ok') + '"><b>급변 경고 사유</b><small>' + wr.length + '건 중 ' + (wr.length - miss.length) + '건 입력</small>' + (miss.length ? ic('alert') : ic('check')) + '</div></div>';
    if (er.length) body += '<div class="alert err">' + ic('shield') + '<div><b>필수 검증 ' + er.length + '건을 통과하지 못해 제출할 수 없습니다.</b> 잘못된 값이 협회에 전달되기 전에 걸러 냅니다.</div></div><div class="iss-l">' + er.slice(0, 12).map(function (x) { return '<div class="iss error"><span class="code">' + x.code + '</span>' + esc(x.msg) + '</div>'; }).join('') + '</div>';
    else if (miss.length) body += '<div class="alert warn">' + ic('alert') + '<div>급변 경고 ' + miss.length + '건에 사유를 적어 주세요. 사유는 협회 「검증 결과·예외 처리」 화면에 함께 표시됩니다.</div></div>' +
      miss.map(function (w) { return '<label class="fr"><span>' + esc(w.msg) + '</span><input class="inp" data-mwhy="' + esc(w.key + '|' + w.field) + '" placeholder="사유"></label>'; }).join('');
    else body += '<div class="alert ok">' + ic('checkc') + '<div><b>제출할 수 있습니다.</b> 제출 후에는 협회 확인이 끝날 때까지 수정할 수 없습니다. 협회 알림 이력에 제출 완료가 기록됩니다.</div></div>';
    I.modal({ title: U.ymLabel(CUR) + ' 자료 제출', size: 'md', body: body,
      foot: '<button class="btn" data-mclose>닫기</button>' + (er.length ? '' : '<button class="btn p" data-sub>' + ic('send') + '제출</button>'),
      onOpen: function (m) {
        var b = m.querySelector('[data-sub]'); if (!b) return;
        b.addEventListener('click', function () {
          $$('[data-mwhy]', m).forEach(function (i) { if (i.value.trim()) st.warnAck[i.getAttribute('data-mwhy')] = i.value.trim(); });
          try { D.transition(CUR, org(), '제출'); I.close(); I.toast('제출했습니다', 'ok', '협회 알림 이력에 제출 완료가 기록됐습니다'); APP.go('/m/status'); } catch (er2) { I.apiError(er2); }
        });
      } });
  }

  /* ======================================================= M04 엑셀 업로드 */
  var UPL = D.UPLOAD;
  function uploadState() {
    if (!UPL.byMember) UPL.byMember = {};
    return UPL.byMember[org()] || (UPL.byMember[org()] = { last: null, hist: [] });
  }
  APP.screen({ path: '/m/upload', side: 'member', title: '엑셀 업로드·일괄 등록',
    render: function () {
      var ed = canEdit(), uploaded = uploadState(), L = uploaded.last;
      var forms = D.FORMS.map(function (f) { return '<button class="fm" data-tpl="' + f.id + '">' + ic('download') + '<span><b>' + f.name + '</b><small>' + f.head.join(' · ') + '</small></span></button>'; }).join('');
      var res = '';
      if (L) {
        var bad = L.check.errors.length;
        res = '<section class="card ' + (bad ? 'rej' : 'acc') + '"><div class="card-h"><h2>' + ic(bad ? 'shield' : 'checkc') + esc(L.name) + '</h2><div class="card-a"><span class="pill">' + (L.auto ? '자동 인식' : '직접 선택') + ' · ' + esc(L.check.form.name) + '</span></div></div><div class="card-b">' +
          (bad ? '<div class="rejx"><div class="big"><b class="num">' + n(L.check.total) + '</b>행 검사 · <b class="num tx-e">오류 ' + n(bad) + '건</b></div><div><h3>전체 미반영 — 반영된 행 0</h3><p>전 행을 먼저 검증한 뒤, 한 건이라도 오류가 있으면 아무것도 반영하지 않습니다. 아래 오류를 수정한 파일을 다시 올려 주세요.</p></div></div>' +
            '<div class="tw"><table class="tbl"><thead><tr><th class="r">행</th><th>열</th><th>사유</th><th>원본</th></tr></thead><tbody>' + L.check.errors.slice(0, 50).map(function (x) { return '<tr><td class="r num">' + x.line + '</td><td>' + esc(x.col) + '</td><td class="tx-e">' + esc(x.msg) + '</td><td class="mono sm">' + esc(x.raw.slice(0, 60)) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
            '<div class="row-a"><button class="btn" data-errcsv>' + ic('download') + '오류 목록 내려받기</button></div>'
            : '<div class="rejx ok"><div class="big"><b class="num">' + n(L.check.total) + '</b>행 검증 통과</div><div><h3>' + (L.applied ? '반영 완료 — ' + L.applied + '건' : '반영 대기') + '</h3><p>' + (L.applied ? '해당 입력 화면에서 반영된 값을 확인해 주세요.' : '반영하면 파일의 값이 해당 입력 화면에 적용됩니다. 지역별 출하 파일은 해당 공장·품목의 시·군·구 상세를 통째로 교체합니다.') + '</p></div></div>' +
              '<div class="row-a">' + (L.applied ? '<a class="btn p" href="#' + ({ monthly: '/m/input?f=all', regional: '/m/input?f=all', flash: '/m/flash', coal: '/m/coal', trade: '/m/trade' })[L.form] + '">' + ic('table') + '반영된 값 확인</a>' : (ed ? '<button class="btn p" data-apply>' + ic('check') + '반영하기</button>' : '<span class="mute">입력 권한 또는 작성 중 상태가 아니어서 반영할 수 없습니다</span>')) + '</div>') +
          '</div></section>';
      }
      return C.ph('엑셀 업로드·일괄 등록', '엑셀 또는 CSV 파일의 머리글로 양식을 판별한 뒤 모든 행을 검증합니다. 오류가 한 건이라도 있으면 파일 전체를 반영하지 않습니다.', '', '자료 입력') +
        '<div class="work-photo lab" aria-hidden="true"></div>' +
        '<div class="grid g2">' +
        C.card('① 파일 올리기', '<label class="drop" data-drop><input type="file" accept=".xlsx,.csv,.txt" data-file hidden>' + ic('upload') + '<b>파일을 끌어 놓거나 눌러서 선택</b><small>Excel(.xlsx) 또는 CSV(UTF-8)를 지원합니다. 여러 시트가 있으면 올릴 시트를 선택할 수 있습니다.</small></label>' +
          '<details class="smp"><summary>예시 파일로 업로드 확인하기</summary><div class="smp-items">' +
          '<button class="btn sm" data-smp="monthly">' + ic('file') + '월간 — 정상</button><button class="btn sm" data-smp="monthly-bad">' + ic('file') + '월간 — 오류 2건</button>' +
          '<button class="btn sm" data-smp="regional">' + ic('file') + '지역별(시·군·구) — 1,000행 정상</button><button class="btn sm dg" data-smp="regional-bad">' + ic('file') + '지역별 — 1,000행 중 1행 오류</button></div></details>') +
        C.card('② 양식 내려받기', '<div class="fms">' + forms + '</div><p class="cap">회원사 업로드 양식 4종(월간 · 속보 · 유연탄 · 수출입)과 월간 지역별 출하 양식입니다. 파일의 머리글 행으로 양식을 판별합니다.</p>') + '</div>' +
        res +
        (uploaded.hist.length ? C.card('우리 회사 업로드 기록', '<div class="tw"><table class="tbl"><thead><tr><th>시각</th><th>파일</th><th>양식</th><th class="r">행</th><th class="r">오류 건수</th><th>결과</th></tr></thead><tbody>' + uploaded.hist.map(function (h) { return '<tr><td>' + U.fmtTime(h.at, false) + '</td><td>' + esc(h.name) + '</td><td>' + esc(h.form) + '</td><td class="r num">' + n(h.total) + '</td><td class="r num">' + n(h.errors) + '</td><td>' + I.chip(h.errors ? '반려' : h.applied ? '반영' : '검수 대기', '') + '</td></tr>'; }).join('') + '</tbody></table></div>') : '');
    },
    mount: function (el, p) {
      var mountOrg = org();
      function sameOrg() { return APP.user() && APP.user().org === mountOrg; }
      function handleRows(name, rows) {
        if (!sameOrg()) { I.toast('계정이 변경되어 파일을 처리하지 않았습니다. 다시 선택해 주세요', 'dg'); return; }
        if (!rows.length) { I.toast('빈 파일입니다', 'dg'); return; }
        var form = D.detectForm(rows[0]);
        if (!form) { pickForm(name, rows); return; }
        runCheck(name, rows, form.id, true);
      }
      function handle(name, text) { handleRows(name, D.util.parseCSV(text)); }
      function runCheck(name, rows, fid, auto) {
        if (!sameOrg()) { I.toast('계정이 변경되어 파일을 처리하지 않았습니다. 다시 선택해 주세요', 'dg'); return; }
        var ck = D.checkUpload(fid, rows, mountOrg, CUR), uploaded = uploadState();
        uploaded.last = { name: name, rows: rows, check: ck, auto: auto, form: fid, mid: mountOrg };
        uploaded.hist.unshift({ at: D.util.tick(1), name: name, form: ck.form.name, total: ck.total, errors: ck.errors.length });
        D.audit('엑셀 업로드 검증', name, ck.errors.length ? '차단' : '허용', ck.total + '행 검사 · 오류 ' + ck.errors.length + '건' + (ck.errors.length ? ' — 전체 미반영' : ''));
        APP.rerender();
        I.toast(ck.errors.length ? n(ck.total) + '행 검사 · 오류 ' + n(ck.errors.length) + '건 — 전체 미반영' : n(ck.total) + '행 검증 통과', ck.errors.length ? 'dg' : 'ok', ck.form.name + (auto ? ' (자동 인식)' : ''));
      }
      function pickForm(name, rows) {
        I.modal({ title: '양식을 판별하지 못했습니다', size: 'md', body: '<p>머리글 「' + esc(rows[0].join(', ').slice(0, 80)) + '」이(가) 등록된 양식과 맞지 않습니다. 잘못 분류된 자료가 조용히 통계에 들어가지 않도록 추측하지 않습니다. 어떤 양식인지 골라 주세요.</p>' +
          D.FORMS.map(function (f) { return '<button class="acc" data-pf="' + f.id + '"><span class="acc-t"><b>' + f.name + '</b><small>' + f.head.join(' · ') + '</small></span></button>'; }).join(''),
          onOpen: function (m) { $$('[data-pf]', m).forEach(function (b) { b.addEventListener('click', function () { I.close(); runCheck(name, rows, b.getAttribute('data-pf'), false); }); }); } });
      }
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-smp],[data-tpl],[data-apply],[data-errcsv]'); if (!b) return;
        if (b.hasAttribute('data-smp')) { if (!sameOrg()) return; var s = D.sampleFile(b.getAttribute('data-smp'), mountOrg, CUR); handle(s.name, D.util.toCSV(s.rows)); }
        if (b.hasAttribute('data-tpl')) { var f = D.FORMS.filter(function (x) { return x.id === b.getAttribute('data-tpl'); })[0]; I.download('양식_' + f.name.replace(/[^\w가-힣]+/g, '_') + '.csv', D.util.toCSV([f.head])); }
        if (b.hasAttribute('data-errcsv')) { var L = uploadState().last; if (!L) return; I.download('오류목록_' + L.name.replace(/\.[^.]+$/, '') + '.csv', D.util.toCSV([['행', '열', '사유', '원본']].concat(L.check.errors.map(function (x) { return [x.line, x.col, x.msg, x.raw]; })))); }
        if (b.hasAttribute('data-apply')) {
          var state = uploadState(), L2 = state.last;
          if (!L2 || L2.mid !== mountOrg || !sameOrg() || !canEdit()) { I.toast('현재 계정에서 반영할 수 없는 파일입니다', 'dg'); return; }
          var latest = D.checkUpload(L2.form, L2.rows, mountOrg, CUR);
          if (latest.errors.length) {
            L2.check = latest; if (state.hist[0]) state.hist[0].errors = latest.errors.length;
            APP.rerender(); I.toast('파일 재검증에서 오류 ' + n(latest.errors.length) + '건이 확인되어 반영하지 않았습니다', 'dg'); return;
          }
          try {
            L2.applied = D.applyUpload(L2.form, L2.rows, mountOrg, CUR);
            if (state.hist[0]) state.hist[0].applied = true;
            APP.rerender(); I.toast(L2.applied + '건을 반영했습니다', 'ok', '해당 입력 화면에서 값을 확인해 주세요');
          } catch (er) { I.apiError(er); }
        }
      });
      var inp = $('[data-file]', el), drop = $('[data-drop]', el);
      function readFile(file) {
        if (!/\.(xlsx|csv|txt)$/i.test(file.name)) { I.toast('Excel(.xlsx) 또는 CSV 파일을 선택해 주세요', 'dg'); return; }
        if (file.size > 20 * 1024 * 1024) { I.toast('20MB 이하의 파일을 선택해 주세요', 'dg'); return; }
        var fr = new FileReader();
        fr.onerror = function () { I.toast('파일을 읽지 못했습니다. 다시 선택해 주세요', 'dg'); };
        if (/\.xlsx$/i.test(file.name)) {
          fr.onload = function () {
            try {
              if (!window.XLSX) throw new Error('엑셀 읽기 구성 요소를 불러오지 못했습니다.');
              var book = XLSX.read(new Uint8Array(fr.result), { type: 'array' });
              var sheets = book.SheetNames.map(function (title) {
                var rows = XLSX.utils.sheet_to_json(book.Sheets[title], { header: 1, defval: '', raw: true, blankrows: false });
                rows = rows.map(function (row) { return row.map(function (cell) { return cell == null ? '' : String(cell).trim(); }); })
                  .filter(function (row) { return row.some(function (cell) { return cell !== ''; }); });
                var headerAt = -1;
                for (var i = 0; i < Math.min(rows.length, 10); i++) if (D.detectForm(rows[i])) { headerAt = i; break; }
                if (headerAt >= 0) rows = rows.slice(headerAt);
                return { title: title, rows: rows, recognized: rows.length ? D.detectForm(rows[0]) : null };
              }).filter(function (sheet) { return sheet.rows.length; });
              if (!sheets.length) { I.toast('입력된 데이터가 없는 엑셀 파일입니다', 'dg'); return; }
              if (sheets.length === 1) { handleRows(file.name + ' · ' + sheets[0].title, sheets[0].rows); return; }
              I.modal({ title: '업로드할 시트를 선택해 주세요', size: 'md', body: '<p>한 번에 한 시트씩 검증하고 반영합니다.</p>' + sheets.map(function (sheet, i) {
                return '<button class="acc" data-sheet="' + i + '"><span class="acc-t"><b>' + esc(sheet.title) + '</b><small>' + (sheet.recognized ? esc(sheet.recognized.name) : '양식 확인 필요') + ' · ' + n(sheet.rows.length - 1) + '행</small></span></button>';
              }).join(''), onOpen: function (m) { $$('[data-sheet]', m).forEach(function (b) { b.addEventListener('click', function () {
                var sheet = sheets[+b.getAttribute('data-sheet')]; I.close(); handleRows(file.name + ' · ' + sheet.title, sheet.rows);
              }); }); } });
            } catch (err) { I.toast('엑셀 파일을 읽지 못했습니다', 'dg', err.message || '파일 형식을 확인해 주세요'); }
          };
          fr.readAsArrayBuffer(file);
        } else {
          fr.onload = function () { handle(file.name, String(fr.result)); };
          fr.readAsText(file, 'utf-8');
        }
      }
      inp.addEventListener('change', function () { if (inp.files[0]) readFile(inp.files[0]); inp.value = ''; });
      ['dragover', 'dragenter'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove('over'); if (t === 'drop' && e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]); }); });
      var lastUpload = uploadState().last;
      if (p.sample && (!lastUpload || lastUpload.name.indexOf('1행오류') < 0 || p.sample !== 'regional-bad')) { var s0 = D.sampleFile(p.sample, mountOrg, CUR); history.replaceState(null, '', '#/m/upload'); handle(s0.name, D.util.toCSV(s0.rows)); }
    } });

  /* ======================================================= M05 속보 */
  APP.screen({ path: '/m/flash', side: 'member', title: '속보 입력',
    render: function (p) {
      var m = p.m || '2026-10', list = D.FLASH[org()][m], ed = D.can('DATA_INPUT');
      var monthly = D.API.own({ measure: 'pr', from: '2026-08', to: '2026-08', by: [] }).total;
      var sep = D.FLASH[org()]['2026-09'], sepSum = sep.reduce(function (s, x) { return s + (x.pr || 0); }, 0);
      return C.ph('속보 입력', '순별(10일 단위) 생산·출하 잠정치입니다. 순이 끝나면 3영업일 안에 입력합니다. 속보는 월간 확정치가 나오기 전 추세 파악용이며, 월간 자료와 별도로 검증합니다.', '<a class="btn" href="#/m/upload">' + ic('upload') + '속보 양식 업로드</a>', '자료 입력') +
        '<div class="tabs"><a class="tab' + (m === '2026-10' ? ' on' : '') + '" href="#/m/flash?m=2026-10">2026년 10월</a><a class="tab' + (m === '2026-09' ? ' on' : '') + '" href="#/m/flash?m=2026-09">2026년 9월</a></div>' +
        C.card('순별 속보 — ' + U.ymLabel(m) + ' <small>전체 품목 합계 · 톤</small>', '<div class="tw"><table class="tbl xg2"><thead><tr><th>순</th><th>기간</th><th class="r">생산</th><th class="r">내수 출하</th><th class="r">수출 출하</th><th>상태</th><th></th></tr></thead><tbody>' +
          list.map(function (x, i) {
            var rng = ['1~10일', '11~20일', '21일~말일'][i], open = x.state === '작성 중' && ed && m === '2026-10' && i === 0;
            var cell = function (k) { return open ? '<input class="inp num r" data-fk="' + k + '" data-fi="' + i + '" value="' + (x[k] === null ? '' : x[k]) + '" inputmode="numeric" aria-label="' + x.term + ' ' + k + '">' : n(x[k]); };
            return '<tr><td><b>' + x.term + '</b></td><td>' + rng + '</td><td class="r num">' + cell('pr') + '</td><td class="r num">' + cell('d') + '</td><td class="r num">' + cell('x') + '</td><td>' + I.chip(x.state) + '</td><td>' + (open ? '<button class="btn sm p" data-fsub="' + i + '">제출</button>' : (x.state === '작성 중' ? '<span class="mute">순 종료 후 입력</span>' : '')) + '</td></tr>';
          }).join('') + '</tbody></table></div>') +
        '<div class="grid g2">' + C.card('속보 현황과 최근 월간 확정 실적', '<dl class="dl"><dt>2026년 9월 속보 생산 합계</dt><dd class="num">' + n(sepSum) + '톤</dd><dt>2026년 8월 월간 확정 생산</dt><dd class="num">' + n(monthly) + '톤</dd></dl><p class="cap">두 값은 기준월이 달라 직접 비교하지 않습니다. 9월 월간 자료가 마감되면 같은 달의 속보 합계와 확정치를 비교하고, 차이가 5%를 넘으면 협회에 표시합니다.</p>') +
        C.card('입력 규칙', '<ul class="ul"><li>순별 합계 단위(톤), 정수만 입력</li><li>필수값 누락 시 제출 불가</li><li>전 순 대비 ±40% 이상이면 경고</li><li>제출 시 협회 알림 이력에 기록 — 확정은 협회가 처리</li></ul>') + '</div>';
    },
    mount: function (el, p) {
      el.addEventListener('input', function (e) { var t = e.target; if (!t.hasAttribute('data-fk')) return; D.FLASH[org()]['2026-10'][+t.getAttribute('data-fi')][t.getAttribute('data-fk')] = num(t.value); });
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-fsub]'); if (!b) return;
        var x = D.FLASH[org()]['2026-10'][+b.getAttribute('data-fsub')];
        var miss = ['pr', 'd', 'x'].filter(function (k) { return x[k] === null || isNaN(x[k]); });
        if (miss.length) { I.toast('필수값 ' + miss.length + '개가 비어 있습니다', 'dg', '생산·내수 출하·수출 출하를 모두 입력하세요'); return; }
        x.state = '제출'; D.audit('속보 제출', '2026년 10월 ' + x.term, '허용', ''); D.notify('제출 완료', '협회 통계팀', '[시멘트 통계] ' + D.MMAP[org()].name + ' 10월 상순 속보 제출');
        APP.rerender(); I.toast('10월 상순 속보를 제출했습니다', 'ok');
      });
    } });

  /* ======================================================= M06 유연탄 */
  APP.screen({ path: '/m/coal', side: 'member', title: '유연탄 입력',
    render: function () {
      var list = D.COAL[org()][CUR] || [], ed = canEdit();
      var hist = D.MONTHS.slice(-13, -1);
      if (!list.length) return C.ph('유연탄 입력', '', '', '자료 입력') + '<div class="empty">' + ic('info') + '킬른(클링커 소성) 공장이 없어 유연탄 수급 보고 대상이 아닙니다.</div>';
      var origins = list[0].inflow.map(function (x) { return x[0]; });
      return C.ph('유연탄 입력', U.ymLabel(CUR) + ' · 킬른 공장별 유연탄 입고(원산지별)·사용·재고입니다. 기초 + 입고 − 사용 = 기말 재고 수지를 함께 검증합니다.', ed ? '<a class="btn" href="#/m/upload">' + ic('upload') + '유연탄 양식 업로드</a>' : '', '자료 입력') +
        (ed ? '' : inputNotice()) +
        list.map(function (c, ci) {
          var f = D.FMAP[c.f], inSum = c.inflow.reduce(function (s, x) { return s + (+x[1] || 0); }, 0), calc = c.b + inSum - c.use;
          return C.card(esc(f.name) + ' <small>단위 톤</small>', '<div class="tw"><table class="tbl"><thead><tr><th>기초 재고</th>' + origins.map(function (o) { return '<th>입고 · ' + o + '</th>'; }).join('') + '<th>입고 합계</th><th>사용량</th><th>기말 재고</th><th>재고 수지</th></tr></thead><tbody><tr>' +
            '<td class="num">' + n(c.b) + '</td>' + c.inflow.map(function (x, j) { return '<td><input class="inp num r" data-ci="' + ci + '" data-cj="' + j + '" value="' + esc(x[1]) + '" inputmode="numeric" aria-label="' + esc(x[0]) + ' 입고"' + (ed ? '' : ' disabled') + '></td>'; }).join('') +
            '<td class="num" data-cin="' + ci + '">' + n(inSum) + '</td><td><input class="inp num r" data-ci="' + ci + '" data-cu="1" value="' + esc(c.use) + '" inputmode="numeric" aria-label="사용량"' + (ed ? '' : ' disabled') + '></td><td><input class="inp num r" data-ci="' + ci + '" data-ce="1" value="' + esc(c.e) + '" inputmode="numeric" aria-label="기말 재고"' + (ed ? '' : ' disabled') + '></td>' +
            '<td data-cb="' + ci + '">' + (calc === c.e ? '<span class="tx-ok">' + ic('check') + '일치</span>' : '<span class="tx-e">' + ic('x') + '차이 ' + n(c.e - calc) + '</span>') + '</td></tr></tbody></table></div>');
        }).join('') +
        C.card('최근 12개월 유연탄 사용량', I.lineChart({ title: '유연탄 사용량', h: 200, labels: hist.map(U.ymShort), series: [{ name: '사용량', color: I.PAL().s1, values: hist.map(function (m) { return (D.COAL[org()][m] || []).reduce(function (s, c) { return s + c.use; }, 0); }), area: true }] })) +
        (ed ? '<div class="row-a"><button class="btn p" data-csave>' + ic('check') + '임시저장</button></div>' : '');
    },
    mount: function (el) {
      el.addEventListener('change', function (e) {
        var t = e.target; if (!t.hasAttribute('data-ci') || !canEdit()) return;
        var c = D.COAL[org()][CUR][+t.getAttribute('data-ci')], v = nonNegativeInt(t.value);
        if (v === null) {
          t.value = t.hasAttribute('data-cj') ? c.inflow[+t.getAttribute('data-cj')][1] : t.hasAttribute('data-cu') ? c.use : c.e;
          I.toast('0 이상의 정수를 입력해 주세요', 'dg');
          return;
        }
        t.value = v;
        if (t.hasAttribute('data-cj')) c.inflow[+t.getAttribute('data-cj')][1] = v; else if (t.hasAttribute('data-cu')) c.use = v; else c.e = v;
        var ci = t.getAttribute('data-ci'), inSum = c.inflow.reduce(function (s, x) { return s + (+x[1] || 0); }, 0), calc = c.b + inSum - c.use;
        $('[data-cin="' + ci + '"]', el).textContent = n(inSum);
        $('[data-cb="' + ci + '"]', el).innerHTML = calc === c.e ? '<span class="tx-ok">' + ic('check') + '일치</span>' : '<span class="tx-e">' + ic('x') + '차이 ' + n(c.e - calc) + '</span>';
      });
      el.addEventListener('click', function (e) { if (e.target.closest('[data-csave]') && canEdit()) { D.audit('유연탄 임시저장', U.ymLabel(CUR), '허용', ''); I.toast('임시저장했습니다', 'ok'); } });
    } });

  /* ======================================================= M07 수출입 */
  APP.screen({ path: '/m/trade', side: 'member', title: '수출입 입력',
    render: function () {
      var list = D.TRADE[org()][CUR] || [], ed = canEdit();
      var exQ = list.filter(function (x) { return x.kind === '수출'; }).reduce(function (s, x) { return s + (+x.q || 0); }, 0);
      var monthlyX = Object.keys(S().rows).reduce(function (s, k) { return s + (+S().rows[k].x || 0); }, 0);
      var diff = monthlyX ? (exQ - monthlyX) / monthlyX : null;
      return C.ph('수출입 입력', U.ymLabel(CUR) + ' · 국가·품목별 수출입 물량과 금액입니다. 수출 물량 합계는 월간 자료의 수출 출하와 교차 확인합니다.', ed ? '<button class="btn" data-tadd>' + ic('plus') + '행 추가</button>' : '', '자료 입력') +
        (ed ? '' : inputNotice()) +
        C.card('수출입 내역 <small>물량 톤 · 금액 USD</small>', '<div class="tw"><table class="tbl"><thead><tr><th>구분</th><th>국가</th><th>품목</th><th class="r">물량</th><th class="r">금액 (USD)</th><th class="r">톤당 단가</th><th></th></tr></thead><tbody>' +
          list.map(function (x, i) {
            return '<tr><td><select class="sel sm" data-tr="' + i + '" data-tf="kind"' + (ed ? '' : ' disabled') + '><option' + (x.kind === '수출' ? ' selected' : '') + '>수출</option><option' + (x.kind === '수입' ? ' selected' : '') + '>수입</option></select></td>' +
              '<td><input class="inp sm" data-tr="' + i + '" data-tf="country" value="' + esc(x.country) + '" aria-label="국가"' + (ed ? '' : ' disabled') + '></td>' +
              '<td><select class="sel sm" data-tr="' + i + '" data-tf="p"' + (ed ? '' : ' disabled') + '>' + D.PRODUCTS.map(function (pp) { return '<option value="' + pp.code + '"' + (pp.code === x.p ? ' selected' : '') + '>' + pp.short + '</option>'; }).join('') + '</select></td>' +
              '<td><input class="inp sm num r" data-tr="' + i + '" data-tf="q" value="' + esc(x.q) + '" inputmode="numeric" aria-label="물량"' + (ed ? '' : ' disabled') + '></td><td><input class="inp sm num r" data-tr="' + i + '" data-tf="usd" value="' + esc(x.usd) + '" inputmode="numeric" aria-label="금액"' + (ed ? '' : ' disabled') + '></td>' +
              '<td class="r num">$' + (x.q ? (x.usd / x.q).toFixed(1) : '—') + '</td><td>' + (ed ? '<button class="btn-ic" data-tdel="' + i + '" aria-label="행 삭제">' + ic('x') + '</button>' : '') + '</td></tr>';
          }).join('') + '</tbody></table></div>') +
        '<div class="grid g2">' + C.card('월간 자료와 교차 확인', '<dl class="dl"><dt>수출입 입력 — 수출 물량 합계</dt><dd class="num">' + n(exQ) + '톤</dd><dt>월간 입력 — 수출 출하 합계</dt><dd class="num">' + n(monthlyX) + '톤</dd><dt>차이</dt><dd class="' + (diff !== null && Math.abs(diff) > .05 ? 'tx-w' : 'tx-ok') + '">' + (diff === null ? '월간 수출 출하 미입력' : I.pctTxt(diff) + (Math.abs(diff) > .05 ? ' — 5% 초과, 선적 기준월 확인 필요' : ' — 허용 범위')) + '</dd></dl>') +
        C.card('입력 안내', '<ul class="ul"><li>선적일(B/L)이 속한 달에 입력합니다.</li><li>수입은 클링커·시멘트 완제품만 입력합니다.</li><li>금액은 FOB 기준 미국 달러로 입력합니다.</li></ul>') + '</div>' +
        (ed ? '<div class="row-a"><button class="btn p" data-tsave>' + ic('check') + '임시저장</button></div>' : '');
    },
    mount: function (el) {
      var list = function () { return D.TRADE[org()][CUR]; };
      el.addEventListener('change', function (e) {
        var t = e.target; if (!t.hasAttribute('data-tr') || !canEdit()) return;
        var x = list()[+t.getAttribute('data-tr')], f = t.getAttribute('data-tf');
        if (f === 'q' || f === 'usd') {
          var v = nonNegativeInt(t.value);
          if (v === null) { t.value = x[f]; I.toast('0 이상의 정수를 입력해 주세요', 'dg'); return; }
          x[f] = v;
        } else x[f] = t.value;
        APP.rerender();
      });
      el.addEventListener('click', function (e) {
        if (!canEdit()) return;
        if (e.target.closest('[data-tadd]')) { list().push({ kind: '수출', country: '', p: 'P01', q: 0, usd: 0 }); APP.rerender(); }
        var d = e.target.closest('[data-tdel]'); if (d) { list().splice(+d.getAttribute('data-tdel'), 1); APP.rerender(); }
        if (e.target.closest('[data-tsave]')) { D.audit('수출입 임시저장', U.ymLabel(CUR), '허용', list().length + '행'); I.toast('임시저장했습니다', 'ok'); }
      });
    } });

  /* ======================================================= M08 제출·보완 요청 현황 */
  APP.screen({ path: '/m/status', side: 'member', title: '제출·보완 요청 현황',
    render: function (p) {
      var st = S(), months = C.pubMonths(12).reverse();
      var mine = D.CORR.filter(function (c) { return c.member === org(); });
      var skip = APP.lastSkip;
      return C.ph('제출·보완 요청 현황', '제출한 자료의 처리 상태와 보완 요청을 확인하세요. 작성 중 → 제출 → 확정 → 마감 순서로 진행되며, 보완 요청이 오면 내용을 수정해 다시 제출할 수 있습니다.', '', '제출') +
        '<div class="grid g21">' + C.card(U.ymLabel(CUR) + ' 자료', C.stepper(st.state) + timeline(st.history.slice().reverse()), { cls: 'tall' }) +
        C.card('제출 처리 단계', '<div class="sm-flow"><span class="st">작성 중</span>→<span class="st">제출</span>→<span class="st">확정</span>→<span class="st">마감</span><div class="sm-loop">제출 → <span class="st w">보완 요청</span> → 작성 중</div></div><ul class="ul sm"><li><b>제출</b> — 제출 권한이 있는 회원사 담당자</li><li><b>보완 요청 · 확정 · 마감</b> — 협회 담당자</li><li>상태가 바뀔 때마다 처리자와 시각이 기록됩니다</li></ul>' +
          (skip ? '<div class="api"><div class="api-h"><span class="m">PATCH</span> /api/submissions/' + CUR + '/' + org() + '</div><pre>' + esc(JSON.stringify(skip.req, null, 1)) + '</pre><div class="api-h r"><span class="s4">' + skip.status + '</span> ' + esc(skip.code) + '</div><pre>' + esc(JSON.stringify({ error: skip.code, message: skip.message }, null, 1)) + '</pre><p class="cap">이 시도는 감사 로그에 「차단」으로 기록되었습니다.</p></div>' : '')) + '</div>' +
        C.card('월별 제출 · 발행 이력', '<div class="tw"><table class="tbl"><thead><tr><th>월</th><th>상태</th><th>발행 버전</th><th>발행 시각</th><th></th></tr></thead><tbody>' +
          '<tr><td><b>' + U.ymLabel(CUR) + '</b></td><td>' + I.chip(st.state) + '</td><td class="mute">마감 전</td><td>—</td><td></td></tr>' +
          months.map(function (m) { var v = D.PUB[m], last = v[v.length - 1]; return '<tr><td>' + U.ymLabel(m) + '</td><td>' + I.chip('마감') + '</td><td>' + C.verBadge(m) + '</td><td>' + U.fmtTime(last.at) + '</td><td>' + (D.can('CORR_REQUEST') ? '<button class="btn sm" data-corr="' + m + '">정정 요청</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table></div>') +
        C.card('마감 후 정정 요청', mine.length ? '<div class="tw"><table class="tbl"><thead><tr><th>번호</th><th>대상 월</th><th>사유</th><th>변경</th><th>상태</th><th>처리</th></tr></thead><tbody>' + mine.map(corrRow).join('') + '</tbody></table></div>' : '<div class="empty">' + ic('info') + '정정 요청 내역이 없습니다.</div>', { act: '<span class="mute sm">승인되면 기존 발행 버전은 보존하고 새 버전을 발행합니다</span>' });
    },
    mount: function (el, p) {
      el.addEventListener('click', function (e) {
        if (e.target.closest('[data-skip]')) {
          var to = S().state === '작성 중' ? '확정' : '마감';
          try { D.transition(CUR, org(), to, ''); } catch (er) { APP.lastSkip = { req: { from: S().state, to: to }, status: er.status, code: er.code, message: er.message }; I.apiError(er); APP.rerender(); }
          return;
        }
        var b = e.target.closest('[data-corr]'); if (b) corrModal(b.getAttribute('data-corr'));
      });
      if (p.try === 'skip' && !APP.lastSkip) { history.replaceState(null, '', '#/m/status'); var bt = $('[data-skip]', el); if (bt) setTimeout(function () { bt.click(); }, 60); }
    } });
  function corrRow(c) {
    return '<tr><td class="mono">' + c.id + '</td><td>' + U.ymLabel(c.ym) + '</td><td>' + esc(c.reason) + '</td><td class="sm">' + c.changes.map(function (x) { return esc(D.FMAP[x.f].name + ' ' + D.PMAP[x.p].short + ' ' + D.FIELDS[x.field]) + ' <span class="num">' + n(x.old) + ' → ' + n(x.new) + '</span>'; }).join('<br>') + '</td><td>' + I.chip(c.state) + (c.version ? ' <span class="ver">v' + c.version + '</span>' : '') + '</td><td class="sm">' + (c.decidedAt ? U.fmtTime(c.decidedAt) + ' ' + esc(c.decidedBy) : '협회 검토 중') + (c.rejectNote ? '<br><span class="mute">' + esc(c.rejectNote) + '</span>' : '') + '</td></tr>';
  }
  function corrModal(m) {
    var recs = D.recsOf(m).filter(function (r) { return D.ownerOf(r.f, m) === org(); });
    I.modal({ title: U.ymLabel(m) + ' 마감 후 정정 요청', size: 'lg', body:
      '<p class="mute">마감된 자료는 덮어쓰지 않습니다. 협회가 승인하면 현재 ' + C.verBadge(m) + '는 그대로 두고 사유·승인 시각을 단 새 버전이 발행됩니다. 정정 후에도 재고 수지가 맞아야 합니다.</p>' +
      '<div class="frow"><label class="fr"><span>공장 · 품목</span><select class="sel" data-cr>' + recs.map(function (r, i) { return '<option value="' + i + '">' + esc(D.FMAP[r.f].name + ' · ' + D.PMAP[r.p].short) + '</option>'; }).join('') + '</select></label></div>' +
      '<div id="crbox"></div><label class="fr"><span>정정 사유</span><textarea class="inp" data-crr rows="2" placeholder="예: 계량기 교정 후 생산량 재산정"></textarea></label>',
      foot: '<button class="btn" data-mclose>취소</button><button class="btn p" data-crgo>' + ic('send') + '정정 요청</button>',
      onOpen: function (mo) {
        function draw() {
          var r = recs[+$('[data-cr]', mo).value];
          $('#crbox', mo).innerHTML = '<table class="tbl compact"><thead><tr><th>항목</th><th class="r">현재 v' + D.latestV(m) + '</th><th>정정값</th></tr></thead><tbody>' +
            ['b', 'pr', 'd', 'x', 'e'].map(function (k) { return '<tr><td>' + D.FIELDS[k] + '</td><td class="r num">' + n(r[k]) + '</td><td>' + (k === 'pr' || k === 'x' || k === 'e' ? '<input class="inp sm num r" data-cv="' + k + '" value="' + r[k] + '" inputmode="numeric" aria-label="' + D.FIELDS[k] + ' 정정값">' : '<span class="mute">정정 불가 (지역 상세·이월 연동)</span>') + '</td></tr>'; }).join('') +
            '<tr><td>재고 수지</td><td colspan="2" data-crb></td></tr></tbody></table>';
          chk();
        }
        function chk() {
          var r = recs[+$('[data-cr]', mo).value], v = {};
          $$('[data-cv]', mo).forEach(function (i) { v[i.getAttribute('data-cv')] = num(i.value); });
          var ok = r.b + v.pr - r.d - v.x === v.e;
          $('[data-crb]', mo).innerHTML = ok ? '<span class="tx-ok">' + ic('check') + '일치</span>' : '<span class="tx-e">' + ic('x') + '기초 ' + n(r.b) + ' + 생산 ' + n(v.pr) + ' − 출하 ' + n(r.d + v.x) + ' ≠ 기말 ' + n(v.e) + '</span>';
        }
        $('[data-cr]', mo).addEventListener('change', draw);
        mo.addEventListener('input', function (e) { if (e.target.hasAttribute('data-cv')) chk(); });
        draw();
        $('[data-crgo]', mo).addEventListener('click', function () {
          var r = recs[+$('[data-cr]', mo).value], ch = [];
          $$('[data-cv]', mo).forEach(function (i) { var k = i.getAttribute('data-cv'), v = num(i.value); if (v !== r[k]) ch.push({ f: r.f, p: r.p, field: k, new: v }); });
          if (!ch.length) { I.toast('바뀐 값이 없습니다', 'dg'); return; }
          try { var req = D.requestCorrection(m, ch, $('[data-crr]', mo).value.trim()); I.close(); APP.rerender(); I.toast('정정 요청을 등록했습니다', 'ok', '접수 번호 ' + req.id + ' · 협회 승인 전까지 발행값은 바뀌지 않습니다'); } catch (er) { I.apiError(er); }
        });
      } });
  }

  /* ======================================================= M09 통계 조회·다운로드 */
  var QS = { scope: 'own', from: null, to: null, measure: 'pr', by: ['month', 'product'], prod: '', saved: {} };
  var SETS = [
    { id: 'p1', name: '월별 × 품목', by: ['month', 'product'] }, { id: 'p2', name: '월별 × 공장', by: ['month', 'factory'] }, { id: 'p3', name: '시·도별 내수 출하', by: ['region'], measure: 'd' }
  ];
  APP.screen({ path: '/m/stats', side: 'member', title: '통계 조회·다운로드',
    render: function (p) {
      var ms = C.pubMonths(), last = ms[ms.length - 1];
      if (!QS.from) { QS.from = U.addM(last, -5); QS.to = last; }
      var pub = QS.scope === 'pub', dims = pub ? ['month', 'year', 'product', 'region'] : ['month', 'year', 'factory', 'product', 'region'];
      QS.by = QS.by.filter(function (d) { return dims.indexOf(d) >= 0; });
      if (!QS.by.length) QS.by = ['month'];
      var regional = QS.by.indexOf('region') >= 0;
      if (regional) QS.measure = 'd';
      var spec = { measure: QS.measure, from: QS.from, to: QS.to, by: QS.by, filter: QS.prod ? { products: [QS.prod] } : {} };
      var res, err = null;
      try { res = pub ? D.API.pub(spec) : D.API.own(spec); } catch (e) { err = e; }
      var saved = (D.SAVED[me().id] || []);
      var other = APP.lastOther;
      var filters = '<div class="fbar">' +
        '<div class="seg" role="group" aria-label="조회 범위"><button data-sc="own" class="' + (!pub ? 'on' : '') + '">' + ic('home') + '우리 회사 자료</button><button data-sc="pub" class="' + (pub ? 'on' : '') + '">' + ic('layers') + '업계 공표 통계</button></div>' +
        C.monthSel('from', QS.from, ms, '시작') + C.monthSel('to', QS.to, ms, '종료') +
        '<label class="fr"><span>지표</span><select class="sel" name="measure"' + (regional ? ' disabled' : '') + '>' + Object.keys(D.MEASURES).map(function (k) { return '<option value="' + k + '"' + (QS.measure === k ? ' selected' : '') + '>' + D.MEASURES[k].name + '</option>'; }).join('') + '</select></label>' +
        '<label class="fr"><span>품목</span><select class="sel" name="prod"><option value="">전체</option>' + D.PRODUCTS.map(function (pp) { return '<option value="' + pp.code + '"' + (QS.prod === pp.code ? ' selected' : '') + '>' + pp.short + '</option>'; }).join('') + '</select></label>' +
        '<div class="fr"><span>구분 (행)</span><div class="chips">' + dims.map(function (d) { return '<label class="tg"><input type="checkbox" data-by="' + d + '"' + (QS.by.indexOf(d) >= 0 ? ' checked' : '') + '>' + D.DIMS[d] + '</label>'; }).join('') + '</div></div></div>';
      return C.ph('통계 조회·다운로드', '<b>우리 회사 자료</b>는 공장별로 확인하고, <b>업계 공표 통계</b>는 회원사별 구분 없는 합계로 조회할 수 있습니다.', '', '통계') +
        filters +
        '<div class="qsets"><span class="mute">자주 쓰는 조회 방식</span>' + SETS.map(function (s) { return '<button class="btn sm g" data-set="' + s.id + '">' + s.name + '</button>'; }).join('') +
        '<span class="sep"></span><span class="mute">저장한 조건 ' + saved.length + '/10</span>' + saved.map(function (s) { return '<button class="btn sm" data-ld="' + s.id + '">' + ic('star') + esc(s.name) + '</button>'; }).join('') + '<button class="btn sm" data-qsave>' + ic('plus') + '현재 조건 저장</button></div>' +
        (other ? '<div class="api wide"><div class="api-h"><span class="m">GET</span> ' + esc(other.path) + '</div><div class="api-h r"><span class="s4">' + other.status + '</span> ' + esc(other.code) + ' — ' + esc(other.message) + '</div><p class="cap">화면에서 숨긴 것이 아니라 서버가 거절했습니다. 이 요청은 협회 「감사 로그」에 「차단」으로 남았습니다.</p></div>' : '') +
        (err ? '<div class="alert err">' + ic('shield') + '<div><b>HTTP ' + err.status + '</b> ' + esc(err.message) + '</div></div>' :
          C.card((pub ? '업계 공표 통계' : D.MMAP[org()].name) + ' · ' + D.MEASURES[res.meta.measure].name + ' <small>' + U.ymLabel(QS.from) + ' ~ ' + U.ymLabel(QS.to) + '</small>',
            C.metaLine(res) + C.statTable(res, {}), { act: '<button class="btn sm" data-dl>' + ic('download') + 'CSV 내려받기</button><button class="btn sm g" onclick="window.print()">' + ic('printer') + '인쇄</button>' }));
    },
    mount: function (el, p) {
      function upd() { APP.rerender(); }
      el.addEventListener('change', function (e) {
        var t = e.target;
        if (t.name === 'from') QS.from = t.value; if (t.name === 'to') QS.to = t.value; if (t.name === 'measure') QS.measure = t.value; if (t.name === 'prod') QS.prod = t.value;
        if (t.hasAttribute('data-by')) { var d = t.getAttribute('data-by'); if (t.checked) QS.by.push(d); else QS.by = QS.by.filter(function (x) { return x !== d; }); }
        if (QS.from > QS.to) { var tmp = QS.from; QS.from = QS.to; QS.to = tmp; }
        upd();
      });
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-sc],[data-set],[data-dl],[data-other],[data-qsave],[data-ld]'); if (!b) return;
        if (b.hasAttribute('data-sc')) { QS.scope = b.getAttribute('data-sc'); upd(); }
        if (b.hasAttribute('data-set')) { var s = SETS.filter(function (x) { return x.id === b.getAttribute('data-set'); })[0]; QS.by = s.by.slice(); if (s.measure) QS.measure = s.measure; upd(); }
        if (b.hasAttribute('data-dl')) dlModal();
        if (b.hasAttribute('data-other')) otherTry();
        if (b.hasAttribute('data-qsave')) {
          var l = D.SAVED[me().id] = D.SAVED[me().id] || [];
          if (l.length >= 10) { I.toast('저장은 계정당 10건까지입니다', 'dg', '안 쓰는 조건을 지운 뒤 저장하세요'); return; }
          l.push({ id: 'Q' + Date.now(), name: (QS.scope === 'pub' ? '공표 · ' : '') + QS.by.map(function (d) { return D.DIMS[d]; }).join('×') + ' · ' + D.MEASURES[QS.measure].name, spec: { scope: QS.scope, measure: QS.measure, by: QS.by.slice(), from: QS.from, to: QS.to, prod: QS.prod } });
          upd(); I.toast('조회 조건을 저장했습니다', 'ok', l.length + '/10');
        }
        if (b.hasAttribute('data-ld')) { var sv = (D.SAVED[me().id] || []).filter(function (x) { return x.id === b.getAttribute('data-ld'); })[0]; if (sv) { var sp = sv.spec; QS.scope = sp.scope || 'own'; QS.measure = sp.measure; QS.by = sp.by.slice(); QS.from = sp.from; QS.to = sp.to; QS.prod = sp.prod || ''; upd(); } }
      });
      if (p.try === 'other' && !APP.lastOther) { history.replaceState(null, '', '#/m/stats'); setTimeout(otherTry, 60); }
    } });
  function otherTry() {
    var target = org() === 'm01' ? 'm02' : 'm01';
    try { D.API.records(target, U.addM(CUR, -1)); } catch (e) {
      APP.lastOther = { path: '/api/members/' + target + '/records?ym=' + U.addM(CUR, -1), status: e.status, code: e.code, message: e.message };
      I.apiError(e); APP.rerender();
    }
  }
  function dlModal() {
    var pub = QS.scope === 'pub', spec = { measure: QS.measure, from: QS.from, to: QS.to, by: QS.by, filter: QS.prod ? { products: [QS.prod] } : {} };
    I.modal({ title: '항목 선택 다운로드', size: 'md', body: '<p class="mute">현재 조회 조건의 자료를 내려받습니다. 선택한 항목만 파일에 포함됩니다.</p>' +
      '<div class="chips">' + QS.by.map(function (d) { return '<label class="tg"><input type="checkbox" checked disabled>' + D.DIMS[d] + '</label>'; }).join('') + '<label class="tg"><input type="checkbox" data-code>코드 열 포함</label><label class="tg"><input type="checkbox" checked disabled>' + D.MEASURES[QS.measure].name + '</label></div>',
      foot: '<button class="btn" data-mclose>취소</button><button class="btn p" data-go>' + ic('download') + '내려받기</button>',
      onOpen: function (m) { $('[data-go]', m).addEventListener('click', function () {
        var res = pub ? D.API.pub(spec) : D.API.own(spec);
        I.download((pub ? '업계공표_' : D.MMAP[org()].name + '_') + QS.from + '_' + QS.to + '.csv', C.csvFrom(res, { code: $('[data-code]', m).checked }));
        D.audit('CSV 내려받기', (pub ? '업계 공표' : '우리 회사') + ' · ' + QS.from + '~' + QS.to, '허용', res.rows.length + '행 · #' + res.meta.hash); I.close();
      }); } });
  }

  /* ======================================================= M10 전년 동기 비교 */
  APP.screen({ path: '/m/yoy', side: 'member', title: '전년 동기 비교 조회',
    render: function (p) {
      var ms = C.pubMonths(), m = p.m || ms[ms.length - 1], py = U.addM(m, -12), meas = p.k || 'pr';
      var y0 = m.slice(0, 4) + '-01', y1 = py.slice(0, 4) + '-01';
      var q = function (from, to, by) { return D.API.own({ measure: meas, from: from, to: to, by: by }); };
      var a = q(m, m, ['product']).rows, b = q(py, py, ['product']).rows, ac = q(y0, m, ['product']).rows, bc = q(y1, py, ['product']).rows;
      var mp = function (l) { var o = {}; l.forEach(function (r) { o[r.product] = r.value; }); return o; };
      var A = mp(a), B = mp(b), AC = mp(ac), BC = mp(bc);
      var prods = D.PRODUCTS.filter(function (x) { return A[x.code] || B[x.code]; });
      var tot = function (o) { return Object.keys(o).reduce(function (s, k) { return s + o[k]; }, 0); };
      var row = function (lb, va, vb, vac, vbc, cls) {
        var d1 = I.delta(va, vb), d2 = I.delta(vac, vbc);
        return '<tr class="' + (cls || '') + '"><td>' + lb + '</td><td class="r num">' + n(va) + '</td><td class="r num">' + n(vb) + '</td><td class="r num">' + n((va || 0) - (vb || 0)) + '</td><td class="r num ' + (d1 > 0 ? 'up' : 'dn') + '">' + I.pctTxt(d1) + '</td>' +
          '<td class="r num">' + n(vac) + '</td><td class="r num">' + n(vbc) + '</td><td class="r num ' + (d2 > 0 ? 'up' : 'dn') + '">' + I.pctTxt(d2) + '</td></tr>';
      };
      var monthsA = D.MONTHS.filter(function (x) { return x >= y0 && x <= m; });
      var ser = q(y1, m, ['month']).rows, sm = {}; ser.forEach(function (r) { sm[r.month] = r.value; });
      return C.ph('전년 동기 비교 조회', D.MMAP[org()].name + ' · 당월과 전년 같은 달, 1월부터의 누계를 품목별로 비교합니다.', '', '통계') +
        '<div class="fbar">' + C.monthSel('m', m, ms.filter(function (x) { return D.PUB[U.addM(x, -12)]; }), '기준월') +
        '<label class="fr"><span>지표</span><select class="sel" name="k">' + ['pr', 'd', 'x', 's'].map(function (k) { return '<option value="' + k + '"' + (meas === k ? ' selected' : '') + '>' + D.MEASURES[k].name + '</option>'; }).join('') + '</select></label></div>' +
        C.card(D.MEASURES[meas].name + ' — ' + U.ymLabel(m) + ' vs ' + U.ymLabel(py) + ' <small>단위 톤</small>', '<div class="tw"><table class="tbl"><thead><tr><th rowspan="2">품목</th><th colspan="4" class="c">당월</th><th colspan="3" class="c">1월~당월 누계</th></tr><tr><th class="r">' + U.ymShort(m) + '</th><th class="r">' + U.ymShort(py) + '</th><th class="r">증감</th><th class="r">증감률</th><th class="r">' + m.slice(0, 4) + '</th><th class="r">' + py.slice(0, 4) + '</th><th class="r">증감률</th></tr></thead><tbody>' +
          prods.map(function (x) { return row(x.short, A[x.code] || 0, B[x.code] || 0, AC[x.code] || 0, BC[x.code] || 0); }).join('') + '</tbody><tfoot>' + row('합계', tot(A), tot(B), tot(AC), tot(BC), 'tot') + '</tfoot></table></div>', { act: '<span class="ver">' + C.verBadge(m).replace(/<[^>]+>/g, '') + '</span>' }) +
        C.card('월별 전년 동기 비교', I.columnPair({ title: '월별 전년 동기 비교', aName: m.slice(0, 4) + '년', bName: py.slice(0, 4) + '년', groups: monthsA.map(function (x) { return { label: (+x.slice(5)) + '월', a: sm[x] || 0, b: sm[U.addM(x, -12)] || 0 }; }) }));
    },
    mount: function (el, p) {
      el.addEventListener('change', function (e) { var t = e.target; var q = Object.assign({}, p); if (t.name === 'm') q.m = t.value; if (t.name === 'k') q.k = t.value; APP.go('/m/yoy?' + Object.keys(q).map(function (k) { return k + '=' + q[k]; }).join('&')); });
    } });

  /* ======================================================= M11 지도 대시보드 */
  APP.screen({ path: '/m/map', side: 'member', title: '지도 대시보드',
    render: function () {
      return C.ph('지도 대시보드', '업계 공표 기준의 시·도별 내수 출하입니다. 회원사가 적은 지역은 합계만으로 특정 회사 출하량이 드러날 수 있어, 구성 회원사 ' + D.THRESHOLD + '개사 미만 지역과 차감으로 유추할 수 있는 지역은 함께 비공개(◆)합니다. 귀사 공장 위치를 함께 표시합니다.', '', '통계') + C.mapDash('member');
    },
    mount: function (el) { C.mountMap(el, 'member'); } });

  /* ======================================================= M12 계정·직원 권한 */
  APP.screen({ path: '/m/staff', side: 'member', title: '계정·직원 권한 관리',
    render: function () {
      var adm = D.can('STAFF_GRANT'), staff = D.USERS.filter(function (u) { return u.org === org(); });
      var G = D.ROLEMAP.MEM_STAFF.grantable;
      return C.ph('계정·직원 권한 관리', '소속 직원의 계정과 업무 권한을 확인하고, 조회·입력·수정·제출 권한을 각각 관리하세요.', adm ? '<button class="btn p" data-addst>' + ic('plus') + '직원 추가</button>' : '', '관리') +
        (adm ? '' : '<div class="alert info">' + ic('lock') + '<div>권한 변경은 회원사 관리자만 할 수 있습니다. 현재 계정: ' + esc(me().name) + ' (' + D.ROLEMAP[me().role].name + ')</div></div>') +
        C.card(esc(D.MMAP[org()].name) + ' 계정 ' + staff.length + '명', '<div class="tw"><table class="tbl"><thead><tr><th>이름</th><th>부서</th><th>역할</th>' + G.map(function (gq) { return '<th class="c">' + I.grantName(gq) + '</th>'; }).join('') + '<th>최근 접속</th></tr></thead><tbody>' +
          staff.map(function (u) {
            var isAdm = u.role === 'MEM_ADMIN', ps = D.permsOf(u);
            return '<tr><td><b>' + esc(u.name) + '</b><small class="mute"> ' + esc(u.email) + '</small></td><td>' + esc(u.dept) + '</td><td>' + D.ROLEMAP[u.role].name + '</td>' +
              G.map(function (gq) { return '<td class="c"><input type="checkbox" data-gu="' + u.id + '" data-gp="' + gq + '"' + (ps.indexOf(gq) >= 0 ? ' checked' : '') + (isAdm || !adm ? ' disabled' : '') + ' aria-label="' + esc(u.name + ' ' + I.grantName(gq)) + '"></td>'; }).join('') +
              '<td class="sm">' + U.fmtTime(u.last) + '</td></tr>';
          }).join('') + '</tbody></table></div><p class="cap">회원사 관리자는 모든 권한을 가집니다. 제출 권한이 없는 직원은 입력·임시저장까지만 할 수 있습니다. 변경 내역은 협회 감사 로그에 남습니다.</p>');
    },
    mount: function (el) {
      el.addEventListener('change', function (e) {
        var t = e.target; if (!t.hasAttribute('data-gu')) return;
        var u = D.UMAP[t.getAttribute('data-gu')], gp = t.getAttribute('data-gp');
        u.grants = u.grants || [];
        if (t.checked) { if (u.grants.indexOf(gp) < 0) u.grants.push(gp); } else u.grants = u.grants.filter(function (x) { return x !== gp; });
        D.audit('권한 변경', u.name + ' (' + D.MMAP[u.org].name + ')', '허용', I.grantName(gp) + (t.checked ? ' 부여' : ' 회수'));
        I.toast(u.name + ' — ' + I.grantName(gp) + ' 권한 ' + (t.checked ? '부여' : '회수'), 'ok');
      });
      el.addEventListener('click', function (e) {
        if (!e.target.closest('[data-addst]')) return;
        I.modal({ title: '직원 추가', size: 'md', body: '<label class="fr"><span>이름</span><input class="inp" data-nn placeholder="예: 홍길동"></label><label class="fr"><span>부서</span><input class="inp" data-nd placeholder="예: 포항공장 생산관리"></label><p class="cap">직원을 추가하면 조회 권한이 먼저 부여됩니다. 이메일 안내는 발송되지 않습니다.</p>',
          foot: '<button class="btn" data-mclose>취소</button><button class="btn p" data-ok>추가</button>',
          onOpen: function (m) { $('[data-ok]', m).addEventListener('click', function () {
            var nm = $('[data-nn]', m).value.trim(); if (!nm) { I.toast('이름을 입력하세요', 'dg'); return; }
            var id = 'u-' + org() + 's' + (D.USERS.length + 1);
            var u = { id: id, name: nm, org: org(), role: 'MEM_STAFF', grants: ['STAT_VIEW'], dept: $('[data-nd]', m).value.trim() || '—', email: 'new' + D.USERS.length + '@' + org() + '.example', last: D.util.now() };
            D.USERS.push(u); D.UMAP[id] = u; D.audit('계정 생성', nm + ' (' + D.MMAP[org()].name + ')', '허용', '조회 권한'); I.close(); APP.rerender(); I.toast(nm + ' 계정을 추가했습니다', 'ok');
          }); } });
      });
    } });
})(window);
