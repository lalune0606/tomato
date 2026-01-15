// 缓存名称
const CACHE_NAME = 'tomato-pwa-v1';

// 需要缓存的资源列表
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './sounds/bell.mp3',
  './icons/icon-72x72.png',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// 安装 Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker: 正在安装...');
  
  // 等待缓存完成
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: 缓存文件中...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: 安装完成');
        return self.skipWaiting();
      })
  );
});

// 激活 Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: 正在激活...');
  
  // 清理旧缓存
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: 清除旧缓存', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  console.log('Service Worker: 激活完成');
  return self.clients.claim();
});

// 拦截请求
self.addEventListener('fetch', event => {
  // 只处理同源请求
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('cdnjs.cloudflare.com') &&
      !event.request.url.includes('cdn.jsdelivr.net')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果缓存中有，直接返回
        if (response) {
          return response;
        }
        
        // 否则从网络获取
        return fetch(event.request)
          .then(response => {
            // 检查是否是有效响应
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 克隆响应
            const responseToCache = response.clone();
            
            // 将新资源添加到缓存
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.log('获取失败:', error);
            
            // 如果是HTML请求，返回离线页面
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// 接收消息
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});