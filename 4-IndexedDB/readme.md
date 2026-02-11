# IndexedDB

คือฐานข้อมูลแบบ NoSQL ที่ฝังอยู่ในเบราว์เซอร์มีประสิทธิภาพสูง ออกแบบมาเพื่อจัดการกับข้อมูลจำนวนมากที่ Cache Storage ปกติทำไม่ได้ สามารถเก็บข้อมูลที่มีโครงสร้างซับซ้อนได้ มีจุดเด่นที่สามารถค้นหา (Search), คัดกรอง (Filter) และจัดเรียงข้อมูลได้รวดเร็วผ่าน Index และยังมีความจุเก็บข้อมูลได้มาก (ขึ้นอยู่กับพื้นที่ว่างของเครื่อง)

# คุณสมบัติเด่นของ IndexedDB

1. Stores structured objects (เก็บข้อมูลเป็นโครงสร้าง)
   เก็บข้อมูลในรูปแบบ JavaScript Objects (คล้าย JSON) คุณสามารถเก็บข้อมูลที่มีความซับซ้อน เช่น ข้อมูลผู้ใช้ที่มี Array ของคำสั่งซื้อซ้อนอยู่ข้างในได้เลยโดยไม่ต้องแปลงเป็น String ก่อน

2. Supports indexes & queries (รองรับการทำดัชนีและการค้นหา)
   นี่คือจุดที่ต่างจาก ID ทั่วไป เพราะคุณสามารถตั้ง Index ให้กับฟิลด์ไหนก็ได้ เช่น ราคา, วันที่, หรือหมวดหมู่

3. Works offline (ทำงานได้แม้ไม่มีอินเทอร์เน็ต)
   ข้อมูลทั้งหมดถูกบันทึกไว้ในหน่วยความจำของเครื่องผู้ใช้ (Client-side) เมื่อแอปพลิเคชันเข้าสู่สภาวะออฟไลน์ PWA จะไปดึงข้อมูลจาก IndexedDB มาแสดงผลแทนการรอข้อมูลจาก API Server ทำให้แอปฯ ยังใช้งานต่อได้ราบรื่น

4. Async & persistent (ทำงานแบบไม่ขัดจังหวะและคงอยู่ถาวร)
   Async: การอ่าน/เขียนข้อมูลทำงานแบบ Asynchronous ทำให้หน้าจอไม่ค้างขณะประมวลผลข้อมูลจำนวนมาก
   Persistent: ข้อมูลจะคงอยู่ถาวรแม้ผู้ใช้จะปิดเบราว์เซอร์หรือรีสตาร์ทเครื่อง (จนกว่าจะมีการสั่งลบผ่านโค้ดหรือล้างข้อมูลเบราว์เซอร์)

# เปรียบเทียบ IndexedDB กับ Cache Storage

| คุณสมบัติ           | Cache Storage                                       | IndexedDB                                                                        |
| ------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------- |
| เหมาะสำหรับเก็บอะไร | ไฟล์ (Assets) เช่น HTML, CSS, JS, รูปภาพ, ลิงก์ CDN | ข้อมูล (Data) เช่น รายชื่อสินค้า, ข้อความแชท, แบบฟอร์มที่พนักงานกรอก             |
| โครงสร้างข้อมูล     | Request / Response (มาเป็นคู่ๆ เหมือนก๊อปปี้ไฟล์มา) | NoSQL Key-Value Pairs (เหมือน JSON Object)                                       |
| การค้นหา            | หาได้เฉพาะ URL ที่ระบุไว้เท่านั้น                   | ค้นหาข้อมูลจาก Id หรือ ข้อมูลใน record ได้ เช่น "หาสินค้าที่ราคามากกว่า 100 บาท" |
| สถานะการทำงาน       | ใช้จัดการตอน Offline (Fetch Event)                  | ใช้จัดการตอน Offline และ Online (จัดการผ่าน JS ปกติ)                             |

# Workshop

1. แก้ไขไฟล์ inventories.html เราจะเปลี่ยนจากการเก็บข้อมูลใน cache ไปเก็บใน indexedDB แทน

```

// Register Service Worker
...

//ประกาศฐานข้อมูล indexedDB
const DB_NAME = "PWAInventoryDB";
const DB_VERSION = 1;

//ประกาศชื่อตารางที่จะใช้เก็บข้อมูล
const STORE_NAME = "products";

const inventories = document.getElementById("inventories");
const products = [];

window.addEventListener("DOMContentLoaded", async () => {
   await load();
});

async function load() {
   inventories.innerHTML = `
         <div class="w-full text-center">
            <h1>กำลังโหลดข้อมูล...</h1>
         </div>
   `;
   const dbs = await window.indexedDB.databases();
   const exists = dbs.some(db => db.name === DB_NAME);

   if (exists) {
         console.log("load data from indexedDB");

         const all = await getAllFromIndexedDB();

         if (all.length > 0) {
            products.splice(0, products.length, ...all);
         } else {
            const res = await fetchProducApi();

            if (res.products.length > 0) {
               products.splice(0, products.length, ...res.products);
               await saveAllToIndexDb(products);
            }
         }

   } else {
         console.log("load data from api");

         const res = await fetchProducApi();

         if (res.products.length > 0) {
            products.splice(0, products.length, ...res.products);
            await saveAllToIndexDb(products);
         }
   }

   render(products);
}

async function fetchProducApi() {
   const res = await fetch("https://dummyjson.com/products?limit=20&select=id,title,description,price,stock,thumbnail");
   return await res.json();
}

function render(products) {
   ...
}

// Open IndexedDB database
function openDB() {
   return new Promise((resolve, reject) => {
         const request = indexedDB.open(DB_NAME, DB_VERSION);

         request.onerror = () => reject(request.error);
         request.onsuccess = () => resolve(request.result);

         request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
               //กำหนดให้ primary key คือ id
               const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
               store.createIndex("status", "status", { unique: false });
            }
         };
   });
}

// Get all items from IndexedDB
const getAllFromIndexedDB = async () => {
   const db = await openDB();
   return new Promise((resolve, reject) => {
         const transaction = db.transaction([STORE_NAME], "readonly");
         const store = transaction.objectStore(STORE_NAME);
         const request = store.getAll();

         request.onsuccess = () => resolve(request.result);
         request.onerror = () => reject(request.error);

         transaction.oncomplete = () => db.close();
   });
};

// Save product to IndexedDB
async function saveAllToIndexDb(products) {
   if (products.length === 0) {
         return;
   }

   const db = await openDB();

   return new Promise((resolve, reject) => {
         // 1. เปิด Transaction แบบ readwrite ครั้งเดียวสำหรับทุกรายการ
         const transaction = db.transaction([STORE_NAME], "readwrite");
         const store = transaction.objectStore(STORE_NAME);

         // 2. วนลูปเพื่อนำสินค้าแต่ละชิ้นใส่ลงใน Store
         products.forEach((item) => {
            store.add(item);
         })

         // 3. รอให้ Transaction ทำงานเสร็จสิ้นทั้งหมด
         transaction.oncomplete = () => {
            console.log("บันทึกสินค้าทั้งหมดเรียบร้อยแล้ว");
            db.close();
            resolve();
         };

         transaction.onerror = () => {
            console.error("เกิดข้อผิดพลาดในการบันทึก");
            reject(transaction.error);
         };

         transaction.oncomplete = () => db.close();
   });
}

```

2. สร้างหน้า detail.html แสดงข้อมูลรายการสินค้าจาก product id

> //เพิ่มเก็บหน้า detail.html ใน cache
>
> const PRECACHE_URLS = [
>
> > ...,
> > "detail.html",
> > ];

เพิ่มโค้ดสำหรับดึงข้อมูลจาก indexedDB แต่ถ้าไม่มีให้ไปโหลดจาก api

```

<script>
// Register Service Worker
if ("serviceWorker" in navigator) {
   window.addEventListener("load", async () => {
         try {
            const reg = await navigator.serviceWorker.register("./sw.js");
            console.log("SW registered:", reg.scope);
         } catch (err) {
            console.warn("SW registration failed:", err);
         }
   });
}

//ประกาศฐานข้อมูล indexedDB
const DB_NAME = "PWAInventoryDB";
const DB_VERSION = 1;

//ประกาศชื่อตารางที่จะใช้เก็บข้อมูล
const STORE_NAME = "products";

const output = document.getElementById("output");
const urlParams = new URLSearchParams(window.location.search);
const { id } = Object.fromEntries(urlParams.entries());

window.addEventListener("DOMContentLoaded", async () => {
   await load(id);
});

async function load(id) {
   output.innerHTML = `
         <div class="w-full text-center">
            <h1>กำลังโหลดข้อมูล...</h1>
         </div>
   `;

   const dbs = await window.indexedDB.databases();
   const exists = dbs.some(db => db.name === DB_NAME);

   if (exists) {
         const product = await getAllFromIndexedDB(Number(id));

         if (product) {
            render(product);
         } else {
            const product = await fetchProducApi(id);
            render(product);

            if (product) {
               await saveToIndexDb(product)
            }
         }

   } else {
         const product = await fetchProducApi(id);

         render(product);
         if (product) {
            await saveToIndexDb(product)
         }
   }
}

async function fetchProducApi(id) {
   const res = await fetch(`https://dummyjson.com/products/${id}?select=id,title,description,price,stock,thumbnail`);
   return await res.json();
}

function render(product) {
   if (product) {
         output.innerHTML = `
            <div>
               <img src="${product.thumbnail}"
                     class="rounded-md border border-gray-200">
            </div>
            <div class="flex flex-col gap-4">
               <p><b>รหัสสินค้า: </b> ${product.id}</p>
               <p><b>ชื่อสินค้า: </b> ${product.title}</p>
               <p><b>รายละเอียด: </b> ${product.description}</p>
               <p><b>จำนวน: </b> ${product.stock}</p>
               <p><b>ราคา: </b> ${product.price}</p>
            </div>
         `;
   } else {
         output.innerHTML = `
            <div class="w-full text-center text-gray-400 italic">ไม่พบรายการสินค้า</div>
         `
   }
}

// Open IndexedDB database
function openDB() {
   return new Promise((resolve, reject) => {
         const request = indexedDB.open(DB_NAME, DB_VERSION);

         request.onerror = () => reject(request.error);
         request.onsuccess = () => resolve(request.result);

         request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
               //กำหนดให้ primary key คือ id
               const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
               store.createIndex("status", "status", { unique: false });
            }
         };
   });
}

// get product by id
async function getAllFromIndexedDB(id) {
   const db = await openDB();

   return new Promise((resolve, reject) => {
         const transaction = db.transaction([STORE_NAME], "readonly");
         const store = transaction.objectStore(STORE_NAME);

         const request = store.get(id);

         request.onsuccess = () => {
            if (request.result) {
               console.log("พบข้อมูลสินค้า:", request.result);
               resolve(request.result);
            } else {
               console.log("ไม่พบสินค้าที่มี ID นี้");
               resolve(null);
            }
         };

         request.onerror = () => {
            console.error("เกิดข้อผิดพลาดในการดึงข้อมูล");
            reject(request.error);
         };

         // ปิดการเชื่อมต่อเมื่อจบงาน
         transaction.oncomplete = () => db.close();
   });
};


// Save product to IndexedDB
async function saveToIndexDb(product) {
   if (!product) {
         return;
   }

   const db = await openDB();

   return new Promise((resolve, reject) => {
         // 1. เปิด Transaction แบบ readwrite ครั้งเดียวสำหรับทุกรายการ
         const transaction = db.transaction([STORE_NAME], "readwrite");
         const store = transaction.objectStore(STORE_NAME);

         // 2. นำสินค้าใส่ลงใน Store
         store.add(product);

         // 3. รอให้ Transaction ทำงานเสร็จสิ้น
         transaction.oncomplete = () => {
            console.log("บันทึกสินค้าเรียบร้อยแล้ว");
            db.close();
            resolve();
         };

         transaction.onerror = () => {
            console.error("เกิดข้อผิดพลาดในการบันทึก");
            reject(transaction.error);
         };

         transaction.oncomplete = () => db.close();
   });
}
</script>

```

ทดลองใช้เว็บไซต์ทั้งใน mode online และ offiline
หากต้องการดูข้อมูลใน indexedDB สามารถดูได้เองจาก Browser DevTools กด F12 หรือคลิกขวาเลือก Inspect แล้วไปที่แถบ (Tab) Application ที่เมนูด้านซ้าย มองหาหัวข้อ Storage > IndexedDB จะเห็นชื่อฐานข้อมูลที่เราสร้าง
