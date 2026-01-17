'use client';

import { useState, useEffect } from 'react';

export type ViewMode = 'table' | 'card';

const STORAGE_KEY = 'rt-view-mode';

export function useViewMode() {
  const [viewMode, setViewModeState] = useState<ViewMode>('table');

  useEffect(() => {
    // 初回：スマホはcard、PCはtable
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    
    if (stored === 'table' || stored === 'card') {
      setViewModeState(stored);
    } else {
      setViewModeState(isMobile ? 'card' : 'table');
    }
  }, []);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, mode);
    }
  };

  return { viewMode, setViewMode };
}
