/**
 * SynthContext - React Context for accessing synth engine
 * Provides access to SynthEngine and its managers throughout the component tree
 */

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { SynthEngine } from '../core/SynthEngine';
import { audioState, voiceState, modulationState, visualizationState } from '../../state';

interface SynthContextType {
  engine: SynthEngine;
  // Direct access to state modules (singletons)
  audioState: typeof audioState;
  voiceState: typeof voiceState;
  modulationState: typeof modulationState;
  visualizationState: typeof visualizationState;
}

const SynthContext = createContext<SynthContextType | null>(null);

interface SynthProviderProps {
  children: ReactNode;
  engine: SynthEngine;
}

/**
 * Provider component that makes synth engine available to all child components
 */
export function SynthProvider({ children, engine }: SynthProviderProps) {
  // Memoize the context value to prevent unnecessary rerenders
  // The engine and state modules are singletons, so they never change
  const value = useMemo(
    () => ({
      engine,
      audioState,
      voiceState,
      modulationState,
      visualizationState,
    }),
    [engine] // Only recreate if engine instance changes (which it shouldn't)
  );

  return <SynthContext.Provider value={value}>{children}</SynthContext.Provider>;
}

/**
 * Hook to access the synth engine and state from any component
 * @throws Error if used outside of SynthProvider
 */
export function useSynthEngine() {
  const context = useContext(SynthContext);
  
  if (!context) {
    throw new Error('useSynthEngine must be used within a SynthProvider');
  }
  
  return context;
}
