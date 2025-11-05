/**
 * Unit tests for EffectsChain
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EffectsChain } from '../../../src/bus/EffectsChain';
import type { AudioEffect } from '../../../src/core/types';

describe('EffectsChain', () => {
  let chain: EffectsChain;
  let mockEffect1: AudioEffect;
  let mockEffect2: AudioEffect;
  let mockEffect3: AudioEffect;
  let mockInputNode: GainNode;
  let mockOutputNode: GainNode;

  beforeEach(() => {
    // Create mock nodes
    mockInputNode = {
      connect: vi.fn(),
      disconnect: vi.fn()
    } as unknown as GainNode;

    mockOutputNode = {
      connect: vi.fn(),
      disconnect: vi.fn()
    } as unknown as GainNode;

    // Create mock effects
    mockEffect1 = createMockEffect('Effect1', 'delay');
    mockEffect2 = createMockEffect('Effect2', 'reverb');
    mockEffect3 = createMockEffect('Effect3', 'distortion');
    
    chain = new EffectsChain({
      inputNode: mockInputNode,
      outputNode: mockOutputNode
    });
  });

  afterEach(() => {
    if (chain) {
      chain.disconnect();
    }
    vi.clearAllMocks();
  });

  function createMockEffect(name: string, type: string): AudioEffect {
    const inputNode = {
      connect: vi.fn(),
      disconnect: vi.fn()
    } as unknown as AudioNode;

    const outputNode = {
      connect: vi.fn(),
      disconnect: vi.fn()
    } as unknown as AudioNode;

    return {
      getName: () => name,
      getType: () => type,
      getInputNode: () => inputNode,
      getOutputNode: () => outputNode,
      connect: vi.fn(),
      disconnect: vi.fn(),
      bypass: vi.fn(),
      isBypassed: () => false,
      setMix: vi.fn(),
      getMix: () => 0.5,
      setParameter: vi.fn(),
      getParameter: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      isEnabled: () => true,
      getParameters: () => []
    } as AudioEffect;
  }

  describe('Constructor', () => {
    it('should create an EffectsChain instance', () => {
      expect(chain).toBeDefined();
    });

    it('should provide input and output nodes', () => {
      expect(chain.getInput()).toBeDefined();
      expect(chain.getOutput()).toBeDefined();
    });

    it('should start with zero effects', () => {
      expect(chain.getEffectCount()).toBe(0);
    });

    it('should not be bypassed by default', () => {
      expect(chain.isChainBypassed()).toBe(false);
    });
  });

  describe('Adding Effects', () => {
    it('should add an effect to the chain', () => {
      const id = chain.addEffect(mockEffect1);
      
      expect(id).toBeDefined();
      expect(id).toMatch(/^effect-\d+$/);
      expect(chain.getEffectCount()).toBe(1);
    });

    it('should add multiple effects', () => {
      chain.addEffect(mockEffect1);
      chain.addEffect(mockEffect2);
      chain.addEffect(mockEffect3);
      
      expect(chain.getEffectCount()).toBe(3);
    });

    it('should return unique IDs for each effect', () => {
      const id1 = chain.addEffect(mockEffect1);
      const id2 = chain.addEffect(mockEffect2);
      const id3 = chain.addEffect(mockEffect3);
      
      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    it('should maintain effect order', () => {
      const id1 = chain.addEffect(mockEffect1);
      const id2 = chain.addEffect(mockEffect2);
      const id3 = chain.addEffect(mockEffect3);
      
      const effects = chain.getEffects();
      expect(effects[0].id).toBe(id1);
      expect(effects[1].id).toBe(id2);
      expect(effects[2].id).toBe(id3);
    });

    it('should connect effects to input node', () => {
      chain.addEffect(mockEffect1);
      
      // Input should be connected to first effect
      const inputNode = chain.getInput();
      expect(inputNode.connect).toHaveBeenCalled();
    });
  });

  describe('Removing Effects', () => {
    it('should remove an effect by ID', () => {
      const id = chain.addEffect(mockEffect1);
      chain.addEffect(mockEffect2);
      
      const removed = chain.removeEffect(id);
      
      expect(removed).toBe(true);
      expect(chain.getEffectCount()).toBe(1);
    });

    it('should return false for non-existent ID', () => {
      chain.addEffect(mockEffect1);
      
      const removed = chain.removeEffect('non-existent-id');
      
      expect(removed).toBe(false);
      expect(chain.getEffectCount()).toBe(1);
    });

    it('should disconnect removed effect', () => {
      const id = chain.addEffect(mockEffect1);
      
      chain.removeEffect(id);
      
      expect(mockEffect1.disconnect).toHaveBeenCalled();
    });

    it('should reconnect remaining effects', () => {
      const id1 = chain.addEffect(mockEffect1);
      chain.addEffect(mockEffect2);
      chain.addEffect(mockEffect3);
      
      // Remove middle effect
      chain.removeEffect(id1);
      
      // Should have 2 effects left
      expect(chain.getEffectCount()).toBe(2);
      
      const effects = chain.getEffects();
      expect(effects[0].effect).toBe(mockEffect2);
      expect(effects[1].effect).toBe(mockEffect3);
    });
  });

  describe('Moving Effects', () => {
    it('should move an effect to a new position', () => {
      const id1 = chain.addEffect(mockEffect1);
      const id2 = chain.addEffect(mockEffect2);
      const id3 = chain.addEffect(mockEffect3);
      
      // Move first effect to last position
      chain.moveEffect(id1, 2);
      
      const effects = chain.getEffects();
      expect(effects[0].id).toBe(id2);
      expect(effects[1].id).toBe(id3);
      expect(effects[2].id).toBe(id1);
    });

    it('should handle moving to same position', () => {
      const id1 = chain.addEffect(mockEffect1);
      chain.addEffect(mockEffect2);
      
      const result = chain.moveEffect(id1, 0);
      
      expect(result).toBe(true);
      const effects = chain.getEffects();
      expect(effects[0].id).toBe(id1);
    });

    it('should clamp position to valid range', () => {
      const id1 = chain.addEffect(mockEffect1);
      chain.addEffect(mockEffect2);
      chain.addEffect(mockEffect3);
      
      // Try to move beyond array bounds
      chain.moveEffect(id1, 999);
      
      const effects = chain.getEffects();
      expect(effects[2].id).toBe(id1); // Should be at last position
    });

    it('should return false for non-existent ID', () => {
      chain.addEffect(mockEffect1);
      
      const result = chain.moveEffect('non-existent-id', 0);
      
      expect(result).toBe(false);
    });

    it('should reconnect chain after move', () => {
      const id1 = chain.addEffect(mockEffect1);
      chain.addEffect(mockEffect2);
      
      // Clear previous calls
      vi.clearAllMocks();
      
      chain.moveEffect(id1, 1);
      
      // Effects should be reconnected
      const inputNode = chain.getInput();
      expect(inputNode.connect).toHaveBeenCalled();
    });
  });

  describe('Bypassing Effects', () => {
    it('should bypass a specific effect', () => {
      const id = chain.addEffect(mockEffect1);
      
      chain.bypassEffect(id, true);
      
      expect(mockEffect1.bypass).toHaveBeenCalledWith(true);
    });

    it('should un-bypass a specific effect', () => {
      const id = chain.addEffect(mockEffect1);
      chain.bypassEffect(id, true);
      
      chain.bypassEffect(id, false);
      
      expect(mockEffect1.bypass).toHaveBeenCalledWith(false);
    });

    it('should return false for non-existent ID', () => {
      const result = chain.bypassEffect('non-existent-id', true);
      
      expect(result).toBe(false);
    });

    it('should track bypass state in slot', () => {
      const id = chain.addEffect(mockEffect1);
      
      chain.bypassEffect(id, true);
      
      const effects = chain.getEffects();
      expect(effects[0].bypassed).toBe(true);
    });
  });

  describe('Chain Bypass', () => {
    it('should bypass entire chain', () => {
      chain.addEffect(mockEffect1);
      chain.addEffect(mockEffect2);
      
      chain.bypassChain(true);
      
      expect(chain.isChainBypassed()).toBe(true);
    });

    it('should un-bypass entire chain', () => {
      chain.bypassChain(true);
      chain.bypassChain(false);
      
      expect(chain.isChainBypassed()).toBe(false);
    });

    it('should connect input to output when bypassed', () => {
      chain.addEffect(mockEffect1);
      
      vi.clearAllMocks();
      
      chain.bypassChain(true);
      
      // Input should connect directly to output, bypassing effects
      const inputNode = chain.getInput();
      const outputNode = chain.getOutput();
      expect(inputNode.connect).toHaveBeenCalledWith(outputNode);
    });
  });

  describe('Querying Effects', () => {
    it('should get all effects', () => {
      chain.addEffect(mockEffect1);
      chain.addEffect(mockEffect2);
      
      const effects = chain.getEffects();
      
      expect(effects).toHaveLength(2);
      expect(effects[0].effect).toBe(mockEffect1);
      expect(effects[1].effect).toBe(mockEffect2);
    });

    it('should get effect by ID', () => {
      const id = chain.addEffect(mockEffect1);
      
      const effect = chain.getEffect(id);
      
      expect(effect).toBe(mockEffect1);
    });

    it('should return null for non-existent ID', () => {
      const effect = chain.getEffect('non-existent-id');
      
      expect(effect).toBeNull();
    });

    it('should return readonly array', () => {
      chain.addEffect(mockEffect1);
      
      const effects = chain.getEffects();
      
      // Should be readonly - TypeScript will prevent modification at compile time
      expect(effects).toBeDefined();
    });
  });

  describe('Clear Chain', () => {
    it('should clear all effects', () => {
      chain.addEffect(mockEffect1);
      chain.addEffect(mockEffect2);
      chain.addEffect(mockEffect3);
      
      chain.clear();
      
      expect(chain.getEffectCount()).toBe(0);
    });

    it('should disconnect all effects when clearing', () => {
      chain.addEffect(mockEffect1);
      chain.addEffect(mockEffect2);
      
      chain.clear();
      
      expect(mockEffect1.disconnect).toHaveBeenCalled();
      expect(mockEffect2.disconnect).toHaveBeenCalled();
    });

    it('should reconnect input to output after clear', () => {
      chain.addEffect(mockEffect1);
      
      vi.clearAllMocks();
      
      chain.clear();
      
      const inputNode = chain.getInput();
      const outputNode = chain.getOutput();
      expect(inputNode.connect).toHaveBeenCalledWith(outputNode);
    });
  });

  describe('Signal Routing', () => {
    it('should connect input directly to output with no effects', () => {
      const inputNode = chain.getInput();
      const outputNode = chain.getOutput();
      
      // With no effects, input should connect to output
      expect(inputNode.connect).toHaveBeenCalledWith(outputNode);
    });

    it('should route through effects in order', () => {
      const id1 = chain.addEffect(mockEffect1);
      const id2 = chain.addEffect(mockEffect2);
      
      // Clear previous connection calls
      vi.clearAllMocks();
      
      // Add third effect to trigger reconnection
      chain.addEffect(mockEffect3);
      
      // Input -> Effect1 -> Effect2 -> Effect3 -> Output
      const inputNode = chain.getInput();
      expect(inputNode.connect).toHaveBeenCalledWith(mockEffect1.getInputNode());
    });

    it('should handle empty chain', () => {
      chain.clear();
      
      expect(chain.getEffectCount()).toBe(0);
      
      const inputNode = chain.getInput();
      const outputNode = chain.getOutput();
      expect(inputNode.connect).toHaveBeenCalledWith(outputNode);
    });
  });

  describe('Cleanup', () => {
    it('should disconnect on cleanup', () => {
      chain.addEffect(mockEffect1);
      
      chain.disconnect();
      
      expect(mockEffect1.disconnect).toHaveBeenCalled();
    });

    it('should clear effects on disconnect', () => {
      chain.addEffect(mockEffect1);
      chain.addEffect(mockEffect2);
      
      chain.disconnect();
      
      expect(chain.getEffectCount()).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid add/remove operations', () => {
      const ids: string[] = [];
      
      // Add many effects
      for (let i = 0; i < 10; i++) {
        const mockEffect = createMockEffect(`Effect${i}`, 'test');
        ids.push(chain.addEffect(mockEffect));
      }
      
      expect(chain.getEffectCount()).toBe(10);
      
      // Remove half of them
      for (let i = 0; i < 5; i++) {
        chain.removeEffect(ids[i]);
      }
      
      expect(chain.getEffectCount()).toBe(5);
    });

    it('should handle bypass all then un-bypass', () => {
      chain.addEffect(mockEffect1);
      chain.addEffect(mockEffect2);
      
      chain.bypassChain(true);
      chain.bypassChain(false);
      
      expect(chain.isChainBypassed()).toBe(false);
    });

    it('should handle move to negative position', () => {
      const id = chain.addEffect(mockEffect1);
      chain.addEffect(mockEffect2);
      
      chain.moveEffect(id, -1);
      
      // Should clamp to 0
      const effects = chain.getEffects();
      expect(effects[0].id).toBe(id);
    });
  });

  describe('Integration', () => {
    it('should work with complex chain operations', () => {
      // Add effects
      const id1 = chain.addEffect(mockEffect1);
      const id2 = chain.addEffect(mockEffect2);
      const id3 = chain.addEffect(mockEffect3);
      
      // Reorder: [id1, id2, id3] -> [id3, id1, id2]
      chain.moveEffect(id3, 0);
      
      // Bypass one
      chain.bypassEffect(id2, true);
      
      // Verify state
      expect(chain.getEffectCount()).toBe(3);
      const effects = chain.getEffects();
      expect(effects[0].id).toBe(id3);
      // After move, id2 is at index 2
      expect(effects[2].bypassed).toBe(true);
      
      // Remove one
      chain.removeEffect(id1);
      expect(chain.getEffectCount()).toBe(2);
    });
  });
});
