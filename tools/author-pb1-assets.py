#!/usr/bin/env python3
"""Offline authoring for the MindForge Voxel production baseline.

PB5A promotes the block-game language already proven by Artifact 001 (Heat) and
Artifact 004 (Cold Battery) into the reusable production asset packs.  These
GLBs are deliberately built from chunky orthogonal forms with UVs and embedded
16x16 pixel surfaces so they arrive in the runtime already matching the Voxel
world. No scene-wide material replacement is required during playback/export.

This script is authoring-only; MindForge never runs it during playback/export.
Requires: Python 3, numpy, trimesh.
"""
from __future__ import annotations

from pathlib import Path
import json
import struct
import numpy as np
import trimesh
from PIL import Image
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals

ROOT = Path(__file__).resolve().parents[1]
NATURE = ROOT / 'public/assets/voxel/nature/production'
OPTICS = ROOT / 'public/assets/voxel/props/production'


TEXTURE_SIZE = 16
_TEXTURE_CACHE: dict[str, Image.Image] = {}


def pixel_texture(family: str) -> Image.Image:
    """Small neutral texture baked into each GLB; baseColorFactor supplies the family tint."""
    cached = _TEXTURE_CACHE.get(family)
    if cached is not None:
        return cached

    rng = np.random.default_rng(sum((i + 1) * ord(ch) for i, ch in enumerate(family)))
    image = Image.new('RGB', (TEXTURE_SIZE, TEXTURE_SIZE))
    pixels: list[tuple[int, int, int]] = []
    for y in range(TEXTURE_SIZE):
        for x in range(TEXTURE_SIZE):
            if family == 'bark':
                value = 205 + ((x // 3 + y // 7) % 3) * 15 + int(rng.integers(-8, 9))
            elif family == 'leaves':
                value = 205 + ((x // 4 + y // 4) % 2) * 26 + int(rng.integers(-12, 13))
            elif family == 'grass':
                value = 212 + ((x + y // 3) % 4) * 9 + int(rng.integers(-10, 11))
            elif family == 'stone':
                value = 198 + int(rng.integers(-26, 28))
            elif family == 'cloud':
                value = 224 + int(rng.integers(-14, 18))
            elif family == 'water':
                value = 215 + ((y + (x // 4)) % 4) * 10 + int(rng.integers(-6, 7))
            elif family == 'flower':
                value = 232 + int(rng.integers(-8, 12))
            else:
                value = 242
            value = max(128, min(255, value))
            pixels.append((value, value, value))
    image.putdata(pixels)
    _TEXTURE_CACHE[family] = image
    return image


def mat(
    name: str,
    rgb: tuple[int, int, int],
    *,
    texture: str,
    roughness=0.88,
    metallic=0.0,
    alpha=255,
    emissive: tuple[int, int, int] | None = None,
) -> PBRMaterial:
    return PBRMaterial(
        name=name,
        baseColorFactor=[*rgb, alpha],
        baseColorTexture=pixel_texture(texture),
        metallicFactor=metallic,
        roughnessFactor=roughness,
        emissiveFactor=None if emissive is None else [channel / 255 for channel in emissive],
        alphaMode='BLEND' if alpha < 255 else 'OPAQUE',
        doubleSided=False,
    )


# Keep the established semantic material names, but bake the Voxel pixel surface
# directly into the reusable GLB. Runtime scene traversal is intentionally not
# required to make a production asset look like it belongs to the Voxel theme.
BARK_DARK = mat('PB1_BarkDark', (87, 61, 40), texture='bark', roughness=.96)
BARK_WARM = mat('PB1_BarkWarm', (112, 78, 47), texture='bark', roughness=.94)
BARK_PALE = mat('PB1_BarkPale', (166, 154, 126), texture='bark', roughness=.90)
LEAF_DARK = mat('PB1_LeafDark', (48, 92, 55), texture='leaves', roughness=.90)
LEAF_MID = mat('PB1_LeafMid', (65, 119, 66), texture='leaves', roughness=.88)
LEAF_LIGHT = mat('PB1_LeafLight', (91, 146, 78), texture='leaves', roughness=.86)
LEAF_PINE = mat('PB1_Pine', (38, 83, 61), texture='leaves', roughness=.92)
ROCK_DARK = mat('PB1_RockDark', (87, 94, 98), texture='stone', roughness=.96)
ROCK_MID = mat('PB1_RockMid', (111, 119, 120), texture='stone', roughness=.94)
ROCK_LIGHT = mat('PB1_RockLight', (137, 142, 139), texture='stone', roughness=.92)
GRASS_DARK = mat('PB1_GrassDark', (55, 103, 52), texture='grass', roughness=.92)
GRASS_MID = mat('PB1_GrassMid', (76, 130, 61), texture='grass', roughness=.90)
FLOWER_WHITE = mat('PB1_FlowerWhite', (229, 228, 205), texture='flower', roughness=.86)
FLOWER_YELLOW = mat('PB1_FlowerYellow', (224, 181, 60), texture='flower', roughness=.82)
CLOUD_DARK = mat('PB1_StormCloudDark', (54, 64, 74), texture='cloud', roughness=1.0)
CLOUD_MID = mat('PB1_StormCloudMid', (76, 89, 100), texture='cloud', roughness=1.0)
CLOUD_LIGHT = mat('PB1_CloudBreak', (137, 154, 162), texture='cloud', roughness=1.0)
WATER = mat('PB2_PuddleWater', (66, 126, 151), texture='water', roughness=.42, alpha=225)
WATER_GLASS = mat('PB2_OpticalWaterGlass', (42, 137, 178), texture='water', roughness=.74, alpha=255)
WATER_GLASS_LIGHT = mat('PB2_OpticalWaterGlassLight', (82, 190, 216), texture='water', roughness=.68, alpha=255)
WATER_GLASS_DARK = mat('PB2_OpticalWaterGlassDark', (25, 82, 121), texture='water', roughness=.80, alpha=255)
PRISM_GLASS = mat('PB2_OpticalPrismGlass', (74, 157, 193), texture='water', roughness=.72, alpha=255)
GLASS_EDGE = mat('PB2_OpticalEdge', (66, 181, 219), texture='flat', roughness=.52, alpha=255, emissive=(12, 45, 64))


def set_material(mesh: trimesh.Trimesh, material: PBRMaterial) -> trimesh.Trimesh:
    uv = getattr(mesh.visual, 'uv', None)
    mesh.visual = TextureVisuals(uv=uv, material=material)
    return mesh


def add(scene: trimesh.Scene, mesh: trimesh.Trimesh, node: str, material: PBRMaterial) -> None:
    set_material(mesh, material)
    scene.add_geometry(mesh, geom_name=f'{node}_Mesh', node_name=node)


def empty(scene: trimesh.Scene, name: str, position=(0.0, 0.0, 0.0)) -> None:
    matrix = np.eye(4)
    matrix[:3, 3] = np.asarray(position, dtype=float)
    scene.graph.update(frame_from='world', frame_to=name, matrix=matrix)


def voxel_box(size, center=(0.0, 0.0, 0.0)) -> trimesh.Trimesh:
    """Box with per-triangle UVs and guaranteed outward winding."""
    size = np.asarray(size, dtype=float)
    center = np.asarray(center, dtype=float)
    base = trimesh.creation.box(extents=size)
    verts: list[np.ndarray] = []
    faces: list[list[int]] = []
    uvs: list[tuple[float, float]] = []
    half = np.maximum(size * .5, 1e-6)

    for face, normal in zip(base.faces, base.face_normals):
        start = len(verts)
        for vertex_index in face:
            p = base.vertices[vertex_index]
            verts.append(p + center)
            axis = int(np.argmax(np.abs(normal)))
            if axis == 0:
                u, v = p[2] / half[2], p[1] / half[1]
            elif axis == 1:
                u, v = p[0] / half[0], p[2] / half[2]
            else:
                u, v = p[0] / half[0], p[1] / half[1]
            uvs.append(((u + 1) * .5, (v + 1) * .5))
        faces.append([start, start + 1, start + 2])

    return trimesh.Trimesh(
        vertices=np.asarray(verts),
        faces=np.asarray(faces),
        visual=TextureVisuals(uv=np.asarray(uvs)),
        process=False,
    )


def add_box(scene: trimesh.Scene, node: str, material: PBRMaterial, size, center) -> None:
    add(scene, voxel_box(size, center), node, material)


def nearest_sampler_glb(data: bytes) -> bytes:
    """Attach one repeat + nearest sampler to every embedded base-color texture."""
    magic, version, total = struct.unpack_from('<III', data, 0)
    if magic != 0x46546C67 or version != 2:
        raise ValueError('Expected a glTF 2.0 GLB')

    offset = 12
    json_doc: dict | None = None
    binary_chunks: list[tuple[int, bytes]] = []
    while offset < total:
        length, chunk_type = struct.unpack_from('<II', data, offset)
        offset += 8
        payload = data[offset:offset + length]
        offset += length
        if chunk_type == 0x4E4F534A:
            json_doc = json.loads(payload.decode('utf8').rstrip(' \x00'))
        else:
            binary_chunks.append((chunk_type, payload))

    if json_doc is None:
        raise ValueError('GLB is missing its JSON chunk')
    if json_doc.get('textures'):
        # trimesh emits one embedded image per material even when several
        # materials share the same authored texture family. Deduplicate those
        # texture records so PF2 budgets describe real GPU texture variety, not
        # exporter duplication. Unused bufferViews can stay in the BIN safely.
        bin_payload = next((payload for chunk_type, payload in binary_chunks if chunk_type == 0x004E4942), b'')
        image_keys: list[bytes] = []
        for image in json_doc.get('images', []):
            view = json_doc['bufferViews'][image['bufferView']]
            start = int(view.get('byteOffset', 0))
            end = start + int(view['byteLength'])
            image_keys.append(bin_payload[start:end])

        texture_map: dict[int, int] = {}
        canonical_by_image: dict[bytes, int] = {}
        new_images: list[dict] = []
        new_textures: list[dict] = []
        for old_index, texture in enumerate(json_doc['textures']):
            source = int(texture['source'])
            key = image_keys[source]
            canonical = canonical_by_image.get(key)
            if canonical is None:
                canonical = len(new_textures)
                canonical_by_image[key] = canonical
                new_images.append(json_doc['images'][source])
                new_textures.append({'source': canonical, 'sampler': 0})
            texture_map[old_index] = canonical

        for material in json_doc.get('materials', []):
            pbr = material.get('pbrMetallicRoughness', {})
            base = pbr.get('baseColorTexture')
            if base is not None:
                base['index'] = texture_map[int(base['index'])]

        json_doc['images'] = new_images
        json_doc['textures'] = new_textures
        json_doc['samplers'] = [{
            'magFilter': 9728,       # NEAREST
            'minFilter': 9986,       # NEAREST_MIPMAP_LINEAR
            'wrapS': 10497,          # REPEAT
            'wrapT': 10497,
        }]

    json_bytes = json.dumps(json_doc, separators=(',', ':')).encode('utf8')
    json_bytes += b' ' * ((4 - len(json_bytes) % 4) % 4)
    chunks = [struct.pack('<II', len(json_bytes), 0x4E4F534A) + json_bytes]
    for chunk_type, payload in binary_chunks:
        payload += b'\x00' * ((4 - len(payload) % 4) % 4)
        chunks.append(struct.pack('<II', len(payload), chunk_type) + payload)
    body = b''.join(chunks)
    return struct.pack('<III', 0x46546C67, 2, 12 + len(body)) + body


def export(scene: trimesh.Scene, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = nearest_sampler_glb(scene.export(file_type='glb'))
    path.write_bytes(data)
    print(f'{path.relative_to(ROOT)}  {len(data) / 1024:.1f} KiB')


# ---------------------------------------------------------------- nature ---

def tree_oak_a() -> trimesh.Scene:
    s = trimesh.Scene()
    add_box(s, 'Trunk', BARK_WARM, (.58, 3.2, .58), (0, 1.6, 0))
    add_box(s, 'Canopy_Base', LEAF_DARK, (2.7, 1.0, 2.35), (0, 3.15, 0))
    add_box(s, 'Canopy_Left', LEAF_MID, (1.75, .9, 1.75), (-.62, 3.82, .05))
    add_box(s, 'Canopy_Right', LEAF_MID, (1.75, .9, 1.75), (.62, 3.75, -.12))
    add_box(s, 'Canopy_Cap', LEAF_LIGHT, (1.55, .78, 1.48), (0, 4.38, -.05))
    empty(s, 'MF_Anchor_Root', (0, 0, 0)); empty(s, 'MF_Anchor_Trunk', (0, 1.6, 0)); empty(s, 'MF_Anchor_Canopy', (0, 3.75, 0))
    return s


def tree_oak_b() -> trimesh.Scene:
    s = trimesh.Scene()
    add_box(s, 'Trunk_Base', BARK_DARK, (.66, 2.2, .62), (0, 1.1, 0))
    add_box(s, 'Trunk_Left', BARK_WARM, (.42, 1.7, .42), (-.28, 2.55, .02))
    add_box(s, 'Trunk_Right', BARK_WARM, (.42, 1.9, .42), (.32, 2.62, -.04))
    add_box(s, 'Canopy_Left', LEAF_MID, (2.15, 1.2, 1.9), (-.72, 3.62, .08))
    add_box(s, 'Canopy_Right', LEAF_DARK, (2.1, 1.15, 1.85), (.76, 3.72, -.12))
    add_box(s, 'Canopy_Cap', LEAF_LIGHT, (1.65, .9, 1.55), (.08, 4.48, -.04))
    empty(s, 'MF_Anchor_Root', (0, 0, 0)); empty(s, 'MF_Anchor_Trunk', (0, 1.7, 0)); empty(s, 'MF_Anchor_Canopy', (0, 3.8, 0))
    return s


def tree_pine_a() -> trimesh.Scene:
    s = trimesh.Scene()
    add_box(s, 'Trunk', BARK_DARK, (.46, 4.65, .46), (0, 2.325, 0))
    for i, (y, size) in enumerate([(1.7, 2.65), (2.45, 2.25), (3.18, 1.8), (3.82, 1.35), (4.36, .85)]):
        material = LEAF_PINE if i % 2 == 0 else LEAF_DARK
        add_box(s, f'Needles_{i + 1}', material, (size, .62, size), (0, y, 0))
    empty(s, 'MF_Anchor_Root', (0, 0, 0)); empty(s, 'MF_Anchor_Trunk', (0, 2.25, 0)); empty(s, 'MF_Anchor_Canopy', (0, 3.0, 0))
    return s


def tree_young_a() -> trimesh.Scene:
    s = trimesh.Scene()
    add_box(s, 'Trunk', BARK_PALE, (.38, 2.45, .38), (0, 1.225, 0))
    add_box(s, 'Canopy_Low', LEAF_MID, (1.45, .72, 1.28), (0, 2.3, 0))
    add_box(s, 'Canopy_Left', LEAF_DARK, (.92, .7, .9), (-.42, 2.78, .04))
    add_box(s, 'Canopy_Right', LEAF_MID, (.92, .72, .9), (.42, 2.82, -.05))
    add_box(s, 'Canopy_Cap', LEAF_LIGHT, (.86, .66, .82), (0, 3.28, 0))
    empty(s, 'MF_Anchor_Root', (0, 0, 0)); empty(s, 'MF_Anchor_Trunk', (0, 1.2, 0)); empty(s, 'MF_Anchor_Canopy', (0, 2.72, 0))
    return s


def rock_scene(seed: int, dims, cluster=False) -> trimesh.Scene:
    # Seed remains part of the authoring signature even though PB5A intentionally
    # uses orthogonal silhouettes rather than noisy low-poly displacement.
    s = trimesh.Scene()
    sx, sy, sz = dims
    add_box(s, 'Rock_Main', ROCK_MID, (sx * 1.55, sy * 1.3, sz * 1.45), (0, sy * .65, 0))
    add_box(s, 'Rock_Top', ROCK_LIGHT, (sx * .9, sy * .65, sz * .9), (sx * .18, sy * 1.38, -sz * .08))
    if cluster:
        add_box(s, 'Rock_SideA', ROCK_DARK, (sx * .78, sy * .85, sz * .74), (sx * .92, sy * .43, -sz * .18))
        add_box(s, 'Rock_SideB', ROCK_LIGHT, (sx * .62, sy * .6, sz * .66), (-sx * .86, sy * .3, sz * .28))
    empty(s, 'MF_Anchor_Center', (0, sy * .72, 0))
    return s


def bush_scene(seed: int, wide=False) -> trimesh.Scene:
    s = trimesh.Scene(); spread = 1.2 if wide else 1.0
    add_box(s, 'Bush_Left', LEAF_DARK, (.9 * spread, .78, .92), (-.4 * spread, .42, .04))
    add_box(s, 'Bush_Right', LEAF_MID, (.98 * spread, .82, .94), (.4 * spread, .45, -.05))
    add_box(s, 'Bush_Cap', LEAF_LIGHT, (.9 * spread, .7, .82), (0, .92, 0))
    add_box(s, 'Twig', BARK_DARK, (.18, .55, .18), (0, .28, 0))
    empty(s, 'MF_Anchor_Root', (0, 0, 0)); empty(s, 'MF_Anchor_Canopy', (0, .68, 0))
    return s


def grass_scene(seed: int, count=8, broad=False) -> trimesh.Scene:
    s = trimesh.Scene(); rng = np.random.default_rng(seed)
    spread = .58 if broad else .44
    for i in range(count):
        x = float(rng.uniform(-spread, spread)); z = float(rng.uniform(-spread, spread))
        h = float(rng.uniform(.34, .72 if broad else .58))
        w = float(rng.choice([.08, .1, .12]))
        add_box(s, f'Blade_{i + 1}', GRASS_MID if i % 3 else GRASS_DARK, (w, h, w), (x, h * .5, z))
    empty(s, 'MF_Anchor_Root', (0, 0, 0)); empty(s, 'MF_Anchor_Center', (0, .3, 0))
    return s


def flower_scene(seed: int) -> trimesh.Scene:
    s = trimesh.Scene(); rng = np.random.default_rng(seed)
    for i in range(4):
        x = float(rng.uniform(-.35, .35)); z = float(rng.uniform(-.35, .35)); h = float(rng.uniform(.42, .68))
        add_box(s, f'Stem_{i + 1}', GRASS_DARK, (.07, h, .07), (x, h * .5, z))
        add_box(s, f'Flower_{i + 1}', FLOWER_WHITE, (.24, .10, .24), (x, h + .07, z))
        add_box(s, f'Center_{i + 1}', FLOWER_YELLOW, (.10, .13, .10), (x, h + .12, z))
    empty(s, 'MF_Anchor_Root', (0, 0, 0)); empty(s, 'MF_Anchor_Center', (0, .5, 0))
    return s


def puddle_scene() -> trimesh.Scene:
    s = trimesh.Scene()
    # Stepped tile footprint: visually consistent with the block ground and much
    # cheaper/more legible than an irregular smooth polygon.
    add_box(s, 'Puddle_Core', WATER, (1.7, .055, 1.05), (0, .028, 0))
    add_box(s, 'Puddle_Left', WATER, (.75, .05, .7), (-1.05, .025, .05))
    add_box(s, 'Puddle_Right', WATER, (.65, .05, .6), (.98, .025, -.18))
    empty(s, 'MF_Anchor_Center', (0, .04, 0)); return s


def cloud_scene(seed: int, break_cloud=False) -> trimesh.Scene:
    s = trimesh.Scene()
    masses = [
        (-1.15, 0, 0, 1.8, .66, 1.0),
        (-.42, .32, -.04, 1.55, .72, 1.08),
        (.38, .20, .02, 1.8, .72, 1.05),
        (1.18, .03, -.02, 1.55, .62, .92),
        (0, -.28, .06, 2.15, .5, .88),
    ]
    if break_cloud:
        masses = [m for i, m in enumerate(masses) if i != 2]
    for i, (x, y, z, sx, sy, sz) in enumerate(masses):
        material = CLOUD_LIGHT if break_cloud and i in (1, 2) else (CLOUD_MID if i % 2 else CLOUD_DARK)
        add_box(s, f'CloudBlock_{i + 1}', material, (sx, sy, sz), (x, y, z))
    empty(s, 'MF_Anchor_Center', (0, 0, 0)); empty(s, 'MF_Anchor_Underside', (0, -.45, 0)); return s


# ---------------------------------------------------------------- optics ---

def hero_drop_scene() -> trimesh.Scene:
    s = trimesh.Scene()
    # PB6 hero: intentionally opaque, saturated and silhouette-first.  The
    # optics are explained by semantic light paths, so the raindrop does not
    # need fragile glass transparency to read as water.  A broad lower body,
    # narrow neck and explicit tip make the shape legible at Shorts scale.
    tiers = [
        (-.86, .24, .54, WATER_GLASS_DARK),
        (-.64, .30, .88, WATER_GLASS),
        (-.38, .34, 1.18, WATER_GLASS_LIGHT),
        (-.08, .38, 1.38, WATER_GLASS),
        (.23, .34, 1.18, WATER_GLASS_LIGHT),
        (.51, .28, .88, WATER_GLASS),
        (.74, .22, .60, WATER_GLASS_DARK),
        (.92, .18, .36, WATER_GLASS),
        (1.06, .14, .18, WATER_GLASS_DARK),
    ]
    for i, (y, h, width, material) in enumerate(tiers):
        add_box(s, f'HeroDroplet_Block_{i + 1}', material, (width, h, width * .72), (0, y, 0))

    # A non-emissive front-face highlight gives the block volume a readable
    # water sheen.  Only the tiny optical core uses emissive material.
    add_box(s, 'HeroDroplet_Highlight', WATER_GLASS_LIGHT, (.24, .44, .09), (-.28, .18, .48))
    add_box(s, 'OpticalCore_Lower', GLASS_EDGE, (.26, .20, .20), (-.08, -.24, .34))
    add_box(s, 'OpticalCore_Upper', GLASS_EDGE, (.18, .18, .18), (.06, .04, .36))

    empty(s, 'MF_Anchor_Center', (0, .02, 0)); empty(s, 'MF_Anchor_Input', (-.68, .18, .16)); empty(s, 'MF_Anchor_Bend', (-.24, .02, .20)); empty(s, 'MF_Anchor_Reflect', (.12, -.50, .20)); empty(s, 'MF_Anchor_Exit', (.66, -.22, .18))
    for name, pos in [
        ('Red', (.72, -.02, .16)), ('Orange', (.74, -.09, .11)), ('Yellow', (.76, -.16, .06)),
        ('Green', (.78, -.23, 0)), ('Blue', (.80, -.30, -.06)), ('Violet', (.82, -.37, -.12)),
    ]:
        empty(s, f'MF_Anchor_{name}', pos)
    return s


def small_drop_scene() -> trimesh.Scene:
    s = trimesh.Scene()
    tiers = [
        (-.27, .12, .26, WATER_GLASS_DARK),
        (-.15, .16, .42, WATER_GLASS),
        (0, .18, .56, WATER_GLASS_LIGHT),
        (.16, .16, .42, WATER_GLASS),
        (.29, .11, .24, WATER_GLASS_DARK),
        (.38, .08, .12, WATER_GLASS_DARK),
    ]
    for i, (y, h, width, material) in enumerate(tiers):
        add_box(s, f'RainDroplet_Block_{i + 1}', material, (width, h, width * .72), (0, y, 0))
    empty(s, 'MF_Anchor_Center', (0, 0, 0)); return s


def prism_scene() -> trimesh.Scene:
    s = trimesh.Scene()
    # A stepped wedge rather than a smooth triangular prism; useful for future
    # optics scenes without breaking the block-world silhouette language.
    widths = [1.8, 1.46, 1.12, .78]
    for i, width in enumerate(widths):
        y = -.48 + i * .32
        add_box(s, f'OpticalPrism_Block_{i + 1}', PRISM_GLASS, (width, .30, .9), (0, y, 0))
    add_box(s, 'OpticalPrism_Core', GLASS_EDGE, (.42, .34, .36), (0, -.02, 0))
    empty(s, 'MF_Anchor_Center', (0, 0, 0)); empty(s, 'MF_Anchor_Input', (-.9, -.25, 0)); empty(s, 'MF_Anchor_Exit', (.9, .20, 0)); empty(s, 'MF_Anchor_OpticalCenter', (0, 0, 0))
    return s


def main() -> None:
    assets = [
        (NATURE / 'tree-oak-a.glb', tree_oak_a()),
        (NATURE / 'tree-oak-b.glb', tree_oak_b()),
        (NATURE / 'tree-pine-a.glb', tree_pine_a()),
        (NATURE / 'tree-young-a.glb', tree_young_a()),
        (NATURE / 'rock-a.glb', rock_scene(101, (.82, .58, .72))),
        (NATURE / 'rock-b.glb', rock_scene(205, (1.12, .72, .86))),
        (NATURE / 'rock-cluster-a.glb', rock_scene(309, (.78, .52, .68), True)),
        (NATURE / 'bush-a.glb', bush_scene(401, False)),
        (NATURE / 'bush-b.glb', bush_scene(503, True)),
        (NATURE / 'grass-cluster-a.glb', grass_scene(601, 8, False)),
        (NATURE / 'grass-cluster-b.glb', grass_scene(703, 11, True)),
        (NATURE / 'flower-cluster-a.glb', flower_scene(809)),
        (NATURE / 'puddle-a.glb', puddle_scene()),
        (NATURE / 'cloud-storm-a.glb', cloud_scene(907, False)),
        (NATURE / 'cloud-storm-b.glb', cloud_scene(1009, False)),
        (NATURE / 'cloud-break-a.glb', cloud_scene(1103, True)),
        (OPTICS / 'hero-rain-droplet.glb', hero_drop_scene()),
        (OPTICS / 'rain-droplet-small.glb', small_drop_scene()),
        (OPTICS / 'optical-prism.glb', prism_scene()),
    ]
    for path, scene in assets:
        export(scene, path)


if __name__ == '__main__':
    main()
