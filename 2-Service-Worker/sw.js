// Simple offline navigation for 3 static pages

const CACHE_NAME = "my-cached-v1";

// เราจะ precache หน้าเพจ,CDN และ resource ต่างๆที่จำเป็น เพื่อให้การทำงานใน mode offline แล้วยังสามารถใช้งานได้
const PRECACHE_URLS = ["/", "index.html"];

//Install
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // addAll จะพยายาม cache ทุก URL
      // ถ้า CDN บางอัน fail ก็ยังมี local pages (ถ้าอยาก strict ให้แยก try/catch)
      await cache.addAll(PRECACHE_URLS);
    })(),
  );

  self.skipWaiting();
});

//activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

//fetch
// Offline navigation:
// - ถ้าเป็น "เปิดหน้า" (navigate) ให้ตอบจาก cache ก่อน
// - ถ้าไม่มีใน cache (เช่นเปิดครั้งแรกแบบ offline) ให้ไป offline.html
self.addEventListener("fetch", async (event) => {
  const req = event.request;

  // Static assets: cache-first
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) return cached;

      try {
        const fresh = await fetch(req);
        // เก็บเฉพาะ response ที่ปกติ
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        // ถ้าเป็น resource อื่น ๆ แล้ว offline จริง ๆ ก็ปล่อยไป
        return cached;
      }
    })(),
  );
});
