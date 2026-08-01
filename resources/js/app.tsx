import { createInertiaApp } from '@inertiajs/react';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    progress: {
        // app.css の --color-primary-600 と同値。片方を変えたら両方直すこと。
        color: '#547048',
    },
});

// サービスワーカーの登録。dev では登録しない。アセットが Vite の :5173 から配信されるため
// キャッシュ規則が噛み合わず、一度登録された SW が開発中ずっと残って原因不明の不整合を生むため。
// 動作確認は npm run build してから http://localhost を開くこと。
//
// パスの条件は管理画面を除外するためのものではない（除外は /app/ というスコープが担う）。
// 管理画面から範囲外の SW を登録しても無意味なので、呼ばないだけである。
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.pathname.startsWith('/app/')) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/app/sw.js');
    });
}
