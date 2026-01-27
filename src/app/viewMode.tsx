'use client';

import { useState } from 'react';

export type ViewMode = 'table' | 'card';

const STORAGE_KEY = 'rt-view-mode';

function getInitialViewMode(): ViewMode {
  // SSR対策（念のため）
  if (typeof window === 'undefined') return 'table';

  // localStorage 優先
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'table' || stored === 'card') return stored as ViewMode;

  // 初回：デフォルトはtable（練習メニュー表）
  return 'table';
}

export function useViewMode() {
  const [viewMode, setViewModeState] = useState<ViewMode>(getInitialViewMode);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
  };

  return { viewMode, setViewMode };
}
