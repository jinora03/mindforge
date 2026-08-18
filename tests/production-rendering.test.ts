import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resolveRendererPresentation } from '@mindforge/engine';
import {
  blockTexture,
  createBlockMaterial,
  createVoxelLighting,
  createVoxelMaterial,
  createVoxelWaterMaterial,
  getTheme,
  plastic,
  toyMetal,
} from '@mindforge/themes';

describe('PQ2 production renderer and materials', () => {
  it('resolves theme renderer presentation to filmic PBR-safe defaults', () => {
    const voxel = resolveRendererPresentation(getTheme('voxel').presentation.renderer);
    expect(voxel.toneMapping).toBe(THREE.ACESFilmicToneMapping);
    expect(voxel.exposure).toBeCloseTo(1.08);
    expect(voxel.shadowsEnabled).toBe(true);
    expect(voxel.shadowMapType).toBe(THREE.PCFSoftShadowMap);
    expect(voxel.imageBasedLightingEnabled).toBe(true);
    expect(voxel.imageBasedLightingIntensity).toBeGreaterThan(0);

    const toybox = resolveRendererPresentation(getTheme('toybox').presentation.renderer);
    expect(toybox.toneMapping).toBe(THREE.ACESFilmicToneMapping);
    expect(toybox.imageBasedLightingIntensity).toBeGreaterThan(voxel.imageBasedLightingIntensity);

    const bounded = resolveRendererPresentation({
      exposure: Number.POSITIVE_INFINITY,
      imageBasedLighting: { intensity: -5 },
    });
    expect(bounded.exposure).toBe(1);
    expect(bounded.imageBasedLightingIntensity).toBe(0);
  });

  it('keeps voxel pixels crisp nearby while stabilising distant camera motion', () => {
    const texture = blockTexture('stone');
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(texture.magFilter).toBe(THREE.NearestFilter);
    expect(texture.minFilter).toBe(THREE.NearestMipmapLinearFilter);
    expect(texture.generateMipmaps).toBe(true);
    expect(texture.anisotropy).toBeGreaterThanOrEqual(4);
  });

  it('gives voxel material families distinct physically based responses', () => {
    const grass = createBlockMaterial('grassTop');
    const stone = createBlockMaterial('stone');
    const metal = createBlockMaterial('metalPlate');

    expect(grass.roughness).toBeGreaterThan(stone.roughness);
    expect(stone.roughness).toBeGreaterThan(metal.roughness);
    expect(grass.metalness).toBe(0);
    expect(metal.metalness).toBeGreaterThan(0.5);
  });

  it('uses production-safe transparency and richer wet/Toybox surfaces', () => {
    const glassyVoxel = createVoxelMaterial('#ffffff', { transparent: true, opacity: 0.5 });
    expect(glassyVoxel.depthWrite).toBe(false);
    expect(glassyVoxel.dithering).toBe(true);

    const water = createVoxelWaterMaterial({ size: [4, 0.05, 2] });
    expect(water).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    expect(water.clearcoat).toBeGreaterThan(0.8);
    expect(water.roughness).toBeLessThan(0.25);
    expect(water.depthWrite).toBe(false);
    expect(water.map?.wrapS).toBe(THREE.RepeatWrapping);

    const clearPlastic = plastic('#ff8844', { transparent: true, opacity: 0.5 });
    expect(clearPlastic).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    expect(clearPlastic.depthWrite).toBe(false);
    expect((clearPlastic as THREE.MeshPhysicalMaterial).clearcoat).toBeGreaterThan(0.2);

    const metal = toyMetal();
    expect(metal).toBeInstanceOf(THREE.MeshPhysicalMaterial);
    expect(metal.metalness).toBeGreaterThan(0.6);
  });


  it('allows weather scenes to darken the shared voxel light rig without changing its defaults', () => {
    const normal = createVoxelLighting();
    const rainy = createVoxelLighting({ intensityScale: 0.72 });
    const normalLights = normal.children.filter((child: THREE.Object3D): child is THREE.Light => child instanceof THREE.Light);
    const rainyLights = rainy.children.filter((child: THREE.Object3D): child is THREE.Light => child instanceof THREE.Light);

    expect(normalLights).toHaveLength(3);
    expect(rainyLights).toHaveLength(3);
    for (let i = 0; i < normalLights.length; i++) {
      expect(rainyLights[i].intensity).toBeCloseTo(normalLights[i].intensity * 0.72);
    }
  });

  it('wires the same renderer presentation through Studio, Player and export', () => {
    const studio = readFileSync(new URL('../apps/studio/src/studio-controller.ts', import.meta.url), 'utf8');
    const player = readFileSync(new URL('../apps/player/src/player-controller.ts', import.meta.url), 'utf8');
    const exporter = readFileSync(
      new URL('../packages/video-export/src/MindForgeVideoExporter.ts', import.meta.url),
      'utf8',
    );

    expect(studio).toContain('rendererPresentation: this.theme.presentation.renderer');
    expect(studio).toContain('nextTheme.presentation.renderer');
    expect(studio).toContain('previousTheme.presentation.renderer');
    expect(player).toContain('rendererPresentation: this.theme.presentation.renderer');
    expect(player).toContain('nextTheme.presentation.renderer');
    expect(player).toContain('previousTheme.presentation.renderer');
    expect(exporter).toContain('rendererPresentation: request.theme.presentation.renderer');
  });
});
