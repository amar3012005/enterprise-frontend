'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { usePathname } from 'next/navigation';

export interface TaraOverlayProps {
  /** WebSocket URL (defaults to wss://demo.davinciai.eu:8443/ws) */
  wsUrl?: string;
  /** Agent ID for the session */
  agentId?: string;
  /** Callback when Visual Co-Pilot state changes */
  onStateChange?: (state: 'idle' | 'intro' | 'listening' | 'thinking' | 'executing') => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Callback when command is received */
  onCommand?: (command: { type: string; target_id: string; text?: string }) => void;
  /** Callback when action is executed */
  onExecute?: (status: 'success' | 'error') => void;
}

export interface TaraOverlayRef {
  /** Start Visual Co-Pilot mode (click orb programmatically) */
  start: () => Promise<void>;
  /** Stop Visual Co-Pilot mode */
  stop: () => Promise<void>;
  /** Check if Visual Co-Pilot is active */
  isActive: () => boolean;
  /** Destroy the widget */
  destroy: () => void;
}

/**
 * TARA Visual Co-Pilot Overlay Component
 * 
 * Small orb at top-right that activates Visual Co-Pilot mode.
 * 
 * Flow:
 * 1. User clicks orb
 * 2. Sends session_config with mode: 'visual-copilot'
 * 3. Backend plays intro audio
 * 4. Widget starts microphone and captures DOM
 * 5. User speaks -> DOM + audio sent to backend
 * 6. Backend sends command -> Widget executes -> Sends execution_complete
 * 
 * @example
 * ```tsx
 * import TaraOverlay from '@/components/overlay/TaraOverlay';
 * 
 * export default function Page() {
 *   return (
 *     <div>
 *       <h1>My Page</h1>
 *       <TaraOverlay 
 *         onStateChange={(state) => console.log('State:', state)}
 *         onCommand={(cmd) => console.log('Command:', cmd)}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
const TaraOverlay = forwardRef<TaraOverlayRef, TaraOverlayProps>(
  function TaraOverlay({
    wsUrl, // Don't pass default - let widget use its own config
    agentId,
    onStateChange,
    onError,
    onCommand,
    onExecute
  }, ref) {
    const widgetRef = useRef<any>(null);
    const scriptLoaded = useRef(false);
    const pathname = usePathname();

    // Trigger DOM scan on navigation
    useEffect(() => {
      if (widgetRef.current) {
        // Small delay to ensure DOM has settled after navigation
        setTimeout(() => {
          widgetRef.current.forceScan?.();
        }, 500);
      }
    }, [pathname]);

    useImperativeHandle(ref, () => ({
      start: async () => {
        if (widgetRef.current && !widgetRef.current.isActive) {
          // Simulate orb click
          widgetRef.current.orbContainer?.click();
        }
      },
      stop: async () => {
        if (widgetRef.current && widgetRef.current.isActive) {
          widgetRef.current.stopVisualCopilot();
        }
      },
      isActive: () => {
        return widgetRef.current?.isActive || false;
      },
      destroy: () => {
        if (widgetRef.current) {
          widgetRef.current.stopVisualCopilot();
          widgetRef.current = null;
        }
      }
    }));

    useEffect(() => {
      if (scriptLoaded.current) return;
      scriptLoaded.current = true;

      // Check if TaraWidget is already loaded
      if (typeof window !== 'undefined' && window.TaraWidget) {
        initializeWidget();
        return;
      }

      // Load tara-widget.js script from production server
      const script = document.createElement('script');
      // Always fetch latest from production server with cache busting
      script.src = `https://davinciai.eu/tara-widget.js?v=${Date.now()}`;
      script.async = true;

      script.onload = () => {
        initializeWidget();
      };

      script.onerror = () => {
        onError?.(new Error('Failed to load TARA widget script'));
      };

      document.body.appendChild(script);

      return () => {
        if (widgetRef.current) {
          widgetRef.current.stopVisualCopilot();
          widgetRef.current = null;
        }
        script.remove();
      };
    }, []);

    const initializeWidget = () => {
      if (!window.TaraWidget || widgetRef.current) return;

      try {
        const config: any = {};
        if (wsUrl) config.wsUrl = wsUrl;
        if (agentId) config.agentId = agentId;

        widgetRef.current = new window.TaraWidget(config);

        // Setup event listeners
        if (onStateChange) {
          const originalStop = widgetRef.current.stopVisualCopilot.bind(widgetRef.current);
          widgetRef.current.stopVisualCopilot = function () {
            originalStop();
            onStateChange('idle');
          };
        }

        console.log('✨ TARA Visual Co-Pilot initialized');
      } catch (err) {
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    };

    // This component renders nothing - the widget creates its own Shadow DOM
    return null;
  }
);

export default TaraOverlay;
