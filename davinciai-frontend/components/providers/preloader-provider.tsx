'use client';

import { useState } from 'react';
import { Preloader } from '@/components/ui/preloader';

interface PreloaderProviderProps {
  children: React.ReactNode;
}

export function PreloaderProvider({ children }: PreloaderProviderProps) {
  const [showPreloader, setShowPreloader] = useState(true);

  return (
    <>
      {showPreloader && (
        <Preloader onComplete={() => setShowPreloader(false)} />
      )}
      {!showPreloader && children}
    </>
  );
}
