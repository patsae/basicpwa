// Simple offline navigation for 3 static pages

const CACHE_NAME = "my-cached-v1";

// เราจะ precache หน้าเพจ,CDN และ resource ต่างๆที่จำเป็น เพื่อให้การทำงานใน mode offline แล้วยังสามารถใช้งานได้
const PRECACHE_URLS = [
  "/",
  "index.html",
  "offline.html",
  "about-us.html",
  "contact-us.html",
  "inventories.html",
  "user.html",
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

  // ✅ Network-First เฉพาะ GET inventories
  if (req.method === "GET" && req.url.includes("/dummyjson.com")) {
    event.respondWith(networkFirst(req));
    return;
  }

  //Stale-While-Revalidate
  if (req.method === "GET" && req.url.includes("randomuser.me/api")) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  if (req.mode === "navigate") {
    console.log("Handling navigation request for", req);
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
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

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);

  try {
    // 1) พยายามเอาจาก network ก่อน
    const fresh = await fetch(req);

    // 2) ถ้าได้ 200 เก็บลง cache ไว้ใช้ตอน offline
    if (fresh && fresh.ok) {
      cache.put(req, fresh.clone());
    }

    return fresh;
  } catch (e) {
    // 3) ถ้า network พัง → เอาจาก cache
    const cached = await cache.match(req);
    if (cached) return cached;

    // 4) ไม่มี cache เลย → ส่ง error response แบบง่าย
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME);
  console.log("[staleWhileRevalidate] for Request", req.url);
  const cached = await cache.match(req.url, { ignoreVary: true });
  console.log("[staleWhileRevalidate] for Cache", cached);

  // ✅ Background update - always fetch to revalidate
  const networkPromise = fetch(req)
    .then(async (fresh) => {
      if (fresh && fresh.ok) {
        const old = await cache.match(req.url, { ignoreVary: true });

        // เปรียบเทียบ response เพื่อดูว่าเปลี่ยนหรือไม่
        const oldText = old ? await old.text() : null;
        const freshClone = fresh.clone();
        const freshText = await freshClone.text();
        const changed = oldText !== freshText;

        // บันทึก cache ใหม่
        await cache.put(req, fresh.clone());

        // ส่ง message ถ้าข้อมูลเปลี่ยน
        if (changed) {
          const clients = await self.clients.matchAll();
          for (const client of clients) {
            client.postMessage({
              type: "USER_API_UPDATED",
              data: freshText,
            });
          }
        }
      }
      return fresh;
    })
    .catch(() => null);

  // ถ้ามี cache คืนทันที + background update
  if (cached) {
    console.log("ฉันมี USER Cache");
    return cached;
  }

  // ไม่มี cache รอ network
  return (
    (await networkPromise) ??
    new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" },
    })
  );
}
