import { clientsClaim } from 'workbox-core';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);
clientsClaim();

const navigationHandler = createHandlerBoundToURL('/index.html');

registerRoute(
  new NavigationRoute(navigationHandler, {
    denylist: [/^\/api\//, /^\/datos/, /^\/admin/, /^\/qr/],
  }),
);

self.addEventListener('install', () => self.skipWaiting());
