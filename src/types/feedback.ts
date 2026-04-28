export type FeedbackCategory = 'bug' | 'feature' | 'ux' | 'content' | 'other';
export type FeedbackStatus   = 'pending' | 'in_progress' | 'resolved' | 'dismissed';

export interface Feedback {
  id:         string;
  user_id:    string | null;
  category:   FeedbackCategory;
  message:    string;
  rating:     number | null;
  status:     FeedbackStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

export const CATEGORY_META: Record<FeedbackCategory, { label: string; color: string; icon: string }> = {
  feature: { label: '機能・改善の要望',   color: 'bg-blue-100 text-blue-700 border-blue-200',       icon: '✨' },
  ux:      { label: '使いやすさについて', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: '🎨' },
  content: { label: 'コンテンツについて', color: 'bg-teal-100 text-teal-700 border-teal-200',       icon: '📝' },
  bug:     { label: 'バグ・不具合',       color: 'bg-red-100 text-red-700 border-red-200',           icon: '🐛' },
  other:   { label: 'その他',             color: 'bg-slate-100 text-slate-600 border-slate-200',     icon: '💬' },
};

export const STATUS_META: Record<FeedbackStatus, { label: string; color: string; dot: string }> = {
  pending:     { label: '受付済み', color: 'bg-amber-100 text-amber-700 border-amber-200',   dot: 'bg-amber-400' },
  in_progress: { label: '対応中',   color: 'bg-blue-100 text-blue-700 border-blue-200',     dot: 'bg-blue-500'  },
  resolved:    { label: '対応済み', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  dismissed:   { label: '対応しない', color: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
};

export const DONE_STATUSES: FeedbackStatus[] = ['resolved', 'dismissed'];
