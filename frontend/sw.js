const C="cclas-nina-v2",F=["./","index.html","css/styles.css","js/config.js","js/api.js","js/icons.js","js/audio.js","js/data.js","js/game.js","manifest.webmanifest","icons/icon.svg"];
self.addEventListener("install",e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=C).map(x=>caches.delete(x))))));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET"||e.request.url.includes("/api/"))return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{const c=n.clone();caches.open(C).then(x=>x.put(e.request,c));return n}).catch(()=>caches.match("index.html"))))});
