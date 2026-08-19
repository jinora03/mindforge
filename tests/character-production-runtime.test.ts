import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  HUMANOID_ANCHORS,
  HUMANOID_JOINTS,
  MODEL_BUDGET_PRESETS,
  SceneRuntime,
  validateAssetCatalog,
  type AssetDescriptor,
  type MotionFactory,
  type RuntimeAssetAccess,
  type RuntimeModelAsset,
} from '@mindforge/engine';
import { createModelCharacterFactory } from '@mindforge/characters';
import { createDefaultLibrary } from '@mindforge/library';

function characterDescriptor(overrides: Partial<AssetDescriptor> = {}): AssetDescriptor {
  const descriptor: AssetDescriptor = {
    id: 'model.test.productionCharacter',
    kind: 'model',
    url: 'assets/test/production-character.glb',
    anchors: Object.fromEntries(
      HUMANOID_ANCHORS.map((name) => [name, `MF_Anchor_${name}`]),
    ),
    model: {
      category: 'character',
      quality: 'standard',
      units: 'meters',
      upAxis: 'Y',
      forwardAxis: '-Z',
      origin: 'ground-center',
      materialPolicy: 'embedded-pbr',
      clips: { walk: 'WalkCycle' },
      budget: MODEL_BUDGET_PRESETS.standard,
    },
    character: {
      rig: 'humanoid',
      rootMotion: 'in-place',
      joints: Object.fromEntries(
        HUMANOID_JOINTS.map((name) => [name, `Rig_${name}`]),
      ) as Record<(typeof HUMANOID_JOINTS)[number], string>,
    },
    provenance: { source: 'original' },
  };
  return { ...descriptor, ...overrides };
}

function runtimeCharacterModel(): RuntimeModelAsset {
  const object3d = new THREE.Group();
  const anchors: Record<string, THREE.Object3D> = {};
  for (const name of HUMANOID_ANCHORS) {
    const anchor = new THREE.Object3D();
    anchor.name = `MF_Anchor_${name}`;
    object3d.add(anchor);
    anchors[name] = anchor;
  }

  const characterJoints = {} as Record<(typeof HUMANOID_JOINTS)[number], THREE.Object3D>;
  for (const name of HUMANOID_JOINTS) {
    const joint = new THREE.Bone();
    joint.name = `Rig_${name}`;
    object3d.add(joint);
    characterJoints[name] = joint;
  }

  const walk = new THREE.AnimationClip('WalkCycle', 1, [
    new THREE.NumberKeyframeTrack('Rig_head.position[x]', [0, 1], [0, 1]),
  ]);
  return {
    object3d,
    anchors,
    animations: [walk],
    clips: { walk },
    characterJoints,
  };
}

const headTurn: MotionFactory = ({ target }) => ({
  apply(ctx) {
    if (!ctx.active) return;
    target.rig?.rotateJoint('head', 0, 0, ctx.progress * 0.3);
  },
  reset() {},
});

describe('PF7 character production pipeline', () => {
  it('requires production character models to declare the humanoid rig contract and canonical anchors', () => {
    const missingProfile = characterDescriptor({ character: undefined });
    const issues = validateAssetCatalog('voxel', [missingProfile], [
      {
        id: 'pack.voxel.characters',
        label: 'Characters',
        maturity: 'production',
        assetIds: [missingProfile.id],
      },
    ]);
    expect(issues.some((issue) => issue.code === 'character.profile-missing')).toBe(true);

    const missingHand = characterDescriptor({
      anchors: Object.fromEntries(
        HUMANOID_ANCHORS.filter((name) => name !== 'handRight').map((name) => [name, `MF_Anchor_${name}`]),
      ),
    });
    const anchorIssues = validateAssetCatalog('voxel', [missingHand], [
      {
        id: 'pack.voxel.characters',
        label: 'Characters',
        maturity: 'production',
        assetIds: [missingHand.id],
      },
    ]);
    expect(anchorIssues.some((issue) => issue.code === 'character.anchor-missing')).toBe(true);
  });

  it('wraps a PF2 model as a semantic character without exposing the asset id to episode JSON', () => {
    const library = createDefaultLibrary();
    library.characters.register(
      'character.test.production',
      createModelCharacterFactory('model.test.productionCharacter'),
    );

    const assets: RuntimeAssetAccess = {
      has: (id) => id === 'model.test.productionCharacter',
      instantiateModel: () => runtimeCharacterModel(),
    };

    const runtime = new SceneRuntime();
    runtime.load(
      {
        schemaVersion: '0.1',
        id: 'pf7-production-character',
        title: 'PF7 Production Character',
        duration: 2,
        environment: 'environment.dreamGarden',
        entities: [
          {
            id: 'hero',
            type: 'character',
            factory: 'character.test.production',
            position: [2, 0, 0],
          },
        ],
        timeline: [],
      },
      library,
      assets,
    );

    const hero = runtime.getEntities().find((entity) => entity.id === 'hero');
    expect(hero?.kind).toBe('character');
    expect(hero?.object3d.position.x).toBe(2);
    expect(hero?.anchorNames()).toEqual([...HUMANOID_ANCHORS].sort());
    expect(hero?.rig?.hasJoint('head')).toBe(true);
    expect(hero?.animationClips?.walk?.name).toBe('WalkCycle');
    expect(hero?.object3d.userData.mindforgeCharacterSource).toBe('authored');
    runtime.dispose();
  });

  it('layers PF3 authored clips and deterministic procedural motion on the same authored rig', () => {
    const library = createDefaultLibrary();
    library.characters.register(
      'character.test.production',
      createModelCharacterFactory('model.test.productionCharacter'),
    );
    library.motions.register('motion.test.headTurn', headTurn);

    const assets: RuntimeAssetAccess = {
      has: (id) => id === 'model.test.productionCharacter',
      instantiateModel: () => runtimeCharacterModel(),
    };

    const runtime = new SceneRuntime();
    runtime.load(
      {
        schemaVersion: '0.1',
        id: 'pf7-authored-plus-procedural',
        title: 'PF7 Authored Plus Procedural',
        duration: 2,
        environment: 'environment.dreamGarden',
        entities: [{ id: 'hero', type: 'character', factory: 'character.test.production' }],
        timeline: [
          { id: 'walk', type: 'animation', at: 0, duration: 1, target: 'hero', clip: 'walk' },
          { id: 'turn', type: 'motion', at: 0, duration: 1, target: 'hero', motion: 'motion.test.headTurn' },
        ],
      },
      library,
      assets,
    );

    runtime.evaluateAt(0.5);
    const hero = runtime.getEntities().find((entity) => entity.id === 'hero');
    const head = hero?.object3d.getObjectByName('Rig_head');
    expect(head?.position.x).toBeCloseTo(0.5);
    expect(head?.rotation.z ?? 0).not.toBeCloseTo(0);
    const firstQuaternion = head?.quaternion.toArray() ?? [];

    runtime.evaluateAt(1.75);
    expect(head?.position.x).toBeCloseTo(0);
    expect(head?.rotation.z ?? 0).toBeCloseTo(0);

    runtime.evaluateAt(0.5);
    expect(head?.position.x).toBeCloseTo(0.5);
    expect(head?.quaternion.toArray()).toEqual(firstQuaternion);
    runtime.dispose();
  });
});
