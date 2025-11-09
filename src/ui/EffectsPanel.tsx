/**
 * EffectsPanel - Effects chain manager
 * Add, remove, bypass effects with parameter controls
 */

import { useState, useEffect, useCallback } from 'react';
import { audioState } from "../state";
import type { EffectSlot } from '../core/EffectsManager';
import {
  DelayEffect,
  ReverbEffect,
  DistortionEffect,
  ChorusEffect,
  ShimmerEffect,
  FlangerEffect,
  PhaserEffect,
  CompressorEffect,
  RingModulatorEffect,
} from "../components/effects";
import { Slider } from './common/Slider';
import { Switch } from './common/Switch';
import './EffectsPanel.css';

export function EffectsPanel() {
  const effectsManager = audioState.getEffectsManagerOrNull();

  const [effects, setEffects] = useState<EffectSlot[]>([]);
  const [chainBypassed, setChainBypassed] = useState(false);

  // Refresh effects list
  const refreshEffects = useCallback(() => {
    if (effectsManager) {
      setEffects(effectsManager.getEffects());
      setChainBypassed(effectsManager.isChainBypassed());
    }
  }, [effectsManager]);

  // Initialize and set up refresh
  useEffect(() => {
    refreshEffects();
  }, [refreshEffects]);

  // Add effect to chain
  const handleAddEffect = useCallback((
    type: 'delay' | 'reverb' | 'distortion' | 'chorus' | 'shimmer' | 'flanger' | 'phaser' | 'compressor' | 'ringmod'
  ) => {
    if (!effectsManager) return;

    let effect;

    switch (type) {
      case 'delay':
        effect = new DelayEffect('medium');
        effect.setParameter('mix', 0.3);
        break;
      case 'reverb':
        effect = new ReverbEffect('hall');
        effect.setParameter('mix', 0.3);
        break;
      case 'distortion':
        effect = new DistortionEffect('overdrive');
        effect.setParameter('mix', 0.5);
        break;
      case 'chorus':
        effect = new ChorusEffect('subtle');
        effect.setParameter('mix', 0.5);
        break;
      case 'shimmer':
        effect = new ShimmerEffect('subtle');
        break;
      case 'flanger':
        effect = new FlangerEffect('subtle');
        effect.setParameter('mix', 0.5);
        break;
      case 'phaser':
        effect = new PhaserEffect('subtle');
        effect.setParameter('mix', 0.5);
        break;
      case 'compressor':
        effect = new CompressorEffect('soft');
        break;
      case 'ringmod':
        effect = new RingModulatorEffect('subtle');
        effect.setParameter('mix', 0.3);
        break;
      default:
        return;
    }

    effectsManager.addEffect(effect);
    refreshEffects();
  }, [effectsManager, refreshEffects]);

  // Remove effect
  const handleRemoveEffect = useCallback((id: string) => {
    if (!effectsManager) return;
    effectsManager.removeEffect(id);
    refreshEffects();
  }, [effectsManager, refreshEffects]);

  // Bypass effect
  const handleBypassEffect = useCallback((id: string, bypass: boolean) => {
    if (!effectsManager) return;
    effectsManager.bypassEffect(id, bypass);
    refreshEffects();
  }, [effectsManager, refreshEffects]);

  // Bypass entire chain
  const handleChainBypass = useCallback((bypass: boolean) => {
    if (!effectsManager) return;
    effectsManager.bypassChain(bypass);
    setChainBypassed(bypass);
  }, [effectsManager]);

  // Update effect parameter
  const handleParameterChange = useCallback((id: string, paramName: string, value: number) => {
    if (!effectsManager) return;
    const slot = effects.find(s => s.id === id);
    if (slot) {
      slot.effect.setParameter(paramName, value);
    }
  }, [effectsManager, effects]);

  if (!effectsManager) {
    return (
      <div className="effects-panel">
        <div className="effects-header">
          <h3>Effects Chain</h3>
        </div>
        <p>Effects manager not initialized</p>
      </div>
    );
  }

  return (
    <div className="effects-panel">
      <div className="effects-header">
        <h3>Effects Chain</h3>
        <span className="effects-count">{effects.length} effect{effects.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="effects-controls">
        {/* Add Effect Buttons */}
        <div className="effects-add-buttons">
          <button 
            className="effects-add-btn primary" 
            onClick={() => handleAddEffect('delay')}
            disabled={effects.length >= 8}
          >
            + Delay
          </button>
          <button 
            className="effects-add-btn primary" 
            onClick={() => handleAddEffect('reverb')}
            disabled={effects.length >= 8}
          >
            + Reverb
          </button>
          <button 
            className="effects-add-btn primary" 
            onClick={() => handleAddEffect('distortion')}
            disabled={effects.length >= 8}
          >
            + Distortion
          </button>
          <button 
            className="effects-add-btn primary" 
            onClick={() => handleAddEffect('chorus')}
            disabled={effects.length >= 8}
          >
            + Chorus
          </button>
          <button 
            className="effects-add-btn primary" 
            onClick={() => handleAddEffect('shimmer')}
            disabled={effects.length >= 8}
          >
            + Shimmer
          </button>
          <button 
            className="effects-add-btn primary" 
            onClick={() => handleAddEffect('flanger')}
            disabled={effects.length >= 8}
          >
            + Flanger
          </button>
          <button 
            className="effects-add-btn primary" 
            onClick={() => handleAddEffect('phaser')}
            disabled={effects.length >= 8}
          >
            + Phaser
          </button>
          <button 
            className="effects-add-btn primary" 
            onClick={() => handleAddEffect('compressor')}
            disabled={effects.length >= 8}
          >
            + Compressor
          </button>
          <button 
            className="effects-add-btn primary" 
            onClick={() => handleAddEffect('ringmod')}
            disabled={effects.length >= 8}
          >
            + Ring Mod
          </button>
        </div>

        {/* Chain Bypass Toggle */}
        <div className="effects-chain-toggle">
          <Switch
            checked={chainBypassed}
            onChange={handleChainBypass}
            label="Bypass Entire Chain"
          />
        </div>

        {/* Effects List */}
        {effects.length === 0 ? (
          <div className="empty-effects">
            No effects in chain. Add an effect to get started!
          </div>
        ) : (
          <div className="effects-list">
            {effects.map((slot) => {
              const params = slot.effect.getParameters();
              const effectName = slot.effect.getName();
              
              // Get presets if available (effects with presets have these methods)
              const effectAny = slot.effect as any;
              const hasPresets = typeof effectAny.getPresets === 'function';
              const presets = hasPresets ? effectAny.getPresets() : null;
              const currentPreset = hasPresets && typeof effectAny.getCurrentPreset === 'function' 
                ? effectAny.getCurrentPreset() 
                : null;

              return (
                <div 
                  key={slot.id} 
                  className={`effect-card ${slot.bypassed ? 'bypassed' : ''}`}
                >
                  <div className="effect-card-header">
                    <h4 className="effect-card-title">{effectName}</h4>
                    <div className="effect-card-controls">
                      <button
                        className={`effect-btn info ${slot.bypassed ? 'active' : ''}`}
                        onClick={() => handleBypassEffect(slot.id, !slot.bypassed)}
                      >
                        {slot.bypassed ? 'Bypassed' : 'Active'}
                      </button>
                      <button
                        className="effect-btn danger"
                        onClick={() => handleRemoveEffect(slot.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Preset Selector */}
                  {!slot.bypassed && presets && (
                    <div className="effect-preset-selector">
                      <label>Preset:</label>
                      <select 
                        value={currentPreset || ''}
                        onChange={(e) => {
                          const effectAny = slot.effect as any;
                          if (typeof effectAny.loadPreset === 'function') {
                            effectAny.loadPreset(e.target.value);
                            refreshEffects();
                          }
                        }}
                      >
                        {Object.keys(presets).map((presetKey) => (
                          <option key={presetKey} value={presetKey}>
                            {presets[presetKey as keyof typeof presets].name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Effect Parameters */}
                  {!slot.bypassed && (
                    <div className="effect-parameters">
                      {params.map((param) => {
                        const currentValue = slot.effect.getParameter(param.name);
                        return (
                          <Slider
                            key={param.name}
                            label={param.name}
                            min={param.min}
                            max={param.max}
                            step={0.01}
                            initialValue={currentValue}
                            onChange={(value) => handleParameterChange(slot.id, param.name, value)}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


