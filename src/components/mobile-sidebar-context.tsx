'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

type MobileSidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const MobileSidebarContext = createContext<MobileSidebarContextValue | null>(null);

// Estado compartido entre el botón de menú (en AppHeader) y el drawer del
// sidebar (en Sidebar) — viven en Suspense boundaries distintos así que no
// pueden pasarse props directamente entre sí.
export function MobileSidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <MobileSidebarContext.Provider value={{ open, setOpen }}>
      {children}
    </MobileSidebarContext.Provider>
  );
}

export function useMobileSidebar() {
  const ctx = useContext(MobileSidebarContext);
  if (!ctx) {
    throw new Error('useMobileSidebar debe usarse dentro de MobileSidebarProvider');
  }
  return ctx;
}
