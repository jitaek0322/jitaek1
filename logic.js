// 군생활 계산 로직 — 앱(브라우저)과 알림 발송기(Node)가 함께 사용합니다.
// 모든 날짜는 'YYYY-MM-DD' 문자열, 한국 시간(KST) 기준입니다.

export const RANKS = [
  { key: 'pvt', name: '이병', bars: 1 },
  { key: 'pfc', name: '일병', bars: 2 },
  { key: 'cpl', name: '상병', bars: 3 },
  { key: 'sgt', name: '병장', bars: 4 },
];

// 2026년 병사 기본봉급 (2025년과 동일, 동결) — 설정에서 수정 가능
export const DEFAULT_PAY = { pvt: 750000, pfc: 900000, cpl: 1200000, sgt: 1500000 };

export const NOTIFY_ITEMS = [
  { key: 'daily', label: '매일 복무 현황', desc: '전역 D-day · 복무율 · 계급 요약' },
  { key: 'events', label: '일정 리마인드', desc: '내일 일정과 오늘 남은 일정' },
  { key: 'promotion', label: '진급 알림', desc: '진급 7일 전 · 전날 · 당일' },
  { key: 'leave', label: '휴가 · 외출 알림', desc: '출발 3일 전 · 전날, 복귀 전날' },
  { key: 'goals', label: '목표 체크', desc: '오늘 체크 안 한 목표가 있을 때' },
  { key: 'savings', label: '적금 납입일', desc: '납입일 전날 · 당일' },
  { key: 'milestone', label: '복무 기념일', desc: '복무율 25·50·75%, 전역 100·50·30·10일 전' },
  { key: 'anniv', label: '생일 · 기념일', desc: '등록한 사람들의 기념일 전날 · 당일' },
  { key: 'diary', label: '일기 리마인드', desc: '오늘 일기를 안 썼을 때' },
  { key: 'merit', label: '과실 경고', desc: '최근 2개월 과실 2회 이상이 된 날 · 줄어든 날' },
  { key: 'report', label: '월간 리포트', desc: '매월 1일 지난달 요약' },
  { key: 'payday', label: '월급날', desc: '월급날 전날 · 당일 (주말이면 금요일로 당겨서)' },
];

export function defaultData() {
  return {
    version: 1,
    profile: {
      name: '',
      branch: '해군',
      enlist: '2026-02-09',
      discharge: '2027-10-08',
      // 진급일: 상병 11월은 직접 알려준 값, 나머지는 추정 — 설정에서 수정하세요
      promo: { pfc: '2026-05-01', cpl: '2026-11-01', sgt: '2027-05-01' },
      unit: '',        // 소속
      serviceNo: '',   // 군번
      specialty: '',   // 직별
      duty: '',        // 보직
    },
    pay: { ...DEFAULT_PAY },
    savings: { monthly: 550000, startMonth: '2026-03', depositDay: 25, rate: 5.0, enabled: true },
    leaveTypes: [
      { id: 'annual', name: '연가', total: 0 },
      { id: 'reward', name: '포상휴가', total: 0 },
      { id: 'comfort', name: '위로휴가', total: 0 },
    ],
    leaves: [], // {id, typeId, kind:'휴가'|'평일외출'|'휴일외출'|'면회외출', start, end, days, memo, plan:{transport, people, checklist:[{t,done}], spend}}
    events: [], // {id, date, time, title, cat, memo, remind:'day1'|'day0'|'both'|'none'}
    goals: [], // {id, title, emoji, logs:{'YYYY-MM-DD':true}}
    notify: { daily: true, events: true, promotion: true, leave: true, goals: true, savings: true, milestone: true, anniv: true, diary: false, merit: true, report: true, payday: true },
    widgetKey: '',
    widgetTheme: 'forklift',
    payday: 10,            // 봉급일 — 주말·공휴일이면 직전 평일
    holidays: [],          // 추가 휴일 'YYYY-MM-DD' (설·추석·대체공휴일 등)
    mileagePerDay: 10,     // 위로 마일리지 n점 = 위로휴가 1일
    overnight: { cycleWeeks: 6, minWeeks: 5, maxWeeks: 7, nights: 2 }, // 정기외박: 6주 주기 2박3일 (5~7주 유동)
    drives: [],            // {id, date, vehicle, name, start, end, km, cargo, memo}
    fitness: { records: [], goals: { pushup: 0, situp: 0, run: 0 } }, // records: {id, date, pushup, situp, run(sec)}
    expenseCats: ['PX', '식비', '외출', '통신', '기타'],
    expenses: [],          // {id, date, cat, amount, memo}
    diary: {},             // {'YYYY-MM-DD': {mood:1~5, text}}
    anniversaries: [],     // {id, kind:'생일'|'기념일', name, who, date:'YYYY-MM-DD'|'0000-MM-DD'}
    merits: [],            // {id, date, type:'양호'|'과실', points, reason}
    weekendWork: [],       // {id, date, task, start, end}
  };
}

// ---------- 날짜 유틸 ----------
export function kstToday(now = new Date()) {
  const k = new Date(now.getTime() + 9 * 3600 * 1000);
  return k.toISOString().slice(0, 10);
}
export function kstTime(now = new Date()) {
  const k = new Date(now.getTime() + 9 * 3600 * 1000);
  return k.toISOString().slice(11, 16);
}
const toUTC = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
export function diffDays(a, b) { return Math.round((toUTC(b) - toUTC(a)) / 86400000); } // b - a
export function addDays(s, n) { return new Date(toUTC(s) + n * 86400000).toISOString().slice(0, 10); }
export function fmtDate(s, withDow = true) {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  const dow = '일월화수목금토'[new Date(toUTC(s)).getUTCDay()];
  return `${String(y).slice(2)}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}${withDow ? ` (${dow})` : ''}`;
}
export function won(n) { return Math.round(n || 0).toLocaleString('ko-KR') + '원'; }
export function dLabel(n) { return n === 0 ? 'D-DAY' : n > 0 ? `D-${n}` : `D+${-n}`; }

// ---------- 복무 계산 ----------
export function service(data, today) {
  const { enlist, discharge } = data.profile;
  const total = diffDays(enlist, discharge);
  const served = Math.max(0, Math.min(total, diffDays(enlist, today)));
  const left = diffDays(today, discharge);
  const pct = total > 0 ? (served / total) * 100 : 0;
  return { total, served, left: Math.max(0, left), pct: Math.min(100, Math.max(0, pct)), done: left <= 0 };
}

export function rankOn(data, date) {
  const p = data.profile.promo || {};
  let r = RANKS[0];
  for (const rk of RANKS.slice(1)) if (p[rk.key] && date >= p[rk.key]) r = rk;
  return r;
}

export function nextPromotion(data, today) {
  const p = data.profile.promo || {};
  for (const rk of RANKS.slice(1)) {
    if (p[rk.key] && p[rk.key] > today) return { rank: rk, date: p[rk.key], d: diffDays(today, p[rk.key]) };
  }
  return null;
}

// ---------- 휴가 ----------
// 출타 1건 = 구간(segments) 여러 개 (예: 정기외박 + 연가). 예전 단일 기록도 구간 1개로 취급
export function segsOf(l) {
  return l.segments?.length ? l.segments : [{ kind: l.kind, typeId: l.typeId, start: l.start, end: l.end, days: l.days }];
}
export function segDays(seg) {
  if (seg.kind !== '휴가') return 0;
  if (typeof seg.days === 'number' && seg.days > 0) return seg.days;
  return diffDays(seg.start, seg.end) + 1;
}
export function segName(data, seg) {
  if (seg.kind === '휴가') return data.leaveTypes.find((t) => t.id === seg.typeId)?.name || '휴가';
  return seg.kind;
}
export function tripLabel(data, l) {
  const segs = segsOf(l);
  return segs.map((g) => (g.kind === '휴가' ? `${segName(data, g)} ${segDays(g)}일` : g.kind === '정기외박' ? `외박 ${diffDays(g.start, g.end)}박` : g.kind)).join(' + ');
}
export function tripSpan(l) { // 총 n박 n+1일
  const days = diffDays(l.start, l.end) + 1;
  return isOuting(l.kind) ? '당일' : `${days - 1}박 ${days}일`;
}
// 구간들로 출타 전체의 시작·끝·종류를 정리
export function normalizeTrip(l) {
  const segs = segsOf(l).slice().sort((a, b) => a.start.localeCompare(b.start));
  l.segments = segs;
  l.start = segs[0].start; l.end = segs.reduce((m, g) => (g.end > m ? g.end : m), segs[0].end);
  l.kind = segs.length > 1 ? '연계' : segs[0].kind; l.typeId = segs.length > 1 ? '' : segs[0].typeId || '';
  delete l.days;
  return l;
}
export function leaveDays(l) {
  if (isOuting(l.kind)) return 0;
  if (l.segments?.length) return diffDays(l.start, l.end) + 1;
  if (typeof l.days === 'number' && l.days > 0) return l.days;
  return diffDays(l.start, l.end) + 1;
}
export function leaveSummary(data) {
  return data.leaveTypes.map((t) => {
    const used = data.leaves.flatMap(segsOf).filter((g) => g.kind === '휴가' && g.typeId === t.id).reduce((s, g) => s + segDays(g), 0);
    const earned = t.id === 'comfort' ? mileageSummary(data).earnedDays : 0; // 주말근무 마일리지 자동 적립
    const total = (t.total || 0) + earned;
    return { ...t, base: t.total || 0, earned, total, used, left: Math.max(0, total - used) };
  });
}
export function nextLeave(data, today) {
  const up = data.leaves.filter((l) => l.end >= today).sort((a, b) => a.start.localeCompare(b.start));
  if (!up.length) return null;
  const l = up[0];
  const ongoing = l.start <= today;
  return { leave: l, ongoing, d: ongoing ? diffDays(today, l.end) : diffDays(today, l.start) };
}

// ---------- 급여 · 적금 ----------
function monthsBetween(ym1, ym2) { // inclusive month count
  const [y1, m1] = ym1.split('-').map(Number); const [y2, m2] = ym2.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1) + 1;
}
export function payThisMonth(data, today) {
  const r = rankOn(data, today);
  return { rank: r, amount: data.pay[r.key] || 0 };
}
export function payTotal(data) {
  // 입대월~전역월까지, 각 달 1일 기준 계급 봉급 합 (입대월·전역월은 일할 계산 생략한 근사치)
  const { enlist, discharge } = data.profile;
  let ym = enlist.slice(0, 7); const end = discharge.slice(0, 7); let sum = 0; let guard = 0;
  while (ym <= end && guard++ < 40) {
    const date = ym === enlist.slice(0, 7) ? enlist : `${ym}-01`;
    sum += data.pay[rankOn(data, date).key] || 0;
    const [y, m] = ym.split('-').map(Number);
    ym = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  }
  return sum;
}
export function savingsProjection(data, today) {
  const s = data.savings;
  if (!s.enabled) return null;
  const end = data.profile.discharge.slice(0, 7);
  const months = Math.max(0, monthsBetween(s.startMonth, end));
  const paidMonths = Math.max(0, Math.min(months, monthsBetween(s.startMonth, today.slice(0, 7)) - (Number(today.slice(8, 10)) < s.depositDay ? 1 : 0)));
  const principal = s.monthly * months;
  const interest = (s.monthly * (s.rate / 100) / 12) * (months * (months + 1)) / 2; // 단리 근사
  const match = principal; // 정부 재정지원: 원금 100% (만기 시)
  return { months, paidMonths, paid: s.monthly * paidMonths, principal, interest, match, total: principal + interest + match };
}

// ---------- 목표 ----------
export function goalStreak(goal, today) {
  let n = 0; let d = goal.logs?.[today] ? today : addDays(today, -1);
  while (goal.logs?.[d]) { n++; d = addDays(d, -1); }
  return n;
}

// ---------- 위젯 요약 ----------
export function widgetSummary(data, today) {
  const sv = service(data, today);
  const np = nextPromotion(data, today);
  const nl = nextLeave(data, today);
  const ev = data.events.filter((e) => e.date >= today).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))[0];
  return {
    enlist: data.profile.enlist, discharge: data.profile.discharge, promo: data.profile.promo,
    nextLeave: nl ? { title: tripLabel(data, nl.leave) + (nl.leave.memo ? ` · ${nl.leave.memo}` : ''), start: nl.leave.start, end: nl.leave.end } : null,
    nextEvent: ev ? { title: ev.title, date: ev.date, time: ev.time || '' } : null,
    nextPromo: np ? { name: np.rank.name, date: np.date } : null,
    pct: Number(sv.pct.toFixed(2)), updated: today, theme: data.widgetTheme || 'forklift',
  };
}

// ---------- 알림 메시지 만들기 (매일 18시) ----------
export function buildNotifications(data, today, nowTime = '18:00') {
  const out = [];
  const on = data.notify || {};
  const sv = service(data, today);
  const r = rankOn(data, today);
  const tomorrow = addDays(today, 1);

  if (on.daily && !sv.done) {
    const v = { left: sv.left, pct: sv.pct.toFixed(1), served: sv.served, rank: r.name, meals: sv.left * 3, weeks: Math.ceil(sv.left / 7) };
    out.push({ key: 'daily', title: pick(FUN.dailyTitle, today, 'dt')(v), body: pick(FUN.dailyBody, today, 'db')(v) });
  }

  if (on.milestone) {
    const m = [];
    for (const p of [25, 50, 75]) {
      const day = addDays(data.profile.enlist, Math.ceil((sv.total * p) / 100));
      if (day === today) m.push(`복무율 ${p}% 돌파!`);
    }
    if ([100, 50, 30, 10, 1].includes(sv.left) && !sv.done) m.push(`전역까지 ${sv.left}일 남았어요`);
    if (sv.left === 0) m.push('전역을 축하합니다! 수고 많으셨어요 🎉');
    if (m.length) out.push({ key: 'milestone', title: '🎖️ 오늘의 기념일', body: m.join(' · ') });
  }

  if (on.events) {
    const tom = data.events.filter((e) => e.date === tomorrow && ['day1', 'both', undefined].includes(e.remind));
    const tod = data.events.filter((e) => e.date === today && ['day0', 'both'].includes(e.remind) && (!e.time || e.time >= nowTime));
    const lines = [];
    tod.sort((a, b) => (a.time || '').localeCompare(b.time || '')).forEach((e) => lines.push(`오늘 ${e.time ? e.time + ' ' : ''}${e.title}`));
    tom.sort((a, b) => (a.time || '').localeCompare(b.time || '')).forEach((e) => lines.push(`내일 ${e.time ? e.time + ' ' : ''}${e.title}`));
    if (lines.length) out.push({ key: 'events', title: `📋 일정 리마인드 (${lines.length}건)`, body: lines.join('\n') });
  }

  if (on.promotion) {
    const np = nextPromotion(data, today);
    if (np && [7, 1].includes(np.d)) out.push({ key: 'promotion', title: `🎖️ ${np.rank.name} 진급 ${dLabel(np.d)}`, body: np.d === 1 ? `내일 ${np.rank.name} 진급! 계급장 준비하세요.` : `${fmtDate(np.date)} ${np.rank.name} 진급까지 일주일 남았어요.` });
    for (const rk of RANKS.slice(1)) if (data.profile.promo?.[rk.key] === today) out.push({ key: 'promotion', title: `🎖️ ${rk.name} 진급을 축하합니다!`, body: `오늘부터 ${rk.name}. 이번 달 봉급 ${won(data.pay[rk.key])}` });
  }

  if (on.leave) {
    for (const l of data.leaves) {
      const d = diffDays(today, l.start);
      const label = (l.kind === '연계' ? '연계 출타' : l.kind === '휴가' ? segName(data, segsOf(l)[0]) : l.kind) + (l.memo ? ` (${l.memo})` : '');
      if (d === 3) out.push({ key: 'leave', title: `🧳 ${label} D-3`, body: `${fmtDate(l.start)} 출발. 출타 신청·짐 챙기기 확인!` });
      if (d === 1) out.push({ key: 'leave', title: `🧳 내일 ${label} 출발!`, body: isOuting(l.kind) ? `${fmtDate(l.start)} ${l.kind}` : `${fmtDate(l.start)} ~ ${fmtDate(l.end)} · ${tripSpan(l)}${l.kind === '연계' ? ` (${tripLabel(data, l)})` : ''}` });
      if (!isOuting(l.kind) && diffDays(today, l.end) === 0 && l.start !== l.end) out.push({ key: 'leave', title: '🏠 오늘 복귀일이에요', body: `${label} 복귀 시간 확인하세요.` });
    }
  }

  if (on.goals && data.goals.length) {
    const undone = data.goals.filter((g) => !g.logs?.[today]);
    if (undone.length) out.push({ key: 'goals', title: `✅ 오늘 목표 ${data.goals.length - undone.length}/${data.goals.length}`, body: `아직 남은 목표: ${undone.map((g) => g.title).join(', ')}` });
  }

  if (on.savings && data.savings.enabled) {
    const dd = String(data.savings.depositDay).padStart(2, '0');
    const thisMonthDay = `${today.slice(0, 7)}-${dd}`;
    const nextMonthFirst = addDays(`${today.slice(0, 7)}-28`, 4).slice(0, 7);
    const candidates = [thisMonthDay, `${nextMonthFirst}-${dd}`];
    for (const c of candidates) {
      if (c > data.profile.discharge.slice(0, 7) + '-31' || c.slice(0, 7) < data.savings.startMonth) continue;
      const d = diffDays(today, c);
      if (d === 1) out.push({ key: 'savings', title: '💰 내일 적금 납입일', body: `장병내일준비적금 ${won(data.savings.monthly)} 납입 예정이에요.` });
      if (d === 0) out.push({ key: 'savings', title: '💰 오늘 적금 납입일', body: `${won(data.savings.monthly)} 잔액 확인하세요.` });
    }
  }
  extraNotifications(data, today, nowTime, out);
  return out;
}

// =====================================================================
//  확장 기능
// =====================================================================
export const OUTING_KINDS = ['평일외출', '휴일외출', '면회외출'];
export const isOuting = (k) => k === '외출' || OUTING_KINDS.includes(k);
export const MOODS = [
  { v: 1, e: '😫', n: '최악' }, { v: 2, e: '😕', n: '별로' }, { v: 3, e: '🙂', n: '보통' },
  { v: 4, e: '😄', n: '좋음' }, { v: 5, e: '🤩', n: '최고' },
];
export const VEHICLES = ['지게차', '트럭', '버스', '승용·전술차량', '기타'];
export const WIDGET_THEMES = [
  { key: 'forklift', name: '지게차', desc: '남색 배경 + 도로 위 지게차' },
  { key: 'anchor', name: '닻', desc: '남색·금색 해군 스타일' },
  { key: 'minimal', name: '미니멀', desc: '검정 배경, 큰 숫자만' },
  { key: 'light', name: '라이트', desc: '흰 배경 + 남색 글씨' },
];

export function addMonths(s, n) {
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  return `${t.toISOString().slice(0, 7)}-${String(Math.min(d, last)).padStart(2, '0')}`;
}
export const ymOf = (s) => s.slice(0, 7);
export function prevYM(ym) { return addMonths(`${ym}-01`, -1).slice(0, 7); }
export function daysInMonth(ym) { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
export function hoursBetween(start, end) {
  if (!start || !end) return 0;
  const [h1, m1] = start.split(':').map(Number), [h2, m2] = end.split(':').map(Number);
  let min = (h2 * 60 + m2) - (h1 * 60 + m1); if (min < 0) min += 1440;
  return Math.round((min / 60) * 100) / 100;
}

// ---------- 주말근무 마일리지 ----------
// 하루 합계 기준: 0~4시간 → 양호 1점/시간, 4~8시간 → 위로 마일리지 1점/시간, 8시간 초과는 인정 안 함
export function weekendByDay(data) {
  const map = {};
  for (const w of data.weekendWork || []) {
    const h = hoursBetween(w.start, w.end);
    (map[w.date] ||= { date: w.date, hours: 0, items: [] });
    map[w.date].hours += h; map[w.date].items.push({ ...w, hours: h });
  }
  return Object.values(map).map((d) => {
    const capped = Math.min(8, d.hours);
    const good = Math.min(4, capped);
    const comfort = Math.max(0, capped - 4);
    return { ...d, capped, good: round1(good), comfort: round1(comfort), over: Math.max(0, round1(d.hours - 8)) };
  }).sort((a, b) => b.date.localeCompare(a.date));
}
const round1 = (n) => Math.round(n * 10) / 10;
export function mileageSummary(data) {
  const days = weekendByDay(data);
  const per = data.mileagePerDay || 10;
  const comfort = round1(days.reduce((s, d) => s + d.comfort, 0));
  const good = round1(days.reduce((s, d) => s + d.good, 0));
  return { days, comfort, good, per, earnedDays: Math.floor(comfort / per), toNext: round1(per - (comfort % per)), hours: round1(days.reduce((s, d) => s + d.capped, 0)) };
}

// ---------- 상벌 (양호 / 과실) ----------
export function allMerits(data) {
  const manual = (data.merits || []).map((m) => ({ ...m, points: Number(m.points) || 0 }));
  const auto = weekendByDay(data).filter((d) => d.good > 0).map((d) => ({
    id: 'ww-' + d.date, date: d.date, type: '양호', points: d.good, reason: `주말근무 ${round1(d.capped)}시간 (${d.items.map((i) => i.task).filter(Boolean).join(', ') || '근무'})`, auto: true,
  }));
  return [...manual, ...auto].sort((a, b) => b.date.localeCompare(a.date));
}
export function meritByMonth(data) {
  const out = {};
  for (const m of allMerits(data)) {
    const ym = ymOf(m.date); (out[ym] ||= { ym, good: 0, bad: 0, goodN: 0, badN: 0 });
    if (m.type === '과실') { out[ym].bad += m.points; out[ym].badN++; } else { out[ym].good += m.points; out[ym].goodN++; }
  }
  return Object.values(out).map((x) => ({ ...x, good: round1(x.good), bad: round1(x.bad) })).sort((a, b) => b.ym.localeCompare(a.ym));
}
// 최근 2개월(오늘 포함) 안에 받은 과실 횟수 — 3회면 진급 누락 위험
export function faultWindow(data, today) {
  const from = addDays(addMonths(today, -2), 1);
  const list = (data.merits || []).filter((m) => m.type === '과실' && m.date >= from && m.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  // 가장 오래된 과실이 창 밖으로 빠지는 날
  const clearOn = list.length ? addMonths(list[0].date, 2) : null;
  return { count: list.length, from, list, clearOn, level: list.length >= 3 ? 'danger' : list.length === 2 ? 'warn' : list.length === 1 ? 'info' : 'ok' };
}
export function meritTotals(data) {
  const all = allMerits(data);
  return { good: round1(all.filter((m) => m.type !== '과실').reduce((s, m) => s + m.points, 0)), bad: round1(all.filter((m) => m.type === '과실').reduce((s, m) => s + m.points, 0)), badN: all.filter((m) => m.type === '과실').length };
}

// ---------- 운행 일지 ----------
export function driveStats(data, ym) {
  const list = (data.drives || []).filter((d) => !ym || ymOf(d.date) === ym);
  const hours = round1(list.reduce((s, d) => s + hoursBetween(d.start, d.end), 0));
  const km = round1(list.reduce((s, d) => s + (Number(d.km) || 0), 0));
  const by = {};
  for (const d of list) { (by[d.vehicle] ||= { vehicle: d.vehicle, n: 0, hours: 0, km: 0 }); by[d.vehicle].n++; by[d.vehicle].hours = round1(by[d.vehicle].hours + hoursBetween(d.start, d.end)); by[d.vehicle].km = round1(by[d.vehicle].km + (Number(d.km) || 0)); }
  return { n: list.length, hours, km, by: Object.values(by).sort((a, b) => b.hours - a.hours) };
}

// ---------- 체력 ----------
export const FIT_ITEMS = [
  { key: 'pushup', name: '팔굽혀펴기', unit: '회', better: 'up' },
  { key: 'situp', name: '윗몸일으키기', unit: '회', better: 'up' },
  { key: 'run', name: '3km 뜀걸음', unit: '', better: 'down' }, // 초 단위 저장
];
export const fmtRun = (sec) => (sec ? `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}` : '—');
export const parseRun = (s) => { if (!s) return 0; const [m, ss] = String(s).split(':').map(Number); return (m || 0) * 60 + (ss || 0); };
export function fitStats(data) {
  const recs = [...(data.fitness?.records || [])].sort((a, b) => a.date.localeCompare(b.date));
  return FIT_ITEMS.map((it) => {
    const vals = recs.filter((r) => Number(r[it.key]) > 0).map((r) => ({ date: r.date, v: Number(r[it.key]) }));
    const last = vals[vals.length - 1], prev = vals[vals.length - 2];
    const best = vals.length ? (it.better === 'up' ? Math.max(...vals.map((x) => x.v)) : Math.min(...vals.map((x) => x.v))) : 0;
    const goal = Number(data.fitness?.goals?.[it.key]) || 0;
    const gap = last && goal ? (it.better === 'up' ? goal - last.v : last.v - goal) : null;
    return { ...it, vals, last, prev, best, goal, gap, delta: last && prev ? last.v - prev.v : null };
  });
}

// ---------- 가계부 ----------
export function moneyMonth(data, ym, today) {
  const date = ym === ymOf(today) ? today : `${ym}-15`;
  const income = data.pay[rankOn(data, date).key] || 0;
  const sv = data.savings.enabled && ym >= data.savings.startMonth && ym <= ymOf(data.profile.discharge) ? data.savings.monthly : 0;
  const list = (data.expenses || []).filter((e) => ymOf(e.date) === ym);
  const spent = list.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const byCat = {};
  for (const e of list) byCat[e.cat] = (byCat[e.cat] || 0) + (Number(e.amount) || 0);
  const left = income - sv - spent;
  const daysLeft = ym === ymOf(today) ? daysInMonth(ym) - Number(today.slice(8, 10)) + 1 : 0;
  return { ym, income, savings: sv, spent, left, perDay: daysLeft ? Math.floor(Math.max(0, left) / daysLeft) : 0, daysLeft, byCat: Object.entries(byCat).sort((a, b) => b[1] - a[1]), list };
}

// ---------- 일기 ----------
export function diaryMemories(data, today) {
  const out = [];
  for (const [n, label] of [[1, '1개월 전'], [3, '3개월 전'], [6, '6개월 전'], [12, '1년 전']]) {
    const d = addMonths(today, -n); const e = data.diary?.[d];
    if (e && (e.text || e.mood)) out.push({ label, date: d, ...e });
  }
  return out;
}
export function diaryStreak(data, today) {
  let n = 0; let d = data.diary?.[today] ? today : addDays(today, -1);
  while (data.diary?.[d]) { n++; d = addDays(d, -1); }
  return n;
}

// ---------- 기념일 ----------
export function nextAnniv(a, today) {
  const md = a.date.slice(5);
  let y = Number(today.slice(0, 4));
  let d = `${y}-${md}`; if (md === '02-29' && daysInMonth(`${y}-02`) < 29) d = `${y}-02-28`;
  if (d < today) { y++; d = `${y}-${md}`; if (md === '02-29' && daysInMonth(`${y}-02`) < 29) d = `${y}-02-28`; }
  return { date: d, d: diffDays(today, d), years: a.date.slice(0, 4) !== '0000' ? y - Number(a.date.slice(0, 4)) : null };
}
export function annivYears(a) {
  if (!a.next?.years) return '';
  return a.kind === '생일' ? ` (만 ${a.next.years}세)` : ` (${a.next.years}주년)`;
}
export function upcomingAnnivs(data, today) {
  return (data.anniversaries || []).map((a) => ({ ...a, next: nextAnniv(a, today) })).sort((x, y) => x.next.d - y.next.d);
}

// ---------- 남은 기간 환산 ----------
export function remainingFun(data, today) {
  const end = data.profile.discharge;
  const sv = service(data, today);
  const left = Math.max(0, diffDays(today, end));
  let weekends = 0, paydays = 0;
  for (let i = 1; i < left; i++) { const d = addDays(today, i); if (new Date(Date.UTC(...d.split('-').map((v, j) => (j === 1 ? v - 1 : +v)))).getUTCDay() === 6) weekends++; }
  for (let ym = ymOf(today); ym <= ymOf(end); ym = addMonths(`${ym}-01`, 1).slice(0, 7)) { const d = paydayDate(data, ym); if (d > today && d <= end) paydays++; }
  const promos = RANKS.slice(1).filter((r) => data.profile.promo?.[r.key] > today);
  const nextPro = promos[0];
  // 명절 (설·추석 당일) — 전역 전까지 남은 횟수
  const holidays = (data.bigHolidays || BIG_HOLIDAYS).filter((h) => h.date > today && h.date <= end);
  const np = nextPayday(data, today);
  const p = sv.pct / 100;
  // 군생활을 하루 24시간으로 치면
  const mins = Math.floor(p * 1440), hh = Math.floor(mins / 60), mm = mins % 60;
  const clock = `${hh < 12 ? '오전' : '오후'} ${hh % 12 === 0 ? 12 : hh % 12}:${String(mm).padStart(2, '0')}`;
  const clockMsg = hh < 7 ? '아직 꿈나라… 기상나팔도 안 울렸어요' : hh < 12 ? '오전 일과 중! 점심까지 버텨요' : hh < 13 ? '점심시간! 딱 반 왔어요' : hh < 18 ? '오후 일과 중, 곧 저녁이에요' : hh < 22 ? '일과 끝! 개인정비 시간' : '곧 취침… 전역이 코앞!';
  const movie = Math.floor(p * 120), soccer = Math.floor(p * 90);
  return [
    { k: 'payday', e: '💵', v: np.d === 0 ? '오늘!' : `D-${np.d}`, n: '다음 월급날', s: `${fmtDate(np.date)}${np.moved ? ' · 주말·휴일이라 당겨짐' : ''} · 남은 월급날 ${paydays}번`, gold: true },
    { k: 'meals', e: '🍚', v: left * 3, u: '끼', n: '남은 짬밥', s: `지금까지 ${(sv.served * 3).toLocaleString()}끼 먹었어요` },
    { k: 'clock', e: '🕰️', v: clock, n: '군생활을 하루로 치면', s: clockMsg, viz: 'clock', p },
    { k: 'weekends', e: '🏖️', v: weekends, u: '번', n: '남은 주말', s: `남은 일요일 밤 우울함도 ${weekends}번` },
    { k: 'movie', e: '🎬', v: `${movie}분`, n: '2시간짜리 영화라면', s: movie < 60 ? '아직 전개 중… 반전은 지금부터!' : movie < 100 ? '클라이맥스 진입! 팝콘 아껴 먹어요' : '엔딩 크레딧 올라가는 중 🎞️' },
    { k: 'soccer', e: '⚽', v: soccer < 45 ? `전반 ${soccer}분` : `후반 ${soccer - 45}분`, n: '축구 경기라면', s: soccer < 45 ? '하프타임까지 조금만!' : soccer < 80 ? '후반전, 체력 안배 중' : '추가시간! 휘슬 직전' },
    { k: 'promos', e: '🎖️', v: promos.length, u: '번', n: '남은 진급', s: nextPro ? `다음은 ${nextPro.name} · ${fmtDate(data.profile.promo[nextPro.key])}` : '최고 계급 달성! 👑' },
    { k: 'roll', e: '🌙', v: left, u: '번', n: '남은 일석점호', s: '기상나팔도 딱 그만큼만 더 들으면 돼요' },
    { k: 'holidays', e: '🧧', v: holidays.length, u: '번', n: '부대에서 맞을 수도 있는 명절', s: holidays.length ? holidays.map((h) => `${h.name} ${fmtDate(h.date, false).slice(3)}`).join(' · ') : '명절은 이제 전부 집에서!' },
    { k: 'heart', e: '💓', v: left * 1440 * 70, u: '번', n: '남은 심장 박동 (분당 70회)', s: '두근두근… 전역 생각만 해도 빨라지는 중' },
    { k: 'weeks', e: '📆', v: Math.ceil(left / 7), u: '주', n: '남은 주', s: `시간으로는 ${(left * 24).toLocaleString()}시간` },
  ];
}
// 설·추석 당일 (2026~2027)
export const BIG_HOLIDAYS = [
  { name: '추석', date: '2026-09-25' }, { name: '설날', date: '2027-02-07' }, { name: '추석', date: '2027-09-15' },
];

// ---------- 업적 배지 ----------
export function badges(data, today) {
  const sv = service(data, today);
  const bestStreak = Math.max(0, ...(data.goals || []).map((g) => longestStreak(g.logs || {})));
  const ds = driveStats(data);
  const ms = mileageSummary(data);
  const diaryN = Object.keys(data.diary || {}).length;
  const fw = faultWindow(data, today);
  const anyFault = (data.merits || []).some((m) => m.type === '과실');
  const fit = fitStats(data);
  const pb = fit.some((f) => f.vals.length >= 2 && f.last && f.last.v === f.best && f.vals.filter((x) => x.v === f.best).length === 1);
  const expMonths = new Set((data.expenses || []).map((e) => ymOf(e.date))).size;
  const r = rankOn(data, today);
  const B = (id, emoji, name, desc, got, prog) => ({ id, emoji, name, desc, got: !!got, prog: got ? 1 : Math.max(0, Math.min(1, prog || 0)) });
  return [
    B('pct25', '🚛', '출발', '복무율 25%', sv.pct >= 25, sv.pct / 25),
    B('pct50', '🛣️', '반환점', '복무율 50%', sv.pct >= 50, sv.pct / 50),
    B('pct75', '🏁', '막바지', '복무율 75%', sv.pct >= 75, sv.pct / 75),
    B('done', '🎓', '전역', '복무 완료', sv.done, sv.pct / 100),
    B('pfc', '🎖️', '일병', '일병 진급', RANKS.indexOf(r) >= 1),
    B('cpl', '🎖️', '상병', '상병 진급', RANKS.indexOf(r) >= 2),
    B('sgt', '👑', '병장', '병장 진급', RANKS.indexOf(r) >= 3),
    B('g7', '🔥', '작심일주', '목표 7일 연속', bestStreak >= 7, bestStreak / 7),
    B('g30', '💎', '습관 완성', '목표 30일 연속', bestStreak >= 30, bestStreak / 30),
    B('d10', '🛻', '초보 운전병', '운행 10시간', ds.hours >= 10, ds.hours / 10),
    B('d100', '🏗️', '베테랑', '운행 100시간', ds.hours >= 100, ds.hours / 100),
    B('d1000', '🌏', '천 리 길', '운행 1,000km', ds.km >= 1000, ds.km / 1000),
    B('ww1', '🛠️', '주말 전사', '위로휴가 1일 적립', ms.earnedDays >= 1, ms.comfort / ms.per),
    B('ww3', '🏅', '근무왕', '위로휴가 3일 적립', ms.earnedDays >= 3, ms.comfort / (ms.per * 3)),
    B('diary30', '📔', '기록가', '일기 30일', diaryN >= 30, diaryN / 30),
    B('diary100', '📚', '군생활 자서전', '일기 100일', diaryN >= 100, diaryN / 100),
    B('clean', '😇', '모범 병사', '과실 없이 100일', !anyFault && sv.served >= 100, anyFault ? 0 : sv.served / 100),
    B('pb', '💪', '기록 갱신', '체력 개인 최고 기록', pb),
    B('money3', '🧾', '알뜰살뜰', '가계부 3개월 기록', expMonths >= 3, expMonths / 3),
    B('safe', '🛡️', '무사고', '최근 2개월 과실 0회', fw.count === 0 && sv.served >= 60),
  ];
}
function longestStreak(logs) {
  const days = Object.keys(logs).filter((k) => logs[k]).sort(); let best = 0, cur = 0, prev = null;
  for (const d of days) { cur = prev && addDays(prev, 1) === d ? cur + 1 : 1; best = Math.max(best, cur); prev = d; }
  return best;
}

// ---------- 월간 리포트 ----------
export function monthReport(data, ym, today) {
  const ds = driveStats(data, ym);
  const money = moneyMonth(data, ym, today);
  const moods = Object.entries(data.diary || {}).filter(([d, e]) => ymOf(d) === ym && e.mood).map(([, e]) => e.mood);
  const mer = meritByMonth(data).find((m) => m.ym === ym) || { good: 0, bad: 0, goodN: 0, badN: 0 };
  const ww = weekendByDay(data).filter((d) => ymOf(d.date) === ym);
  const fitRecs = (data.fitness?.records || []).filter((r) => ymOf(r.date) === ym).sort((a, b) => a.date.localeCompare(b.date));
  const goalsDone = (data.goals || []).reduce((s, g) => s + Object.keys(g.logs || {}).filter((d) => ymOf(d) === ym).length, 0);
  const outs = (data.leaves || []).filter((l) => ymOf(l.start) === ym);
  const endDay = ym === ymOf(today) ? today : `${ym}-${daysInMonth(ym)}`;
  return {
    ym, drives: ds, money,
    mood: moods.length ? round1(moods.reduce((a, b) => a + b, 0) / moods.length) : null, diaryN: moods.length,
    merit: mer, weekend: { days: ww.length, hours: round1(ww.reduce((s, d) => s + d.capped, 0)), comfort: round1(ww.reduce((s, d) => s + d.comfort, 0)) },
    fit: fitRecs[fitRecs.length - 1] || null, goalsDone,
    leaveDays: (data.leaves || []).flatMap(segsOf).filter((g) => g.kind === '휴가' && ymOf(g.start) === ym).reduce((s, g) => s + segDays(g), 0),
    outings: (data.leaves || []).flatMap(segsOf).filter((g) => isOuting(g.kind) && ymOf(g.start) === ym).length,
    overnights: (data.leaves || []).flatMap(segsOf).filter((g) => g.kind === '정기외박' && ymOf(g.start) === ym).length,
    pctEnd: service(data, endDay).pct,
  };
}

// ---------- 추가 알림 ----------
function extraNotifications(data, today, nowTime, out) {
  const on = data.notify || {};
  const tomorrow = addDays(today, 1);
  if (on.anniv) {
    for (const a of upcomingAnnivs(data, today)) {
      if (a.next.d === 1) out.push({ key: 'anniv', title: `🎂 내일은 ${a.name}`, body: `${a.who ? a.who + ' · ' : ''}${fmtDate(a.next.date)}${annivYears(a)} — 연락 잊지 마세요!` });
      if (a.next.d === 0) out.push({ key: 'anniv', title: `🎉 오늘은 ${a.name}`, body: `${a.who ? a.who + '에게 ' : ''}축하 메시지 보내보세요.` });
    }
  }
  if (on.diary && !data.diary?.[today]) out.push({ key: 'diary', title: '📔 오늘 하루는 어땠나요?', body: '기분 하나, 한 줄이면 충분해요.' });
  if (on.report && today.slice(8) === '01') {
    const r = monthReport(data, prevYM(ymOf(today)), today);
    out.push({ key: 'report', title: `📊 ${Number(r.ym.slice(5))}월 리포트가 나왔어요`, body: `운행 ${r.drives.hours}시간 · 지출 ${won(r.money.spent)} · 양호 ${r.merit.good}점${r.mood ? ` · 평균 기분 ${r.mood}` : ''}` });
  }
  if (on.leave) {
    const no = nextOvernight(data, today);
    if (no && !no.planned && no.windowStart === today) out.push({ key: 'leave', title: '🌙 정기외박 시기가 다가왔어요', body: `마지막 외박 후 ${data.overnight?.minWeeks || 5}주째! 예정일은 ${fmtDate(no.target)} 전후 (늦어도 ${fmtDate(no.windowEnd)})` });
  }
  if (on.payday) {
    const pdThis = paydayDate(data, ymOf(today)), pdNext = paydayDate(data, addMonths(`${ymOf(today)}-01`, 1).slice(0, 7));
    const amt = won(data.pay[rankOn(data, today).key] || 0);
    const moved = (d) => d.slice(8) !== String(data.payday || 10).padStart(2, '0');
    if (pdThis === today && today <= data.profile.discharge) out.push({ key: 'payday', title: pick(FUN.paydayTitle, today, 'pt'), body: `${amt} 입금 예정!${moved(today) ? ' (주말이라 금요일에 들어와요)' : ''} ${pick(FUN.paydayBody, today, 'pb')}` });
    for (const pdd of [pdThis, pdNext]) if (diffDays(today, pdd) === 1 && pdd <= data.profile.discharge) out.push({ key: 'payday', title: pick(FUN.paydayEveTitle, today, 'pe'), body: `내일 ${amt} 들어와요${moved(pdd) ? ' (주말이라 하루 일찍!)' : ''}. ${pick(FUN.paydayEveBody, today, 'pv')}` });
  }
  if (on.merit) {
    const fw = faultWindow(data, today);
    const last = fw.list[fw.list.length - 1];
    if (fw.count >= 2 && last && last.date === today) out.push({ key: 'merit', title: fw.count >= 3 ? '🚨 최근 2개월 과실 3회 이상' : '⚠️ 최근 2개월 과실 2회', body: fw.count >= 3 ? '진급 누락 기준에 해당할 수 있어요. 확인해보세요.' : `한 번 더 받으면 진급 누락 위험! ${fmtDate(fw.clearOn)}부터 1회 줄어요.` });
    const prevWin = faultWindow(data, addDays(today, -1));
    if (prevWin.count > fw.count && fw.count < prevWin.count) out.push({ key: 'merit', title: '🕊️ 과실 카운트가 줄었어요', body: `최근 2개월 과실 ${fw.count}회` });
  }
  return out;
}

// ---------- 월급날 (주말·공휴일이면 직전 평일) ----------
// 날짜가 고정된 공휴일만 기본 반영 (설·추석 등 음력 공휴일은 설정의 '추가 휴일'에 넣으면 반영)
export const FIXED_HOLIDAYS = ['01-01', '03-01', '05-05', '06-06', '08-15', '10-03', '10-09', '12-25'];
export function isOffDay(data, d) {
  const dow = new Date(Date.UTC(...d.split('-').map((v, i) => (i === 1 ? v - 1 : +v)))).getUTCDay();
  return dow === 0 || dow === 6 || FIXED_HOLIDAYS.includes(d.slice(5)) || (data.holidays || []).includes(d);
}
export function paydayDate(data, ym) {
  const day = Math.min(daysInMonth(ym), Math.max(1, Number(data.payday) || 10));
  let d = `${ym}-${String(day).padStart(2, '0')}`;
  // 주말·공휴일이면 직전 평일로 (보통 금요일)
  for (let guard = 0; guard < 10 && isOffDay(data, d); guard++) d = addDays(d, -1);
  return d;
}
export function nextPayday(data, today) {
  let d = paydayDate(data, ymOf(today));
  if (d < today) d = paydayDate(data, addMonths(`${ymOf(today)}-01`, 1).slice(0, 7));
  return { date: d, d: diffDays(today, d), moved: d.slice(8) !== String(Number(data.payday) || 10).padStart(2, '0') };
}

// ---------- 재밌는 문구 (날짜마다 바뀜) ----------
export function pick(arr, seed, salt = '') {
  let h = 2166136261; for (const c of seed + salt) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return arr[Math.abs(h) % arr.length];
}
export const FUN = {
  dailyTitle: [
    (v) => `⚓ 전역 D-${v.left}`, (v) => `🛻 오늘도 무사히 운행 완료! D-${v.left}`, (v) => `🔥 ${v.served}일 버텼다, D-${v.left}`,
    (v) => `📉 전역까지 ${v.left}일, 또 하루 줄었다`, (v) => `🍚 남은 짬밥 ${v.meals.toLocaleString()}끼`, (v) => `⏳ 복무율 ${v.pct}% 돌파 중`,
  ],
  dailyBody: [
    (v) => `${v.rank} · 복무율 ${v.pct}% · 오늘 하루도 수고했어요`, (v) => `${v.weeks}주만 더 버티면 사회인! 오늘 저녁 뭐 먹었어요?`,
    (v) => `복무율 ${v.pct}% — 지게차 아직 달리는 중 🚧`, (v) => `${v.rank} ${v.served}일째. 내일의 나에게 맡기고 오늘은 쉬어요`,
    (v) => `전역 시계는 오늘도 정상 작동 중 ✅ (${v.pct}%)`, (v) => `오늘 하루 수고! 남은 건 ${v.left}일뿐`,
  ],
  paydayTitle: ['💸 오늘은 월급날! 어떤 거 하고 싶으세요?', '🎉 띵동~ 월급이 도착했어요!', '💰 통장이 웃는 날, 월급날이에요', '🤑 월급 들어왔다! 오늘 PX 플렉스?'],
  paydayBody: ['냉동 털기? 적금 통장 보며 흐뭇해하기?', '이번 달 가계부도 잊지 말고 기록해요 🧾', '휴가 자금으로 모아둘까요, 오늘만 플렉스할까요?', '고생한 나에게 작은 선물 하나 어때요?'],
  paydayEveTitle: ['⏰ 내일은 월급날!', '💸 D-1, 월급이 오고 있어요', '🛻 월급 수송 차량 출발했습니다'],
  paydayEveBody: ['위시리스트 미리 정리해두세요', '오늘 밤은 설레서 잠 안 올지도?', '내일 PX 동선 미리 짜두기 📝'],
};

// ---------- 홈 화면 축하 팝업 ----------
export function celebrations(data, today) {
  const out = [], sv = service(data, today);
  const add = (key, emoji, title, msg, action) => out.push({ key: `${today}:${key}`, emoji, title, msg, action });
  for (const rk of RANKS.slice(1)) if (data.profile.promo?.[rk.key] === today) add('promo', '🎖️', `${rk.name} 진급을 축하합니다!`, `오늘부터 ${rk.name}! 이번 달 봉급은 ${won(data.pay[rk.key])}이에요.`, null);
  const pd = paydayDate(data, ymOf(today));
  if (pd === today && today <= data.profile.discharge) add('payday', '💸', pick(FUN.paydayTitle, today, 'pt'), `${won(data.pay[rankOn(data, today).key] || 0)} 입금 예정! ${pick(FUN.paydayBody, today, 'pb')}`, 'book');
  for (const a of upcomingAnnivs(data, today).filter((x) => x.next.d === 0)) add('anniv-' + a.id, a.kind === '생일' ? '🎂' : '💝', `오늘은 ${a.name}!`, `${a.who ? a.who + '에게 ' : ''}축하 메시지 보내는 거 잊지 마세요${annivYears(a)}`, null);
  if (sv.done && today === data.profile.discharge) add('done', '🎓', '전역을 축하합니다!', `${sv.total}일 동안 정말 수고 많으셨어요. 이제 사회로 출발!`, null);
  else {
    for (const p of [25, 50, 75]) if (addDays(data.profile.enlist, Math.ceil((sv.total * p) / 100)) === today) add('pct' + p, p === 50 ? '🛣️' : '🚛', `복무율 ${p}% 돌파!`, p === 50 ? '드디어 반환점! 이제 내리막길이에요.' : p === 75 ? '막바지! 끝이 보이기 시작해요.' : '4분의 1 완료! 순조로운 출발이에요.', null);
    if (sv.served > 0 && sv.served % 100 === 0) add('served', '💯', `복무 ${sv.served}일째!`, '100일마다 찾아오는 작은 축하 🎉', null);
    if ([100, 50, 30, 10, 1].includes(sv.left)) add('left', '⏳', sv.left === 1 ? '내일 전역!' : `전역 D-${sv.left}`, sv.left === 1 ? '마지막 밤이에요. 짐 싸셨나요?' : `이제 ${sv.left}일 남았어요!`, null);
  }
  for (const l of data.leaves || []) if (l.start === today) add('leave-' + l.id, '🧳', `오늘 ${l.kind === '연계' ? '출타' : l.kind === '휴가' ? segName(data, segsOf(l)[0]) : l.kind} 출발!`, `${l.memo ? l.memo + ' · ' : ''}즐겁게 다녀오세요!`, 'leave');
  return out;
}

// ---------- 정기외박 주기 ----------
export function overnightList(data) {
  return (data.leaves || []).flatMap((l) => segsOf(l).map((g) => ({ ...g, trip: l }))).filter((g) => g.kind === '정기외박').sort((a, b) => a.start.localeCompare(b.start));
}
export function nextOvernight(data, today) {
  const cfg = { cycleWeeks: 6, minWeeks: 5, maxWeeks: 7, nights: 2, ...(data.overnight || {}) };
  const list = overnightList(data);
  const upcoming = list.find((g) => g.end >= today);
  if (upcoming) return { planned: true, seg: upcoming, d: diffDays(today, upcoming.start), ongoing: upcoming.start <= today };
  const last = list[list.length - 1];
  if (!last) return null;
  const target = addDays(last.start, cfg.cycleWeeks * 7), ws = addDays(last.start, cfg.minWeeks * 7), we = addDays(last.start, cfg.maxWeeks * 7);
  return { planned: false, last: last.start, target, windowStart: ws, windowEnd: we, d: diffDays(today, target), weeksSince: Math.floor(diffDays(last.start, today) / 7), cfg };
}
