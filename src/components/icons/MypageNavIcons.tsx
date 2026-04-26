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

/** 管理者：盾 + チェックマーク */
export function AdminIcon() {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3l7 3.5v5c0 4.5-3 8-7 9.5C8 19.5 5 16 5 11.5v-5L12 3z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

/** トレーニング計画：カレンダー + チェック */
export function PlanIcon() {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <polyline points="9 16 11 18 15 14" />
    </svg>
  );
}

/** 目標シート：同心円ターゲット + 十字線 */
export function GoalSheetIcon() {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <line x1="12" y1="3" x2="12" y2="7" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="3" y1="12" x2="7" y2="12" />
      <line x1="17" y1="12" x2="21" y2="12" />
    </svg>
  );
}

/** コーチ：人 + 笛 */
export function CoachIcon() {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-1a6 6 0 0 1 10.5-4" />
      <path d="M16 14l2 2 4-4" />
      <circle cx="19" cy="17" r="3" />
    </svg>
  );
}

/** フィードバック：吹き出し + ハート */
export function FeedbackIcon() {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <path d="M12 8c-.6 0-1.1.5-1.1 1.1 0 1.3 1.1 2 1.1 2s1.1-.7 1.1-2c0-.6-.5-1.1-1.1-1.1z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** カウンセリング：カレンダー + 人 */
export function CounselingIcon() {
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <circle cx="12" cy="15" r="2" />
      <path d="M9 20a3 3 0 0 1 6 0" />
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
