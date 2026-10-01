/* ==========================================================================
   협회 관리자 웹 — 15화면
   A01 로그인 · A02 운영 대시보드 · A03 회원사별 제출 현황판 · A04 검증 결과·예외 처리
   A05 확정·마감 · A06 정정 이력 · A07 통계 조회·보고서 · A08 맞춤 보고서 · A09 지도(전체)
   A10 기준정보 · A11 사용자 계정·권한 · A12 외부 데이터 수집·검수 · A13 이관 검증 결과
   A14 감사 로그 · A15 알림 이력
   ========================================================================== */
(function (g) {
  'use strict';
  var D = g.DB, U = D.util, I = g.UI, C = g.CM, esc = I.esc, ic = I.ic, n = I.n, $ = I.$, $$ = I.$$;
  var CUR = D.CUR;
  function SUBS() { return D.SUB[CUR]; }
  function lastPub() { return C.pubMonths().slice(-1)[0]; }
  function cnt(state) { return D.ACTIVE.filter(function (m) { return SUBS()[m.id].state === state; }).length; }
  function pendingWarns(mid) {
    var S = SUBS()[mid];
    return D.validate(mid, CUR, 'submit').filter(function (w) { return w.lv === 'warn' && !S.assocAck[w.key + '|' + w.field]; });
  }
  function fillRate(mid) {
    var S = SUBS()[mid], ks = Object.keys(S.rows);
    return ks.filter(function (k) { return ['pr', 'd', 'x', 'e'].every(function (f) { return S.rows[k][f] !== null; }); }).length / Math.max(1, ks.length);
  }

  /* ======================================================= A01 로그인 */
  APP.screen({ path: '/a/login', side: 'assoc', title: '협회 관리자 웹 로그인', public: true,
    render: function () { return I.authPage('assoc'); },
    mount: function (el) { I.mountAuth(el); } });

  /* ======================================================= A02 운영 대시보드 */
  APP.screen({ path: '/a/home', side: 'assoc', title: '운영 대시보드',
    render: function () {
      var m = lastPub(), py = U.addM(m, -12);
      var tot = function (meas, mm, by) { return D.aggregate({ measure: meas, from: mm, to: mm, by: by || [] }); };
      var pr = tot('pr', m).total, prY = tot('pr', py).total, sh = tot('s', m).total, shY = tot('s', py).total, inv = tot('e', m).total;
      var warns = D.ACTIVE.reduce(function (s, mm) { return s + (['제출'].indexOf(SUBS()[mm.id].state) >= 0 ? pendingWarns(mm.id).length : 0); }, 0);
      var y = m.slice(0, 4), yp = String(+y - 1);
      var labels = [], a = [], b = [];
      for (var i = 1; i <= 12; i++) { var mm = y + '-' + (i < 10 ? '0' : '') + i, mp = yp + '-' + (i < 10 ? '0' : '') + i; labels.push(i + '월'); a.push(D.PUB[mm] ? tot('s', mm).total : null); b.push(D.PUB[mp] ? tot('s', mp).total : null); }
      var byM = tot('pr', m, ['member']).rows.sort(function (x, z) { return z.value - x.value; });
      var byP = tot('pr', m, ['product']).rows.sort(function (x, z) { return z.value - x.value; });
      var blocks = D.AUDIT.filter(function (x) { return x.result === '차단'; }).slice(0, 5);
      var strip = '<div class="mstrip">' + D.ACTIVE.map(function (mm) { var S = SUBS()[mm.id]; return '<a class="ms" data-s="' + S.state + '" href="#/a/board?m=' + mm.id + '"><b>' + esc(mm.name) + '</b>' + I.chip(S.state) + '</a>'; }).join('') + '</div>';
      var md = C.mapState(); md.m = md.m || m;
      return C.ph('운영 대시보드', U.ymLabel(CUR) + ' 자료 마감 10월 10일 · 발행된 최신 통계 ' + U.ymLabel(m) + ' ' + C.verBadge(m), '<a class="btn" href="#/a/stats">' + ic('chart') + '보고서</a><a class="btn p" href="#/a/board">' + ic('grid') + '제출 현황판</a>', '협회 관리자 웹') +
        '<section class="hero assoc"><div class="hero-l"><div class="kick">' + U.ymLabel(CUR) + ' 자료 진행</div><h1>10개사 중 <span>' + cnt('확정') + '개사 확정</span> · 확인 대기 ' + cnt('제출') + '개사</h1>' +
        '<div class="prog">' + ['확정', '제출', '보완 요청', '작성 중'].map(function (s) { var c = cnt(s); return c ? '<i data-s="' + s + '" style="flex:' + c + '" title="' + s + ' ' + c + '"></i>' : ''; }).join('') + '</div>' +
        '<div class="plg">' + ['확정', '제출', '보완 요청', '작성 중'].map(function (s) { return '<span>' + I.chip(s) + ' <b>' + cnt(s) + '</b></span>'; }).join('') + '</div></div>' +
        '<div class="hero-r"><div class="hq"><b>' + warns + '</b><span>협회 확인이 필요한<br>급변 경고</span><a class="btn sm" href="#/a/review">검증 결과</a></div><div class="hq"><b>' + D.CORR.filter(function (c) { return c.state === '요청'; }).length + '</b><span>정정 요청</span><a class="btn sm" href="#/a/corr">정정 이력</a></div><div class="hq"><b>' + D.EXT.runs.filter(function (r) { return r.status === '검수 대기'; }).length + '</b><span>외부 수집<br>검수 대기</span><a class="btn sm" href="#/a/collect">수집</a></div></div></section>' +
        strip +
        '<div class="kpis">' +
        kpi('전국 생산', pr, prY, m) + kpi('전국 총출하', sh, shY, m) + kpi('전국 기말재고', inv, tot('e', py).total, m) +
        '<div class="kpi"><div class="l">재고 일수 <small>기말재고 ÷ 일평균 출하</small></div><div class="v">' + (inv / (sh / 30)).toFixed(1) + '<em>일</em></div><div class="d">' + U.ymLabel(m) + '</div></div></div>' +
        '<div class="grid g21">' + C.card('월별 총출하 <small>' + y + '년 vs ' + yp + '년</small>', I.lineChart({ title: '월별 총출하', labels: labels, series: [{ name: y + '년', color: I.PAL().s1, values: a, area: true }, { name: yp + '년', color: I.PAL().s2, values: b }] })) +
        C.card('최근 차단 이벤트 <small>감사 로그</small>', '<ul class="evl">' + blocks.map(function (x) { return '<li>' + ic('shield') + '<div><b>' + esc(x.action) + '</b><small>' + U.fmtTime(x.at) + ' · ' + esc(x.who) + ' (' + esc(x.org) + ')</small><p>' + esc(x.detail) + '</p></div></li>'; }).join('') + '</ul><a class="lnk" href="#/a/audit?r=차단">감사 로그 전체 →</a>') + '</div>' +
        '<div class="grid g2">' + C.card('회원사별 생산 비중 <small>' + U.ymLabel(m) + '</small>', I.barList({ items: byM.map(function (r) { return { label: D.MMAP[r.member].name, value: r.value, share: r.value / pr }; }) })) +
        C.card('품목별 생산 비중 <small>' + U.ymLabel(m) + '</small>', I.barList({ items: byP.map(function (r) { return { label: D.PMAP[r.product].short, value: r.value, share: r.value / pr }; }) })) + '</div>';
    } });
  function kpi(label, v, p, m) { var d = I.delta(v, p); return '<div class="kpi"><div class="l">' + label + ' <small>' + U.ymLabel(m) + '</small></div><div class="v">' + I.compact(v) + '<em>톤</em></div><div class="d"><span class="' + (d >= 0 ? 'up' : 'dn') + '">전년 동월 ' + I.pctTxt(d) + '</span></div></div>'; }

  /* ======================================================= A03 제출 현황판 */
  var BF = { st: '' };
  APP.screen({ path: '/a/board', side: 'assoc', title: '회원사별 제출 현황판',
    render: function (p) {
      var list = D.ACTIVE.filter(function (m) { return !BF.st || SUBS()[m.id].state === BF.st; });
      var notSub = D.ACTIVE.filter(function (m) { return SUBS()[m.id].state === '작성 중'; });
      var rows = list.map(function (m) {
        var S = SUBS()[m.id], iss = D.validate(m.id, CUR, 'submit'), er = iss.filter(function (x) { return x.lv === 'error'; }).length, wr = pendingWarns(m.id).length;
        var sub = S.history.filter(function (h) { return h.to === '제출'; }).slice(-1)[0], adm = D.USERS.filter(function (u) { return u.org === m.id && u.role === 'MEM_ADMIN'; })[0];
        var fr = fillRate(m.id);
        var act = S.state === '작성 중' ? '<button class="btn sm" data-mail="' + m.id + '">' + ic('send') + '제출 요청</button>' :
          S.state === '제출' ? '<button class="btn sm" data-rq="' + m.id + '">' + ic('alert') + '보완 요청</button><button class="btn sm p" data-cf="' + m.id + '">' + ic('check') + '확정</button>' :
          S.state === '보완 요청' ? '<span class="mute sm">회원사 수정 대기</span>' : '';
        return '<tr class="' + (p.m === m.id ? 'on' : '') + '"><td><button class="lnk" data-det="' + m.id + '"><b>' + esc(m.name) + '</b></button><small class="mute"> ' + D.factoriesOf(m.id, CUR).length + '개 공장</small></td><td>' + I.chip(S.state) + '</td>' +
          '<td><div class="meter"><i style="width:' + Math.round(fr * 100) + '%"></i></div><small class="num">' + Math.round(fr * 100) + '%</small></td>' +
          '<td class="r num">' + (S.state === '작성 중' || S.state === '보완 요청' ? (er ? '<span class="tx-e">' + er + '</span>' : 0) : '—') + '</td><td class="r num">' + (wr ? '<span class="tx-w">' + wr + '</span>' : 0) + '</td>' +
          '<td class="sm">' + (sub ? U.fmtTime(sub.at) : '—') + '</td><td class="sm">' + esc(adm ? adm.name : '') + '</td><td class="acts">' + act + '</td></tr>';
      }).join('');
      return C.ph('회원사별 제출 현황판', U.ymLabel(CUR) + ' · 마감 10월 10일. 회원사별 입력·제출 상태를 확인하고 필요한 곳에 제출 또는 보완을 요청하세요.', '<button class="btn" data-mailall' + (notSub.length ? '' : ' disabled') + '>' + ic('send') + '미제출 ' + notSub.length + '개사에 제출 요청</button><a class="btn p" href="#/a/close">' + ic('lock') + '확정·마감</a>', '자료 관리') +
        '<div class="work-photo logistics" aria-hidden="true"></div>' +
        '<div class="sumrow">' + ['', '작성 중', '제출', '보완 요청', '확정'].map(function (s) { return '<button class="sumc' + (BF.st === s ? ' on' : '') + '" data-bf="' + s + '"><b>' + (s ? cnt(s) : D.ACTIVE.length) + '</b><span>' + (s || '전체') + '</span></button>'; }).join('') + '</div>' +
        C.card('회원사 ' + list.length + '곳', '<div class="tw"><table class="tbl"><thead><tr><th>회원사</th><th>상태</th><th>입력률</th><th class="r">오류</th><th class="r">미확인 경고</th><th>제출 시각</th><th>담당자</th><th>처리</th></tr></thead><tbody>' + rows + '</tbody></table></div>') +
        '<p class="cap">급변 경고를 모두 확인한 제출 자료만 확정할 수 있습니다. 회원사 이름을 누르면 상세 자료와 처리 이력을 볼 수 있습니다.</p>';
    },
    mount: function (el) {
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-bf],[data-mail],[data-mailall],[data-rq],[data-cf],[data-det]'); if (!b) return;
        if (b.hasAttribute('data-bf')) { BF.st = b.getAttribute('data-bf'); APP.rerender(); }
        if (b.hasAttribute('data-mail')) sendDeadline([b.getAttribute('data-mail')]);
        if (b.hasAttribute('data-mailall')) sendDeadline(D.ACTIVE.filter(function (m) { return SUBS()[m.id].state === '작성 중'; }).map(function (m) { return m.id; }));
        if (b.hasAttribute('data-rq')) reqModal(b.getAttribute('data-rq'));
        if (b.hasAttribute('data-cf')) confirmOne(b.getAttribute('data-cf'));
        if (b.hasAttribute('data-det')) detail(b.getAttribute('data-det'));
      });
    } });
  function sendDeadline(ids) {
    ids.forEach(function (id) { D.notify('마감 임박(제출 요청)', D.MMAP[id].name + ' 통계 담당', '[시멘트 통계] ' + U.ymLabel(CUR) + ' 자료 제출 요청 (마감 10월 10일)', '아직 제출되지 않았습니다. 대량 입력표 또는 엑셀 업로드로 입력 후 제출해 주세요.', D.util.tick(1)); });
    D.audit('알림 기록', '마감 임박(제출 요청) · ' + ids.length + '개사', '허용', ids.map(function (i) { return D.MMAP[i].name; }).join(', '));
    I.toast(ids.length + '개사의 제출 요청을 기록했습니다', 'ok', '알림 이력에서 확인할 수 있습니다. 실제 메일은 발송되지 않습니다');
    APP.rerender();
  }
  function reqModal(mid) {
    I.modal({ title: D.MMAP[mid].name + ' — 보완 요청', size: 'md', body: '<p class="mute">보완 요청을 등록하면 회원사는 다시 수정할 수 있습니다. 알림 이력에 기록되지만 실제 메일은 발송되지 않습니다.</p><label class="fr"><span>보완 요청 사유</span><textarea class="inp" rows="3" data-note placeholder="예: 송학공장 클링커 기말재고 실사값 확인 부탁드립니다"></textarea></label>',
      foot: '<button class="btn" data-mclose>취소</button><button class="btn p" data-ok>' + ic('send') + '보완 요청</button>',
      onOpen: function (m) { $('[data-ok]', m).addEventListener('click', function () { try { D.transition(CUR, mid, '보완 요청', $('[data-note]', m).value.trim()); I.close(); APP.rerender(); I.toast('보완 요청을 등록했습니다', 'ok', D.MMAP[mid].name); } catch (er) { I.apiError(er); } }); } });
  }
  function confirmOne(mid) {
    try { D.transition(CUR, mid, '확정'); APP.rerender(); I.toast(D.MMAP[mid].name + ' 자료를 확정했습니다', 'ok'); }
    catch (er) { I.apiError(er); if (er.code === 'ASSOC_ACK') APP.go('/a/review?m=' + mid); }
  }
  function detail(mid) {
    var S = D.API.records(mid, CUR), iss = D.validate(mid, CUR, 'submit');
    var rows = Object.keys(S.rows).map(function (k) {
      var r = S.rows[k], f = D.FMAP[r.f], e = iss.filter(function (x) { return x.key === k; });
      return '<tr><td>' + esc(f.name) + '</td><td>' + D.PMAP[r.p].short + '</td>' + ['b', 'pr', 'd', 'x', 'e'].map(function (c) { var x = e.filter(function (z) { return z.field === c; })[0]; return '<td class="r num ' + (x ? (x.lv === 'error' ? 'tx-e' : 'tx-w') : '') + '">' + n(r[c]) + '</td>'; }).join('') +
        '<td>' + (e.length ? e.map(function (x) { return '<span class="code ' + x.lv + '">' + x.code + '</span>'; }).join(' ') : '<span class="tx-ok">' + ic('check') + '</span>') + '</td></tr>';
    }).join('');
    I.modal({ title: D.MMAP[mid].name + ' — ' + U.ymLabel(CUR) + ' 제출 자료', size: 'xl', body: '<div class="frow">' + I.chip(S.state) + '<span class="mute">협회 권한 조회 · 감사 로그 기록됨</span></div><div class="tw" style="max-height:56vh"><table class="tbl"><thead><tr><th>공장</th><th>품목</th><th class="r">기초</th><th class="r">생산</th><th class="r">내수</th><th class="r">수출</th><th class="r">기말</th><th>검증</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<h3 class="h3">처리 이력</h3><ol class="tl">' + S.history.slice().reverse().map(function (h) { return '<li><span class="tl-d">' + I.chip(h.to) + '</span><div><b>' + esc((h.from ? h.from + ' → ' : '') + h.to) + '</b><small>' + U.fmtTime(h.at) + ' · ' + esc(h.by) + '</small>' + (h.note ? '<p>' + esc(h.note) + '</p>' : '') + '</div></li>'; }).join('') + '</ol>' });
  }

  /* ======================================================= A04 검증 결과·예외 처리 */
  APP.screen({ path: '/a/review', side: 'assoc', title: '검증 결과·예외 처리',
    render: function (p) {
      var subs = D.ACTIVE.filter(function (m) { return SUBS()[m.id].state === '제출'; });
      var items = [];
      subs.forEach(function (m) { var S = SUBS()[m.id]; D.validate(m.id, CUR, 'submit').filter(function (w) { return w.lv === 'warn'; }).forEach(function (w) { items.push({ m: m, w: w, k: w.key + '|' + w.field, ack: S.assocAck[w.key + '|' + w.field], why: S.warnAck[w.key + '|' + w.field] }); }); });
      var open = items.filter(function (x) { return !x.ack; });
      return C.ph('검증 결과·예외 처리', '제출된 자료의 급변 경고와 회원사가 입력한 사유를 확인하세요. 설명이 충분하면 확인 처리하고, 수정이 필요하면 보완을 요청할 수 있습니다.', '', '자료 관리') +
        '<div class="kpis k3"><div class="kpi"><div class="l">확인 대기 회원사</div><div class="v">' + subs.length + '<em>곳</em></div><div class="d">제출 상태</div></div><div class="kpi"><div class="l">미확인 경고</div><div class="v">' + open.length + '<em>건</em></div><div class="d">확정 전 확인 필요</div></div><div class="kpi"><div class="l">필수 검증 오류</div><div class="v">0<em>건</em></div><div class="d">제출 단계에서 차단됨</div></div></div>' +
        (items.length ? C.card('급변 경고 ' + items.length + '건', '<div class="tw"><table class="tbl"><thead><tr><th>회원사</th><th>항목</th><th class="r">입력값</th><th class="r">비교값</th><th class="r">변동</th><th>회원사 사유</th><th>처리</th></tr></thead><tbody>' +
          items.map(function (x) {
            var r = SUBS()[x.m.id].rows[x.w.key];
            return '<tr class="' + (p.m === x.m.id ? 'on' : '') + '"><td><b>' + esc(x.m.name) + '</b></td><td>' + esc(x.w.msg.split(' — ')[0]) + '<small class="mute"> · ' + D.FIELDS[x.w.field] + ' · ' + (x.w.code === 'W01' ? '전월 대비' : '전년 동월 대비') + '</small></td><td class="r num">' + n(r[x.w.field]) + '</td><td class="r num">' + n(x.w.ref) + '</td><td class="r num tx-w">' + I.pctTxt(x.w.rate) + '</td>' +
              '<td>' + (x.why ? esc(x.why) : '<span class="mute">사유 없음</span>') + '</td><td class="acts">' + (x.ack ? '<span class="tx-ok sm">' + ic('check') + esc(x.ack) + '</span>' : '<button class="btn sm p" data-ack="' + x.m.id + '|' + esc(x.k) + '">' + ic('check') + '확인</button><button class="btn sm" data-rq="' + x.m.id + '">보완 요청</button>') + '</td></tr>';
          }).join('') + '</tbody></table></div>') : '<div class="empty">' + ic('checkc') + '확인할 경고가 없습니다.</div>') +
        C.card('확정 가능 여부', '<div class="tw"><table class="tbl"><thead><tr><th>회원사</th><th>상태</th><th class="r">미확인 경고</th><th></th></tr></thead><tbody>' + subs.map(function (m) { var pw = pendingWarns(m.id).length; return '<tr><td>' + esc(m.name) + '</td><td>' + I.chip(SUBS()[m.id].state) + '</td><td class="r num">' + pw + '</td><td>' + '<button class="btn sm ' + (pw ? '' : 'p') + '" data-cf="' + m.id + '">' + ic('check') + '확정</button></td></tr>'; }).join('') + '</tbody></table></div>');
    },
    mount: function (el) {
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-ack],[data-rq],[data-cf]'); if (!b) return;
        if (b.hasAttribute('data-ack')) {
          var v = b.getAttribute('data-ack'), mid = v.split('|')[0], k = v.slice(mid.length + 1);
          SUBS()[mid].assocAck[k] = D.actor().name + ' · 확인'; D.audit('급변 경고 확인', D.MMAP[mid].name + ' · ' + k, '허용', '회원사 사유 수용');
          APP.rerender(); I.toast('경고를 확인했습니다', 'ok');
        }
        if (b.hasAttribute('data-rq')) reqModal(b.getAttribute('data-rq'));
        if (b.hasAttribute('data-cf')) confirmOne(b.getAttribute('data-cf'));
      });
    } });

  /* ======================================================= A05 확정·마감 */
  APP.screen({ path: '/a/close', side: 'assoc', title: '확정·마감 처리',
    render: function () {
      var all = D.ACTIVE.every(function (m) { return SUBS()[m.id].state === '확정' || SUBS()[m.id].state === '마감'; });
      var closed = !!D.PUB[CUR], months = C.pubMonths(6).reverse();
      return C.ph('확정·마감 처리', '회원사 10곳의 자료가 모두 확정되면 해당 월을 마감할 수 있습니다. 발행된 통계는 버전별로 보존되어 이후 정정 내역과 구분해 조회할 수 있습니다.', '', '자료 관리') +
        '<section class="card"><div class="card-h"><h2>' + ic('lock') + U.ymLabel(CUR) + ' 마감</h2></div><div class="card-b"><div class="closeg">' +
        D.ACTIVE.map(function (m) { var s = SUBS()[m.id].state; return '<div class="cl" data-s="' + s + '"><b>' + esc(m.name) + '</b>' + I.chip(s) + (s === '제출' ? '<button class="btn sm" data-cf="' + m.id + '">확정</button>' : '') + '</div>'; }).join('') + '</div>' +
        (closed ? '<div class="alert ok">' + ic('checkc') + '<div><b>' + U.ymLabel(CUR) + ' 마감 완료</b> — 발행 v1 · ' + U.fmtTime(D.PUB[CUR][0].at) + '. 이제 통계·보고서·지도에 반영됩니다.</div></div>' :
          '<div class="row-a"><button class="btn p" data-closem' + (all ? '' : ' disabled') + '>' + ic('lock') + U.ymLabel(CUR) + ' 마감·발행</button></div>' +
          (all ? '' : '<p class="cap">모든 회원사 자료가 확정되면 마감할 수 있습니다. 미확정 자료는 제출 현황에서 확인해 주세요.</p>')) + '</div></section>' +
        C.card('최근 발행 버전', '<div class="tw"><table class="tbl"><thead><tr><th>월</th><th>버전</th><th>발행 시각</th><th>처리자</th><th>내용</th></tr></thead><tbody>' +
          (closed ? [CUR] : []).concat(months).map(function (m) { return D.PUB[m].slice().reverse().map(function (v, i) { return '<tr' + (i ? ' class="old"' : '') + '><td>' + (i ? '' : '<b>' + U.ymLabel(m) + '</b>') + '</td><td><span class="ver">v' + v.v + '</span>' + (i ? ' <small class="mute">보존</small>' : ' <small class="tx-ok">최신</small>') + '</td><td>' + U.fmtTime(v.at) + '</td><td>' + esc(v.by) + '</td><td>' + esc(v.note) + '</td></tr>'; }).join(''); }).join('') + '</tbody></table></div>');
    },
    mount: function (el) {
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-cf],[data-closem]'); if (!b) return;
        if (b.hasAttribute('data-cf')) confirmOne(b.getAttribute('data-cf'));
        if (b.hasAttribute('data-closem')) { try { var v = D.closeMonth(CUR); APP.rerender(); I.toast(U.ymLabel(CUR) + ' 마감 — 발행 v' + v.v, 'ok', '통계·보고서·지도에 반영됩니다'); } catch (er) { I.apiError(er); } }
      });
    } });

  /* ======================================================= A06 정정 이력 */
  APP.screen({ path: '/a/corr', side: 'assoc', title: '정정 이력',
    render: function (p) {
      var sel = p.c || (D.CORR[0] && D.CORR[0].id), c = D.CORR.filter(function (x) { return x.id === sel; })[0];
      var diff = '';
      if (c && c.changes.length) {
        var m = c.ym, vers = D.PUB[m], showRequested = c.state !== '승인';
        var compareNote = c.state === '요청' ? '요청값은 현재 발행 통계에 반영되지 않았습니다. 협회가 승인하면 기존 버전을 보존하고 새 버전을 발행합니다.' :
          c.state === '반려' ? '반려된 요청값은 발행 통계에 반영되지 않았습니다. 기존 발행 버전은 그대로 유지됩니다.' :
            '승인된 정정은 v' + c.version + '에 반영됐습니다. 이전 버전(v' + (c.version - 1) + ')은 보존되며 통계 조회에서 버전을 골라 확인할 수 있습니다.';
        diff = C.card(c.id + (showRequested ? ' 정정 요청값 대조 — ' : ' 발행 버전 비교 — ') + U.ymLabel(m), '<div class="tw"><table class="tbl"><thead><tr><th>항목</th>' + vers.map(function (v) { return '<th class="r">v' + v.v + ' <small class="mute">' + U.fmtTime(v.at).slice(0, 10) + '</small></th>'; }).join('') + (showRequested ? '<th class="r">' + (c.state === '반려' ? '반려된 요청값' : '요청값') + '</th>' : '') + '</tr></thead><tbody>' +
          c.changes.map(function (x) {
            return '<tr><td>' + esc(D.FMAP[x.f].name + ' · ' + D.PMAP[x.p].short + ' · ' + D.FIELDS[x.field]) + '</td>' + vers.map(function (v) { var r = D.recsOf(m, v.v).filter(function (y) { return y.f === x.f && y.p === x.p; })[0]; return '<td class="r num">' + n(r[x.field]) + '</td>'; }).join('') + (showRequested ? '<td class="r num tx-w">' + n(x.new) + '</td>' : '') + '</tr>';
          }).join('') +
          '<tr class="tot"><td>' + U.ymLabel(m) + ' 전국 생산 합계</td>' + vers.map(function (v) { return '<td class="r num">' + n(D.aggregate({ measure: 'pr', from: m, to: m, by: [], versions: (function () { var o = {}; o[m] = v.v; return o; })() }).total) + '</td>'; }).join('') + (showRequested ? '<td></td>' : '') + '</tr></tbody></table></div>' +
          '<p class="cap">' + compareNote + '</p>');
      }
      return C.ph('정정 이력', '마감된 자료의 정정 요청과 승인 상태를 확인하세요. 승인된 정정은 기존 발행본을 보존한 채 새 버전으로 반영됩니다.', '', '자료 관리') +
        C.card('정정 요청 ' + D.CORR.length + '건', '<div class="tw"><table class="tbl"><thead><tr><th>번호</th><th>대상 월</th><th>회원사</th><th>요청</th><th>사유</th><th>상태</th><th>처리</th></tr></thead><tbody>' +
          D.CORR.map(function (x) {
            return '<tr class="' + (x.id === sel ? 'on' : '') + '"><td><a class="lnk mono" href="#/a/corr?c=' + x.id + '">' + x.id + '</a></td><td>' + U.ymLabel(x.ym) + '</td><td>' + esc(D.MMAP[x.member].name) + '</td><td class="sm">' + U.fmtTime(x.at) + '<br>' + esc(x.by) + '</td><td>' + esc(x.reason) + (x.rejectNote ? '<br><small class="mute">반려 사유: ' + esc(x.rejectNote) + '</small>' : '') + '</td><td>' + I.chip(x.state) + (x.version ? ' <span class="ver">v' + x.version + '</span>' : '') + '</td>' +
              '<td class="acts">' + (x.state === '요청' ? '<button class="btn sm p" data-ap="' + x.id + '">' + ic('check') + '승인 · 새 버전 발행</button><button class="btn sm" data-rj="' + x.id + '">반려</button>' : '<span class="sm mute">' + U.fmtTime(x.decidedAt) + ' ' + esc(x.decidedBy) + '</span>') + '</td></tr>';
          }).join('') + '</tbody></table></div>') + diff;
    },
    mount: function (el) {
      el.addEventListener('click', function (e) {
        var a = e.target.closest('[data-ap]'), r = e.target.closest('[data-rj]');
        if (a) { try { var c = D.decideCorrection(a.getAttribute('data-ap'), true); APP.go('/a/corr?c=' + c.id); I.toast('승인 — ' + U.ymLabel(c.ym) + ' v' + c.version + ' 발행', 'ok', '이전 버전은 보존됩니다'); } catch (er) { I.apiError(er); } }
        if (r) {
          var id = r.getAttribute('data-rj');
          I.modal({ title: id + ' 반려', size: 'md', body: '<label class="fr"><span>반려 사유</span><textarea class="inp" rows="2" data-n></textarea></label>', foot: '<button class="btn" data-mclose>취소</button><button class="btn p" data-ok>반려</button>',
            onOpen: function (m) { $('[data-ok]', m).addEventListener('click', function () { try { D.decideCorrection(id, false, $('[data-n]', m).value.trim()); I.close(); APP.rerender(); I.toast('반려했습니다', 'ok'); } catch (er) { I.apiError(er); } }); } });
        }
      });
    } });

  /* ======================================================= A07 통계 조회·보고서 */
  var RS = { tab: 'rep', m: null, ver: {}, pathRes: null, bulk: null, prod: '', reg: '' };
  APP.screen({ path: '/a/stats', side: 'assoc', title: '통계 조회·보고서 출력',
    render: function (p) {
      if (p.tab) RS.tab = p.tab;
      var ms = C.pubMonths(); if (!RS.m || !D.PUB[RS.m]) RS.m = ms[ms.length - 1];
      var m = RS.m, vers = D.PUB[m], v = RS.ver[m] || D.latestV(m);
      var tabs = [['rep', '대표 양식 · 수급 실적 월보'], ['g2', '양식군 · 회원사별 실적'], ['g3', '양식군 · 시·도별 출하'], ['g4', '양식군 · 공장별 생산'], ['trend', '추이 차트 4종'], ['paths', '4경로 일치 검증']];
      var head = '<div class="fbar">' + C.monthSel('m', m, ms, '기준월') +
        '<label class="fr"><span>발행 버전</span><select class="sel" name="ver">' + vers.slice().reverse().map(function (x) { return '<option value="' + x.v + '"' + (x.v === v ? ' selected' : '') + '>v' + x.v + (x.v === D.latestV(m) ? ' (최신)' : ' (보존본)') + '</option>'; }).join('') + '</select></label>' +
        '<div class="fr"><span>&nbsp;</span><div class="row-a"><button class="btn" data-rdl>' + ic('download') + 'CSV 내려받기</button><button class="btn" onclick="window.print()">' + ic('printer') + '인쇄 · PDF</button></div></div></div>';
      var body = RS.tab === 'rep' ? report(m, v) : RS.tab === 'g2' ? g2(m, v) : RS.tab === 'g3' ? g3(m, v) : RS.tab === 'g4' ? g4(m, v) : RS.tab === 'trend' ? trend(m) : paths(m);
      return C.ph('통계 조회·보고서 출력', '발행된 통계를 기간·품목·지역별로 조회하고 보고서나 파일로 내려받으세요. 화면과 출력물에는 같은 발행 버전의 값이 사용됩니다.', '', '통계') +
        '<div class="tabs">' + tabs.map(function (t) { return '<a class="tab' + (RS.tab === t[0] ? ' on' : '') + '" href="#/a/stats?tab=' + t[0] + '">' + t[1] + '</a>'; }).join('') + '</div>' + (RS.tab === 'paths' || RS.tab === 'trend' ? '' : head) + body;
    },
    mount: function (el) {
      el.addEventListener('change', function (e) { var t = e.target; if (t.name === 'm') RS.m = t.value; if (t.name === 'ver') RS.ver[RS.m] = +t.value; if (t.name === 'pm') RS.pm = t.value; if (t.name === 'pp') RS.prod = t.value; if (t.name === 'pr') RS.reg = t.value; APP.rerender(); });
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-rdl],[data-run],[data-bulk]'); if (!b) return;
        if (b.hasAttribute('data-rdl')) {
          var tb = el.querySelector('table.rep'); if (!tb) return;
          var rows = $$('tr', tb).map(function (tr) { var out = []; $$('th,td', tr).forEach(function (c) { out.push(c.textContent.trim()); for (var i = 1; i < (+c.getAttribute('colspan') || 1); i++) out.push(''); }); return out; });
          I.download('보고서_' + RS.tab + '_' + RS.m + '_v' + (RS.ver[RS.m] || D.latestV(RS.m)) + '.csv', D.util.toCSV(rows)); D.audit('CSV 내려받기', '보고서 ' + RS.tab + ' · ' + U.ymLabel(RS.m), '허용', rows.length + '행');
        }
        if (b.hasAttribute('data-run')) { RS.pathRes = runPaths(); APP.rerender(); }
        if (b.hasAttribute('data-bulk')) { RS.bulk = bulkPaths(); APP.rerender(); }
      });
    } });
  function vq(meas, from, to, by, filter, m, v) { var o = {}; if (v) o[m] = v; return D.aggregate({ measure: meas, from: from, to: to, by: by, filter: filter, versions: o }); }
  function mapBy(res, key) { var o = {}; res.rows.forEach(function (r) { o[r[key]] = r.value; }); return o; }
  function report(m, v) {
    var py = U.addM(m, -12), y0 = m.slice(0, 4) + '-01', yp0 = py.slice(0, 4) + '-01';
    var cols = {
      pr: mapBy(vq('pr', m, m, ['product'], null, m, v), 'product'), prY: mapBy(vq('pr', py, py, ['product']), 'product'), prC: mapBy(vq('pr', y0, m, ['product'], null, m, v), 'product'), prCY: mapBy(vq('pr', yp0, py, ['product']), 'product'),
      d: mapBy(vq('d', m, m, ['product'], null, m, v), 'product'), dC: mapBy(vq('d', y0, m, ['product'], null, m, v), 'product'), x: mapBy(vq('x', m, m, ['product'], null, m, v), 'product'), xC: mapBy(vq('x', y0, m, ['product'], null, m, v), 'product'), e: mapBy(vq('e', m, m, ['product'], null, m, v), 'product')
    };
    var sum = function (o) { return Object.keys(o).reduce(function (s, k) { return s + o[k]; }, 0); };
    var line = function (lb, g, cls) {
      var r1 = I.delta(g('pr'), g('prY')), r2 = I.delta(g('prC'), g('prCY'));
      return '<tr class="' + (cls || '') + '"><th>' + lb + '</th><td>' + n(g('pr')) + '</td><td>' + n(g('prY')) + '</td><td class="' + (r1 >= 0 ? 'up' : 'dn') + '">' + I.pctTxt(r1) + '</td><td>' + n(g('prC')) + '</td><td>' + n(g('prCY')) + '</td><td class="' + (r2 >= 0 ? 'up' : 'dn') + '">' + I.pctTxt(r2) + '</td><td>' + n(g('d')) + '</td><td>' + n(g('dC')) + '</td><td>' + n(g('x')) + '</td><td>' + n(g('xC')) + '</td><td>' + n(g('e')) + '</td></tr>';
    };
    var prods = D.PRODUCTS.filter(function (pp) { return cols.pr[pp.code] || cols.prY[pp.code]; });
    return '<section class="card repc"><div class="rep-h"><div><div class="kick">시멘트 수급 실적 월보 · 대표 양식</div><h2>' + U.ymLabel(m) + ' 시멘트 수급 실적</h2></div><div class="rep-m"><span>단위: 톤</span><span>발행 v' + v + (v < D.latestV(m) ? ' (보존본)' : '') + '</span><span>' + U.fmtTime(D.PUB[m].filter(function (x) { return x.v === v; })[0].at) + '</span></div></div>' +
      '<div class="tw"><table class="tbl rep"><thead><tr><th rowspan="3">품목</th><th colspan="6">생 산</th><th colspan="4">출 하</th><th rowspan="3">기말<br>재고</th></tr>' +
      '<tr><th colspan="3">당 월</th><th colspan="3">누 계 (1월~)</th><th colspan="2">내 수</th><th colspan="2">수 출</th></tr>' +
      '<tr><th>' + m.slice(0, 4) + '</th><th>' + py.slice(0, 4) + '</th><th>증감률</th><th>' + m.slice(0, 4) + '</th><th>' + py.slice(0, 4) + '</th><th>증감률</th><th>당월</th><th>누계</th><th>당월</th><th>누계</th></tr></thead><tbody>' +
      prods.map(function (pp) { return line(pp.name, function (k) { return cols[k][pp.code] || 0; }); }).join('') + '</tbody><tfoot>' + line('합 계', function (k) { return sum(cols[k]); }, 'tot') + '</tfoot></table></div>' +
      '<p class="cap">자료 기준: ' + D.aggregate({ measure: 'pr', from: m, to: m, by: [] }).meta.basis + '.</p></section>';
  }
  function g2(m, v) {
    var pr = mapBy(vq('pr', m, m, ['member'], null, m, v), 'member'), d = mapBy(vq('d', m, m, ['member'], null, m, v), 'member'), x = mapBy(vq('x', m, m, ['member'], null, m, v), 'member'), e = mapBy(vq('e', m, m, ['member'], null, m, v), 'member');
    var tot = Object.keys(pr).reduce(function (s, k) { return s + pr[k]; }, 0);
    var ids = Object.keys(pr).sort(function (a, b) { return pr[b] - pr[a]; });
    return C.card('회원사별 실적 — ' + U.ymLabel(m) + ' <small>v' + v + ' · 톤</small>', '<div class="tw"><table class="tbl rep"><thead><tr><th>회원사</th><th>생산</th><th>점유율</th><th>내수 출하</th><th>수출 출하</th><th>기말재고</th></tr></thead><tbody>' +
      ids.map(function (k) { return '<tr><th>' + esc(D.MMAP[k].name) + '</th><td>' + n(pr[k]) + '</td><td>' + (pr[k] / tot * 100).toFixed(1) + '%</td><td>' + n(d[k]) + '</td><td>' + n(x[k]) + '</td><td>' + n(e[k]) + '</td></tr>'; }).join('') +
      '</tbody><tfoot><tr class="tot"><th>합계</th><td>' + n(tot) + '</td><td>100.0%</td><td>' + n(sumO(d)) + '</td><td>' + n(sumO(x)) + '</td><td>' + n(sumO(e)) + '</td></tr></tfoot></table></div><p class="cap">협회 내부용 양식입니다. 회원사별 수치는 공표 통계에 포함되지 않습니다.</p>');
  }
  function sumO(o) { return Object.keys(o).reduce(function (s, k) { return s + o[k]; }, 0); }
  function g3(m, v) {
    var ms = [U.addM(m, -2), U.addM(m, -1), m].filter(function (x) { return D.PUB[x]; });
    var res = ms.map(function (mm) { return mapBy(vq('d', mm, mm, ['region'], null, m, v), 'region'); });
    var y0 = m.slice(0, 4) + '-01', cum = mapBy(vq('d', y0, m, ['region'], null, m, v), 'region');
    return C.card('시·도별 내수 출하 — 최근 3개월 · 누계 <small>톤</small>', '<div class="tw"><table class="tbl rep"><thead><tr><th>시·도</th>' + ms.map(function (mm) { return '<th>' + U.ymShort(mm) + '</th>'; }).join('') + '<th>1월~누계</th><th>비중</th></tr></thead><tbody>' +
      D.REGIONS.map(function (r) { return '<tr><th>' + r.name + '</th>' + res.map(function (o) { return '<td>' + n(o[r.code] || 0) + '</td>'; }).join('') + '<td>' + n(cum[r.code] || 0) + '</td><td>' + ((cum[r.code] || 0) / sumO(cum) * 100).toFixed(1) + '%</td></tr>'; }).join('') +
      '</tbody><tfoot><tr class="tot"><th>전국</th>' + res.map(function (o) { return '<td>' + n(sumO(o)) + '</td>'; }).join('') + '<td>' + n(sumO(cum)) + '</td><td>100.0%</td></tr></tfoot></table></div><p class="cap">협회 내부 양식은 비공개 처리 없이 전 지역을 표시합니다. 회원사·외부 공표용으로 내보낼 때는 소수 지역 보호 규칙을 적용합니다.</p>');
  }
  function g4(m, v) {
    var res = vq('pr', m, m, ['factory', 'product'], null, m, v).rows, by = {};
    res.forEach(function (r) { (by[r.factory] = by[r.factory] || {})[r.product] = r.value; });
    var fids = Object.keys(by).sort();
    return C.card('공장별 생산 — ' + U.ymLabel(m) + ' <small>톤</small>', '<div class="tw"><table class="tbl rep"><thead><tr><th>공장</th><th>회원사</th><th>소재지</th>' + D.PRODUCTS.map(function (pp) { return '<th>' + pp.short + '</th>'; }).join('') + '<th>합계</th></tr></thead><tbody>' +
      fids.map(function (f) { var F = D.FMAP[f]; return '<tr><th>' + esc(F.name) + '</th><td>' + esc(D.MMAP[D.ownerOf(f, m)].name) + '</td><td>' + D.RMAP[F.region].name + ' ' + esc(F.districtName) + '</td>' + D.PRODUCTS.map(function (pp) { return '<td>' + (by[f][pp.code] ? n(by[f][pp.code]) : '') + '</td>'; }).join('') + '<td><b>' + n(sumO(by[f])) + '</b></td></tr>'; }).join('') + '</tbody></table></div>');
  }
  function trend(m) {
    var y = m.slice(0, 4), yp = String(+y - 1), P = I.PAL();
    var mon = function (yy) { var l = []; for (var i = 1; i <= 12; i++) { var mm = yy + '-' + (i < 10 ? '0' : '') + i; l.push(D.PUB[mm] ? D.aggregate({ measure: 's', from: mm, to: mm, by: [] }).total : null); } return l; };
    var a = mon(y), b = mon(yp), labels = []; for (var i = 1; i <= 12; i++) labels.push(i + '월');
    var cum = function (l) { var s = 0; return l.map(function (v) { if (v === null) return null; s += v; return s; }); };
    var byM = D.aggregate({ measure: 's', from: y + '-01', to: m, by: ['member'] }), byP = D.aggregate({ measure: 's', from: y + '-01', to: m, by: ['product'] });
    return '<div class="grid g2">' + C.card('① 월별 추이 <small>총출하 · ' + y + ' vs ' + yp + '</small>', I.lineChart({ title: '월별 추이', labels: labels, series: [{ name: y + '년', color: P.s1, values: a, area: true }, { name: yp + '년', color: P.s2, values: b }] })) +
      C.card('② 전년 동기 비교 <small>월별 총출하</small>', I.columnPair({ title: '전년 동기 비교', aName: y + '년', bName: yp + '년', groups: labels.map(function (l, i) { return { label: l, a: a[i], b: b[i] }; }).filter(function (gq) { return gq.a !== null; }) })) +
      C.card('③ 비중 <small>' + y + '년 누계 총출하 · 회원사</small>', I.barList({ items: byM.rows.sort(function (q, w) { return w.value - q.value; }).map(function (r) { return { label: D.MMAP[r.member].name, value: r.value, share: r.value / byM.total }; }) }) +
        '<h3 class="h3">품목</h3>' + I.barList({ items: byP.rows.sort(function (q, w) { return w.value - q.value; }).map(function (r) { return { label: D.PMAP[r.product].short, value: r.value, share: r.value / byP.total }; }) })) +
      C.card('④ 누계 <small>1월부터 누적 총출하</small>', I.lineChart({ title: '누계', labels: labels, series: [{ name: y + '년 누계', color: P.s1, values: cum(a) }, { name: yp + '년 누계', color: P.s2, values: cum(b) }] }) +
        '<p class="cap">차트 종류는 표준 4종으로 고정했습니다. 이미지는 차트 위에서 마우스 오른쪽 또는 인쇄 화면으로 저장합니다.</p>') + '</div>';
  }
  /* 4경로 일치 — 같은 조건을 화면·엑셀·보고서·지도가 각자 요청해 비교 */
  function pathSpec() {
    var m = RS.pm || lastPub(), f = {};
    if (RS.prod) f.products = [RS.prod];
    return { m: m, prod: RS.prod, reg: RS.reg, spec: { measure: 'd', from: m, to: m, by: ['region'], filter: f } };
  }
  function runPaths(ps) {
    ps = ps || pathSpec();
    var out = [];
    var pick = function (res) { return ps.reg ? res.rows.filter(function (r) { return r.region === ps.reg; }).reduce(function (s, r) { return s + r.value; }, 0) : res.total; };
    /* ① 화면 표 */
    var r1 = D.aggregate(ps.spec); out.push({ path: '화면 (통계 조회 표)', icon: 'table', v: pick(r1), hash: r1.meta.hash, how: '표 렌더러가 rows 를 그대로 출력' });
    /* ② 엑셀 — CSV 문자열을 만들고 다시 읽어 합산 */
    var r2 = D.aggregate(ps.spec), csv = C.csvFrom(r2), parsed = D.util.parseCSV(csv).slice(1, -1);
    var v2 = parsed.filter(function (row) { return !ps.reg || row[0] === D.RMAP[ps.reg].name; }).reduce(function (s, row) { return s + (+row[row.length - 1] || 0); }, 0);
    out.push({ path: '엑셀 (CSV 파일 재판독)', icon: 'download', v: v2, hash: r2.meta.hash, how: 'CSV 생성 → 파일 파싱 → 합산' });
    /* ③ 보고서 — 양식군 「시·도별 출하」 표의 해당 칸 */
    var r3 = D.aggregate(ps.spec), rep = mapBy(r3, 'region');
    out.push({ path: '보고서 (시·도별 출하 양식)', icon: 'file', v: ps.reg ? (rep[ps.reg] || 0) : sumO(rep), hash: r3.meta.hash, how: '보고서 템플릿이 칸에 배치' });
    /* ④ 지도 — 지도 데이터 소스 */
    var r4 = D.API.pub(Object.assign({}, ps.spec)), mv = {};
    r4.rows.forEach(function (r) { mv[r.region] = r.value; });
    out.push({ path: '지도 (시·도 단계 구분도)', icon: 'map', v: ps.reg ? (mv[ps.reg] || 0) : sumO(mv), hash: r4.meta.hash, how: '지도 렌더러가 시·도 색 단계로 표시' });
    var same = out.every(function (x) { return x.v === out[0].v && x.hash === out[0].hash; });
    return { ps: ps, out: out, same: same };
  }
  function bulkPaths() {
    var ms = C.pubMonths(24), rnd = D.util.prng(D.util.now() % 100000), diff = 0, cases = [];
    for (var i = 0; i < 50; i++) {
      var m = ms[Math.floor(rnd() * ms.length)], pp = rnd() < .5 ? '' : D.PRODUCTS[Math.floor(rnd() * 10)].code, rg = rnd() < .3 ? '' : D.REGIONS[Math.floor(rnd() * 17)].code;
      var res = runPaths({ m: m, prod: pp, reg: rg, spec: { measure: 'd', from: m, to: m, by: ['region'], filter: pp ? { products: [pp] } : {} } });
      if (!res.same) diff++;
      cases.push({ m: m, pp: pp, rg: rg, v: res.out[0].v, same: res.same });
    }
    D.audit('경로 간 일치 시험', '50건 × 4경로', diff ? '실패' : '허용', '차이 ' + diff + '건');
    return { cases: cases, diff: diff };
  }
  function paths(m0) {
    var ms = C.pubMonths(), ps = pathSpec(), R = RS.pathRes, B = RS.bulk;
    return '<div class="fbar">' + C.monthSel('pm', ps.m, ms, '기간') +
      '<label class="fr"><span>품목</span><select class="sel" name="pp"><option value="">전체</option>' + D.PRODUCTS.map(function (pp) { return '<option value="' + pp.code + '"' + (RS.prod === pp.code ? ' selected' : '') + '>' + pp.short + '</option>'; }).join('') + '</select></label>' +
      '<label class="fr"><span>지역</span><select class="sel" name="pr"><option value="">전국</option>' + D.REGIONS.map(function (r) { return '<option value="' + r.code + '"' + (RS.reg === r.code ? ' selected' : '') + '>' + r.name + '</option>'; }).join('') + '</select></label>' +
      '<div class="fr"><span>&nbsp;</span><div class="row-a"><button class="btn p" data-run>' + ic('refresh') + '4경로 동시 조회</button><button class="btn" data-bulk>' + ic('list') + '무작위 50건 × 4경로 시험</button></div></div></div>' +
      '<section class="card"><div class="card-h"><h2>' + ic('db') + '어디서 뽑아도 같은 숫자</h2></div><div class="card-b"><div class="paths">' +
      '<div class="pcore"><b>단일 집계 서비스</b><small>집계 기준서 v1.0 · 식 M-02<br>계산은 이 한 곳에서만</small></div>' +
      (R ? R.out.map(function (x) { return '<div class="pth ' + (R.same ? 'ok' : 'bad') + '">' + ic(x.icon) + '<b>' + x.path + '</b><span class="pv num">' + n(x.v) + '<em>톤</em></span><small>' + x.how + '</small><span class="hash">#' + x.hash + '</span></div>'; }).join('') :
        ['화면', '엑셀', '보고서', '지도'].map(function (x) { return '<div class="pth idle">' + ic('clock') + '<b>' + x + '</b><small>조회 전</small></div>'; }).join('')) + '</div>' +
      (R ? '<div class="alert ' + (R.same ? 'ok' : 'err') + '">' + ic(R.same ? 'checkc' : 'alert') + '<div><b>' + (R.same ? '4경로 동일 — 경로 간 차이 0건' : '경로 간 차이 발생') + '</b> · ' + U.ymLabel(R.ps.m) + ' · ' + (R.ps.prod ? D.PMAP[R.ps.prod].short : '전체 품목') + ' · ' + (R.ps.reg ? D.RMAP[R.ps.reg].name : '전국') + ' 내수 출하. 네 경로가 같은 집계 결과를 사용하며 결과 지문(#)도 일치합니다.</div></div>' : '<p class="mute">조건을 선택한 뒤 4경로 동시 조회를 실행하면 화면·엑셀·보고서·지도에 표시되는 값을 비교할 수 있습니다.</p>') +
      '</div></section>' +
      (B ? C.card('무작위 50건 집계 비교', '<div class="alert ' + (B.diff ? 'err' : 'ok') + '">' + ic(B.diff ? 'alert' : 'checkc') + '<div><b>차이 ' + B.diff + '건</b> — 동일한 조회 조건을 4경로에 적용한 결과입니다.</div></div><div class="tw" style="max-height:320px"><table class="tbl compact"><thead><tr><th>#</th><th>월</th><th>품목</th><th>지역</th><th class="r">값 (4경로 공통)</th><th>결과</th></tr></thead><tbody>' +
        B.cases.map(function (c, i) { return '<tr><td class="num">' + (i + 1) + '</td><td>' + U.ymLabel(c.m) + '</td><td>' + (c.pp ? D.PMAP[c.pp].short : '전체') + '</td><td>' + (c.rg ? D.RMAP[c.rg].name : '전국') + '</td><td class="r num">' + n(c.v) + '</td><td>' + (c.same ? '<span class="tx-ok">' + ic('check') + '동일</span>' : '<span class="tx-e">차이</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>') : '');
  }

  /* ======================================================= A08 맞춤 보고서 */
  var CB = { row: 'region', col: 'month', meas: 'd', from: null, to: null, prod: '', cur: null };
  APP.screen({ path: '/a/custom', side: 'assoc', title: '맞춤 보고서 만들기',
    render: function () {
      var ms = C.pubMonths(); if (!CB.from) { CB.from = U.addM(ms[ms.length - 1], -5); CB.to = ms[ms.length - 1]; }
      var dims = ['month', 'year', 'member', 'factory', 'product', 'region'];
      if ((CB.row === 'region' || CB.col === 'region')) CB.meas = 'd';
      var by = CB.row === CB.col ? [CB.row] : [CB.row, CB.col], err = null, res = null;
      try { res = D.aggregate({ measure: CB.meas, from: CB.from, to: CB.to, by: by, filter: CB.prod ? { products: [CB.prod] } : {} }); } catch (e) { err = e; }
      var saved = D.SAVED[APP.user().id] = D.SAVED[APP.user().id] || [];
      var sel = function (name, val, list) { return '<select class="sel" name="' + name + '">' + list.map(function (d) { return '<option value="' + d + '"' + (val === d ? ' selected' : '') + '>' + D.DIMS[d] + '</option>'; }).join('') + '</select>'; };
      var pivot = '';
      if (res) {
        var rk = [], ck = [], cell = {};
        res.rows.forEach(function (r) { var a = r[CB.row], b = by.length > 1 ? r[CB.col] : '_'; if (rk.indexOf(a) < 0) rk.push(a); if (ck.indexOf(b) < 0) ck.push(b); cell[a + '|' + b] = r.value; });
        rk.sort(); ck.sort();
        var rs = {}, cs = {};
        rk.forEach(function (a) { ck.forEach(function (b) { var v = cell[a + '|' + b] || 0; rs[a] = (rs[a] || 0) + v; cs[b] = (cs[b] || 0) + v; }); });
        pivot = '<div class="tw" style="max-height:60vh"><table class="tbl rep pv"><thead><tr><th>' + D.DIMS[CB.row] + ' \\ ' + (by.length > 1 ? D.DIMS[CB.col] : '') + '</th>' + ck.map(function (b) { return '<th>' + (b === '_' ? D.MEASURES[CB.meas].name : esc(C.label(CB.col, b))) + '</th>'; }).join('') + (ck.length > 1 ? '<th>합계</th>' : '') + '</tr></thead><tbody>' +
          rk.map(function (a) { return '<tr><th>' + esc(C.label(CB.row, a)) + '</th>' + ck.map(function (b) { return '<td>' + (cell[a + '|' + b] ? n(cell[a + '|' + b]) : '') + '</td>'; }).join('') + (ck.length > 1 ? '<td><b>' + n(rs[a]) + '</b></td>' : '') + '</tr>'; }).join('') +
          '</tbody><tfoot><tr class="tot"><th>합계</th>' + ck.map(function (b) { return '<td>' + n(cs[b]) + '</td>'; }).join('') + (ck.length > 1 ? '<td>' + n(res.total) + '</td>' : '') + '</tr></tfoot></table></div>';
      }
      return C.ph('맞춤 보고서 만들기', '조회할 지표와 행·열 항목을 선택해 보고서를 구성하세요. 자주 쓰는 구성은 저장해 다시 불러올 수 있습니다.', '', '통계') +
        '<div class="grid g12"><section class="card"><div class="card-h"><h2>' + ic('table') + '구성</h2></div><div class="card-b builder">' +
        '<label class="fr"><span>행</span>' + sel('row', CB.row, dims) + '</label><label class="fr"><span>열</span>' + sel('col', CB.col, dims) + '</label>' +
        '<label class="fr"><span>지표</span><select class="sel" name="meas">' + Object.keys(D.MEASURES).map(function (k) { return '<option value="' + k + '"' + (CB.meas === k ? ' selected' : '') + '>' + D.MEASURES[k].name + '</option>'; }).join('') + '</select></label>' +
        C.monthSel('from', CB.from, ms, '시작') + C.monthSel('to', CB.to, ms, '종료') +
        '<label class="fr"><span>품목 필터</span><select class="sel" name="prod"><option value="">전체</option>' + D.PRODUCTS.map(function (pp) { return '<option value="' + pp.code + '"' + (CB.prod === pp.code ? ' selected' : '') + '>' + pp.short + '</option>'; }).join('') + '</select></label>' +
        '<div class="row-a"><button class="btn p" data-csv2' + (res ? '' : ' disabled') + '>' + ic('download') + 'CSV 내려받기</button><button class="btn" data-sv' + (res ? '' : ' disabled') + '>' + ic('star') + '보고서 저장</button></div>' +
        '<h3 class="h3">저장한 보고서 ' + saved.length + '/10</h3><ul class="savl">' + saved.map(function (s) { return '<li><button class="lnk" data-ld="' + s.id + '">' + esc(s.name) + '</button><button class="btn-ic sm" data-del="' + s.id + '" aria-label="삭제">' + ic('x') + '</button></li>'; }).join('') + '</ul>' +
        '<p class="cap">행·열 항목을 선택해 보고서를 구성하고, 설정을 저장하거나 CSV 파일로 내려받을 수 있습니다.</p></div></section>' +
        '<section class="card"><div class="card-h"><h2>' + ic('eye') + '미리보기</h2></div><div class="card-b">' + (err ? '<div class="alert err">' + ic('alert') + '<div>' + esc(err.message) + '</div></div>' : C.metaLine(res) + pivot) + '</div></section></div>';
    },
    mount: function (el) {
      el.addEventListener('change', function (e) { var t = e.target; if (t.name in CB) CB[t.name] = t.value; if (CB.from > CB.to) { var x = CB.from; CB.from = CB.to; CB.to = x; } APP.rerender(); });
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-csv2],[data-sv],[data-ld],[data-del]'); if (!b) return;
        var saved = D.SAVED[APP.user().id];
        if (b.hasAttribute('data-csv2')) {
          var tb = el.querySelector('table.pv'); var rows = $$('tr', tb).map(function (tr) { return $$('th,td', tr).map(function (c) { return c.textContent.trim(); }); });
          I.download('맞춤보고서_' + D.DIMS[CB.row] + 'x' + D.DIMS[CB.col] + '_' + CB.from + '_' + CB.to + '.csv', D.util.toCSV(rows)); D.audit('CSV 내려받기', '맞춤 보고서', '허용', rows.length + '행');
        }
        if (b.hasAttribute('data-sv')) {
          if (saved.length >= 10) { I.toast('보고서 저장은 계정당 10건까지입니다', 'dg'); return; }
          I.modal({ title: '보고서 저장', size: 'md', body: '<label class="fr"><span>이름</span><input class="inp" data-nm value="' + esc(D.DIMS[CB.row] + ' × ' + D.DIMS[CB.col] + ' · ' + D.MEASURES[CB.meas].name) + '"></label><p class="cap">저장되는 것은 숫자가 아니라 행·열 축과 조건입니다. 나중에 열면 그 시점의 최신 발행 버전으로 다시 계산합니다.</p>', foot: '<button class="btn" data-mclose>취소</button><button class="btn p" data-ok>저장</button>',
            onOpen: function (m) { $('[data-ok]', m).addEventListener('click', function () { saved.push({ id: 'S' + Date.now(), name: $('[data-nm]', m).value.trim() || '맞춤 보고서', spec: { measure: CB.meas, by: CB.row === CB.col ? [CB.row] : [CB.row, CB.col], from: CB.from, to: CB.to, prod: CB.prod } }); I.close(); APP.rerender(); I.toast('저장했습니다', 'ok', saved.length + '/10'); }); } });
        }
        if (b.hasAttribute('data-ld')) { var s = saved.filter(function (x) { return x.id === b.getAttribute('data-ld'); })[0]; CB.meas = s.spec.measure; CB.row = s.spec.by[0]; CB.col = s.spec.by[1] || s.spec.by[0]; CB.from = s.spec.from; CB.to = s.spec.to; CB.prod = s.spec.prod || ''; APP.rerender(); I.toast('「' + s.name + '」을(를) 불러왔습니다', 'ok'); }
        if (b.hasAttribute('data-del')) { var i = saved.findIndex(function (x) { return x.id === b.getAttribute('data-del'); }); saved.splice(i, 1); APP.rerender(); }
      });
    } });

  /* ======================================================= A09 지도 대시보드(전체) */
  APP.screen({ path: '/a/map', side: 'assoc', title: '지도 대시보드(전체)',
    render: function (p) {
      if (p.drill) { C.mapState().drill = p.drill; history.replaceState(null, '', '#/a/map'); }
      return C.ph('지도 대시보드(전체)', '지역별 출하량과 공장 위치를 확인하세요. 「공표 기준 미리보기」를 켜면 구성 회원사 ' + D.THRESHOLD + '개사 미만 등 비공개 대상 지역이 어떻게 표시되는지 볼 수 있습니다.', '', '통계') + C.mapDash('assoc');
    },
    mount: function (el) { C.mountMap(el, 'assoc'); } });

  /* ======================================================= A10 기준정보 */
  var MT = { tab: 'member' };
  APP.screen({ path: '/a/master', side: 'assoc', title: '기준정보 관리',
    render: function (p) {
      if (p.tab) MT.tab = p.tab;
      var tabs = [['member', '회원사'], ['factory', '공장'], ['product', '품목'], ['region', '지역'], ['hist', '합병·폐쇄 이력']];
      var body = '';
      if (MT.tab === 'member') body = '<table class="tbl"><thead><tr><th>코드</th><th>회원사</th><th>상태</th><th class="r">공장</th><th>비고</th></tr></thead><tbody>' + D.MEMBERS.map(function (m) { return '<tr' + (m.inactive ? ' class="old"' : '') + '><td class="mono">' + m.id + '</td><td><b>' + esc(m.name) + '</b></td><td>' + (m.inactive ? '<span class="pill">합병 ' + U.ymShort(m.mergedAt) + ' → ' + esc(D.MMAP[m.mergedInto].name) + '</span>' : '<span class="pill ok">정상</span>') + '</td><td class="r num">' + D.FACTORIES.filter(function (f) { return f.owner.some(function (o) { return o.member === m.id; }); }).length + '</td><td class="sm">' + (m.inactive ? '합병 이전 통계는 이 회원사로 집계' : '') + '</td></tr>'; }).join('') + '</tbody></table>';
      if (MT.tab === 'factory') body = '<table class="tbl"><thead><tr><th>코드</th><th>공장</th><th>회원사</th><th>소재지 (시군구 코드)</th><th>좌표</th><th>품목</th><th>상태</th><th></th></tr></thead><tbody>' + D.FACTORIES.map(function (f) { var mem = D.ownerOf(f.id, CUR) || f.owner[f.owner.length - 1].member; return '<tr' + (f.closed ? ' class="old"' : '') + '><td class="mono">' + f.id + '</td><td><b>' + esc(f.name) + '</b></td><td>' + esc(D.MMAP[mem].name) + (f.owner.length > 1 ? '<br><small class="mute">' + esc(D.MMAP[f.owner[0].member].name) + '에서 승계</small>' : '') + '</td><td>' + D.RMAP[f.region].name + ' ' + esc(f.districtName) + ' <small class="mono mute">' + f.district + '</small></td><td class="num sm">' + f.lat.toFixed(3) + ', ' + f.lon.toFixed(3) + '</td><td class="sm">' + f.products.join(' ') + '</td><td>' + (f.closed ? '<span class="pill">폐쇄 ' + U.ymShort(f.closed) + '</span>' : '<span class="pill ok">가동</span>') + '</td><td>' + (f.closed ? '' : '<button class="btn sm" data-close="' + f.id + '">폐쇄 처리</button>') + '</td></tr>'; }).join('') + '</tbody></table>';
      if (MT.tab === 'product') body = '<table class="tbl"><thead><tr><th>코드</th><th>품목</th><th>약칭</th><th>구 코드 (이관 매핑)</th></tr></thead><tbody>' + D.PRODUCTS.map(function (pp, i) { return '<tr><td class="mono">' + pp.code + '</td><td>' + pp.name + '</td><td>' + pp.short + '</td><td class="mono sm">' + D.MIG.codes.filter(function (c) { return c[1] === pp.code; }).map(function (c) { return c[0]; }).join(', ') + '</td></tr>'; }).join('') + '</tbody></table>';
      if (MT.tab === 'region') body = '<table class="tbl"><thead><tr><th>코드</th><th>시·도</th><th class="r">시·군·구</th><th>경계 버전</th></tr></thead><tbody>' + D.REGIONS.map(function (r) { return '<tr><td class="mono">' + r.code + '</td><td>' + r.name + '</td><td class="r num">' + GEO.districts[r.code].length + '</td><td class="sm">2026-01</td></tr>'; }).join('') + '</tbody></table>';
      if (MT.tab === 'hist') body = '<table class="tbl"><thead><tr><th>일자</th><th>구분</th><th>대상</th><th>내용</th><th>처리자</th></tr></thead><tbody>' + D.HISTORY.slice().sort(function (a, b) { return a.at < b.at ? 1 : -1; }).map(function (h) { return '<tr><td>' + h.at + '</td><td><span class="pill">' + h.type + '</span></td><td>' + esc(h.target) + '</td><td>' + esc(h.detail) + '</td><td>' + esc(h.by) + '</td></tr>'; }).join('') + '</tbody></table>';
      return C.ph('기준정보 관리', '회원사·공장·품목·지역 코드를 관리합니다. <b>합병·폐쇄는 삭제하지 않고 이력으로 남깁니다.</b> 폐쇄된 공장의 과거 통계는 그대로 조회되고, 합병된 회원사는 합병 시점 이전·이후가 구분되어 집계됩니다.', '', '운영') +
        '<div class="tabs">' + tabs.map(function (t) { return '<a class="tab' + (MT.tab === t[0] ? ' on' : '') + '" href="#/a/master?tab=' + t[0] + '">' + t[1] + '</a>'; }).join('') + '</div>' + C.card('', '<div class="tw">' + body + '</div>');
    },
    mount: function (el) {
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-close]'); if (!b) return;
        var f = D.FMAP[b.getAttribute('data-close')];
        I.modal({ title: f.name + ' 폐쇄 처리', size: 'md', body: '<p>폐쇄해도 공장 코드와 과거 통계는 지워지지 않습니다. 폐쇄월 이후로는 입력 대상에서 빠집니다.</p><label class="fr"><span>폐쇄월 (마지막 제출월)</span><select class="sel" data-cm><option>2026-10</option><option>2026-11</option><option>2026-12</option></select></label>',
          foot: '<button class="btn" data-mclose>취소</button><button class="btn p" data-ok>폐쇄 이력 등록</button>',
          onOpen: function (m) { $('[data-ok]', m).addEventListener('click', function () { var cm = $('[data-cm]', m).value; f.closed = cm; D.HISTORY.push({ at: cm + '-말일', type: '폐쇄', target: D.MMAP[D.ownerOf(f.id, CUR)].name + ' ' + f.name + '(' + f.id + ')', detail: cm + ' 자료까지 제출 · 과거 통계 유지', by: D.actor().name }); D.audit('기준정보 변경', f.name, '허용', '폐쇄 ' + cm); I.close(); APP.go('/a/master?tab=hist'); I.toast('폐쇄 이력을 등록했습니다', 'ok'); }); } });
      });
    } });

  /* ======================================================= A11 사용자 계정·권한 */
  APP.screen({ path: '/a/users', side: 'assoc', title: '사용자 계정·권한 관리',
    render: function () {
      var roles = D.ROLES, perms = D.PERMS, adm = D.can('USER_ADMIN');
      return C.ph('사용자 계정·권한 관리', '사용자별 역할과 접근 권한을 확인하고 필요한 권한을 관리하세요.', adm ? '<button class="btn" data-addrole>' + ic('plus') + '역할 추가</button>' : '', '운영') +
        C.card('역할 × 기능 권한', '<div class="tw"><table class="tbl mtx"><thead><tr><th>기능 코드</th><th>기능</th>' + roles.map(function (r) { return '<th class="c">' + esc(r.name) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          perms.map(function (pm) { return '<tr><td class="mono sm">' + pm.code + '</td><td>' + pm.name + ' <small class="mute">' + pm.grp + '</small></td>' + roles.map(function (r) { var on = r.perms.indexOf(pm.code) >= 0, gr = r.grantable && r.grantable.indexOf(pm.code) >= 0; return '<td class="c">' + (r.code === 'MEM_STAFF' ? (gr ? '<span class="pill">관리자 부여</span>' : '') : '<input type="checkbox" data-rp="' + r.code + '|' + pm.code + '"' + (on ? ' checked' : '') + (adm && r.custom ? '' : ' disabled') + ' aria-label="' + esc(r.name + ' ' + pm.name) + '">') + '</td>'; }).join('') + '</tr>'; }).join('') +
          '</tbody></table></div><p class="cap">기본 역할의 권한은 잠겨 있고, 추가한 역할만 여기서 조합합니다. 회원사 직원의 권한은 각 회원사 관리자가 부여합니다.</p>') +
        C.card('사용자 ' + D.USERS.length + '명', '<div class="tw"><table class="tbl"><thead><tr><th>이름</th><th>소속</th><th>역할</th><th>부서</th><th>이메일</th><th>최근 접속</th></tr></thead><tbody>' +
          D.USERS.map(function (u) { return '<tr><td><b>' + esc(u.name) + '</b></td><td>' + esc(u.org === 'assoc' ? '협회' : D.MMAP[u.org].name) + '</td><td>' + esc(D.ROLEMAP[u.role].name) + (u.role === 'MEM_STAFF' ? ' <small class="mute">(' + (u.grants || []).map(I.grantName).join('·') + ')</small>' : '') + '</td><td>' + esc(u.dept) + '</td><td class="sm">' + esc(u.email) + '</td><td class="sm">' + U.fmtTime(u.last) + '</td></tr>'; }).join('') + '</tbody></table></div>');
    },
    mount: function (el) {
      el.addEventListener('change', function (e) { var t = e.target; if (!t.hasAttribute('data-rp')) return; var a = t.getAttribute('data-rp').split('|'), r = D.ROLEMAP[a[0]]; if (t.checked) r.perms.push(a[1]); else r.perms = r.perms.filter(function (x) { return x !== a[1]; }); D.audit('역할 권한 변경', r.name, '허용', a[1] + (t.checked ? ' 추가' : ' 제거')); I.toast(r.name + ' — ' + a[1] + (t.checked ? ' 추가' : ' 제거'), 'ok'); });
      el.addEventListener('click', function (e) {
        if (!e.target.closest('[data-addrole]')) return;
        I.modal({ title: '역할 추가', size: 'md', body: '<label class="fr"><span>역할 이름</span><input class="inp" data-rn placeholder="예: 협회 열람자"></label><p class="cap">추가한 역할은 권한 표에서 기능 코드를 골라 조합합니다. 코드 변경 없이 바로 적용됩니다.</p>',
          foot: '<button class="btn" data-mclose>취소</button><button class="btn p" data-ok>추가</button>',
          onOpen: function (m) { $('[data-ok]', m).addEventListener('click', function () { var nm = $('[data-rn]', m).value.trim() || '새 역할'; var r = { code: 'ROLE_' + (D.ROLES.length + 1), name: nm, side: 'assoc', perms: ['STAT_VIEW'], custom: true }; D.ROLES.push(r); D.ROLEMAP[r.code] = r; D.audit('역할 추가', nm, '허용', 'STAT_VIEW'); I.close(); APP.rerender(); I.toast('「' + nm + '」 역할을 추가했습니다', 'ok', '권한 표에서 기능을 골라 주세요'); }); } });
      });
    } });

  /* ======================================================= A12 외부 데이터 수집·검수 */
  APP.screen({ path: '/a/collect', side: 'assoc', title: '외부 데이터 수집·검수',
    render: function () {
      var E = D.EXT, runs = E.runs.slice().reverse(), pend = runs.filter(function (r) { return r.status === '검수 대기'; })[0];
      var target = '2026-09', got = E.series[target], last = runs[0];
      var series = D.MONTHS.filter(function (m) { return m >= '2025-01'; });
      var P = I.PAL();
      var pv = pend ? pend.pending : null, prevV = E.series[U.addM(pend ? pend.ym : target, -1)];
      return C.ph('외부 데이터 수집·검수', '외부 지표의 수집 상태를 확인하고 새로 들어온 값을 검수하세요. 승인 전 자료는 공식 통계에 반영되지 않습니다.', '', '운영') +
        '<div class="grid g12">' + C.card(ic('cloud') + '제공처', '<dl class="dl"><dt>제공처</dt><dd>' + esc(E.provider.name) + '</dd><dt>방식</dt><dd>' + esc(E.provider.kind) + '</dd><dt>일정</dt><dd>' + esc(E.provider.schedule) + '</dd><dt>항목</dt><dd>' + E.provider.items.join(' · ') + '</dd><dt>약관</dt><dd class="tx-w">' + esc(E.provider.terms) + '</dd></dl>' +
          '<div class="collect-act"><button class="btn p" data-run' + (got || pend ? ' disabled' : '') + '>' + ic('refresh') + '9월분 수동 수집</button>' +
          (last && last.status === '실패' && last.ym === target ? '<button class="btn" data-manual>' + ic('refresh') + '수동 재수집</button>' : '') + '</div>' +
          '<p class="cap">제공처 연결 상태나 이용 조건이 달라진 경우 담당자에게 확인해 주세요.</p>') +
        (pend ? C.card(ic('eye') + '검수 대기 — ' + U.ymLabel(pend.ym) + '분', '<table class="tbl compact"><thead><tr><th>항목</th><th class="r">수집값</th><th class="r">전월 반영값</th><th class="r">변동</th></tr></thead><tbody>' +
          [['건축 착공 면적(㎡)', 'area'], ['레미콘 출하 지수', 'idx'], ['건설 수주액(억 원)', 'order']].map(function (k) { var d = I.delta(pv[k[1]], prevV ? prevV[k[1]] : null); return '<tr><td>' + k[0] + '</td><td class="r num">' + n(pv[k[1]]) + '</td><td class="r num">' + (prevV ? n(prevV[k[1]]) : '—') + '</td><td class="r num ' + (Math.abs(d) > .2 ? 'tx-w' : '') + '">' + I.pctTxt(d) + '</td></tr>'; }).join('') + '</tbody></table>' +
          '<div class="alert warn">' + ic('lock') + '<div><b>아직 통계에 반영되지 않았습니다.</b> 승인해야 대시보드·보고서의 외부 지표에 나타납니다.</div></div><div class="row-a"><button class="btn p" data-ap="' + pend.id + '">' + ic('check') + '승인 · 통계 반영</button><button class="btn" data-rj="' + pend.id + '">반려</button></div>') :
          C.card(ic('checkc') + '반영 상태', got ? '<div class="alert ok">' + ic('checkc') + '<div><b>' + U.ymLabel(target) + '분 반영 완료</b></div></div>' : '<div class="alert info">' + ic('clock') + '<div><b>' + U.ymLabel(target) + '분 수집 전</b> — 다음 정기 수집 예정 시각은 10월 3일 06:00입니다.</div></div>')) + '</div>' +
        C.card('건축 착공 면적 — 반영된 값만 표시 <small>천 ㎡</small>', I.lineChart({ title: '건축 착공 면적', h: 200, labels: series.map(U.ymShort), series: [{ name: '반영값', color: P.s1, values: series.map(function (m) { return E.series[m] && E.series[m].approved ? Math.round(E.series[m].area / 1000) : null; }), area: true }] }) +
          '<p class="cap">검수 대기 또는 반려 상태의 값은 차트에서 제외됩니다.</p>') +
        C.card('수집 실행 이력', '<div class="tw"><table class="tbl"><thead><tr><th>실행</th><th>대상 월</th><th>실행 시각</th><th>방식</th><th>상태</th><th class="r">항목</th><th>내용</th><th>검수</th></tr></thead><tbody>' +
          runs.map(function (r) { return '<tr class="' + (r.status === '실패' ? 'bad' : '') + '"><td class="mono">' + r.id + '</td><td>' + U.ymLabel(r.ym) + '</td><td class="sm">' + U.fmtTime(r.at) + '</td><td>' + r.mode + '</td><td>' + I.chip(r.status) + '</td><td class="r num">' + r.rows + '</td><td class="sm">' + esc(r.error || r.note || '') + '</td><td class="sm">' + (r.approvedBy ? esc(r.approvedBy) + ' · ' + U.fmtTime(r.approvedAt, false) : '') + '</td></tr>'; }).join('') + '</tbody></table></div>');
    },
    mount: function (el) {
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-run],[data-manual],[data-ap],[data-rj]'); if (!b) return;
        try {
          if (b.hasAttribute('data-run')) { var r = D.runCollect('2026-09', true); APP.rerender(); I.toast(r.status === '실패' ? '수집 실패 — 알림 이력에 기록' : '수집 완료 — 검수 대기', r.status === '실패' ? 'dg' : 'ok', r.error || '승인 전까지 통계 미반영'); }
          if (b.hasAttribute('data-manual')) { D.EXT.breakNext = false; var r2 = D.runCollect('2026-09', true); APP.rerender(); I.toast('수동 재수집 성공 — 검수 대기', 'ok', '승인 전까지 통계 미반영'); }
          if (b.hasAttribute('data-ap')) { D.approveCollect(b.getAttribute('data-ap'), true); APP.rerender(); I.toast('승인 — 통계에 반영했습니다', 'ok'); }
          if (b.hasAttribute('data-rj')) { D.approveCollect(b.getAttribute('data-rj'), false); APP.rerender(); I.toast('반려 — 통계에 반영하지 않았습니다', 'ok'); }
        } catch (er) { I.apiError(er); }
      });
    } });

  /* ======================================================= A13 이관 검증 결과 */
  APP.screen({ path: '/a/migrate', side: 'assoc', title: '이관 검증 결과 조회',
    render: function () {
      var M = D.MIG, ys = M.years, cntOk = ys.filter(function (y) { return y.srcCnt === y.dstCnt; }).length, sumOk = ys.filter(function (y) { return y.srcSum === y.dstSum; }).length;
      var items = M.compare.reduce(function (s, c) { return s + c.items; }, 0), match = M.compare.reduce(function (s, c) { return s + c.match; }, 0);
      return C.ph('이관 검증 결과 조회', '이관 전후의 자료 건수와 연도별 합계, 코드 매핑 결과를 확인하세요. 차이가 있는 항목은 대조 목록에서 따로 볼 수 있습니다.', '<button class="btn" data-mdl>' + ic('download') + '검증 결과 내려받기</button>', '운영') +
        '<div class="kpis"><div class="kpi"><div class="l">이관 연도</div><div class="v">' + ys.length + '<em>년</em></div><div class="d">' + ys[0].y + '~' + ys[ys.length - 1].y + '년 · 원본·신규 코드 대조</div></div>' +
        '<div class="kpi"><div class="l">건수 일치</div><div class="v">' + cntOk + '<em>/' + ys.length + '</em></div><div class="d up">연도별 100%</div></div>' +
        '<div class="kpi"><div class="l">연도별 합계 일치</div><div class="v">' + sumOk + '<em>/' + ys.length + '</em></div><div class="d up">생산 합계 기준</div></div>' +
        '<div class="kpi"><div class="l">신·구 대조</div><div class="v">' + (match / items * 100).toFixed(0) + '<em>%</em></div><div class="d">대조 대상 ' + n(items) + '항목 · 제외 ' + M.excluded.length + '건</div></div></div>' +
        '<div class="grid g2">' + C.card('신·구 수치 대조 <small>대표 양식 1종 × 3개년</small>', '<table class="tbl"><thead><tr><th>양식</th><th>연도</th><th class="r">대조 항목</th><th class="r">일치</th><th class="r">일치율</th><th class="r">제외</th></tr></thead><tbody>' +
          M.compare.map(function (c) { return '<tr><td>' + esc(c.form) + '</td><td>' + c.year + '</td><td class="r num">' + n(c.items) + '</td><td class="r num">' + n(c.match) + '</td><td class="r num tx-ok">' + (c.match / c.items * 100).toFixed(1) + '%</td><td class="r num">' + c.excluded + '</td></tr>'; }).join('') + '</tbody></table>' +
          '<p class="cap">불일치가 나오면 결과값만 맞추지 않고 집계 기준과 구현 로직을 함께 확인한 뒤 다시 출력합니다.</p>') +
        C.card('대조 제외 목록 <small>승인된 예외</small>', '<table class="tbl"><thead><tr><th>번호</th><th>항목</th><th>사유</th><th>합의</th></tr></thead><tbody>' + M.excluded.map(function (x) { return '<tr><td class="mono">' + x.id + '</td><td>' + esc(x.item) + '</td><td class="sm">' + esc(x.reason) + '</td><td class="sm">' + esc(x.agreed) + '</td></tr>'; }).join('') + '</tbody></table>') + '</div>' +
        '<div class="grid g21">' + C.card('연도별 건수 · 합계 대조 <small>원본 DB ↔ 신규 DB</small>', '<div class="tw" style="max-height:440px"><table class="tbl compact"><thead><tr><th>연도</th><th class="r">원본 건수</th><th class="r">신규 건수</th><th class="r">원본 생산 합계</th><th class="r">신규 생산 합계</th><th>결과</th></tr></thead><tbody>' +
          ys.slice().reverse().map(function (y) { var ok = y.srcCnt === y.dstCnt && y.srcSum === y.dstSum; return '<tr><td>' + y.y + '</td><td class="r num">' + n(y.srcCnt) + '</td><td class="r num">' + n(y.dstCnt) + '</td><td class="r num">' + n(y.srcSum) + '</td><td class="r num">' + n(y.dstSum) + '</td><td>' + (ok ? '<span class="tx-ok">' + ic('check') + '일치</span>' : '<span class="tx-e">불일치</span>') + '</td></tr>'; }).join('') + '</tbody></table></div>') +
        C.card('코드 매핑 <small>누락 0 · 중복 0</small>', '<table class="tbl compact"><thead><tr><th>구 코드</th><th>신 코드</th><th>품목</th><th class="r">누락</th><th class="r">중복</th></tr></thead><tbody>' + M.codes.map(function (c) { return '<tr><td class="mono">' + c[0] + '</td><td class="mono">' + c[1] + '</td><td class="sm">' + esc(c[2]) + '</td><td class="r num">' + c[3] + '</td><td class="r num">' + c[4] + '</td></tr>'; }).join('') + '</tbody></table>' +
          '<dl class="dl sm"><dt>원본</dt><dd>' + esc(M.source) + '</dd><dt>대상</dt><dd>' + esc(M.target) + '</dd><dt>실행</dt><dd>' + U.fmtTime(M.runAt) + '</dd></dl>') + '</div>';
    },
    mount: function (el) { el.addEventListener('click', function (e) { if (!e.target.closest('[data-mdl]')) return; var M = D.MIG; I.download('데이터이관_검증결과.csv', D.util.toCSV([['연도', '원본 건수', '신규 건수', '원본 합계', '신규 합계']].concat(M.years.map(function (y) { return [y.y, y.srcCnt, y.dstCnt, y.srcSum, y.dstSum]; })))); }); } });

  /* ======================================================= A14 감사 로그 */
  var AF = { r: '', q: '' };
  APP.screen({ path: '/a/audit', side: 'assoc', title: '감사 로그 조회',
    render: function (p) {
      if (p.r !== undefined) AF.r = p.r;
      var list = D.AUDIT.filter(function (x) { return (!AF.r || x.result === AF.r) && (!AF.q || (x.who + x.org + x.action + x.target + x.detail).indexOf(AF.q) >= 0); });
      return C.ph('감사 로그 조회', '로그인, 자료 조회·제출·확정, 권한 변경, 내려받기와 <b>차단된 요청</b>을 모두 기록합니다. 다른 회원사 자료 요청, 허용되지 않은 단계 전이는 「차단」으로 남습니다.', '<button class="btn" data-adl>' + ic('download') + '내려받기</button>', '운영') +
        '<div class="fbar"><div class="seg" role="group" aria-label="결과">' + ['', '허용', '차단', '실패'].map(function (r) { return '<button data-ar="' + r + '" class="' + (AF.r === r ? 'on' : '') + '">' + (r || '전체') + ' <b>' + D.AUDIT.filter(function (x) { return !r || x.result === r; }).length + '</b></button>'; }).join('') + '</div>' +
        '<label class="fr grow"><span>검색</span><input class="inp" data-aq value="' + esc(AF.q) + '" placeholder="사용자 · 회원사 · 동작 · 대상"></label></div>' +
        C.card('기록 ' + list.length + '건', '<div class="tw"><table class="tbl"><thead><tr><th>번호</th><th>시각</th><th>사용자</th><th>소속 · 역할</th><th>동작</th><th>대상</th><th>결과</th><th>상세</th><th>접속 IP</th></tr></thead><tbody>' +
          list.slice(0, 200).map(function (x) { return '<tr class="' + (x.result === '차단' ? 'bad' : '') + '"><td class="mono sm">' + x.id + '</td><td class="sm">' + U.fmtTime(x.at) + '</td><td>' + esc(x.who) + '</td><td class="sm">' + esc(x.org) + ' · ' + esc(x.role) + '</td><td>' + esc(x.action) + '</td><td class="sm">' + esc(x.target) + '</td><td>' + I.chip(x.result) + '</td><td class="sm">' + esc(x.detail) + '</td><td class="mono sm">' + x.ip + '</td></tr>'; }).join('') + '</tbody></table></div>');
    },
    mount: function (el) {
      el.addEventListener('click', function (e) { var b = e.target.closest('[data-ar],[data-adl]'); if (!b) return; if (b.hasAttribute('data-ar')) { AF.r = b.getAttribute('data-ar'); APP.go('/a/audit?r=' + AF.r); } else I.download('감사로그.csv', D.util.toCSV([['번호', '시각', '사용자', '소속', '역할', '동작', '대상', '결과', '상세', 'IP']].concat(D.AUDIT.map(function (x) { return [x.id, U.fmtTime(x.at), x.who, x.org, x.role, x.action, x.target, x.result, x.detail, x.ip]; })))); });
      var q = $('[data-aq]', el), tmr;
      q.addEventListener('input', function () { clearTimeout(tmr); tmr = setTimeout(function () { AF.q = q.value.trim(); APP.rerender(); var q2 = document.querySelector('[data-aq]'); if (q2) { q2.focus(); q2.setSelectionRange(q2.value.length, q2.value.length); } }, 250); });
    } });

  /* ======================================================= A15 알림 이력 */
  var NF = { t: '' };
  APP.screen({ path: '/a/noti', side: 'assoc', title: '알림 이력',
    render: function () {
      var types = ['제출 완료', '보완 요청', '정정 요청', '정정 승인', '마감 임박(제출 요청)', '수집 실패'];
      var list = D.NOTI.filter(function (x) { return !NF.t || x.type === NF.t; });
      return C.ph('알림 이력', '제출 완료·보완 요청·정정 처리·외부 수집 실패 알림의 기록을 확인하세요. 이 화면에서는 실제 이메일을 발송하지 않습니다.', '', '운영') +
        '<div class="fbar"><div class="seg" role="group" aria-label="유형"><button data-nt="" class="' + (!NF.t ? 'on' : '') + '">전체 <b>' + D.NOTI.length + '</b></button>' + types.map(function (t) { return '<button data-nt="' + t + '" class="' + (NF.t === t ? 'on' : '') + '">' + t + ' <b>' + D.NOTI.filter(function (x) { return x.type === t; }).length + '</b></button>'; }).join('') + '</div></div>' +
        C.card('기록 ' + list.length + '건', '<div class="tw"><table class="tbl"><thead><tr><th>번호</th><th>기록 시각</th><th>유형</th><th>수신 대상</th><th>제목</th><th>예정 채널</th><th>상태</th></tr></thead><tbody>' +
          list.map(function (x) { return '<tr><td class="mono sm">' + x.id + '</td><td class="sm">' + U.fmtTime(x.at) + '</td><td><span class="pill">' + esc(x.type) + '</span></td><td>' + esc(x.to) + '</td><td><button class="lnk" data-nv="' + x.id + '">' + esc(x.subject) + '</button></td><td>이메일</td><td>' + I.chip(x.status) + '</td></tr>'; }).join('') + '</tbody></table></div>');
    },
    mount: function (el) {
      el.addEventListener('click', function (e) {
        var b = e.target.closest('[data-nt],[data-nv]'); if (!b) return;
        if (b.hasAttribute('data-nt')) { NF.t = b.getAttribute('data-nt'); APP.rerender(); return; }
        var x = D.NOTI.filter(function (z) { return z.id === b.getAttribute('data-nv'); })[0];
        I.modal({ title: x.subject, size: 'md', body: '<dl class="dl"><dt>수신 대상</dt><dd>' + esc(x.to) + '</dd><dt>기록 시각</dt><dd>' + U.fmtTime(x.at) + '</dd><dt>유형</dt><dd>' + esc(x.type) + '</dd></dl><div class="mail">' + esc(x.body || '(본문 없음)') + '<p class="mute">— 이메일 내용 미리보기 · 실제 발송 없음</p></div>' });
      });
    } });

  /* ======================================================= 시연 시나리오 */
  APP.DEMO.scenarios = [
    { t: '엑셀처럼 쓰는 대량 입력표', d: '방향키·붙여넣기 · 재고 수지 실시간 · 전월·전년 동월 비교', as: 'u-m04a', run: function () { APP.go('/m/input?f=F12'); I.toast('포항공장 빈 칸을 채우거나 엑셀에서 복사해 붙여넣어 보세요', '', '재고 수지와 지역 합계가 바로 검증됩니다'); } },
    { t: '1,000행 중 1행 오류 → 전체 미반영', d: '전 행 검증 후 오류 행 번호·사유 반환', as: 'u-m04a', run: function () { APP.go('/m/upload?sample=regional-bad'); } },
    { t: '필수 검증 실패 시 제출 차단', d: '재고 수지 · 상세 합계 ↔ 총괄값 교차 검증', as: 'u-m04a', run: function () { APP.go('/m/input?f=F13'); setTimeout(function () { var b = document.querySelector('[data-act2="submit"]'); if (b) b.click(); }, 80); } },
    { t: '제출 → 보완 요청 → 확정 → 마감', d: '회원사별 제출 현황판과 알림 이력', as: 'u-a1', run: function () { APP.go('/a/board'); } },
    { t: '단계 건너뛰기 차단 (409)', d: '허용되지 않은 처리 순서 차단 · 감사 로그', as: 'u-m04a', run: function () { APP.lastSkip = null; APP.go('/m/status?try=skip'); } },
    { t: '어디서 뽑아도 같은 숫자', d: '화면·엑셀·보고서·지도 4경로 일치 · 50건 시험', as: 'u-a1', run: function () { RS.pathRes = null; RS.bulk = null; APP.go('/a/stats?tab=paths'); setTimeout(function () { var b = document.querySelector('[data-run]'); if (b) b.click(); }, 80); } },
    { t: '마감 후 정정 → 새 발행 버전', d: 'v1 보존 · v2 사유·승인 시각 · 버전 비교', as: 'u-a1', run: function () { APP.go('/a/corr?c=C-0007'); } },
    { t: '다른 회원사 자료 요청 차단 (403)', d: '세션 기준 서버 판정 · 감사 로그 기록', as: 'u-m04a', run: function () { APP.lastOther = null; APP.go('/m/stats?try=other'); } },
    { t: '소수 회원사 지역 합계 보호', d: '3개사 미만 비공개 + 차감 유추 방지', as: 'u-m04a', run: function () { var s = C.mapState(); s.drill = null; s.mode = 'seq'; APP.go('/m/map'); } },
    { t: '지도 · 시·군·구 확대 · 월별 재생', d: '전년 동월 대비 증감 · 공장 위치 · 이미지 저장', as: 'u-a1', run: function () { var s = C.mapState(); s.preview = false; APP.go('/a/map?drill=51'); } },
    { t: '외부 수집 실패 → 검수 전 미반영', d: '실패 알림 · 수동 재수집 · 승인 후 반영', as: 'u-a1', run: function () { D.EXT.breakNext = true; APP.go('/a/collect'); I.toast('「제공처 응답 형식 변경 모의」를 켜 두었습니다', '', '정기 수집 실행을 눌러 보세요'); } },
    { t: '맞춤 보고서 만들기', d: '행·열 선택 · 저장 · CSV 내려받기', as: 'u-a1', run: function () { APP.go('/a/custom'); } },
    { t: '제출 권한 없는 직원', d: '회원사 관리자가 부여한 기능 권한', as: 'u-m04s1', run: function () { APP.go('/m/input'); I.toast('이수아 — 조회·입력·수정 권한, 제출 권한 없음', '', '제출 버튼이 비활성화됩니다'); } },
    { t: '신·구 대조 · 이관 검증 결과', d: '25년 건수·합계 · 코드 매핑 · 제외 목록', as: 'u-a1', run: function () { APP.go('/a/migrate'); } }
  ];
})(window);
