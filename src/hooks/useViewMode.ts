import { useState, useCallback } from 'react';
import { ViewMode } from '@/components/layout/AppHeader';

export function useViewMode(initialView: ViewMode = 'participant') {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Try to restore from localStorage
    const saved = localStorage.getItem('hr-training-view-mode');
    if (saved === 'coach' || saved === 'participant') {
      return saved;
    }
    return initialView;
  });

  const changeView = useCallback((view: ViewMode) => {
    setViewMode(view);
    localStorage.setItem('hr-training-view-mode', view);
  }, []);

  return { viewMode, changeView };
}
