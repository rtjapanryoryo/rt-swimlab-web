import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/supabase/server';
import Dashboard from '@/components/Dashboard';

export default async function HomePage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/login');

  return (
    <div className="min-h-screen bg-slate-900">
      {/* ヘッダー */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">RT Swim Lab</h1>
              <p className="text-xs text-slate-400">管理ポータル</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">
              {admin.display_name ?? admin.email}
            </span>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800"
              >
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* メイン */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">ダッシュボード</h2>
          <p className="text-sm text-slate-400 mt-1">ユーザーの利用状況を確認できます</p>
        </div>
        <Dashboard />
      </main>
    </div>
  );
}
