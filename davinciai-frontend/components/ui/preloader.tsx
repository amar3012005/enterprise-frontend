'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PreloaderProps {
  onComplete?: () => void;
}

export function Preloader({ onComplete }: PreloaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 2500;
    const interval = 30;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const newProgress = Math.min((currentStep / steps) * 100, 100);
      setProgress(newProgress);

      if (currentStep >= steps) {
        clearInterval(timer);
        setTimeout(() => {
          setIsLoading(false);
          onComplete?.();
        }, 400);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0a0a]"
        >
          {/* Background grid effect */}
          <div className="absolute inset-0 opacity-5">
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px',
              }}
            />
          </div>

          {/* Main logo animation container */}
          <div className="relative flex flex-col items-center">
            {/* Logo SVG with animation */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              {/* Glow effect behind logo */}
              <div className="absolute inset-0 blur-3xl opacity-20">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-orange-500 rounded-full" />
              </div>

              {/* Logo mark */}
              <motion.svg
                width="120"
                height="120"
                viewBox="0 0 120 120"
                fill="none"
                className="relative z-10"
              >
                {/* Animated border circle */}
                <motion.circle
                  cx="60"
                  cy="60"
                  r="55"
                  stroke="url(#gradient1)"
                  strokeWidth="2"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.5, ease: "easeInOut" }}
                />

                {/* Inner geometric shape - stylized D/A */}
                <motion.path
                  d="M40 35 L40 85 L65 85 C80 85 90 75 90 60 C90 45 80 35 65 35 Z"
                  fill="url(#gradient1)"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />

                {/* Inner detail line */}
                <motion.path
                  d="M50 45 L50 75 L60 75 C70 75 75 70 75 60 C75 50 70 45 60 45 Z"
                  fill="#0a0a0a"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />

                {/* Decorative lines */}
                <motion.path
                  d="M25 60 L35 60"
                  stroke="url(#gradient2)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.8, duration: 0.3 }}
                />
                <motion.path
                  d="M85 60 L95 60"
                  stroke="url(#gradient2)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.9, duration: 0.3 }}
                />

                <defs>
                  <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                  <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </motion.svg>
            </motion.div>

            {/* Logo text */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 text-center"
            >
              <h1 className="text-3xl font-bold tracking-[0.2em] text-white uppercase" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                DaVinci AI
              </h1>
              <p className="mt-2 text-xs tracking-[0.3em] text-neutral-500 uppercase">
                Voice Intelligence
              </p>
            </motion.div>

            {/* Progress bar */}
            <div className="mt-12 w-48 h-0.5 bg-neutral-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 via-orange-500 to-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
            </div>

            {/* Progress percentage */}
            <motion.p
              className="mt-3 text-xs text-neutral-600 font-mono"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              {Math.round(progress)}%
            </motion.p>

            {/* Loading text */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8 flex items-center gap-2"
            >
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-emerald-500"
              />
              <span className="text-xs text-neutral-500 tracking-wider uppercase">
                Initializing Neural Network
              </span>
            </motion.div>
          </div>

          {/* Corner accents */}
          <div className="absolute top-8 left-8 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-xs text-neutral-600 font-mono">v2.0</span>
          </div>

          <div className="absolute bottom-8 right-8 text-xs text-neutral-600">
            <span className="font-mono">System Ready</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
