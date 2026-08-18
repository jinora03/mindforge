import * as THREE from 'three';
import type { RendererPresentationConfig } from './EngineTypes';

export interface ResolvedRendererPresentation {
  readonly toneMapping: THREE.ToneMapping;
  readonly exposure: number;
  readonly shadowsEnabled: boolean;
  readonly shadowMapType: THREE.ShadowMapType;
  readonly imageBasedLightingEnabled: boolean;
  readonly imageBasedLightingIntensity: number;
}

const DEFAULT_SHADOWS = { enabled: true, type: 'pcfSoft' } as const;
const DEFAULT_IBL = { enabled: true, intensity: 0.35 } as const;

export const DEFAULT_RENDERER_PRESENTATION: Readonly<RendererPresentationConfig> = {
  toneMapping: 'acesFilmic',
  exposure: 1,
  shadows: DEFAULT_SHADOWS,
  imageBasedLighting: DEFAULT_IBL,
};

/** Resolve plain theme data into Three.js renderer constants with safe bounds. */
export function resolveRendererPresentation(
  config: RendererPresentationConfig = DEFAULT_RENDERER_PRESENTATION,
): ResolvedRendererPresentation {
  const shadows = config.shadows ?? DEFAULT_SHADOWS;
  const ibl = config.imageBasedLighting ?? DEFAULT_IBL;
  return {
    toneMapping: config.toneMapping === 'none' ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping,
    exposure: finiteClamp(config.exposure ?? 1, 0.25, 4, 1),
    shadowsEnabled: shadows.enabled !== false,
    shadowMapType: shadows.type === 'pcf' ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap,
    imageBasedLightingEnabled: ibl.enabled !== false,
    imageBasedLightingIntensity: finiteClamp(ibl.intensity ?? DEFAULT_IBL.intensity, 0, 2, DEFAULT_IBL.intensity),
  };
}

function finiteClamp(value: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
