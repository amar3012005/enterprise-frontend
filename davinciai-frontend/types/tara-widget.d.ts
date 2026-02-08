// Type definitions for TARA Visual Co-Pilot Widget v3.0
// Visual Co-Pilot Protocol: session_config -> intro -> dom_update -> command -> execution_complete

declare global {
  interface Window {
    TaraWidget: typeof TaraWidget;
    tara?: TaraWidget;
  }
}

/**
 * TARA Widget configuration
 */
export interface TaraConfig {
  /** WebSocket URL */
  wsUrl?: string;
  /** Agent ID */
  agentId?: string;
  /** Orb size in pixels (default: 40 for top-right placement) */
  orbSize?: number;
}

/**
 * DOM element for backend processing
 */
export interface TaraDOMElement {
  /** Element ID or null */
  id: string | null;
  /** Visible text (max 50 chars) */
  text: string;
  /** HTML tag name */
  type: string;
  /** Element bounds */
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * WebSocket message types (Client → Server)
 */
export type TaraClientMessage = 
  | { type: 'session_config'; mode: 'visual-copilot' | 'voice'; timestamp: number }
  | { type: 'dom_update'; elements: TaraDOMElement[] }
  | { type: 'execution_complete'; status: 'success' | 'error'; timestamp: number };

/**
 * WebSocket message types (Server → Client)
 */
export type TaraServerMessage = 
  | { type: 'command'; payload: TaraCommand }
  | { type: 'state_update'; state: string };

/**
 * Command from backend to execute
 */
export interface TaraCommand {
  /** Command type: click, scroll_to, highlight, spotlight, clear */
  type: 'click' | 'scroll_to' | 'highlight' | 'spotlight' | 'clear';
  /** Target element ID */
  target_id: string;
  /** Optional text/label */
  text?: string;
}

/**
 * Main TARA Widget class
 */
export declare class TaraWidget {
  constructor(config?: TaraConfig);
  
  /** Whether Visual Co-Pilot is active */
  isActive: boolean;
  /** Whether waiting for intro to complete */
  waitingForIntro: boolean;
  /** Whether waiting for command execution */
  waitingForExecution: boolean;
  /** Reference to orb container */
  orbContainer: HTMLDivElement | null;
  
  /** Start Visual Co-Pilot mode (called on orb click) */
  startVisualCopilot(): Promise<void>;
  /** Stop Visual Co-Pilot mode */
  stopVisualCopilot(): Promise<void>;
  /** Destroy the widget */
  destroy(): void;
}

/**
 * React component props
 */
export interface TaraOverlayProps {
  wsUrl?: string;
  agentId?: string;
  onStateChange?: (state: 'idle' | 'intro' | 'listening' | 'thinking' | 'executing') => void;
  onError?: (error: Error) => void;
  onCommand?: (command: TaraCommand) => void;
  onExecute?: (status: 'success' | 'error') => void;
}

/**
 * React component ref methods
 */
export interface TaraOverlayRef {
  start(): Promise<void>;
  stop(): Promise<void>;
  isActive(): boolean;
  destroy(): void;
}

export {};
