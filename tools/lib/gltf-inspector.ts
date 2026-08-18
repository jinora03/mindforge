import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

interface GltfAccessor {
  readonly count?: number;
}

interface GltfPrimitive {
  readonly indices?: number;
  readonly attributes?: Readonly<Record<string, number>>;
  readonly mode?: number;
}

interface GltfDocument {
  readonly accessors?: readonly GltfAccessor[];
  readonly animations?: readonly { readonly name?: string }[];
  readonly buffers?: readonly { readonly uri?: string }[];
  readonly images?: readonly { readonly uri?: string }[];
  readonly materials?: readonly unknown[];
  readonly meshes?: readonly { readonly primitives?: readonly GltfPrimitive[] }[];
  readonly nodes?: readonly { readonly name?: string }[];
  readonly textures?: readonly unknown[];
  readonly extensionsUsed?: readonly string[];
}

export interface GltfInspection {
  readonly format: 'glb' | 'gltf';
  readonly nodeNames: readonly string[];
  readonly animationNames: readonly string[];
  readonly meshCount: number;
  readonly materialCount: number;
  readonly textureCount: number;
  readonly triangleCount: number;
  readonly extensionsUsed: readonly string[];
  readonly externalUris: readonly string[];
  readonly remoteUris: readonly string[];
}

export function inspectGltfFile(path: string): GltfInspection {
  const extension = extname(path).toLowerCase();
  if (extension !== '.glb' && extension !== '.gltf') {
    throw new Error(`Unsupported model extension "${extension || '(none)'}". Expected .glb or .gltf.`);
  }
  const document = extension === '.glb' ? parseGlb(path) : parseGltf(path);

  const referencedUris = [
    ...(document.buffers ?? []).map((buffer) => buffer.uri),
    ...(document.images ?? []).map((image) => image.uri),
  ].filter((uri): uri is string => Boolean(uri));
  const externalUris = referencedUris.filter((uri) => !isEmbedded(uri) && !isRemote(uri));
  const remoteUris = referencedUris.filter(isRemote);

  return {
    format: extension.slice(1) as 'glb' | 'gltf',
    nodeNames: (document.nodes ?? []).map((node) => node.name).filter((name): name is string => Boolean(name)),
    animationNames: (document.animations ?? [])
      .map((animation) => animation.name)
      .filter((name): name is string => Boolean(name)),
    meshCount: document.meshes?.length ?? 0,
    materialCount: document.materials?.length ?? 0,
    textureCount: document.textures?.length ?? 0,
    triangleCount: countTriangles(document),
    extensionsUsed: [...(document.extensionsUsed ?? [])],
    externalUris,
    remoteUris,
  };
}

function parseGltf(path: string): GltfDocument {
  return JSON.parse(readFileSync(path, 'utf8')) as GltfDocument;
}

function parseGlb(path: string): GltfDocument {
  const bytes = readFileSync(path);
  if (bytes.length < 20 || bytes.readUInt32LE(0) !== 0x46546c67) {
    throw new Error('Invalid GLB header.');
  }
  const version = bytes.readUInt32LE(4);
  if (version !== 2)
    throw new Error(`Unsupported GLB version ${version}; MindForge expects glTF 2.0.`);
  const declaredLength = bytes.readUInt32LE(8);
  if (declaredLength > bytes.length) throw new Error('GLB declares a length larger than the file.');

  let offset = 12;
  while (offset + 8 <= declaredLength) {
    const chunkLength = bytes.readUInt32LE(offset);
    const chunkType = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + chunkLength;
    if (end > declaredLength) throw new Error('GLB chunk exceeds declared file length.');
    if (chunkType === 0x4e4f534a) {
      let jsonEnd = end;
      while (jsonEnd > start && (bytes[jsonEnd - 1] === 0x00 || bytes[jsonEnd - 1] === 0x20)) {
        jsonEnd -= 1;
      }
      const json = bytes.subarray(start, jsonEnd).toString('utf8');
      return JSON.parse(json) as GltfDocument;
    }
    offset = end;
  }
  throw new Error('GLB does not contain a JSON chunk.');
}

function countTriangles(document: GltfDocument): number {
  let total = 0;
  const accessors = document.accessors ?? [];
  for (const mesh of document.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      const accessorIndex = primitive.indices ?? primitive.attributes?.POSITION;
      const count = accessorIndex === undefined ? 0 : accessors[accessorIndex]?.count ?? 0;
      const mode = primitive.mode ?? 4;
      if (mode === 4) total += Math.floor(count / 3); // TRIANGLES
      else if (mode === 5 || mode === 6) total += Math.max(0, count - 2); // STRIP / FAN
    }
  }
  return total;
}

function isEmbedded(uri: string): boolean {
  return uri.startsWith('data:') || uri.startsWith('blob:');
}

function isRemote(uri: string): boolean {
  return /^(?:[a-z]+:)?\/\//i.test(uri);
}
