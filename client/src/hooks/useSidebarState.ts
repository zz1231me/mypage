// client/src/hooks/useSidebarState.ts
import { useState } from 'react';

export function useSidebarState(initialState = true) {
  const [isOpen, setIsOpen] = useState(initialState);

  const toggle = () => setIsOpen(prev => !prev);
  const close = () => setIsOpen(false);
  const open = () => setIsOpen(true);

  return { isOpen, toggle, close, open };
}
