/**
 * マイページサイドバー用アイコン
 * currentColor で親のテキスト色を継承
 */

const cls = 'w-5 h-5 shrink-0';

/** ダッシュボード：分析グリッド（縦バーの高さが異なるメトリクスパネル） */
export function DashboardIcon() {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="8" rx="1.5" />
      <rect x="14" y="3" width="7" height="4" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="10" width="7" height="11" rx="1.5" />
    </svg>
  );
}

/** RT swim lab：泳ぐ人 + 水面波 */
export function SwimLabIcon() {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* 頭 */}
      <circle cx="17.5" cy="4.5" r="1.8" />
      {/* 胴体・腕 */}
      <path d="M3 11.5c2.5-2.5 4.5-3.5 7-2l3.5 1.8L17 8" />
      {/* 脚 */}
      <path d="M13.5 11.3c.5 1.2.5 2.5-.5 3.5" />
      {/* 水面波 */}
      <path d="M2 18c1.5-1 3-1.5 5-1s3.5 1.2 5.5 1.2 3.5-.7 5-1.2 3 0 4.5.5" />
    </svg>
  );
}

/** RT GENE PROFILE：DNAダブルヘリックス */
export function GeneProfileIcon() {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* 左鎖 */}
      <path d="M9 3c0 3 6 5.5 6 9s-6 6-6 9" />
      {/* 右鎖 */}
      <path d="M15 3c0 3-6 5.5-6 9s6 6 6 9" />
      {/* 横架橋 */}
      <line x1="9.5"  y1="6.5"  x2="14.5" y2="6.5"  />
      <line x1="10.5" y1="9.5"  x2="13.5" y2="9.5"  />
      <line x1="10.5" y1="14.5" x2="13.5" y2="14.5" />
      <line x1="9.5"  y1="17.5" x2="14.5" y2="17.5" />
    </svg>
  );
}

/** コミュニティ：3人のシルエット */
export function CommunityIcon() {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {/* 中央の人 */}
      <circle cx="12" cy="7" r="3" />
      <path d="M6 21v-1a6 6 0 0 1 12 0v1" />
      {/* 左の人 */}
      <circle cx="4.5" cy="9" r="2.2" />
      <path d="M1 21v-.5a3.5 3.5 0 0 1 5.5-2.9" />
      {/* 右の人 */}
      <circle cx="19.5" cy="9" r="2.2" />
      <path d="M23 21v-.5a3.5 3.5 0 0 0-5.5-2.9" />
    </svg>
  );
}

/** アカウント情報：人 + 設定歯車リング */
export function AccountIcon() {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="7.5" r="3.5" />
      <path d="M5 20v-1a7 7 0 0 1 14 0v1" />
      {/* 設定の小ドット */}
      <circle cx="18.5" cy="5" r="1" fill="currentColor" stroke="none" />
      <path d="M18.5 2.5v1M18.5 7.5v1M16 5h1M20 5h1" strokeWidth="1.25" />
    </svg>
  );
}

/** ログアウト：ドアから出る矢印 */
export function LogoutIcon() {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
