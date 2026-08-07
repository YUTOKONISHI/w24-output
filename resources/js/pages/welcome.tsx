import { Head, Link } from '@inertiajs/react';
import { login } from '@/routes';

export default function Welcome() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6 py-12">
      <Head title="ストック管理アプリ" />

      <main className="w-full max-w-sm flex flex-col items-center text-center">
        <img
          src="/icons/icon-192.png"
          alt=""
          width={96}
          height={96}
          className="w-24 h-24 rounded-full"
        />

        <p className="mt-8 text-sm text-ink-muted">うっかり買い忘れをなくそう</p>
        <h1 className="mt-1 text-3xl font-bold text-ink">ストック管理アプリ</h1>

        <div className="mt-6 space-y-1 text-sm text-ink-muted leading-relaxed">
          <p>切らすと困るものを、買ったときに登録しておくだけ。</p>
          <p>ストック数と消費日数から、次に買う日を自動で計算します。</p>
        </div>

        <Link
          href={login.url()}
          className="mt-10 block w-full bg-primary-600 text-white text-center py-3 rounded hover:bg-primary-700 transition"
        >
          利用開始
        </Link>
      </main>
    </div>
  );
}
