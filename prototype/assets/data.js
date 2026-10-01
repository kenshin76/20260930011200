/* ==========================================================================
   시멘트 통계 포털 — 도메인 엔진 (시연용)
   제안서의 설계를 데이터 위에서 실제로 돌립니다.
     · 검증 3지점 (입력 · 제출 · 확정)       · 제출 상태 머신
     · 단일 집계 서비스 (화면·엑셀·보고서·지도 공용) · 발행 버전 스냅샷 · 마감 후 정정
     · 회원사 격리 (서버 판정)              · 소수 회원사 지역 합계 보호 (차감 방지 포함)
     · 엑셀/CSV 업로드 전 행 검증              · 양식 자동 인식 · 외부 수집 검수 · 감사 로그
   모든 회사·공장·수치는 시연용 가상 데이터입니다.
   ========================================================================== */
(function (g) {
  'use strict';

  /* ------------------------------------------------------------ 기초 유틸 */
  function prng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function h01(s) { return (hash(s) % 100000) / 100000; }
  /* 최대 나머지 배분 — 합계가 정확히 total 이 되도록 정수로 나눈다 */
  function split(total, weights) {
    var sw = 0, i, out = [], rem = [];
    for (i = 0; i < weights.length; i++) sw += weights[i];
    if (!sw || !total) return weights.map(function () { return 0; });
    var acc = 0;
    for (i = 0; i < weights.length; i++) {
      var raw = total * weights[i] / sw, fl = Math.floor(raw);
      out.push(fl); acc += fl; rem.push([raw - fl, i]);
    }
    rem.sort(function (a, b) { return b[0] - a[0] || a[1] - b[1]; });
    for (i = 0; i < total - acc; i++) out[rem[i % rem.length][1]]++;
    return out;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ------------------------------------------------------------ 시간 */
  function ym(y, m) { return y + '-' + (m < 10 ? '0' : '') + m; }
  function addM(s, k) {
    var y = +s.slice(0, 4), m = +s.slice(5, 7) - 1 + k;
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    return ym(y, m + 1);
  }
  function ymLabel(s) { return s.slice(0, 4) + '년 ' + (+s.slice(5, 7)) + '월'; }
  function ymShort(s) { return s.slice(2, 4) + '.' + s.slice(5, 7); }
  var FIRST = '2021-01', CUR = '2026-09';
  var MONTHS = [];
  for (var _m = FIRST; _m <= CUR; _m = addM(_m, 1)) MONTHS.push(_m);
  var DEADLINE = '2026-10-10';

  var CLOCK = Date.UTC(2026, 9, 1, 0, 12);          // 2026-10-01 09:12 KST
  function now() { return CLOCK; }
  function tick(min) { CLOCK += (min || 3) * 60000; return CLOCK; }
  function fmtTime(t, withDate) {
    var d = new Date(t + 9 * 3600000);
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    var s = p(d.getUTCHours()) + ':' + p(d.getUTCMinutes());
    if (withDate === false) return s;
    return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()) + ' ' + s;
  }
  function atDay(y, m, d, hh, mm) { return Date.UTC(y, m - 1, d, (hh || 9) - 9, mm || 0); }

  /* ------------------------------------------------------------ 기준정보 */
  var PRODUCTS = [
    { code: 'P01', name: '보통 포틀랜드 시멘트', short: '보통(1종)' },
    { code: 'P02', name: '조강 포틀랜드 시멘트', short: '조강(3종)' },
    { code: 'P03', name: '중용열 포틀랜드 시멘트', short: '중용열(2종)' },
    { code: 'P04', name: '저열 포틀랜드 시멘트', short: '저열(4종)' },
    { code: 'P05', name: '내황산염 포틀랜드 시멘트', short: '내황산염(5종)' },
    { code: 'P06', name: '고로 슬래그 시멘트', short: '슬래그' },
    { code: 'P07', name: '플라이애시 시멘트', short: '플라이애시' },
    { code: 'P08', name: '백색 포틀랜드 시멘트', short: '백색' },
    { code: 'P09', name: '클링커', short: '클링커' },
    { code: 'P10', name: '기타 혼합 시멘트', short: '기타 혼합' }
  ];
  var PMAP = {}; PRODUCTS.forEach(function (p) { PMAP[p.code] = p; });

  var REGIONS = GEO.regions.map(function (r) { return { code: r.code, name: r.name, lx: r.lx, ly: r.ly }; });
  var RMAP = {}; REGIONS.forEach(function (r) { RMAP[r.code] = r; });
  var DMAP = {};
  Object.keys(GEO.districts).forEach(function (rc) {
    GEO.districts[rc].forEach(function (d) { DMAP[d.code] = { code: d.code, name: d.name, region: rc }; });
    DMAP[rc + '000'] = { code: rc + '000', name: '시·군·구 미상', region: rc, unknown: true };
  });
  function districtCode(rc, name) {
    var l = GEO.districts[rc];
    for (var i = 0; i < l.length; i++) if (l[i].name === name) return l[i].code;
    throw new Error('district ' + rc + ' ' + name);
  }
  var DEMAND = { '11': 1.6, '26': .62, '27': .42, '28': .72, '29': .26, '30': .3, '31': .26, '36': .16,
    '41': 2.5, '51': .42, '43': .42, '44': .62, '52': .36, '46': .46, '47': .6, '48': .72, '50': .13 };

  var MEMBERS = [
    { id: 'm01', name: '가온시멘트', ceo: '가상', since: '1986' },
    { id: 'm02', name: '나린양회', since: '1991' },
    { id: 'm03', name: '다올시멘트', since: '1979' },
    { id: 'm04', name: '라온산업', since: '1994' },
    { id: 'm05', name: '미르시멘트', since: '1988' },
    { id: 'm06', name: '별솔양회', since: '2003' },
    { id: 'm07', name: '새봄시멘트', since: '1983' },
    { id: 'm08', name: '아라시멘트', since: '1996' },
    { id: 'm09', name: '자람산업', since: '2001' },
    { id: 'm10', name: '하늘양회', since: '1998' },
    { id: 'm11', name: '(구) 동진양회', since: '1990', inactive: true, mergedInto: 'm04', mergedAt: '2023-01' }
  ];
  var MMAP = {}; MEMBERS.forEach(function (m) { MMAP[m.id] = m; });
  var ACTIVE = MEMBERS.filter(function (m) { return !m.inactive; });

  /* 공장: [id, 회원사, 이름, 시도, 시군구, 경도, 위도, 월 생산능력(톤), 품목, 수출 비중, 비고] */
  var FDEF = [
    ['F01', 'm01', '동해공장', '51', '동해시', 129.11, 37.52, 210000, ['P01', 'P02', 'P06', 'P09'], .14],
    ['F02', 'm01', '삼척공장', '51', '삼척시', 129.17, 37.44, 160000, ['P01', 'P03', 'P04', 'P09'], .10],
    ['F03', 'm01', '인천분쇄공장', '28', '서구', 126.66, 37.53, 70000, ['P01', 'P06'], 0],
    ['F04', 'm01', '군산출하기지', '52', '군산시', 126.72, 35.98, 40000, ['P01'], 0],
    ['F05', 'm02', '단양공장', '43', '단양군', 128.37, 36.98, 190000, ['P01', 'P02', 'P03', 'P09'], .05],
    ['F06', 'm02', '제천공장', '43', '제천시', 128.19, 37.13, 120000, ['P01', 'P06', 'P07'], 0],
    ['F07', 'm02', '부산분쇄공장', '26', '사하구', 128.97, 35.10, 60000, ['P01', 'P06'], .2],
    ['F08', 'm03', '영월공장', '51', '영월군', 128.46, 37.18, 170000, ['P01', 'P02', 'P09'], .04],
    ['F09', 'm03', '평택분쇄공장', '41', '평택시', 126.99, 36.99, 80000, ['P01', 'P06', 'P07'], 0],
    ['F10', 'm03', '광양슬래그공장', '46', '광양시', 127.70, 34.94, 75000, ['P06', 'P10'], .08],
    ['F11', 'm04', '강릉공장', '51', '강릉시', 128.88, 37.75, 150000, ['P01', 'P02', 'P05', 'P09'], .12],
    ['F12', 'm04', '포항공장', '47', '포항시', 129.36, 36.02, 95000, ['P01', 'P06', 'P10'], .06],
    ['F13', 'm04', '당진분쇄공장', '44', '당진시', 126.64, 36.89, 70000, ['P01', 'P06', 'P07'], 0],
    ['F14', 'm05', '매포공장', '43', '단양군', 128.33, 37.02, 130000, ['P01', 'P03', 'P09'], .03],
    ['F15', 'm05', '대구출하기지', '27', '달성군', 128.43, 35.77, 45000, ['P01', 'P08'], 0],
    ['F16', 'm05', '울산분쇄공장', '31', '울주군', 129.24, 35.52, 55000, ['P01', 'P06'], .15],
    ['F17', 'm06', '당진공장', '44', '당진시', 126.62, 36.95, 90000, ['P06', 'P07', 'P10'], 0],
    ['F18', 'm06', '군산공장', '52', '군산시', 126.66, 35.94, 60000, ['P01', 'P06'], 0],
    ['F19', 'm06', '목포출하기지', '46', '목포시', 126.39, 34.81, 35000, ['P01'], 0],
    ['F20', 'm07', '북평공장', '51', '동해시', 129.08, 37.48, 140000, ['P01', 'P02', 'P04', 'P09'], .18],
    ['F21', 'm07', '여수공장', '46', '여수시', 127.66, 34.76, 70000, ['P01', 'P06'], .10],
    ['F22', 'm07', '김해출하기지', '48', '김해시', 128.88, 35.23, 40000, ['P01'], 0],
    ['F23', 'm08', '송학공장', '43', '제천시', 128.24, 37.17, 115000, ['P01', 'P03', 'P09'], .02],
    ['F24', 'm08', '청주출하기지', '43', '청주시', 127.49, 36.64, 45000, ['P01', 'P08'], 0],
    ['F25', 'm08', '대전출하기지', '30', '대덕구', 127.42, 36.38, 35000, ['P01'], 0],
    ['F26', 'm09', '장성공장', '46', '장성군', 126.78, 35.30, 80000, ['P01', 'P05', 'P09'], 0],
    ['F27', 'm09', '광주출하기지', '29', '광산구', 126.79, 35.14, 35000, ['P01'], 0],
    ['F28', 'm09', '장성2공장', '46', '장성군', 126.82, 35.34, 30000, ['P01', 'P10'], 0, '2025-06'],
    ['F29', 'm10', '원덕공장', '51', '삼척시', 129.30, 37.17, 100000, ['P01', 'P09'], .2],
    ['F30', 'm10', '평택분쇄공장', '41', '평택시', 126.88, 37.00, 65000, ['P01', 'P06'], 0]
  ];
  var FACTORIES = FDEF.map(function (a) {
    var xy = GEO.proj(a[5], a[6]);
    return { id: a[0], member: a[1], name: a[2], region: a[3], district: districtCode(a[3], a[4]),
      districtName: a[4], lon: a[5], lat: a[6], x: xy[0], y: xy[1], cap: a[7], products: a[8],
      exp: a[9], closed: a[10] || null,
      owner: a[0] === 'F12' ? [{ member: 'm11', from: FIRST, to: '2022-12' }, { member: 'm04', from: '2023-01', to: null }]
        : [{ member: a[1], from: FIRST, to: null }] };
  });
  var FMAP = {}; FACTORIES.forEach(function (f) { FMAP[f.id] = f; });
  function ownerOf(fid, m) {
    var o = FMAP[fid].owner;
    for (var i = 0; i < o.length; i++) if (m >= o[i].from && (!o[i].to || m <= o[i].to)) return o[i].member;
    return null;
  }
  function factoriesOf(mid, m) {
    return FACTORIES.filter(function (f) {
      return ownerOf(f.id, m || CUR) === mid && (!f.closed || (m || CUR) <= f.closed);
    });
  }
  var HISTORY = [
    { at: '2023-01-01', type: '합병', target: '(구) 동진양회 → 라온산업', detail: '포항공장(F12) 승계. 2022년 12월 이전 통계는 (구) 동진양회로 집계', by: '협회 관리자' },
    { at: '2025-06-30', type: '폐쇄', target: '자람산업 장성2공장(F28)', detail: '2025년 6월 자료까지 제출. 과거 통계는 그대로 조회', by: '협회 관리자' },
    { at: '2024-03-15', type: '코드 개정', target: '품목 P10 기타 혼합 시멘트', detail: '구 코드 C10·C11 통합 (이관 시 매핑)', by: '협회 관리자' }
  ];

  /* ---------------------------------------------- 지역별 출하 배분 프로파일 */
  var RW = {};   // RW[fid] = [[regionCode, weight], ...]
  FACTORIES.forEach(function (f) {
    var ws = REGIONS.map(function (r) {
      var dx = r.lx - f.x, dy = r.ly - f.y, dist = Math.sqrt(dx * dx + dy * dy);
      return [r.code, DEMAND[r.code] * Math.exp(-dist / 105) * (0.85 + 0.3 * h01(f.id + r.code))];
    }).sort(function (a, b) { return b[1] - a[1]; });
    var tot = ws.reduce(function (s, w) { return s + w[1]; }, 0), acc = 0, keep = [];
    for (var i = 0; i < ws.length && keep.length < 7; i++) {
      keep.push(ws[i]); acc += ws[i][1];
      if (acc / tot > .9 && keep.length >= 4) break;
    }
    RW[f.id] = keep;
  });
  /* 제주는 남해안 2개 회원사만, 세종은 중부권 4개 회원사가 출하한다 (소수 지역 보호 시연) */
  [['F21', .05], ['F19', .06]].forEach(function (a) { RW[a[0]].push(['50', a[1]]); });
  [['F25', .08], ['F05', .02], ['F17', .03], ['F13', .03]].forEach(function (a) { RW[a[0]].push(['36', a[1]]); });
  /* 시·군·구 배분 — 공장·시도별로 고정된 출하처 분포 */
  var DW = {};
  function districtWeights(fid, rc) {
    var k = fid + rc;
    if (DW[k]) return DW[k];
    var ds = GEO.districts[rc].map(function (d) { return [d.code, 0.25 + h01(fid + d.code)]; })
      .sort(function (a, b) { return b[1] - a[1]; });
    var n = Math.min(ds.length, 2 + hash(k) % 7);
    var f = FMAP[fid];
    if (f.region === rc && ds.every(function (d) { return d[0] !== f.district; }) === false) { /* 자기 시군구 포함 */ }
    DW[k] = ds.slice(0, n);
    return DW[k];
  }
  function splitRegions(fid, d) {
    var w = RW[fid], amt = split(d, w.map(function (x) { return x[1]; })), dm = {};
    w.forEach(function (x, i) {
      if (!amt[i]) return;
      var dw = districtWeights(fid, x[0]), da = split(amt[i], dw.map(function (y) { return y[1]; }));
      dw.forEach(function (y, j) { if (da[j]) dm[y[0]] = da[j]; });
    });
    return dm;
  }

  /* ------------------------------------------------------------ 시계열 생성 */
  var SEASON = [.76, .80, 1.02, 1.09, 1.11, 1.01, .89, .92, 1.03, 1.10, 1.06, .93];
  var PSHARE = { P01: 1, P02: .22, P03: .2, P04: .1, P05: .12, P06: .55, P07: .35, P08: .06, P09: .3, P10: .25 };
  var BASE = {};       // BASE[ym] = [rec...]  — 발행 v1 의 원본 (기준 데이터)
  (function generate() {
    MONTHS.forEach(function (m) { BASE[m] = []; });
    FACTORIES.forEach(function (f) {
      var shares = f.products.map(function (p) { return PSHARE[p]; });
      var sw = shares.reduce(function (a, b) { return a + b; }, 0);
      f.products.forEach(function (p, pi) {
        var rnd = prng(hash(f.id + p)), b = null;
        var base = f.cap * 0.82 * shares[pi] / sw;
        MONTHS.forEach(function (m, mi) {
          if (f.closed && m > f.closed) return;
          var y = +m.slice(0, 4), mo = +m.slice(5, 7);
          var trend = 1 - 0.027 * (y - 2021) - 0.002 * mo;
          var noise = 0.965 + rnd() * 0.07;
          var dem = base * SEASON[mo - 1] * trend * noise;
          var xr = (p === 'P01' || p === 'P09' || p === 'P02') ? f.exp * (0.9 + rnd() * 0.2) : 0;
          var x = Math.round(dem * xr), d = Math.round(dem - x);
          if (b === null) b = Math.round(dem * 0.45);
          var e = Math.round(dem * (0.44 + rnd() * 0.04));
          var pr = d + x + e - b;
          if (pr < 0) { pr = 0; e = b - d - x; if (e < 0) { d += e; e = 0; } }
          BASE[m].push({ f: f.id, p: p, b: b, pr: pr, d: d, x: x, e: e });
          b = e;
        });
      });
    });
  })();
  var DMCACHE = {};
  function dmOf(rec, m) {
    if (rec.dm) return rec.dm;
    var k = m + rec.f + rec.p + ':' + rec.d;
    if (!DMCACHE[k]) DMCACHE[k] = splitRegions(rec.f, rec.d);
    return DMCACHE[k];
  }

  /* --------------------------------------------- 발행 버전 · 정정 (스냅샷) */
  var PUB = {};    // PUB[ym] = [{v, at, by, note, changes:[{f,p,field,old,new}]}]
  MONTHS.forEach(function (m) {
    if (m === CUR) return;
    var nx = addM(m, 1);
    PUB[m] = [{ v: 1, at: atDay(+nx.slice(0, 4), +nx.slice(5, 7), 12, 17, 30), by: '협회 관리자', note: '정기 마감 발행', changes: [] }];
  });
  /* 2026-07: 마감 후 정정 1건 승인 (v2) — 기존 v1 보존 */
  (function seedCorrection() {
    var r = BASE['2026-07'].filter(function (x) { return x.f === 'F17' && x.p === 'P06'; })[0];
    PUB['2026-07'].push({ v: 2, at: atDay(2026, 8, 21, 14, 5), by: '한지윤 (협회)', note: '당진공장 슬래그 시멘트 생산량 계량 오류 정정 — 회원사 요청 C-0007 승인',
      changes: [{ f: 'F17', p: 'P06', field: 'pr', old: r.pr, new: r.pr + 1240 }, { f: 'F17', p: 'P06', field: 'e', old: r.e, new: r.e + 1240 }], req: 'C-0007' });
    /* 정정은 8월 마감(9/12) 전에 승인되었으므로 8월 기초재고는 정정된 7월 기말을 이어받아 발행되었다 */
    var a = BASE['2026-08'].filter(function (x) { return x.f === 'F17' && x.p === 'P06'; })[0];
    a.b += 1240; a.e += 1240;
  })();
  var RECCACHE = {};
  function latestV(m) { return PUB[m] ? PUB[m][PUB[m].length - 1].v : 0; }
  function recsOf(m, v) {
    if (!PUB[m]) return [];
    v = v || latestV(m);
    var k = m + '@' + v;
    if (RECCACHE[k]) return RECCACHE[k];
    var list = BASE[m].map(function (r) { return { f: r.f, p: r.p, b: r.b, pr: r.pr, d: r.d, x: r.x, e: r.e, dm: r.dm }; });
    PUB[m].forEach(function (ver) {
      if (ver.v > v || !ver.changes) return;
      ver.changes.forEach(function (c) {
        list.forEach(function (r) { if (r.f === c.f && r.p === c.p) r[c.field] = c.new; });
      });
    });
    RECCACHE[k] = list;
    return list;
  }

  /* 검증 상수 (급변 기준은 협회 설정값) */
  var FIELDS = { b: '기초재고', pr: '생산', d: '내수 출하', x: '수출 출하', e: '기말재고' };
  var SWING = { mom: 0.30, yoy: 0.40, minAbs: 800 };

  /* ------------------------------------------------ 당월 제출 (상태 머신) */
  var STATES = ['작성 중', '제출', '보완 요청', '확정', '마감'];
  var TRANS = { '작성 중': ['제출'], '제출': ['보완 요청', '확정'], '보완 요청': ['작성 중'], '확정': ['마감'], '마감': [] };
  var TRANS_ROLE = { '제출': 'member', '작성 중': 'member', '보완 요청': 'assoc', '확정': 'assoc', '마감': 'assoc' };
  var SUB = {};    // SUB[ym][mid] = { state, rows:{key:row}, history:[], warnAck:{}, assocAck:{}, note }
  function rowKey(f, p) { return f + '|' + p; }
  function prevE(fid, p, m) {
    var pm = addM(m, -1), l = recsOf(pm);
    for (var i = 0; i < l.length; i++) if (l[i].f === fid && l[i].p === p) return l[i].e;
    return 0;
  }
  function emptyRow(fid, p, m) { return { f: fid, p: p, b: prevE(fid, p, m), pr: null, d: null, x: null, e: null, dm: {} }; }
  function trueRow(fid, p, m) {
    var r = BASE[m].filter(function (x) { return x.f === fid && x.p === p; })[0];
    var row = { f: fid, p: p, b: prevE(fid, p, m), pr: r.pr, d: r.d, x: r.x, e: r.e, dm: clone(dmOf(r, m)) };
    /* 기초재고가 정정 이월로 달라졌다면 생산으로 흡수해 재고 수지를 맞춘다 */
    row.pr = row.d + row.x + row.e - row.b; if (row.pr < 0) { row.e -= row.pr; row.pr = 0; }
    return row;
  }
  (function seedCurrent() {
    SUB[CUR] = {};
    var plan = { m01: '확정', m02: '확정', m03: '보완 요청', m04: '작성 중', m05: '제출', m06: '제출', m07: '확정', m08: '제출', m09: '작성 중', m10: '확정' };
    ACTIVE.forEach(function (mem, i) {
      var st = plan[mem.id], rows = {};
      factoriesOf(mem.id, CUR).forEach(function (f) {
        f.products.forEach(function (p) {
          var k = rowKey(f.id, p);
          if (mem.id === 'm09') { rows[k] = emptyRow(f.id, p, CUR); return; }
          rows[k] = trueRow(f.id, p, CUR);
          if (mem.id === 'm04') {
            /* 시연 회원사: 강릉공장은 입력 완료, 포항공장 일부, 당진공장 미입력 */
            if (f.id === 'F13') rows[k] = emptyRow(f.id, p, CUR);
            if (f.id === 'F12' && p !== 'P01') { rows[k].pr = null; rows[k].e = null; rows[k].dm = {}; rows[k].d = null; rows[k].x = null; }
          }
        });
      });
      var t0 = atDay(2026, 10, 1, 8, 0) - (10 - i) * 3600000 * 5;
      var hist = [{ at: atDay(2026, 9, 25, 9, 0) + i * 900000, from: null, to: '작성 중', by: '시스템', note: '2026년 9월 자료 입력 개시' }];
      if (st !== '작성 중') hist.push({ at: t0, from: '작성 중', to: '제출', by: mem.name + ' 담당자', note: '' });
      if (st === '보완 요청') hist.push({ at: t0 + 5400000, from: '제출', to: '보완 요청', by: '한지윤 (협회)', note: '영월공장 클링커 수출 출하가 전년 동월 대비 크게 늘었습니다. 선적 기준월 확인 부탁드립니다.' });
      if (st === '확정') hist.push({ at: t0 + 7200000, from: '제출', to: '확정', by: '한지윤 (협회)', note: '' });
      SUB[CUR][mem.id] = { state: st, rows: rows, history: hist, warnAck: {}, assocAck: {}, savedAt: t0 - 3600000 };
    });
    /* 급변 시연 데이터 — 미르시멘트 매포공장 중용열 생산 급증 (제출 상태, 협회 확인 전) */
    var r5 = SUB[CUR].m05.rows[rowKey('F14', 'P03')];
    r5.pr += Math.round(r5.pr * 0.52); r5.e = r5.b + r5.pr - r5.d - r5.x;
    SUB[CUR].m05.warnAck[rowKey('F14', 'P03') + '|pr'] = '신규 댐 공사 수주로 중용열 시멘트 증산 (9월 2주차부터)';
    /* 다올시멘트 — 보완 요청 원인 데이터 */
    var r3 = SUB[CUR].m03.rows[rowKey('F08', 'P09')];
    if (r3) { var add = Math.round((r3.x || 3000) * 1.7 + 2500); r3.x += add; r3.pr += add; }
    /* 아라시멘트 — 경고에 회원사 사유 입력, 협회 확인 전 */
    var r8 = SUB[CUR].m08.rows[rowKey('F24', 'P08')];
    if (r8) { var bump = Math.round(r8.d * 0.6) + 300; r8.d += bump; r8.pr += bump;
      var dk = Object.keys(r8.dm)[0]; r8.dm[dk] += bump;
      SUB[CUR].m08.warnAck[rowKey('F24', 'P08') + '|d'] = '타일 접착제 제조사 신규 거래 개시'; }
    /* 시드 상태에 맞춰 자연 발생 경고에 사유·확인을 채운다 (확정 = 회원사 사유 + 협회 확인, 제출 = 회원사 사유) */
    var REASONS = ['성수기 진입에 따른 출하 증가', '킬른 정기 보수 완료 후 정상 가동', '전월 설비 점검으로 감산했던 물량 회복', '수출 선적 일정 변경', '대형 현장 납품 개시'];
    ACTIVE.forEach(function (mem) {
      var S = SUB[CUR][mem.id];
      if (S.state === '작성 중') return;
      validate(mem.id, CUR, 'submit').filter(function (w) { return w.lv === 'warn'; }).forEach(function (w, j) {
        var k = w.key + '|' + w.field;
        if (!S.warnAck[k]) S.warnAck[k] = REASONS[(hash(k) + j) % REASONS.length];
        if (S.state === '확정') S.assocAck[k] = '한지윤 · 확인';
      });
    });
  })();

  /* ------------------------------------------------------------ 계정·권한 */
  var PERMS = [
    { code: 'STAT_VIEW', name: '통계 조회', grp: '공통' },
    { code: 'DATA_INPUT', name: '자료 입력', grp: '회원사' },
    { code: 'DATA_EDIT', name: '자료 수정', grp: '회원사' },
    { code: 'DATA_SUBMIT', name: '자료 제출', grp: '회원사' },
    { code: 'STAFF_GRANT', name: '직원 권한 부여', grp: '회원사' },
    { code: 'CORR_REQUEST', name: '마감 후 정정 요청', grp: '회원사' },
    { code: 'REVIEW', name: '검증 결과 확인·보완 요청', grp: '협회' },
    { code: 'CONFIRM', name: '확정·마감', grp: '협회' },
    { code: 'CORR_APPROVE', name: '정정 승인', grp: '협회' },
    { code: 'REPORT', name: '보고서·맞춤 보고서', grp: '협회' },
    { code: 'MASTER', name: '기준정보 관리', grp: '협회' },
    { code: 'USER_ADMIN', name: '사용자·권한 관리', grp: '협회' },
    { code: 'COLLECT', name: '외부 수집 검수·반영', grp: '협회' },
    { code: 'AUDIT', name: '감사 로그 조회', grp: '협회' }
  ];
  var ROLES = [
    { code: 'ASSOC_ADMIN', name: '협회 관리자', side: 'assoc', perms: ['STAT_VIEW', 'REVIEW', 'CONFIRM', 'CORR_APPROVE', 'REPORT', 'MASTER', 'USER_ADMIN', 'COLLECT', 'AUDIT'] },
    { code: 'ASSOC_STAFF', name: '협회 통계 담당', side: 'assoc', perms: ['STAT_VIEW', 'REVIEW', 'REPORT', 'COLLECT'] },
    { code: 'MEM_ADMIN', name: '회원사 관리자', side: 'member', perms: ['STAT_VIEW', 'DATA_INPUT', 'DATA_EDIT', 'DATA_SUBMIT', 'STAFF_GRANT', 'CORR_REQUEST'] },
    { code: 'MEM_STAFF', name: '회원사 직원', side: 'member', perms: [], grantable: ['STAT_VIEW', 'DATA_INPUT', 'DATA_EDIT', 'DATA_SUBMIT'] }
  ];
  var ROLEMAP = {}; ROLES.forEach(function (r) { ROLEMAP[r.code] = r; });
  var USERS = [
    { id: 'u-a1', name: '한지윤', org: 'assoc', role: 'ASSOC_ADMIN', dept: '통계팀 팀장', email: 'jiyun.han@assoc.example', last: atDay(2026, 10, 1, 8, 41) },
    { id: 'u-a2', name: '서민재', org: 'assoc', role: 'ASSOC_STAFF', dept: '통계팀', email: 'minjae.seo@assoc.example', last: atDay(2026, 9, 30, 17, 2) },
    { id: 'u-m04a', name: '김태오', org: 'm04', role: 'MEM_ADMIN', dept: '영업관리팀', email: 'taeo.kim@raon.example', last: atDay(2026, 9, 30, 16, 20) },
    { id: 'u-m04s1', name: '이수아', org: 'm04', role: 'MEM_STAFF', grants: ['STAT_VIEW', 'DATA_INPUT', 'DATA_EDIT'], dept: '강릉공장 생산관리', email: 'sua.lee@raon.example', last: atDay(2026, 9, 29, 11, 5) },
    { id: 'u-m04s2', name: '박도현', org: 'm04', role: 'MEM_STAFF', grants: ['STAT_VIEW'], dept: '경영기획팀', email: 'dohyun.park@raon.example', last: atDay(2026, 9, 18, 10, 12) }
  ];
  var MNAMES = ['최윤서', '정하람', '윤도경', null, '강민호', '조은별', '임재현', '신가윤', '오태린', '배준서'];
  ACTIVE.forEach(function (m, i) {
    if (m.id === 'm04') return;
    USERS.push({ id: 'u-' + m.id + 'a', name: MNAMES[i], org: m.id, role: 'MEM_ADMIN', dept: '통계 담당', email: 'stat@' + m.id + '.example', last: atDay(2026, 9, 28 + (i % 3), 9 + i % 7, 10) });
  });
  var UMAP = {}; USERS.forEach(function (u) { UMAP[u.id] = u; });
  function permsOf(u) {
    var r = ROLEMAP[u.role];
    return r.code === 'MEM_STAFF' ? (u.grants || []) : r.perms;
  }

  /* ------------------------------------------------------------ 세션 · 감사 */
  var SESSION = { user: null };
  var AUDIT = [], NOTI = [], auditSeq = 0;
  function actor() {
    var u = SESSION.user; if (!u) return { name: '시스템', org: '-', role: '-' };
    return { name: u.name, org: u.org === 'assoc' ? '협회' : MMAP[u.org].name, role: ROLEMAP[u.role].name, uid: u.id };
  }
  function audit(action, target, result, detail, at) {
    var a = actor();
    AUDIT.unshift({ id: 'A' + (10000 + (++auditSeq)), at: at || tick(1), who: a.name, org: a.org, role: a.role,
      action: action, target: target, result: result || '허용', detail: detail || '', ip: a.org === '협회' ? '10.20.1.14' : '211.36.' + (40 + auditSeq % 9) + '.' + (10 + auditSeq % 80) });
  }
  function notify(type, to, subject, body, at) {
    NOTI.unshift({ id: 'N' + (5000 + NOTI.length + 1), at: at || now(), type: type, to: to, subject: subject, body: body || '', status: '체험 기록' });
  }
  /* 감사 로그 · 알림 기초 데이터 */
  (function seedLogs() {
    var save = SESSION.user;
    var seed = [
      ['u-a1', '로그인', '협회 관리자 웹', '허용', '', atDay(2026, 10, 1, 8, 41)],
      ['u-m04a', '자료 임시저장', '2026년 9월 · 강릉공장', '허용', '12개 행', atDay(2026, 9, 30, 16, 32)],
      ['u-m01a', '타사 자료 API 호출', 'GET /api/members/m02/records?ym=2026-08', '차단', '세션 회원사(m01) ≠ 요청 대상(m02) — HTTP 403', atDay(2026, 9, 30, 14, 2)],
      ['u-a2', 'CSV 내려받기', '시멘트 수급 실적 월보 · 2026년 8월 v1', '허용', '3,600행', atDay(2026, 9, 30, 11, 26)],
      ['u-a1', '권한 변경', '이수아 (라온산업)', '허용', '회원사 관리자가 부여: 조회·입력·수정', atDay(2026, 9, 29, 10, 4)],
      ['u-a1', '정정 승인', '2026년 7월 · 별솔양회 당진공장', '허용', 'v1 보존 → v2 발행', atDay(2026, 8, 21, 14, 5)],
      ['u-m05a', '자료 제출', '2026년 9월', '허용', '경고 1건 사유 입력', atDay(2026, 9, 30, 15, 40)]
    ];
    seed.forEach(function (s) { SESSION.user = UMAP[s[0]]; audit(s[1], s[2], s[3], s[4], s[5]); });
    SESSION.user = save;
    notify('마감 임박(제출 요청)', '자람산업 통계 담당', '[시멘트 통계] 2026년 9월 자료 제출 요청 (마감 10월 10일)', '아직 제출되지 않았습니다.', atDay(2026, 9, 30, 9, 0));
    notify('보완 요청', '다올시멘트 통계 담당', '[시멘트 통계] 2026년 9월 자료 보완 요청', SUB[CUR].m03.history[2].note, SUB[CUR].m03.history[2].at);
    notify('제출 완료', '협회 통계팀', '[시멘트 통계] 미르시멘트 2026년 9월 자료 제출', '', atDay(2026, 9, 30, 15, 40));
    notify('제출 완료', '협회 통계팀', '[시멘트 통계] 별솔양회 2026년 9월 자료 제출', '', atDay(2026, 9, 30, 13, 2));
    notify('수집 실패', '협회 통계팀', '[시멘트 통계] 외부 데이터 9월분 수집 실패 — 응답 형식 변경 감지', '수동 재수집 후 검수 필요', atDay(2026, 9, 3, 6, 4));
  })();

  /* ------------------------------------------------------------ 오류 */
  function ApiError(status, code, msg) { this.status = status; this.code = code; this.message = msg; }

  /* ------------------------------------------------------------ 검증 */
  function refVal(fid, p, m, field) {
    var l = recsOf(m); for (var i = 0; i < l.length; i++) if (l[i].f === fid && l[i].p === p) return l[i][field];
    return null;
  }
  function regionSums(dm) {
    var s = {}; Object.keys(dm || {}).forEach(function (k) { var r = k.slice(0, 2); s[r] = (s[r] || 0) + (+dm[k] || 0); });
    return s;
  }
  function dmTotal(dm) { var t = 0; Object.keys(dm || {}).forEach(function (k) { t += (+dm[k] || 0); }); return t; }
  /* stage: 'input' | 'submit' */
  function validate(mid, m, stage) {
    var S = SUB[m][mid], out = [];
    Object.keys(S.rows).forEach(function (k) {
      var r = S.rows[k], F = FMAP[r.f], tag = F.name + ' · ' + PMAP[r.p].short;
      ['pr', 'd', 'x', 'e'].forEach(function (fl) {
        var v = r[fl];
        if (v === null || v === '' || v === undefined) { out.push({ lv: 'error', code: 'E01', key: k, field: fl, at: 'input', msg: tag + ' — ' + FIELDS[fl] + ' 필수값 누락' }); return; }
        if (isNaN(v) || Math.floor(v) !== +v) { out.push({ lv: 'error', code: 'E03', key: k, field: fl, at: 'input', msg: tag + ' — ' + FIELDS[fl] + ' 정수(톤)만 입력' }); return; }
        if (v < 0) { out.push({ lv: 'error', code: 'E02', key: k, field: fl, at: 'input', msg: tag + ' — ' + FIELDS[fl] + ' 음수 불가' }); return; }
        if (fl === 'e') return;
        var pm = refVal(r.f, r.p, addM(m, -1), fl), py = refVal(r.f, r.p, addM(m, -12), fl);
        if (pm && Math.abs(v - pm) > SWING.minAbs && Math.abs(v - pm) / pm > SWING.mom)
          out.push({ lv: 'warn', code: 'W01', key: k, field: fl, at: 'input', ref: pm, rate: (v - pm) / pm, msg: tag + ' — ' + FIELDS[fl] + ' 전월 대비 ' + pct((v - pm) / pm) });
        else if (py && Math.abs(v - py) > SWING.minAbs && Math.abs(v - py) / py > SWING.yoy)
          out.push({ lv: 'warn', code: 'W02', key: k, field: fl, at: 'input', ref: py, rate: (v - py) / py, msg: tag + ' — ' + FIELDS[fl] + ' 전년 동월 대비 ' + pct((v - py) / py) });
      });
      if (stage === 'submit') {
        var ok = ['pr', 'd', 'x', 'e'].every(function (fl) { return r[fl] !== null && r[fl] !== '' && !isNaN(r[fl]); });
        if (ok) {
          var calc = (+r.b) + (+r.pr) - (+r.d) - (+r.x);
          if (calc !== +r.e) out.push({ lv: 'error', code: 'E10', key: k, field: 'e', at: 'submit', calc: calc, msg: tag + ' — 재고 수지 불일치: 기초 ' + n(r.b) + ' + 생산 ' + n(r.pr) + ' − 출하 ' + n(+r.d + +r.x) + ' = ' + n(calc) + ' ≠ 기말 ' + n(r.e) });
          var dt = dmTotal(r.dm);
          if (dt !== +r.d) out.push({ lv: 'error', code: 'E11', key: k, field: 'd', at: 'submit', calc: dt, msg: tag + ' — 지역별 출하 합계 ' + n(dt) + ' ≠ 내수 출하 총괄 ' + n(r.d) });
        }
        var pe = prevE(r.f, r.p, m);
        if (+r.b !== pe) out.push({ lv: 'error', code: 'E12', key: k, field: 'b', at: 'submit', msg: tag + ' — 기초재고 ' + n(r.b) + ' ≠ 전월 확정 기말재고 ' + n(pe) });
      }
    });
    return out;
  }
  function n(v) { return v === null || v === undefined || v === '' ? '—' : Number(v).toLocaleString('ko-KR'); }
  function pct(r) { return (r >= 0 ? '+' : '') + (r * 100).toFixed(1) + '%'; }

  /* ------------------------------------------------------- 제출 상태 전이 */
  function can(perm) { var u = SESSION.user; return !!u && permsOf(u).indexOf(perm) >= 0; }
  function side() { var u = SESSION.user; return u ? ROLEMAP[u.role].side : null; }
  function transition(m, mid, to, note) {
    var S = SUB[m][mid], from = S.state, label = MMAP[mid].name + ' · ' + ymLabel(m);
    var allowed = TRANS[from].indexOf(to) >= 0;
    var need = TRANS_ROLE[to];
    if (!allowed) {
      audit('단계 전이 시도', label + ' · ' + from + ' → ' + to, '차단', '허용되지 않은 처리 순서 — HTTP 409');
      throw new ApiError(409, 'INVALID_TRANSITION', '「' + from + '」에서 「' + to + '」(으)로 바로 이동할 수 없습니다. 허용: ' + (TRANS[from].join(', ') || '없음'));
    }
    if (side() !== need) {
      audit('단계 전이 시도', label + ' · ' + from + ' → ' + to, '차단', '역할 불일치 — HTTP 403');
      throw new ApiError(403, 'FORBIDDEN', '이 단계는 ' + (need === 'assoc' ? '협회' : '회원사') + '만 처리할 수 있습니다.');
    }
    var needPerm = { '확정': 'CONFIRM', '마감': 'CONFIRM', '보완 요청': 'REVIEW' }[to];
    if (needPerm && !can(needPerm)) {
      audit('단계 전이 시도', label + ' · ' + from + ' → ' + to, '차단', '권한 없음 (' + needPerm + ') — HTTP 403');
      throw new ApiError(403, 'NO_PERMISSION', '「' + to + '」 처리 권한이 없습니다 (' + needPerm + ').');
    }
    if (side() === 'member' && SESSION.user.org !== mid) {
      audit('단계 전이 시도', label, '차단', '타 회원사 — HTTP 403');
      throw new ApiError(403, 'FORBIDDEN', '다른 회원사의 자료입니다.');
    }
    if (to === '제출') {
      if (!can('DATA_SUBMIT')) { audit('자료 제출', label, '차단', '제출 권한 없음'); throw new ApiError(403, 'NO_PERMISSION', '제출 권한이 없습니다. 회원사 관리자에게 「제출」 권한을 요청하세요.'); }
      var iss = validate(mid, m, 'submit');
      var errs = iss.filter(function (x) { return x.lv === 'error'; });
      if (errs.length) { audit('자료 제출', label, '차단', '필수 검증 실패 ' + errs.length + '건'); throw new ApiError(422, 'VALIDATION', '필수 검증을 통과하지 못해 제출할 수 없습니다 (' + errs.length + '건).'); }
      var warns = iss.filter(function (x) { return x.lv === 'warn'; });
      var miss = warns.filter(function (w) { return !S.warnAck[w.key + '|' + w.field]; });
      if (miss.length) throw new ApiError(428, 'WARN_REASON', '급변 경고 ' + miss.length + '건에 사유를 입력해 주세요. 경고는 제출을 막지 않지만 협회 확인용 사유가 필요합니다.');
    }
    if (to === '확정') {
      var w2 = validate(mid, m, 'submit').filter(function (x) { return x.lv === 'warn'; });
      var un = w2.filter(function (w) { return !S.assocAck[w.key + '|' + w.field]; });
      if (un.length) throw new ApiError(428, 'ASSOC_ACK', '협회 확인이 필요한 경고 ' + un.length + '건이 남아 있습니다. 「검증 결과·예외 처리」에서 확인 후 확정하세요.');
    }
    if (to === '보완 요청' && !note) throw new ApiError(400, 'NOTE', '보완 요청 사유를 입력하세요.');
    var t = tick(2);
    S.state = to;
    S.history.push({ at: t, from: from, to: to, by: actor().name + ' (' + actor().org + ')', note: note || '' });
    audit(to === '작성 중' ? '보완 수정 시작' : (to === '제출' ? '자료 제출' : to + ' 처리'), label, '허용', note || '');
    if (to === '제출') notify('제출 완료', '협회 통계팀', '[시멘트 통계] ' + MMAP[mid].name + ' ' + ymLabel(m) + ' 자료 제출', '', t);
    if (to === '보완 요청') notify('보완 요청', MMAP[mid].name + ' 통계 담당', '[시멘트 통계] ' + ymLabel(m) + ' 자료 보완 요청', note, t);
    return S;
  }
  function closeMonth(m) {
    if (side() !== 'assoc' || !can('CONFIRM')) throw new ApiError(403, 'FORBIDDEN', '마감 권한이 없습니다.');
    var notYet = ACTIVE.filter(function (x) { return SUB[m][x.id].state !== '확정'; });
    if (notYet.length) {
      audit('월 마감 시도', ymLabel(m), '차단', '미확정 ' + notYet.length + '개사');
      throw new ApiError(409, 'NOT_ALL_CONFIRMED', '확정되지 않은 회원사가 ' + notYet.length + '곳 있습니다: ' + notYet.map(function (x) { return x.name; }).join(', '));
    }
    var t = tick(3);
    BASE[m] = [];
    ACTIVE.forEach(function (mem) {
      var S = SUB[m][mem.id];
      Object.keys(S.rows).forEach(function (k) {
        var r = S.rows[k];
        BASE[m].push({ f: r.f, p: r.p, b: +r.b, pr: +r.pr, d: +r.d, x: +r.x, e: +r.e, dm: clone(r.dm) });
      });
      S.state = '마감';
      S.history.push({ at: t, from: '확정', to: '마감', by: actor().name + ' (협회)', note: '월 마감' });
    });
    PUB[m] = [{ v: 1, at: t, by: actor().name + ' (협회)', note: '정기 마감 발행', changes: [] }];
    Object.keys(RECCACHE).forEach(function (k) { if (k.indexOf(m) === 0) delete RECCACHE[k]; });
    audit('월 마감·발행', ymLabel(m), '허용', '발행 v1 스냅샷 생성');
    return PUB[m][0];
  }

  /* ------------------------------------------------------- 마감 후 정정 */
  var CORR = [
    { id: 'C-0007', ym: '2026-07', member: 'm06', at: atDay(2026, 8, 19, 10, 22), by: '조은별', state: '승인', decidedAt: atDay(2026, 8, 21, 14, 5), decidedBy: '한지윤',
      reason: '당진공장 슬래그 시멘트 출하 계량기 교정 후 생산량 재산정', changes: PUB['2026-07'][1].changes, version: 2 },
    { id: 'C-0006', ym: '2026-05', member: 'm02', at: atDay(2026, 6, 16, 15, 8), by: '정하람', state: '반려', decidedAt: atDay(2026, 6, 18, 11, 30), decidedBy: '한지윤',
      reason: '단양공장 수출 출하 선적일 기준 변경 요청', changes: [], rejectNote: '선적일 기준은 집계 기준서 §4.2 상 B/L 일자로 통일되어 있어 반려합니다.' }
  ];
  function requestCorrection(m, changes, reason) {
    var u = SESSION.user;
    if (side() !== 'member' || !can('CORR_REQUEST')) throw new ApiError(403, 'FORBIDDEN', '정정 요청 권한이 없습니다.');
    if (!PUB[m]) throw new ApiError(409, 'NOT_CLOSED', '마감되지 않은 월은 정정 요청 대상이 아닙니다.');
    if (!reason) throw new ApiError(400, 'NOTE', '정정 사유를 입력하세요.');
    changes.forEach(function (c) { if (ownerOf(c.f, m) !== u.org) throw new ApiError(403, 'FORBIDDEN', '다른 회원사 공장입니다.'); });
    /* 정정 후에도 재고 수지가 맞아야 한다 */
    var cur = recsOf(m), byKey = {};
    changes.forEach(function (c) { byKey[c.f + c.p] = byKey[c.f + c.p] || {}; byKey[c.f + c.p][c.field] = c.new; });
    Object.keys(byKey).forEach(function (k) {
      var r = cur.filter(function (x) { return x.f + x.p === k; })[0], o = byKey[k];
      var pr = o.pr !== undefined ? o.pr : r.pr, x = o.x !== undefined ? o.x : r.x, e = o.e !== undefined ? o.e : r.e;
      if (r.b + pr - r.d - x !== e) throw new ApiError(422, 'BALANCE', FMAP[r.f].name + ' · ' + PMAP[r.p].short + ' — 정정 후 재고 수지 불일치 (기초 + 생산 − 출하 ≠ 기말)');
    });
    var id = 'C-' + String(8 + CORR.length - 2).padStart(4, '0');
    changes.forEach(function (c) { var r = cur.filter(function (x) { return x.f === c.f && x.p === c.p; })[0]; c.old = r[c.field]; });
    var req = { id: id, ym: m, member: u.org, at: tick(2), by: u.name, state: '요청', reason: reason, changes: changes };
    CORR.unshift(req);
    audit('정정 요청', ymLabel(m) + ' · ' + id, '허용', reason);
    notify('정정 요청', '협회 통계팀', '[시멘트 통계] ' + MMAP[u.org].name + ' ' + ymLabel(m) + ' 정정 요청 ' + id, reason);
    return req;
  }
  function decideCorrection(id, approve, note) {
    if (side() !== 'assoc' || !can('CORR_APPROVE')) throw new ApiError(403, 'FORBIDDEN', '정정 승인 권한이 없습니다.');
    var c = CORR.filter(function (x) { return x.id === id; })[0];
    if (c.state !== '요청') throw new ApiError(409, 'DONE', '이미 처리된 요청입니다.');
    c.decidedAt = tick(2); c.decidedBy = actor().name;
    if (!approve) { c.state = '반려'; c.rejectNote = note || '';
      audit('정정 반려', ymLabel(c.ym) + ' · ' + id, '허용', note || ''); return c; }
    c.state = '승인';
    var v = latestV(c.ym) + 1;
    PUB[c.ym].push({ v: v, at: c.decidedAt, by: actor().name + ' (협회)', note: c.reason + ' — 회원사 요청 ' + id + ' 승인', changes: c.changes, req: id });
    c.version = v;
    audit('정정 승인', ymLabel(c.ym) + ' · ' + id, '허용', 'v' + (v - 1) + ' 보존 → v' + v + ' 발행');
    notify('정정 승인', MMAP[c.member].name + ' 통계 담당', '[시멘트 통계] 정정 요청 ' + id + ' 승인 — 발행 v' + v, '');
    return c;
  }

  /* ======================================================= 단일 집계 서비스
     화면 · 엑셀 · 보고서 · 지도는 모두 이 함수만 부른다. 계산식은 여기 한 곳.
     spec = { measure, from, to, by:[...], filter:{members,factories,products,regions,districts}, versions:{ym:v} } */
  var MEASURES = {
    pr: { name: '생산', unit: '톤' }, d: { name: '내수 출하', unit: '톤' }, x: { name: '수출 출하', unit: '톤' },
    s: { name: '총출하 (내수+수출)', unit: '톤' }, e: { name: '기말재고', unit: '톤' }, b: { name: '기초재고', unit: '톤' }
  };
  var DIMS = { month: '월', year: '연도', member: '회원사', factory: '공장', product: '품목', region: '시·도', district: '시·군·구' };
  var aggCount = 0;
  function aggregate(spec) {
    aggCount++;
    var fl = spec.filter || {}, by = spec.by || [], meas = spec.measure || 'pr';
    var regional = by.indexOf('region') >= 0 || by.indexOf('district') >= 0 || fl.regions || fl.districts;
    if (regional && meas !== 'd') throw new ApiError(400, 'MEASURE', '지역 단위 집계는 내수 출하만 가능합니다 (집계 기준서 §3.4).');
    var months = MONTHS.filter(function (m) { return m >= spec.from && m <= spec.to && PUB[m]; });
    var groups = {}, total = 0, scanned = 0, versions = {};
    months.forEach(function (m) {
      var v = (spec.versions && spec.versions[m]) || latestV(m); versions[m] = v;
      recsOf(m, v).forEach(function (r) {
        var mem = ownerOf(r.f, m);
        if (fl.members && fl.members.indexOf(mem) < 0) return;
        if (fl.factories && fl.factories.indexOf(r.f) < 0) return;
        if (fl.products && fl.products.indexOf(r.p) < 0) return;
        scanned++;
        var base = { month: m, year: m.slice(0, 4), member: mem, factory: r.f, product: r.p };
        var parts;
        if (regional) {
          var dm = dmOf(r, m);
          parts = Object.keys(dm).filter(function (dc) {
            return (!fl.regions || fl.regions.indexOf(dc.slice(0, 2)) >= 0) && (!fl.districts || fl.districts.indexOf(dc) >= 0);
          }).map(function (dc) { return { region: dc.slice(0, 2), district: dc, val: dm[dc] }; });
        } else {
          parts = [{ val: meas === 's' ? r.d + r.x : r[meas] }];
        }
        parts.forEach(function (pt) {
          var key = by.map(function (d) { return pt[d] !== undefined ? pt[d] : base[d]; });
          var k = key.join('|');
          if (!groups[k]) { groups[k] = { key: key, value: 0, members: {} }; }
          groups[k].value += pt.val; groups[k].members[mem] = 1; total += pt.val;
        });
      });
    });
    var rows = Object.keys(groups).map(function (k) {
      var gr = groups[k], o = { value: gr.value, contributors: Object.keys(gr.members).filter(function (mm) { return true; }).length, memberSet: Object.keys(gr.members) };
      by.forEach(function (d, i) { o[d] = gr.key[i]; });
      return o;
    });
    rows.sort(function (a, b) {
      for (var i = 0; i < by.length; i++) { var d = by[i]; if (a[d] < b[d]) return -1; if (a[d] > b[d]) return 1; }
      return 0;
    });
    var sig = rows.map(function (r) { return by.map(function (d) { return r[d]; }).join('/') + '=' + r.value; }).join(';') + '#' + total;
    return { rows: rows, total: total, meta: { months: months, versions: versions, scanned: scanned, measure: meas, by: by,
      hash: ('0000000' + hash(sig).toString(16)).slice(-8).toUpperCase(), basis: '집계 기준서 v1.0 · 식 ' + ({ pr: 'M-01', d: 'M-02', x: 'M-03', s: 'M-04', e: 'M-05', b: 'M-06' })[meas] } };
  }

  /* ------------------------------------------- 소수 회원사 지역 합계 보호 */
  var THRESHOLD = 3;
  /* rows 는 같은 상위 합계(전국 또는 시·도)를 나누는 형제 집합.
     1차: 구성 회원사 수 < 임계 → 비공개.  2차: 비공개가 1칸뿐이면 합계에서 빼서 알아낼 수 있으므로 다음으로 작은 칸도 비공개.
     3차: 비공개 칸들의 구성 회원사가 모두 같은 1~2개사이면 합쳐도 역산되므로 추가 비공개. */
  function protect(rows, key) {
    rows.forEach(function (r) { r.sup = r.contributors < THRESHOLD ? 'primary' : null; });
    function supSet() { var s = {}; rows.forEach(function (r) { if (r.sup) r.memberSet.forEach(function (m) { s[m] = 1; }); }); return Object.keys(s); }
    var guard = 0;
    while (guard++ < rows.length) {
      var sup = rows.filter(function (r) { return r.sup; });
      if (!sup.length) break;
      var exposed = sup.length === 1 || supSet().length < THRESHOLD;
      if (!exposed) break;
      var cand = rows.filter(function (r) { return !r.sup; }).sort(function (a, b) { return a.value - b.value; })[0];
      if (!cand) break;
      cand.sup = 'secondary';
    }
    return rows;
  }

  /* ======================================================= API (서버 역할)
     세션에서 회원사를 꺼내 서버가 강제한다. 화면에서 숨기는 것이 아니다. */
  function sessionOrg() { return SESSION.user ? SESSION.user.org : null; }
  var API = {
    /* 우리 회사 자료 — 회원사 세션이면 회원사 필터를 서버가 덮어쓴다 */
    own: function (spec) {
      if (!SESSION.user) throw new ApiError(401, 'AUTH', '로그인이 필요합니다.');
      if (side() === 'member') {
        var org = sessionOrg();
        var asked = spec.filter && spec.filter.members;
        if (asked && (asked.length !== 1 || asked[0] !== org)) {
          audit('타사 자료 API 호출', 'GET /api/stats?members=' + asked.join(','), '차단', '세션 회원사(' + org + ') ≠ 요청 대상 — HTTP 403');
          throw new ApiError(403, 'FORBIDDEN', '다른 회원사의 자료는 조회할 수 없습니다.');
        }
        if (spec.by && spec.by.indexOf('member') >= 0 && false) {}
        spec = clone(spec); spec.filter = spec.filter || {}; spec.filter.members = [org];
      }
      return aggregate(spec);
    },
    /* 업계 공표 통계 — 회원사별 구분 불가, 지역 단위는 보호 규칙 적용 */
    pub: function (spec) {
      if (!SESSION.user) throw new ApiError(401, 'AUTH', '로그인이 필요합니다.');
      if ((spec.by || []).some(function (d) { return d === 'member' || d === 'factory'; }) || (spec.filter && (spec.filter.members || spec.filter.factories))) {
        audit('공표 통계 회원사별 조회 시도', 'GET /api/stats/public?by=member', '차단', 'HTTP 403');
        throw new ApiError(403, 'FORBIDDEN', '업계 공표 통계는 회원사·공장별로 나눌 수 없습니다.');
      }
      var res = aggregate(spec);
      var geoKey = (spec.by || []).indexOf('district') >= 0 ? 'district' : ((spec.by || []).indexOf('region') >= 0 ? 'region' : null);
      if (geoKey && (side() === 'member' || spec.preview)) {
        /* 형제 집합 단위로 보호 — 나머지 차원이 같은 행끼리 묶는다 */
        var others = spec.by.filter(function (d) { return d !== geoKey; });
        var fam = {};
        res.rows.forEach(function (r) { var k = others.map(function (d) { return r[d]; }).join('|'); (fam[k] = fam[k] || []).push(r); });
        Object.keys(fam).forEach(function (k) { protect(fam[k], geoKey); });
        res.protectedApplied = true;
      }
      return res;
    },
    /* 원시 행 조회 (입력 화면) */
    records: function (mid, m) {
      var org = sessionOrg();
      if (side() === 'member' && mid !== org) {
        audit('타사 자료 API 호출', 'GET /api/members/' + mid + '/records?ym=' + m, '차단', '세션 회원사(' + org + ') ≠ 요청 대상(' + mid + ') — HTTP 403');
        throw new ApiError(403, 'FORBIDDEN', '다른 회원사의 자료는 조회할 수 없습니다.');
      }
      audit('자료 조회', MMAP[mid].name + ' · ' + ymLabel(m), '허용', '');
      return SUB[m] && SUB[m][mid];
    }
  };

  /* ------------------------------------------------------------ CSV · 업로드 */
  function parseCSV(text) {
    var rows = [], row = [], cell = '', q = false, i, c;
    text = text.replace(/^﻿/, '');
    for (i = 0; i < text.length; i++) {
      c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return x.trim() !== ''; }); });
  }
  function toCSV(rows) {
    return '﻿' + rows.map(function (r) {
      return r.map(function (v) { v = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',');
    }).join('\r\n');
  }
  /* 양식 지문 — 시트 이름(파일명 접두)과 머리글 행으로 판별 */
  var FORMS = [
    { id: 'monthly', name: '월간 생산·출하·재고', head: ['공장코드', '품목코드', '기초재고', '생산', '내수출하', '수출출하', '기말재고'] },
    { id: 'regional', name: '월간 · 지역별 출하 시트 (시·군·구)', head: ['공장코드', '품목코드', '시군구코드', '출하량'] },
    { id: 'flash', name: '속보 (순별)', head: ['구분순', '품목코드', '생산', '내수출하', '수출출하'] },
    { id: 'coal', name: '유연탄 수급', head: ['공장코드', '원산지', '입고량', '사용량', '기말재고'] },
    { id: 'trade', name: '수출입', head: ['구분', '국가', '품목코드', '물량', '금액USD'] }
  ];
  function detectForm(head) {
    var h = head.map(function (x) { return x.replace(/\s/g, ''); });
    for (var i = 0; i < FORMS.length; i++) {
      var f = FORMS[i];
      if (f.head.length === h.length && f.head.every(function (x, j) { return x === h[j]; })) return f;
    }
    return null;
  }
  /* 전 행을 먼저 검증한다. 한 행이라도 오류면 아무것도 반영하지 않는다. */
  function checkUpload(formId, rows, mid, m) {
    var form = FORMS.filter(function (f) { return f.id === formId; })[0];
    rows = rows.map(function (r) { return r.map(function (c) { return c === null || c === undefined ? '' : String(c); }); });
    var errs = [], seen = {}, body = rows.slice(1), mine = {}, coalGroups = {};
    factoriesOf(mid, m).forEach(function (f) { mine[f.id] = f; });
    if (!body.length) errs.push({ line: 1, col: '-', msg: '머리글 아래에 입력된 행이 없습니다', raw: '' });
    body.forEach(function (r, i) {
      var line = i + 2, push = function (col, msg) { errs.push({ line: line, col: col, msg: msg, raw: r.join(',') }); };
      if (r.length !== form.head.length) { push('-', '열 개수 ' + r.length + ' (양식 ' + form.head.length + '열)'); return; }
      var numCols = formId === 'monthly' ? [2, 3, 4, 5, 6] : formId === 'regional' ? [3] : formId === 'flash' ? [2, 3, 4] : formId === 'coal' ? [2, 3, 4] : [3, 4];
      numCols.forEach(function (c) {
        var v = r[c].replace(/,/g, '').trim();
        if (v === '') push(form.head[c], '필수값 누락');
        else if (!/^\d+$/.test(v)) push(form.head[c], '숫자(0 이상 정수)가 아님: 「' + r[c] + '」');
      });
      if (formId === 'monthly' || formId === 'regional') {
        var f = FMAP[r[0]], p = PMAP[r[1]];
        if (!f) push('공장코드', '없는 공장코드 「' + r[0] + '」');
        else if (!mine[r[0]]) push('공장코드', '귀사 공장이 아님 「' + r[0] + '」');
        if (!p) push('품목코드', '없는 품목코드 「' + r[1] + '」');
        else if (f && f.products.indexOf(r[1]) < 0) push('품목코드', f.name + '에 등록되지 않은 품목 「' + r[1] + '」');
        if (formId === 'regional' && !DMAP[r[2]]) push('시군구코드', '없는 시·군·구 코드 「' + r[2] + '」');
        var k = formId === 'monthly' ? r[0] + '|' + r[1] : r[0] + '|' + r[1] + '|' + r[2];
        if (seen[k]) push('-', '중복 행 (' + seen[k] + '행과 동일 키)'); else seen[k] = line;
        if (formId === 'monthly' && SRow(r[0], r[1]) && toNumber(r[2]) !== +SRow(r[0], r[1]).b) push('기초재고', '전월 확정 기말재고와 일치하지 않음');
      } else if (formId === 'flash') {
        if (['상순', '중순', '하순'].indexOf(r[0]) < 0) push('구분순', '상순·중순·하순 중 하나를 입력하세요');
        if (!PMAP[r[1]]) push('품목코드', '없는 품목코드 「' + r[1] + '」');
        if (r[0] !== '상순' || FLASH[mid]['2026-10'][0].state !== '작성 중') push('구분순', '현재 작성 가능한 10월 상순 자료만 업로드할 수 있습니다');
        var fk = r[0] + '|' + r[1]; if (seen[fk]) push('-', '중복 행 (' + seen[fk] + '행과 동일 키)'); else seen[fk] = line;
      } else if (formId === 'coal') {
        if (!mine[r[0]] || mine[r[0]].products.indexOf('P09') < 0) push('공장코드', '귀사의 유연탄 보고 대상 공장이 아닙니다');
        if (!r[1].trim()) push('원산지', '원산지를 입력하세요');
        var ck = r[0] + '|' + r[1]; if (seen[ck]) push('-', '중복 행 (' + seen[ck] + '행과 동일 키)'); else seen[ck] = line;
        var cg = coalGroups[r[0]] || (coalGroups[r[0]] = { inflow: 0, use: r[3], e: r[4], line: line });
        cg.inflow += toNumber(r[2]);
        if (toNumber(cg.use) !== toNumber(r[3]) || toNumber(cg.e) !== toNumber(r[4])) push('사용량·기말재고', '같은 공장의 원산지별 행은 사용량과 기말재고가 같아야 합니다');
      } else if (formId === 'trade') {
        if (r[0] !== '수출' && r[0] !== '수입') push('구분', '수출 또는 수입을 입력하세요');
        if (!r[1].trim()) push('국가', '국가를 입력하세요');
        if (!PMAP[r[2]]) push('품목코드', '없는 품목코드 「' + r[2] + '」');
      }
    });
    Object.keys(coalGroups).forEach(function (fid) {
      var group = coalGroups[fid], current = (COAL[mid][m] || []).filter(function (x) { return x.f === fid; })[0];
      if (current && current.b + group.inflow - toNumber(group.use) !== toNumber(group.e))
        errs.push({ line: group.line, col: '기말재고', msg: '기초재고 + 입고량 − 사용량과 기말재고가 일치하지 않습니다', raw: fid });
    });
    return { form: form, total: body.length, errors: errs };
    function SRow(fid, pid) { return SUB[m][mid].rows[rowKey(fid, pid)]; }
  }
  function toNumber(v) { return +String(v).replace(/,/g, '').trim(); }
  function applyUpload(formId, rows, mid, m) {
    if (!SESSION.user || SESSION.user.org !== mid) throw new ApiError(403, 'FORBIDDEN', '현재 회원사 계정의 파일만 반영할 수 있습니다.');
    if (SUB[m][mid].state !== '작성 중' || !(can('DATA_INPUT') || can('DATA_EDIT')))
      throw new ApiError(403, 'FORBIDDEN', '자료 입력 권한과 작성 중 상태를 확인해 주세요.');
    var checked = checkUpload(formId, rows, mid, m);
    if (checked.errors.length) throw new ApiError(422, 'INVALID_UPLOAD', '파일을 다시 검증해 오류 ' + checked.errors.length + '건을 확인했습니다. 반영하지 않았습니다.');
    var S = SUB[m][mid], body = rows.slice(1), touched = {};
    if (formId === 'monthly') {
      body.forEach(function (r) {
        var k = rowKey(r[0], r[1]), row = S.rows[k];
        row.pr = toNumber(r[3]); row.d = toNumber(r[4]); row.x = toNumber(r[5]); row.e = toNumber(r[6]); touched[k] = 1;
      });
    } else if (formId === 'regional') {
      body.forEach(function (r) { var k = rowKey(r[0], r[1]); if (!touched[k]) { S.rows[k].dm = {}; touched[k] = 1; } S.rows[k].dm[r[2]] = toNumber(r[3]); });
    } else if (formId === 'flash') {
      var f = FLASH[mid]['2026-10'][0]; f.pr = 0; f.d = 0; f.x = 0;
      body.forEach(function (r) { f.pr += toNumber(r[2]); f.d += toNumber(r[3]); f.x += toNumber(r[4]); });
      touched['상순'] = 1;
    } else if (formId === 'coal') {
      var groups = {};
      body.forEach(function (r) {
        var c = groups[r[0]] || (groups[r[0]] = { inflow: [], use: toNumber(r[3]), e: toNumber(r[4]) });
        c.inflow.push([r[1], toNumber(r[2])]);
      });
      (COAL[mid][m] || []).forEach(function (c) { if (groups[c.f]) { c.inflow = groups[c.f].inflow; c.use = groups[c.f].use; c.e = groups[c.f].e; touched[c.f] = 1; } });
    } else if (formId === 'trade') {
      TRADE[mid][m] = body.map(function (r) { return { kind: r[0], country: r[1], p: r[2], q: toNumber(r[3]), usd: toNumber(r[4]) }; });
      body.forEach(function (r, i) { touched[i] = 1; });
    }
    S.savedAt = tick(1);
    audit('엑셀 업로드 반영', MMAP[mid].name + ' · ' + ymLabel(m), '허용', body.length + '행 · ' + Object.keys(touched).length + '개 공장·품목');
    return Object.keys(touched).length;
  }
  function sampleFile(kind, mid, m) {
    var S = SUB[m][mid], out;
    var fs = factoriesOf(mid, m), truth = {};
    fs.forEach(function (f) { f.products.forEach(function (p) { truth[rowKey(f.id, p)] = trueRow(f.id, p, m); }); });
    if (kind === 'monthly' || kind === 'monthly-bad') {
      out = [FORMS[0].head];
      Object.keys(truth).forEach(function (k) { var r = truth[k]; out.push([r.f, r.p, r.b, r.pr, r.d, r.x, r.e]); });
      if (kind === 'monthly-bad') { out[3][3] = '1,2O0'; out.push([out[1][0], out[1][1], 1, 1, 0, 0, 2]); }
      return { name: '월간_생산출하재고_' + m + '_' + MMAP[mid].name + (kind === 'monthly-bad' ? '_오류포함' : '') + '.csv', rows: out };
    }
    /* 지역별(시·군·구) — 전 공장·품목의 출하처 행. 1,000행이 되도록 시·군·구 0톤 행(출하 없음 명시)을 채운다 */
    out = [FORMS[1].head];
    Object.keys(truth).forEach(function (k) { var r = truth[k]; Object.keys(r.dm).sort().forEach(function (dc) { out.push([r.f, r.p, dc, r.dm[dc]]); }); });
    var have = {}; out.forEach(function (x) { have[x[0] + x[1] + x[2]] = 1; });
    var cand = [];
    Object.keys(truth).forEach(function (k) { var r = truth[k];
      RW[r.f].forEach(function (w) { GEO.districts[w[0]].forEach(function (d) { if (!have[r.f + r.p + d.code]) cand.push([r.f, r.p, d.code, 0]); }); }); });
    cand.sort(function (a, b) { return hash(a.join()) - hash(b.join()); });
    for (var i = 0; out.length < 1001 && i < cand.length; i++) out.push(cand[i]);
    var hd = out.shift(); out.sort(function (a, b) { return (a[0] + a[1] + a[2]) < (b[0] + b[1] + b[2]) ? -1 : 1; }); out.unshift(hd);
    if (kind === 'regional-bad') {
      var at = 742; out[at] = [out[at][0], out[at][1], '51999', out[at][3]];
    }
    return { name: '지역별출하_시군구_' + m + '_' + MMAP[mid].name + (kind === 'regional-bad' ? '_1행오류' : '') + '.csv', rows: out };
  }

  /* ------------------------------------------------- 속보 · 유연탄 · 수출입 */
  var FLASH = {}, COAL = {}, TRADE = {};
  (function seedSide() {
    ACTIVE.forEach(function (mem, i) {
      var rnd = prng(hash('flash' + mem.id));
      var fs = factoriesOf(mem.id, CUR), cap = fs.reduce(function (s, f) { return s + f.cap; }, 0);
      /* 속보: 10월 상순은 작성 중, 9월 3개 순은 확정 */
      FLASH[mem.id] = {};
      ['2026-09', '2026-10'].forEach(function (m) {
        FLASH[mem.id][m] = ['상순', '중순', '하순'].map(function (s, j) {
          var base = cap * 0.82 * SEASON[+m.slice(5) - 1] / 3 * (0.92 + rnd() * 0.16);
          var x = Math.round(base * (fs.some(function (f) { return f.exp; }) ? .08 : 0));
          var filled = m === '2026-09' || (j === 0 && i % 3 !== 1 && mem.id !== 'm04');
          return { term: s, pr: filled ? Math.round(base * 1.01) : null, d: filled ? Math.round(base - x) : null, x: filled ? x : null,
            state: m === '2026-09' ? '확정' : (filled ? '제출' : '작성 중') };
        });
      });
      COAL[mem.id] = {};
      MONTHS.slice(-13).forEach(function (m, k) {
        var kiln = fs.filter(function (f) { return f.products.indexOf('P09') >= 0; });
        COAL[mem.id][m] = kiln.map(function (f) {
          var use = Math.round(f.cap * 0.12 * SEASON[+m.slice(5) - 1] * (0.94 + rnd() * 0.12));
          var origin = [['호주', .48], ['러시아', .22], ['인도네시아', .2], ['캐나다', .1]];
          var inAmt = origin.map(function (o) { return [o[0], Math.round(use * o[1] * (0.85 + rnd() * 0.3))]; });
          return { f: f.id, use: use, inflow: inAmt, b: Math.round(use * .8), e: null };
        });
        COAL[mem.id][m].forEach(function (c) { c.e = c.b + c.inflow.reduce(function (s, x) { return s + x[1]; }, 0) - c.use; });
      });
      TRADE[mem.id] = {};
      MONTHS.slice(-13).forEach(function (m) {
        var ex = fs.filter(function (f) { return f.exp; });
        var list = [];
        ex.forEach(function (f) {
          [['미국', 'P01', 64], ['칠레', 'P09', 41], ['필리핀', 'P01', 58], ['방글라데시', 'P09', 39]].forEach(function (c, j) {
            if ((hash(f.id + m + c[0]) % 3) === 0) return;
            var q = Math.round(f.cap * f.exp * (0.15 + rnd() * 0.2));
            list.push({ kind: '수출', country: c[0], p: c[1], q: q, usd: Math.round(q * c[2] * (0.95 + rnd() * 0.1)) });
          });
        });
        if (mem.id === 'm03' || mem.id === 'm06') list.push({ kind: '수입', country: '일본', p: 'P09', q: Math.round(4000 + rnd() * 3000), usd: Math.round(180000 + rnd() * 90000) });
        TRADE[mem.id][m] = list;
      });
    });
  })();

  /* ------------------------------------------------------------ 외부 데이터 수집 */
  var EXT = {
    provider: { name: '건설 경기 동향 지표 (가상 제공처)', kind: '비공식 API (공개 웹 응답 JSON)', schedule: '매월 3일 06:00 자동 실행', items: ['건축 착공 면적(㎡)', '레미콘 출하 지수', '건설 수주액(억 원)'], terms: '자동 수집 이용 조건 확인 필요' },
    runs: [], series: {}, breakNext: false
  };
  (function seedExt() {
    var rnd = prng(77);
    MONTHS.forEach(function (m) {
      if (m < '2024-01') return;
      var v = Math.round((820 + 180 * SEASON[+m.slice(5) - 1] + rnd() * 120) * 10) / 10;
      EXT.series[m] = { area: Math.round(v * 1000), idx: Math.round((92 + rnd() * 16) * 10) / 10, order: Math.round(120000 + rnd() * 40000), approved: true };
    });
    var list = MONTHS.filter(function (m) { return m >= '2025-10' && m <= '2026-08'; });
    list.forEach(function (m, i) {
      var nx = addM(m, 1);
      EXT.runs.push({ id: 'R' + (300 + i), ym: m, at: atDay(+nx.slice(0, 4), +nx.slice(5), 3, 6, 0), mode: '정기', status: '반영', rows: 3, approvedBy: i % 2 ? '서민재' : '한지윤', approvedAt: atDay(+nx.slice(0, 4), +nx.slice(5), 3, 10, 20) });
    });
    /* 2026-08 분: 9월 3일 정기 수집 실패 → 수동 재수집 → 승인 */
    var last = EXT.runs[EXT.runs.length - 1];
    last.mode = '수동 재수집'; last.at = atDay(2026, 9, 3, 9, 40); last.note = '06:00 정기 실행 실패 후 재수집';
    EXT.runs.splice(EXT.runs.length - 1, 0, { id: 'R399', ym: '2026-08', at: atDay(2026, 9, 3, 6, 0), mode: '정기', status: '실패', rows: 0, error: '응답 형식 변경: 필드 「startArea」 → 「start_area_m2」 (스키마 불일치)' });
    /* 2026-09 분: 아직 수집 전 (10월 3일 예정) */
    delete EXT.series['2026-09'];
  })();
  function runCollect(ym, manual) {
    if (side() !== 'assoc' || !can('COLLECT')) throw new ApiError(403, 'FORBIDDEN', '수집 권한이 없습니다.');
    var t = tick(4), id = 'R' + (400 + EXT.runs.length);
    if (EXT.breakNext && !manual) {
      EXT.runs.push({ id: id, ym: ym, at: t, mode: '정기', status: '실패', rows: 0, error: '응답 형식 변경: 필드 「reqIdx」 누락 (스키마 불일치) — 제공처 구조 변경 의심' });
      notify('수집 실패', '협회 통계팀', '[시멘트 통계] 외부 데이터 ' + ymLabel(ym) + ' 수집 실패 — 응답 형식 변경 감지', '수동 재수집 후 검수 필요', t);
      audit('외부 수집', ymLabel(ym) + ' 정기 실행', '실패', '스키마 불일치 — 알림 이력 기록');
      return EXT.runs[EXT.runs.length - 1];
    }
    var rnd = prng(hash(ym + id));
    var v = { area: Math.round((900 + rnd() * 200) * 1000), idx: Math.round((95 + rnd() * 10) * 10) / 10, order: Math.round(125000 + rnd() * 30000), approved: false };
    EXT.runs.push({ id: id, ym: ym, at: t, mode: manual ? '수동 재수집' : '정기', status: '검수 대기', rows: 3, pending: v });
    audit('외부 수집', ymLabel(ym) + (manual ? ' 수동 재수집' : ' 정기 실행'), '허용', '3개 항목 적재 — 검수 대기 (통계 미반영)');
    return EXT.runs[EXT.runs.length - 1];
  }
  function approveCollect(id, ok) {
    if (side() !== 'assoc' || !can('COLLECT')) throw new ApiError(403, 'FORBIDDEN', '검수 권한이 없습니다.');
    var r = EXT.runs.filter(function (x) { return x.id === id; })[0];
    r.approvedBy = actor().name; r.approvedAt = tick(2);
    if (ok) { r.status = '반영'; r.pending.approved = true; EXT.series[r.ym] = r.pending; }
    else r.status = '반려';
    audit('외부 수집 검수', ymLabel(r.ym) + ' · ' + id, '허용', ok ? '승인 — 통계 반영' : '반려 — 미반영');
    return r;
  }

  /* ------------------------------------------------------------ 이관 검증 */
  var MIG = (function () {
    var rnd = prng(2026), years = [];
    for (var y = 2001; y <= 2025; y++) {
      var cnt = 1180 + Math.round(rnd() * 160) + (y > 2012 ? 120 : 0);
      var pr = Math.round((52000000 - Math.abs(y - 2017) * 1300000 + rnd() * 1500000));
      years.push({ y: y, srcCnt: cnt, dstCnt: cnt, srcSum: pr, dstSum: pr, ship: Math.round(pr * 0.97) });
    }
    return {
      runAt: atDay(2026, 3, 18, 22, 10), source: '현행 DB 원본 (MiPlatform 연동 스키마)', target: '신규 DB (PostgreSQL)',
      years: years,
      codes: [['C01', 'P01', '보통 포틀랜드', 0, 0], ['C02', 'P02', '조강 포틀랜드', 0, 0], ['C03', 'P03', '중용열', 0, 0], ['C04', 'P04', '저열', 0, 0],
        ['C05', 'P05', '내황산염', 0, 0], ['C06', 'P06', '고로 슬래그', 0, 0], ['C07', 'P07', '플라이애시', 0, 0], ['C08', 'P08', '백색', 0, 0],
        ['C09', 'P09', '클링커', 0, 0], ['C10', 'P10', '기타 혼합 (구 C10·C11 통합)', 0, 0], ['C11', 'P10', '기타 혼합 (구 C10·C11 통합)', 0, 0]],
      compare: [
        { form: '시멘트 수급 실적 월보 (대표 양식)', year: 2023, items: 1584, match: 1584, excluded: 0 },
        { form: '시멘트 수급 실적 월보 (대표 양식)', year: 2024, items: 1584, match: 1584, excluded: 1 },
        { form: '시멘트 수급 실적 월보 (대표 양식)', year: 2025, items: 1584, match: 1584, excluded: 1 }
      ],
      excluded: [
        { id: 'X-01', year: 2024, item: '2024년 3월 · 슬래그 · 강원 출하', reason: '현행 DB에 근거 없는 수기 보정 (보고서 인쇄본에만 존재)', agreed: '승인된 제외 목록 #3' },
        { id: 'X-02', year: 2025, item: '2025년 11월 · 클링커 수출', reason: '사후 정정이 보고서 발행 후 반영되어 DB 값과 발행값이 다름', agreed: '승인된 제외 목록 #7' }
      ]
    };
  })();

  /* ------------------------------------------------------------ 저장 항목 */
  var SAVED = { 'u-a1': [
    { id: 'S1', name: '시·도별 내수 출하 — 최근 12개월', spec: { measure: 'd', by: ['region', 'month'], from: addM(CUR, -12), to: addM(CUR, -1) } },
    { id: 'S2', name: '회원사 × 품목 생산 (2026년 누계)', spec: { measure: 'pr', by: ['member', 'product'], from: '2026-01', to: addM(CUR, -1) } }
  ] };
  var UPLOAD = { byMember: {} };

  /* 시연 상태만 이 브라우저에 보관한다. 실제 서버·다른 브라우저와는 동기화되지 않는다. */
  var STORE_KEY = 'cement-158558-demo-v1';
  var STORE_OBJECTS = { BASE: BASE, PUB: PUB, SUB: SUB, FLASH: FLASH, COAL: COAL, TRADE: TRADE, EXT: EXT, MIG: MIG, SAVED: SAVED, UPLOAD: UPLOAD };
  var STORE_ARRAYS = { CORR: CORR, USERS: USERS, ROLES: ROLES, MEMBERS: MEMBERS, FACTORIES: FACTORIES, HISTORY: HISTORY, AUDIT: AUDIT, NOTI: NOTI };
  var storageError = '';
  function replaceObject(target, source) {
    Object.keys(target).forEach(function (k) { delete target[k]; });
    Object.keys(source).forEach(function (k) { target[k] = source[k]; });
  }
  function rebuildMap(map, list, key) {
    Object.keys(map).forEach(function (k) { delete map[k]; });
    list.forEach(function (item) { map[item[key]] = item; });
  }
  function saveState() {
    try {
      var state = { version: 1, clock: CLOCK, auditSeq: auditSeq, sessionUid: SESSION.user && SESSION.user.id, objects: STORE_OBJECTS, arrays: STORE_ARRAYS };
      g.localStorage.setItem(STORE_KEY, JSON.stringify(state));
      storageError = '';
      return true;
    } catch (e) {
      storageError = '이 브라우저에 체험 데이터를 저장할 수 없습니다. 저장 공간 또는 브라우저 설정을 확인해 주세요.';
      return false;
    }
  }
  function restoreState() {
    try {
      var raw = g.localStorage.getItem(STORE_KEY);
      if (!raw) return true;
      var state = JSON.parse(raw);
      if (state.version !== 1 || !state.objects || !state.arrays) throw new Error('저장 형식이 다릅니다');
      Object.keys(STORE_OBJECTS).forEach(function (k) {
        if (!state.objects[k] || typeof state.objects[k] !== 'object' || Array.isArray(state.objects[k])) throw new Error(k + ' 형식 오류');
      });
      Object.keys(STORE_ARRAYS).forEach(function (k) {
        if (!Array.isArray(state.arrays[k])) throw new Error(k + ' 형식 오류');
      });
      /* 예전 전 계정 공용 업로드 미리보기는 소유 회원사를 확정할 수 없어 복원하지 않는다. */
      if (!state.objects.UPLOAD.byMember) state.objects.UPLOAD = { byMember: {} };
      Object.keys(STORE_OBJECTS).forEach(function (k) { replaceObject(STORE_OBJECTS[k], state.objects[k]); });
      Object.keys(STORE_ARRAYS).forEach(function (k) {
        var arr = STORE_ARRAYS[k]; arr.splice.apply(arr, [0, arr.length].concat(state.arrays[k]));
      });
      NOTI.forEach(function (item) {
        if (item.status === '발송 완료') item.status = '체험 기록';
        if (/정정 요청.*승인/.test(item.subject)) item.type = '정정 승인';
        else if (/정정 요청/.test(item.subject)) item.type = '정정 요청';
      });
      AUDIT.forEach(function (item) { if (item.action === '엑셀 내려받기') item.action = 'CSV 내려받기'; });
      if (EXT.provider && EXT.provider.terms === '자동 수집 허용 여부 S1 확인 (확인 사항 10번)')
        EXT.provider.terms = '자동 수집 이용 조건 확인 필요';
      if (MIG.excluded) MIG.excluded.forEach(function (item) {
        if (/^G1 합의 목록 #/.test(item.agreed)) item.agreed = item.agreed.replace('G1 합의 목록', '승인된 제외 목록');
      });
      rebuildMap(MMAP, MEMBERS, 'id'); rebuildMap(FMAP, FACTORIES, 'id');
      rebuildMap(ROLEMAP, ROLES, 'code'); rebuildMap(UMAP, USERS, 'id');
      Object.keys(RECCACHE).forEach(function (k) { delete RECCACHE[k]; });
      Object.keys(DMCACHE).forEach(function (k) { delete DMCACHE[k]; });
      /* ACTIVE는 별도 배열이므로 복원된 회원사 객체를 다시 참조하게 한다. */
      ACTIVE.splice.apply(ACTIVE, [0, ACTIVE.length].concat(MEMBERS.filter(function (m) { return !m.inactive; })));
      SESSION.user = state.sessionUid ? (UMAP[state.sessionUid] || null) : null;
      CLOCK = typeof state.clock === 'number' ? state.clock : CLOCK;
      auditSeq = typeof state.auditSeq === 'number' ? state.auditSeq : auditSeq;
      storageError = '';
      return true;
    } catch (e) {
      storageError = '저장된 체험 데이터를 읽지 못했습니다. 초기 상태로 계속 사용합니다.';
      return false;
    }
  }
  function resetState() {
    try { g.localStorage.removeItem(STORE_KEY); return true; }
    catch (e) { storageError = '저장된 체험 데이터를 삭제할 수 없습니다.'; return false; }
  }

  /* ------------------------------------------------------------ 공개 */
  g.DB = {
    util: { prng: prng, hash: hash, split: split, addM: addM, ymLabel: ymLabel, ymShort: ymShort, fmtTime: fmtTime, now: now, tick: tick, n: n, pct: pct, clone: clone, parseCSV: parseCSV, toCSV: toCSV, atDay: atDay },
    CUR: CUR, FIRST: FIRST, MONTHS: MONTHS, DEADLINE: DEADLINE,
    PRODUCTS: PRODUCTS, PMAP: PMAP, REGIONS: REGIONS, RMAP: RMAP, DMAP: DMAP,
    MEMBERS: MEMBERS, ACTIVE: ACTIVE, MMAP: MMAP, FACTORIES: FACTORIES, FMAP: FMAP, HISTORY: HISTORY,
    ownerOf: ownerOf, factoriesOf: factoriesOf, RW: RW,
    PUB: PUB, latestV: latestV, recsOf: recsOf, dmOf: dmOf, BASE: BASE,
    SUB: SUB, STATES: STATES, TRANS: TRANS, transition: transition, closeMonth: closeMonth, rowKey: rowKey, prevE: prevE,
    validate: validate, FIELDS: FIELDS, SWING: SWING, refVal: refVal, regionSums: regionSums, dmTotal: dmTotal,
    CORR: CORR, requestCorrection: requestCorrection, decideCorrection: decideCorrection,
    aggregate: aggregate, aggCount: function () { return aggCount; }, MEASURES: MEASURES, DIMS: DIMS, THRESHOLD: THRESHOLD, protect: protect,
    API: API, ApiError: ApiError,
    PERMS: PERMS, ROLES: ROLES, ROLEMAP: ROLEMAP, USERS: USERS, UMAP: UMAP, permsOf: permsOf, can: can, side: side,
    SESSION: SESSION, audit: audit, AUDIT: AUDIT, NOTI: NOTI, notify: notify, actor: actor,
    FORMS: FORMS, detectForm: detectForm, checkUpload: checkUpload, applyUpload: applyUpload, sampleFile: sampleFile,
    FLASH: FLASH, COAL: COAL, TRADE: TRADE, EXT: EXT, runCollect: runCollect, approveCollect: approveCollect, MIG: MIG, SAVED: SAVED, UPLOAD: UPLOAD,
    saveState: saveState, restoreState: restoreState, resetState: resetState, storageError: function () { return storageError; }
  };
})(window);
