// 매일 18시(KST) GitHub Actions가 실행 → Firestore의 내 데이터를 읽고 → 오늘 보낼 알림을 FCM으로 발송
// 로컬 테스트:  FIREBASE_SERVICE_ACCOUNT='{"type":...}' node notifier/send.js --dry
import admin from 'firebase-admin';
import { buildNotifications, defaultData, kstToday, kstTime } from '../logic.js';

const DRY = process.argv.includes('--dry');
const TEST = process.argv.includes('--test') || process.env.SEND_TEST === 'true';
const APP_URL = process.env.APP_URL || './';

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
if (!sa.project_id) { console.error('FIREBASE_SERVICE_ACCOUNT 시크릿이 비어 있어요. README 3단계를 확인하세요.'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const today = process.env.TODAY || kstToday();
const now = process.env.NOW || (kstTime() < '17:30' ? '18:00' : kstTime());
console.log(`[군생활 관리] ${today} ${now} 알림 발송 시작${DRY ? ' (DRY RUN)' : ''}${TEST ? ' (TEST)' : ''}`);

const users = await db.collection('users').where('pushOn', '==', true).get();
let sent = 0;
for (const doc of users.docs) {
  const r = doc.data();
  const tokens = r.tokens || [];
  if (!r.json || !tokens.length) continue;
  const base = defaultData(); const d = JSON.parse(r.json);
  const data = { ...base, ...d, notify: { ...base.notify, ...(d.notify || {}) }, profile: { ...base.profile, ...d.profile } };

  let msgs = buildNotifications(data, today, now);
  if (TEST) msgs = [{ key: 'test', title: '⚓ 테스트 알림', body: '푸시 연결이 정상이에요! 매일 18시에 만나요.' }, ...msgs];
  console.log(`- ${doc.id.slice(0, 6)}… 토큰 ${tokens.length}개, 알림 ${msgs.length}건`);
  for (const m of msgs) console.log(`   · [${m.key}] ${m.title} — ${m.body.replace(/\n/g, ' / ')}`);
  if (DRY || !msgs.length) continue;

  const bad = new Set();
  for (const [i, m] of msgs.entries()) {
    const res = await admin.messaging().sendEachForMulticast({
      tokens,
      data: { title: m.title, body: m.body, tag: `${today}-${m.key}-${i}`, url: APP_URL },
      webpush: { headers: { Urgency: 'high', TTL: String(6 * 3600) } },
    });
    res.responses.forEach((x, j) => {
      if (x.success) sent++;
      else {
        const code = x.error?.code || '';
        console.warn(`   ! 실패 ${code}`);
        if (code.includes('registration-token-not-registered') || code.includes('invalid-argument') || code.includes('invalid-registration-token')) bad.add(tokens[j]);
      }
    });
  }
  if (bad.size) {
    await doc.ref.update({ tokens: admin.firestore.FieldValue.arrayRemove(...bad) });
    console.log(`   만료된 토큰 ${bad.size}개 정리`);
  }
}
console.log(`완료: ${sent}건 전송`);
process.exit(0);
