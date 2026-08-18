import { resolve } from 'node:path';
import { inspectGltfFile } from './lib/gltf-inspector';

const input = process.argv[2];
if (!input) {
  console.error('Usage: pnpm inspect:model <path/to/model.glb|model.gltf>');
  process.exit(1);
}

const path = resolve(process.cwd(), input);
const result = inspectGltfFile(path);
console.log(`MindForge model inspection · ${input}\n`);
console.log(`Format:      ${result.format.toUpperCase()}`);
console.log(`Meshes:      ${result.meshCount}`);
console.log(`Triangles:   ${result.triangleCount.toLocaleString()}`);
console.log(`Materials:   ${result.materialCount}`);
console.log(`Textures:    ${result.textureCount}`);
console.log(`Nodes:       ${result.nodeNames.length}`);
console.log(`Animations:  ${result.animationNames.length}`);
console.log(`Extensions:  ${result.extensionsUsed.join(', ') || 'none'}`);
console.log(`External:    ${result.externalUris.join(', ') || 'none'}`);
console.log(`Remote:      ${result.remoteUris.join(', ') || 'none'}`);
if (result.animationNames.length) console.log(`Clip names:  ${result.animationNames.join(', ')}`);
const anchors = result.nodeNames.filter((name) => name.startsWith('MF_Anchor_'));
console.log(`MF anchors:  ${anchors.join(', ') || 'none'}`);
