// client/src/hooks/useSearchHistory.ts
import { useState, useCallback } from 'react';

const MAX_HISTORY = 10;

function getStorageKey(userId: string): string {
  return `search_history_${userId}`;
}

function loadHistory(userId: string): string[] {
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(userId: string, history: string[]): void {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(history));
  } catch {
    // storage full or unavailable — silently ignore
  }
}

export function useSearchHistory(userId: string | undefined) {
  const [history, setHistory] = useState<string[]>(() => (userId ? loadHistory(userId) : []));

  const addSearch = useCallback(
    (query: string) => {
      if (!userId) return;
      const trimmed = query.trim();
      if (trimmed.length < 2) return;
      setHistory(prev => {
        const filtered = prev.filter(q => q !== trimmed);
        const next = [trimmed, ...filtered].slice(0, MAX_HISTORY);
        saveHistory(userId, next);
        return next;
      });
    },
    [userId]
  );

  const removeSearch = useCallback(
    (query: string) => {
      if (!userId) return;
      setHistory(prev => {
        const next = prev.filter(q => q !== query);
        saveHistory(userId, next);
        return next;
      });
    },
    [userId]
  );

  const clearAll = useCallback(() => {
    if (!userId) return;
    setHistory([]);
    saveHistory(userId, []);
  }, [userId]);

  return { history, addSearch, removeSearch, clearAll };
}
