'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Preloader } from '@/components/ui/preloader';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [showPreloader, setShowPreloader] = useState(true);

  useEffect(() => {
    // Show preloader for at least 2.5 seconds
    const preloaderTimer = setTimeout(() => {
      setShowPreloader(false);
      
      // Then check auth and redirect
      const token = localStorage.getItem('access_token');
      if (token) {
        router.push('/agents');
      } else {
        router.push('/login');
      }
    }, 2500);

    return () => clearTimeout(preloaderTimer);
  }, [router]);

  return (
    <>
      {showPreloader && <Preloader />}
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-neutral-700 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm text-neutral-500 font-mono">Loading...</span>
        </div>
      </div>
    </>
  );
}
