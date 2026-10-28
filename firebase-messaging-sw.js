// 서비스 워커: 오프라인 캐시 + 앱이 꺼져 있을 때 푸시 알림 표시
importScripts('./firebase-config.js');

const CACHE = 'navy-log-v10';
const SHELL = ['./', './index.html', './logic.js', './firebase-config.js', './manifest.webmanifest',
  './fonts/PretendardVariable.woff2', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // 네트워크 우선, 실패하면 캐시 (업데이트가 바로 반영되도록)
  e.respondWith(fetch(e.request).then((res) => {
    const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))));
});

// 푸시 수신 → 알림 표시 (발송기는 data 메시지로 보냄)
self.addEventListener('push', (e) => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (_) { p = { data: { title: '군생활 관리', body: e.data && e.data.text() } }; }
  const d = p.data || p.notification || {};
  const title = d.title || '⚓ 군생활 관리';
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || '',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: d.tag || undefined,
    data: { url: d.url || './' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url.startsWith(self.registration.scope)) return c.focus();
    return self.clients.openWindow(target);
  }));
});
