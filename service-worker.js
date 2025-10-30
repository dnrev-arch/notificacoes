// ============ SERVICE WORKER - PIX NOTIFIER ============
// Este arquivo roda em background e mantém as notificações funcionando
// mesmo quando o app está fechado

const CACHE_NAME = 'pix-notifier-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// ============ INSTALAÇÃO ============
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// ============ ATIVAÇÃO ============
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Ativando...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ============ FETCH (CACHE FIRST) ============
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retorna do cache se existir
        if (response) {
          return response;
        }
        
        // Senão, busca da rede
        return fetch(event.request).then((response) => {
          // Não cachear API calls
          if (event.request.url.includes('/api/')) {
            return response;
          }
          
          // Cachear outros recursos
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          
          return response;
        });
      })
      .catch(() => {
        // Fallback se offline
        return new Response('Offline - Sem conexão', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      })
  );
});

// ============ NOTIFICAÇÕES PUSH ============
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push recebido:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Novo PIX gerado!',
    icon: 'https://cdn-icons-png.flaticon.com/512/825/825454.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/825/825454.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'pix-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'Ver Detalhes',
        icon: 'https://cdn-icons-png.flaticon.com/512/709/709612.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: 'https://cdn-icons-png.flaticon.com/512/458/458594.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('💰 Novo PIX!', options)
  );
});

// ============ CLIQUE NA NOTIFICAÇÃO ============
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notificação clicada:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    // Abrir/focar no app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Se já tiver uma janela aberta, focar nela
          for (let i = 0; i < clientList.length; i++) {
            const client = clientList[i];
            if (client.url.includes('index.html') && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Senão, abrir nova janela
          if (clients.openWindow) {
            return clients.openWindow('/');
          }
        })
    );
  }
});

// ============ FECHAR NOTIFICAÇÃO ============
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notificação fechada');
});

// ============ MENSAGENS DO APP ============
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Mensagem recebida:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Responder ao app principal
  if (event.data && event.data.type === 'PING') {
    event.ports[0].postMessage({ type: 'PONG', status: 'Service Worker ativo' });
  }
});

// ============ SINCRONIZAÇÃO EM BACKGROUND ============
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-pix') {
    event.waitUntil(
      // Aqui você pode fazer verificação periódica mesmo offline
      checkPixStatus()
    );
  }
});

async function checkPixStatus() {
  try {
    // Esta função pode ser expandida para verificar PIX mesmo quando o app está fechado
    console.log('[Service Worker] Verificando status dos PIX...');
    
    // Por enquanto, apenas log - pode ser expandido para fazer fetch à API
    return Promise.resolve();
  } catch (error) {
    console.error('[Service Worker] Erro ao verificar PIX:', error);
    return Promise.reject(error);
  }
}

// ============ LOG DE STATUS ============
console.log('[Service Worker] Script carregado e pronto');
console.log('[Service Worker] Cache:', CACHE_NAME);
