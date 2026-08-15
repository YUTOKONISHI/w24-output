import { createInertiaApp } from '@inertiajs/react';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
  title: (title) => (title ? `${title} - ${appName}` : appName),
  progress: {
    color: '#547048',
  },
});

if (import.meta.env.PROD && 'serviceWorker' in navigator && location.pathname.startsWith('/app/')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/app/sw.js');
  });
}
