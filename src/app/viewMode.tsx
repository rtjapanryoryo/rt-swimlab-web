'use client';

import { useEffect, useState } from 'react';

export type ViewMode = 'table' | 'card';

const STORAGE_KEY = 'rt-view-mode';

export function useViewMode() {
  // サーバー・クライアントで同じ初期値にし、ハイドレーション不一致を防ぐ
  const [viewMode, setViewModeState] = useState<ViewMode>('table');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'table' || stored === 'card') {
        setViewModeState(stored as ViewMode);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  };

  return { viewMode, setViewMode };
}
