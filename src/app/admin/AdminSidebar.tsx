'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// ── アイコン ────────────────────────────────────────────────────────────────

const ic = 'w-4 h-4 shrink-0';

function OverviewIcon()  { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="8" rx="1.5"/><rect x="14" y="3" width="7" height="4" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="10" width="7" height="11" rx="1.5"/></svg>; }
function RevenueIcon()   { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 6v2m0 8v2m-3-7h6m-6 3h4"/><path d="M9 9h1.5a1.5 1.5 0 0 1 0 3H9m0 0h4a1.5 1.5 0 0 1 0 3H9"/></svg>; }
function CustomersIcon() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1"/><circle cx="18" cy="8" r="2.5"/><path d="M21 20v-.5a4 4 0 0 0-5-3.87"/></svg>; }
function AnalyticsIcon() { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>; }
function FeedbackIcon()  { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function SettingsIcon()  { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v3m0 16v3M4.22 4.22l2.12 2.12m11.32 11.32 2.12 2.12M1 12h3m16 0h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>; }
function LogoutIcon()    { return <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }

// ── ナビ定義 ──────────────────────────────────────────────────────────────

const NAV = [
  {
    section: 'メイン',
    items: [
      { href: '/admin',           label: '概要',       icon: OverviewIcon,  exact: true },
      { href: '/admin/revenue',   label: '収益管理',   icon: RevenueIcon                },
      { href: '/admin/customers', label: '顧客管理',   icon: CustomersIcon              },
    ],
  },
  {
    section: '分析',
    items: [
      { href: '/admin/analytics', label: '利用分析',         icon: AnalyticsIcon },
      { href: '/admin/feedback',  label: 'フィードバック管理', icon: FeedbackIcon  },
    ],
  },
  {
    section: 'システム',
    items: [
      { href: '/admin/settings',  label: '設定・同期', icon: SettingsIcon               },
    ],
  },
];

// ── コンポーネント ─────────────────────────────────────────────────────────

export default function AdminSidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 w-56 bg-slate-900 border-r border-slate-800 flex flex-col z-40">
      {/* ブランド */}
      <div className="px-5 py-5 border-b border-slate-800">
        <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">RT Swimlab</p>
        <p className="text-sm font-bold text-white mt-0.5">管理者パネル</p>
      </div>

      {/* ナビ */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-1.5">
              {section}
            </p>
            <ul className="space-y-0.5">
              {items.map(({ href, label, icon: Icon, exact }) => {
                const isActive = exact ? pathname === href : pathname.startsWith(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Icon />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* フッター */}
      <div className="px-4 py-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-amber-400">
              {adminName.charAt(0)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-300 truncate">{adminName}</p>
            <p className="text-[10px] text-amber-500/70">管理者</p>
          </div>
        </div>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogoutIcon />
            ログアウト
          </button>
        </form>
      </div>
    </aside>
  );
}
