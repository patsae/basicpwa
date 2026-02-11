// Simple offline navigation for 3 static pages

const CACHE_NAME = "my-cached-v1";

// เราจะ precache หน้าเพจ,CDN และ resource ต่างๆที่จำเป็น เพื่อให้การทำงานใน mode offline แล้วยังสามารถใช้งานได้
const PRECACHE_URLS = [
  "/",
  "index.html",
  "inventories.html",
  "detail.html",
  "offline.html",
  "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4",
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=info",
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,0,0&icon_names=globe_2_cancel",
];

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

  console.log("SW installing");
  self.skipWaiting();
});

//activate
self.addEventListener("activate", (event) => {
  console.log("SW activating");
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
  console.log("SW FETCH");
  const req = event.request;

  if (req.mode === "navigate") {
    console.log("Handling navigation request for", req);
    event.respondWith(
      (async () => {
        const cached = await caches.match(req, {
          ignoreSearch: true,
        });
        if (cached) return cached;

        //fallback page
        return caches.match("/offline.html");
      })(),
    );
    return;
  }

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
