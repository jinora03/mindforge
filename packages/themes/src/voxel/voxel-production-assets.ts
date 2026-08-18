import type { AssetDescriptor, AssetPackDescriptor, ModelAssetProfile } from '@mindforge/engine';

const STANDARD_BUDGET = {
  maxTriangles: 12_000,
  maxMaterials: 8,
  maxTextures: 4,
} as const;

const BACKGROUND_BUDGET = {
  maxTriangles: 6_000,
  maxMaterials: 6,
  maxTextures: 4,
} as const;

const HERO_BUDGET = {
  maxTriangles: 24_000,
  maxMaterials: 8,
  maxTextures: 6,
} as const;

const ORIGINAL_PROVENANCE = {
  source: 'original',
  attribution: 'MindForge PB1 Production Baseline',
} as const;

function profile(
  category: ModelAssetProfile['category'],
  options: {
    readonly quality?: ModelAssetProfile['quality'];
    readonly origin?: ModelAssetProfile['origin'];
    readonly budget?: ModelAssetProfile['budget'];
    readonly castShadow?: boolean;
    readonly receiveShadow?: boolean;
  } = {},
): ModelAssetProfile {
  return {
    category,
    quality: options.quality ?? 'standard',
    units: 'meters',
    upAxis: 'Y',
    origin: options.origin ?? 'ground-center',
    materialPolicy: 'embedded-pbr',
    budget: options.budget ?? STANDARD_BUDGET,
    castShadow: options.castShadow ?? true,
    receiveShadow: options.receiveShadow ?? true,
  };
}

const treeAnchors = {
  root: 'MF_Anchor_Root',
  trunk: 'MF_Anchor_Trunk',
  canopy: 'MF_Anchor_Canopy',
} as const;

const bushAnchors = {
  root: 'MF_Anchor_Root',
  canopy: 'MF_Anchor_Canopy',
} as const;

const groundCoverAnchors = {
  root: 'MF_Anchor_Root',
  center: 'MF_Anchor_Center',
} as const;

export const VOXEL_PB1_NATURE_ASSET_IDS = {
  trees: [
    'model.vegetation.treeOakA.production',
    'model.vegetation.treeOakB.production',
    'model.vegetation.treePineA.production',
    'model.vegetation.treeYoungA.production',
  ],
  bushes: [
    'model.vegetation.bushA.production',
    'model.vegetation.bushB.production',
  ],
  rocks: [
    'model.rock.meadowA.production',
    'model.rock.meadowB.production',
    'model.rock.clusterA.production',
  ],
  groundCover: [
    'model.vegetation.grassClusterA.production',
    'model.vegetation.grassClusterB.production',
    'model.vegetation.flowerClusterA.production',
  ],
} as const;

export const VOXEL_PB1_PRODUCTION_ASSETS: AssetDescriptor[] = [
  {
    id: 'model.vegetation.treeOakA.production',
    kind: 'model',
    url: 'assets/voxel/nature/production/tree-oak-a.glb',
    description: 'PB1 broad-canopy oak with asymmetrical branching and semantic trunk/canopy anchors.',
    anchors: treeAnchors,
    model: profile('vegetation'),
    provenance: ORIGINAL_PROVENANCE,
  },
  {
    id: 'model.vegetation.treeOakB.production',
    kind: 'model',
    url: 'assets/voxel/nature/production/tree-oak-b.glb',
    description: 'PB1 split-trunk oak for reusable meadow and forest composition variety.',
    anchors: treeAnchors,
    model: profile('vegetation'),
    provenance: ORIGINAL_PROVENANCE,
  },
  {
    id: 'model.vegetation.treePineA.production',
    kind: 'model',
    url: 'assets/voxel/nature/production/tree-pine-a.glb',
    description: 'PB1 layered stylized pine for distant and midground nature composition.',
    anchors: treeAnchors,
    model: profile('vegetation'),
    provenance: ORIGINAL_PROVENANCE,
  },
  {
    id: 'model.vegetation.treeYoungA.production',
    kind: 'model',
    url: 'assets/voxel/nature/production/tree-young-a.glb',
    description: 'PB1 young tree for scale variation and lighter foreground/midground dressing.',
    anchors: treeAnchors,
    model: profile('vegetation'),
    provenance: ORIGINAL_PROVENANCE,
  },
  {
    id: 'model.rock.meadowA.production',
    kind: 'model',
    url: 'assets/voxel/nature/production/rock-a.glb',
    description: 'PB1 faceted meadow rock A.',
    anchors: { center: 'MF_Anchor_Center' },
    model: profile('rock'),
    provenance: ORIGINAL_PROVENANCE,
  },
  {
    id: 'model.rock.meadowB.production',
    kind: 'model',
    url: 'assets/voxel/nature/production/rock-b.glb',
    description: 'PB1 faceted meadow rock B with a broader silhouette.',
    anchors: { center: 'MF_Anchor_Center' },
    model: profile('rock'),
    provenance: ORIGINAL_PROVENANCE,
  },
  {
    id: 'model.rock.clusterA.production',
    kind: 'model',
    url: 'assets/voxel/nature/production/rock-cluster-a.glb',
    description: 'PB1 reusable three-piece rock cluster.',
    anchors: { center: 'MF_Anchor_Center' },
    model: profile('rock'),
    provenance: ORIGINAL_PROVENANCE,
  },
  {
    id: 'model.vegetation.bushA.production',
    kind: 'model',
    url: 'assets/voxel/nature/production/bush-a.glb',
    description: 'PB1 compact layered bush with internal twig structure.',
    anchors: bushAnchors,
    model: profile('vegetation'),
    provenance: ORIGINAL_PROVENANCE,
  },
  {
    id: 'model.vegetation.bushB.production',
    kind: 'model',
    url: 'assets/voxel/nature/production/bush-b.glb',
    description: 'PB1 wider bush variant for composition breakup.',
    anchors: bushAnchors,
    model: profile('vegetation'),
    provenance: ORIGINAL_PROVENANCE,
  },
  {
    id: 'model.vegetation.grassClusterA.production',
    kind: 'model',
    url: 'assets/voxel/nature/production/grass-cluster-a.glb',
    description: 'PB1 authored grass cluster A with individually shaped blades.',
    anchors: groundCoverAnchors,
    model: profile('vegetation', { quality: 'background', budget: BACKGROUND_BUDGET }),
    provenance: ORIGINAL_PROVENANCE,
  },
  {
    id: 'model.vegetation.grassClusterB.production',
    kind: 'model',
    url: 'assets/voxel/nature/production/grass-cluster-b.glb',
    description: 'PB1 denser authored grass cluster B.',
    anchors: groundCoverAnchors,
    model: profile('vegetation', { quality: 'background', budget: BACKGROUND_BUDGET }),
    provenance: ORIGINAL_PROVENANCE,
  },
  {
    id: 'model.vegetation.flowerClusterA.production',
    kind: 'model',
    url: 'assets/voxel/nature/production/flower-cluster-a.glb',
    description: 'PB1 reusable five-flower meadow cluster.',
    anchors: groundCoverAnchors,
    model: profile('vegetation', { quality: 'background', budget: BACKGROUND_BUDGET }),
    provenance: ORIGINAL_PROVENANCE,
  },
  {
    id: 'model.prop.puddleA.production',
    kind: 'model',
    url: 'assets/voxel/nature/production/puddle-a.glb',
    description: 'PB1 irregular puddle mesh prepared for PB2 production water/wet-surface material work.',
    anchors: { center: 'MF_Anchor_Center' },
    model: profile('prop', { castShadow: false, receiveShadow: true }),
    provenance: ORIGINAL_PROVENANCE,
  },
  {
    id: 'model.environment.stormCloudA.production',
    kind: 'model',
    url: 'assets/voxel/nature/production/cloud-storm-a.glb',
    description: 'PB1 layered storm cloud family A.',
    anchors: { center: 'MF_Anchor_Center', underside: 'MF_Anchor_Underside' },
    model: profile('environment', {
      origin: 'center',
      quality: 'background',
      budget: BACKGROUND_BUDGET,
      castShadow: false,
      receiveShadow: false,
    }),
    provenance: ORIGINAL_PROVENANCE,
  },
  {
    id: 'model.environment.stormCloudB.production',
    kind: 'model',
    url: 'assets/voxel/nature/production/cloud-storm-b.glb',
    description: 'PB1 layered storm cloud family B with a different authored mass layout.',
    anchors: { center: 'MF_Anchor_Center', underside: 'MF_Anchor_Underside' },
    model: profile('environment', {
      origin: 'center',
      quality: 'background',
      budget: BACKGROUND_BUDGET,
      castShadow: false,
      receiveShadow: false,
    }),
    provenance: ORIGINAL_PROVENANCE,
  },
  {
    id: 'model.environment.cloudBreakA.production',
    kind: 'model',
    url: 'assets/voxel/nature/production/cloud-break-a.glb',
    description: 'PB1 broken-cloud family for reusable sunlight/reveal compositions.',
    anchors: { center: 'MF_Anchor_Center', underside: 'MF_Anchor_Underside' },
    model: profile('environment', {
      origin: 'center',
      quality: 'background',
      budget: BACKGROUND_BUDGET,
      castShadow: false,
      receiveShadow: false,
    }),
    provenance: ORIGINAL_PROVENANCE,
  },
  {
    id: 'model.prop.prismDrop.production',
    kind: 'model',
    url: 'assets/voxel/props/production/hero-rain-droplet.glb',
    description: 'PB1 hero optical rain droplet with custom faceted silhouette, inner lens and dispersion anchors.',
    anchors: {
      center: 'MF_Anchor_Center',
      input: 'MF_Anchor_Input',
      bend: 'MF_Anchor_Bend',
      reflect: 'MF_Anchor_Reflect',
      exit: 'MF_Anchor_Exit',
      red: 'MF_Anchor_Red',
      orange: 'MF_Anchor_Orange',
      yellow: 'MF_Anchor_Yellow',
      green: 'MF_Anchor_Green',
      blue: 'MF_Anchor_Blue',
      violet: 'MF_Anchor_Violet',
    },
    model: profile('prop', { quality: 'hero', origin: 'center', budget: HERO_BUDGET }),
    provenance: ORIGINAL_PROVENANCE,
  },
  {
    id: 'model.prop.rainDropletSmall.production',
    kind: 'model',
    url: 'assets/voxel/props/production/rain-droplet-small.glb',
    description: 'PB1 small authored rain droplet for close/midground optical staging.',
    anchors: { center: 'MF_Anchor_Center' },
    model: profile('prop', { origin: 'center' }),
    provenance: ORIGINAL_PROVENANCE,
  },
  {
    id: 'model.prop.opticalPrism.production',
    kind: 'model',
    url: 'assets/voxel/props/production/optical-prism.glb',
    description: 'PB1 reusable triangular optical prism with semantic input/exit/center anchors.',
    anchors: {
      center: 'MF_Anchor_Center',
      input: 'MF_Anchor_Input',
      exit: 'MF_Anchor_Exit',
      opticalCenter: 'MF_Anchor_OpticalCenter',
    },
    model: profile('prop', { origin: 'center' }),
    provenance: ORIGINAL_PROVENANCE,
  },
];

export const VOXEL_PB1_ASSET_PACKS: AssetPackDescriptor[] = [
  {
    id: 'pack.voxel.nature-production',
    label: 'Voxel Nature Core v1',
    maturity: 'production',
    description:
      'PB1 original authored nature baseline: trees, rocks, shrubs, ground cover, puddle and reusable cloud families.',
    assetIds: [
      'model.vegetation.treeOakA.production',
      'model.vegetation.treeOakB.production',
      'model.vegetation.treePineA.production',
      'model.vegetation.treeYoungA.production',
      'model.rock.meadowA.production',
      'model.rock.meadowB.production',
      'model.rock.clusterA.production',
      'model.vegetation.bushA.production',
      'model.vegetation.bushB.production',
      'model.vegetation.grassClusterA.production',
      'model.vegetation.grassClusterB.production',
      'model.vegetation.flowerClusterA.production',
      'model.prop.puddleA.production',
      'model.environment.stormCloudA.production',
      'model.environment.stormCloudB.production',
      'model.environment.cloudBreakA.production',
    ],
    tags: ['production', 'nature', 'meadow', 'weather-ready'],
  },
  {
    id: 'pack.voxel.optics-production',
    label: 'Voxel Optics Core v1',
    maturity: 'production',
    description:
      'PB1 original authored optical baseline for droplets, refraction/dispersion staging and reusable prism experiments.',
    assetIds: [
      'model.prop.prismDrop.production',
      'model.prop.rainDropletSmall.production',
      'model.prop.opticalPrism.production',
    ],
    tags: ['production', 'science', 'optics', 'rainbow'],
  },
];
