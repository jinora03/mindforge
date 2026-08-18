#!/usr/bin/env python3
"""Offline PB1 asset authoring for the first MindForge production baseline.

This script creates original, embedded-material GLB assets. It is an authoring
utility only: MindForge never runs it at playback/export time.

Requires: Python 3, numpy, trimesh.
"""
from __future__ import annotations

from pathlib import Path
import math
import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals

ROOT = Path(__file__).resolve().parents[1]
NATURE = ROOT / 'public/assets/voxel/nature/production'
OPTICS = ROOT / 'public/assets/voxel/props/production'


def mat(name: str, rgb: tuple[int, int, int], *, roughness=0.82, metallic=0.0, alpha=255) -> PBRMaterial:
    return PBRMaterial(
        name=name,
        baseColorFactor=[*rgb, alpha],
        metallicFactor=metallic,
        roughnessFactor=roughness,
        alphaMode='BLEND' if alpha < 255 else 'OPAQUE',
        doubleSided=False,
    )

BARK_DARK = mat('PB1_BarkDark', (87, 61, 40), roughness=0.96)
BARK_WARM = mat('PB1_BarkWarm', (112, 78, 47), roughness=0.94)
BARK_PALE = mat('PB1_BarkPale', (166, 154, 126), roughness=0.9)
LEAF_DARK = mat('PB1_LeafDark', (48, 92, 55), roughness=0.88)
LEAF_MID = mat('PB1_LeafMid', (65, 119, 66), roughness=0.86)
LEAF_LIGHT = mat('PB1_LeafLight', (91, 146, 78), roughness=0.84)
LEAF_PINE = mat('PB1_Pine', (38, 83, 61), roughness=0.9)
ROCK_DARK = mat('PB1_RockDark', (87, 94, 98), roughness=0.95)
ROCK_MID = mat('PB1_RockMid', (111, 119, 120), roughness=0.93)
ROCK_LIGHT = mat('PB1_RockLight', (137, 142, 139), roughness=0.91)
GRASS_DARK = mat('PB1_GrassDark', (55, 103, 52), roughness=0.91)
GRASS_MID = mat('PB1_GrassMid', (76, 130, 61), roughness=0.9)
FLOWER_WHITE = mat('PB1_FlowerWhite', (229, 228, 205), roughness=0.84)
FLOWER_YELLOW = mat('PB1_FlowerYellow', (224, 181, 60), roughness=0.8)
CLOUD_DARK = mat('PB1_StormCloudDark', (77, 91, 104), roughness=1.0)
CLOUD_MID = mat('PB1_StormCloudMid', (104, 120, 132), roughness=1.0)
CLOUD_LIGHT = mat('PB1_CloudBreak', (174, 189, 196), roughness=1.0)
WATER = mat('PB2_PuddleWater', (98, 164, 191), roughness=0.16, alpha=190)
WATER_GLASS = mat('PB2_OpticalWaterGlass', (188, 231, 245), roughness=0.08, alpha=232)
PRISM_GLASS = mat('PB2_OpticalPrismGlass', (196, 234, 247), roughness=0.06, alpha=238)
GLASS_EDGE = mat('PB2_OpticalEdge', (115, 184, 214), roughness=0.16, alpha=210)


def set_material(mesh: trimesh.Trimesh, material: PBRMaterial) -> trimesh.Trimesh:
    mesh.visual = TextureVisuals(material=material)
    return mesh


def add(scene: trimesh.Scene, mesh: trimesh.Trimesh, node: str, material: PBRMaterial) -> None:
    set_material(mesh, material)
    scene.add_geometry(mesh, geom_name=f'{node}_Mesh', node_name=node)


def empty(scene: trimesh.Scene, name: str, position=(0.0, 0.0, 0.0)) -> None:
    m = np.eye(4)
    m[:3, 3] = np.asarray(position, dtype=float)
    scene.graph.update(frame_from='world', frame_to=name, matrix=m)



def lowpoly_blob(radius: float, position, scale_xyz=(1, 1, 1), subdivisions=1) -> trimesh.Trimesh:
    mesh = trimesh.creation.icosphere(subdivisions=subdivisions, radius=radius)
    mesh.apply_scale(np.asarray(scale_xyz, dtype=float))
    mesh.apply_translation(np.asarray(position, dtype=float))
    return mesh


def cylinder_between(p0, p1, radius: float, sections=8) -> trimesh.Trimesh:
    p0 = np.asarray(p0, dtype=float)
    p1 = np.asarray(p1, dtype=float)
    vec = p1 - p0
    length = float(np.linalg.norm(vec))
    if length < 1e-6:
        raise ValueError('zero-length cylinder')
    mesh = trimesh.creation.cylinder(radius=radius, height=length, sections=sections)
    align = trimesh.geometry.align_vectors([0, 0, 1], vec / length)
    mesh.apply_transform(align)
    mesh.apply_translation((p0 + p1) * 0.5)
    return mesh


def tapered_y(y0: float, y1: float, r0: float, r1: float, *, sides=9, center=(0, 0)) -> trimesh.Trimesh:
    cx, cz = center
    verts = []
    for y, r in ((y0, r0), (y1, r1)):
        for i in range(sides):
            a = 2 * math.pi * i / sides
            verts.append((cx + math.cos(a) * r, y, cz + math.sin(a) * r))
    faces = []
    for i in range(sides):
        j = (i + 1) % sides
        faces.extend(((i, j, sides + j), (i, sides + j, sides + i)))
    # Triangulated caps keep the GLB primitive strictly triangle-based.
    bottom_center = len(verts)
    top_center = bottom_center + 1
    verts.extend(((cx, y0, cz), (cx, y1, cz)))
    for i in range(sides):
        j = (i + 1) % sides
        faces.append((bottom_center, j, i))
        faces.append((top_center, sides + i, sides + j))
    return trimesh.Trimesh(vertices=np.array(verts), faces=np.array(faces), process=True)


def cone_y(radius: float, height: float, y: float, *, sections=10) -> trimesh.Trimesh:
    mesh = trimesh.creation.cone(radius=radius, height=height, sections=sections)
    rot = trimesh.transformations.rotation_matrix(-math.pi / 2, [1, 0, 0])
    mesh.apply_transform(rot)
    mesh.apply_translation([0, y + height * 0.5, 0])
    return mesh


def irregular_rock(seed: int, scale_xyz=(1.0, 0.7, 0.9), subdivisions=1) -> trimesh.Trimesh:
    rng = np.random.default_rng(seed)
    mesh = trimesh.creation.icosphere(subdivisions=subdivisions, radius=1.0)
    verts = mesh.vertices.copy()
    # coherent-enough fixed authored faceting: noise by vertex direction and height
    noise = rng.uniform(0.78, 1.18, len(verts))
    noise *= 1.0 + 0.06 * np.sign(verts[:, 1])
    verts *= noise[:, None]
    mesh.vertices = verts
    mesh.apply_scale(np.asarray(scale_xyz, dtype=float))
    mesh.apply_translation([0, -mesh.bounds[0, 1], 0])
    return mesh


def blade_mesh(x: float, z: float, height: float, width: float, lean: float, angle: float) -> trimesh.Trimesh:
    # Thin diamond-prism blade: visible from every camera angle without requiring double-sided material.
    base = np.array([
        [-width * .5, 0, -width * .12],
        [ width * .5, 0, -width * .12],
        [ width * .5, 0,  width * .12],
        [-width * .5, 0,  width * .12],
    ])
    top = np.array([
        [-width * .11 + lean, height, -width * .04],
        [ width * .11 + lean, height, -width * .04],
        [ width * .11 + lean, height,  width * .04],
        [-width * .11 + lean, height,  width * .04],
    ])
    verts = np.vstack([base, top])
    faces = np.array([
        [0,1,5],[0,5,4], [1,2,6],[1,6,5], [2,3,7],[2,7,6], [3,0,4],[3,4,7],
        [4,5,6],[4,6,7], [0,3,2],[0,2,1]
    ])
    mesh = trimesh.Trimesh(vertices=verts, faces=faces, process=True)
    mesh.apply_transform(trimesh.transformations.rotation_matrix(angle, [0,1,0]))
    mesh.apply_translation([x,0,z])
    return mesh


def petal_mesh(radius=0.12, length=0.32) -> trimesh.Trimesh:
    mesh = lowpoly_blob(1.0, (0,0,0), (length, 0.045, radius), subdivisions=1)
    return mesh


def ensure_outward_winding(mesh: trimesh.Trimesh) -> trimesh.Trimesh:
    """Normalize closed authored meshes to outward-facing winding before GLB export."""
    if mesh.is_watertight and mesh.volume < 0:
        mesh.invert()
    return mesh


def teardrop_mesh(scale_factor=1.0) -> trimesh.Trimesh:
    profile = [
        (-1.05, .18), (-.92, .40), (-.58, .64), (-.08, .72),
        (.38, .63), (.78, .44), (1.10, .20), (1.34, .045), (1.42, 0.0),
    ]
    segments = 16
    verts = []
    for y, r in profile:
        if r == 0:
            verts.append((0, y, 0))
        else:
            for i in range(segments):
                a = 2 * math.pi * i / segments
                # slightly asymmetrical X/Z footprint prevents primitive-perfect silhouette
                rr = r * (1.0 + 0.035 * math.cos(a * 3))
                verts.append((math.cos(a) * rr, y, math.sin(a) * rr * .94))
    faces = []
    ring_starts=[]
    idx=0
    for _, r in profile:
        ring_starts.append(idx)
        idx += 1 if r == 0 else segments
    for p in range(len(profile)-1):
        r0, r1 = profile[p][1], profile[p+1][1]
        s0,s1=ring_starts[p],ring_starts[p+1]
        if r0 != 0 and r1 != 0:
            for i in range(segments):
                j=(i+1)%segments
                faces.extend(((s0+i,s0+j,s1+j),(s0+i,s1+j,s1+i)))
        elif r1 == 0:
            tip=s1
            for i in range(segments):
                j=(i+1)%segments
                faces.append((s0+i,s0+j,tip))
    # bottom cap
    bottom_center=len(verts); verts.append((0, profile[0][0]-0.02, 0))
    s=ring_starts[0]
    for i in range(segments):
        j=(i+1)%segments
        faces.append((bottom_center,s+j,s+i))
    mesh=trimesh.Trimesh(vertices=np.array(verts)*scale_factor, faces=np.array(faces), process=True)
    mesh.apply_translation([0, -0.175 * scale_factor, 0])
    return ensure_outward_winding(mesh)


def triangular_prism(length=1.8, height=1.4, depth=0.9) -> trimesh.Trimesh:
    # Prism points along X, triangular section in Y/Z.
    x0,x1=-length/2,length/2
    yz=[(-height/2,-depth/2),(-height/2,depth/2),(height/2,0)]
    verts=[(x,y,z) for x in (x0,x1) for y,z in yz]
    faces=np.array([
        [0,2,1],[3,4,5],
        [0,3,5],[0,5,2],
        [1,4,3],[1,3,0],
        [2,5,4],[2,4,1],
    ])
    return ensure_outward_winding(trimesh.Trimesh(vertices=np.array(verts), faces=faces, process=True))


def irregular_puddle(seed=77, radius=1.25, thickness=.035, points=14) -> trimesh.Trimesh:
    rng=np.random.default_rng(seed)
    angles=np.linspace(0,2*math.pi,points,endpoint=False)
    radii=radius*rng.uniform(.72,1.08,points)
    ring=np.column_stack([np.cos(angles)*radii, np.zeros(points), np.sin(angles)*radii*rng.uniform(.7,.95)])
    top=np.column_stack([ring[:,0], np.full(points, thickness), ring[:,2]])
    bottom=ring.copy()
    verts=np.vstack([bottom,top,[[0,0,0],[0,thickness,0]]])
    bcenter=points*2; tcenter=bcenter+1
    faces=[]
    for i in range(points):
        j=(i+1)%points
        faces.extend(((tcenter,points+i,points+j),(bcenter,j,i),(i,j,points+j),(i,points+j,points+i)))
    return trimesh.Trimesh(vertices=verts,faces=np.array(faces),process=True)


def export(scene: trimesh.Scene, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data=scene.export(file_type='glb')
    path.write_bytes(data)
    print(f'{path.relative_to(ROOT)}  {len(data)/1024:.1f} KiB')


def tree_oak_a() -> trimesh.Scene:
    s=trimesh.Scene()
    add(s,tapered_y(0,3.25,.32,.21,sides=10),'Trunk',BARK_WARM)
    for i,(p0,p1,r) in enumerate([
        ((0,1.85,0),(-.9,2.75,.15),.12),((.05,2.05,0),(.92,2.92,-.15),.115),
        ((0,2.35,.02),(-.35,3.22,-.70),.095),((0,2.55,0),(.35,3.28,.68),.09),
    ]): add(s,cylinder_between(p0,p1,r,8),f'Branch_{i+1}',BARK_DARK)
    blobs=[(-.72,3.15,.05,1.05,.78,.88),(.62,3.25,-.08,1.08,.82,.92),(0,3.72,.05,1.15,.82,.98),(-.1,4.18,-.2,.85,.64,.78)]
    for i,(x,y,z,sx,sy,sz) in enumerate(blobs): add(s,lowpoly_blob(1,(x,y,z),(sx,sy,sz),1),f'Canopy_{i+1}',[LEAF_DARK,LEAF_MID,LEAF_LIGHT,LEAF_MID][i])
    empty(s,'MF_Anchor_Root',(0,0,0)); empty(s,'MF_Anchor_Trunk',(0,1.65,0)); empty(s,'MF_Anchor_Canopy',(0,3.55,0))
    return s


def tree_oak_b() -> trimesh.Scene:
    s=trimesh.Scene()
    add(s,tapered_y(0,1.8,.36,.27,sides=9),'TrunkBase',BARK_DARK)
    add(s,cylinder_between((-.02,1.55,0),(-.55,3.25,.05),.20,9),'TrunkLeft',BARK_WARM)
    add(s,cylinder_between((.05,1.62,0),(.58,3.38,-.12),.19,9),'TrunkRight',BARK_WARM)
    for i,(p0,p1) in enumerate([((-.38,2.25,.02),(-1.05,3.05,.38)),((.4,2.35,-.08),(1.05,3.15,-.4)),((.2,2.55,0),(.1,3.5,.6))]):
        add(s,cylinder_between(p0,p1,.085,8),f'Branch_{i+1}',BARK_DARK)
    blobs=[(-.95,3.3,.2,1.0,.72,.85),(-.1,3.72,.3,1.15,.82,.92),(.82,3.4,-.25,1.08,.78,.9),(.2,4.15,-.1,.9,.68,.82)]
    for i,(x,y,z,sx,sy,sz) in enumerate(blobs): add(s,lowpoly_blob(1,(x,y,z),(sx,sy,sz),1),f'Canopy_{i+1}',[LEAF_MID,LEAF_LIGHT,LEAF_DARK,LEAF_MID][i])
    empty(s,'MF_Anchor_Root',(0,0,0)); empty(s,'MF_Anchor_Trunk',(0,1.7,0)); empty(s,'MF_Anchor_Canopy',(0,3.6,0))
    return s


def tree_pine_a() -> trimesh.Scene:
    s=trimesh.Scene(); add(s,tapered_y(0,4.7,.25,.12,sides=9),'Trunk',BARK_DARK)
    layers=[(1.35,1.45,1.05),(2.05,1.3,.95),(2.75,1.08,.86),(3.42,.86,.72),(4.0,.62,.58)]
    for i,(y,r,h) in enumerate(layers):
        m=cone_y(r,h,y-h*.2,sections=11); m.apply_scale([1,.92,.88]); add(s,m,f'Needles_{i+1}',LEAF_PINE if i%2==0 else LEAF_DARK)
    empty(s,'MF_Anchor_Root',(0,0,0)); empty(s,'MF_Anchor_Trunk',(0,2.25,0)); empty(s,'MF_Anchor_Canopy',(0,3.0,0))
    return s


def tree_young_a() -> trimesh.Scene:
    s=trimesh.Scene(); add(s,tapered_y(0,2.45,.16,.1,sides=8),'Trunk',BARK_PALE)
    add(s,cylinder_between((0,1.55,0),(-.48,2.24,.05),.065,7),'BranchLeft',BARK_PALE)
    add(s,cylinder_between((0,1.72,0),(.5,2.35,-.05),.06,7),'BranchRight',BARK_PALE)
    for i,(x,y,z,sc) in enumerate([(-.48,2.45,.06,.62),(.48,2.55,-.08,.65),(0,2.92,.05,.72)]): add(s,lowpoly_blob(1,(x,y,z),(sc,.55,sc*.9),1),f'Canopy_{i+1}',LEAF_LIGHT if i==2 else LEAF_MID)
    empty(s,'MF_Anchor_Root',(0,0,0)); empty(s,'MF_Anchor_Trunk',(0,1.2,0)); empty(s,'MF_Anchor_Canopy',(0,2.6,0))
    return s


def rock_scene(seed, dims, cluster=False) -> trimesh.Scene:
    s=trimesh.Scene()
    add(s,irregular_rock(seed,dims,1),'Rock_Main',ROCK_MID)
    if cluster:
        m=irregular_rock(seed+1,(dims[0]*.52,dims[1]*.52,dims[2]*.52),1); m.apply_translation([dims[0]*.62,0,-dims[2]*.18]); add(s,m,'Rock_SideA',ROCK_DARK)
        m=irregular_rock(seed+2,(dims[0]*.38,dims[1]*.35,dims[2]*.42),1); m.apply_translation([-dims[0]*.58,0,dims[2]*.3]); add(s,m,'Rock_SideB',ROCK_LIGHT)
    empty(s,'MF_Anchor_Center',(0,dims[1]*.55,0)); return s


def bush_scene(seed, wide=False) -> trimesh.Scene:
    rng=np.random.default_rng(seed); s=trimesh.Scene()
    for i in range(3):
        x=(-.38+i*.38)*(1.25 if wide else 1); z=rng.uniform(-.18,.18); y=.55+rng.uniform(-.04,.12)
        add(s,lowpoly_blob(1,(x,y,z),(.62,.58,.55),1),f'Bush_{i+1}',[LEAF_DARK,LEAF_MID,LEAF_LIGHT][i])
    for i in range(4):
        x=rng.uniform(-.55,.55); z=rng.uniform(-.3,.3); add(s,cylinder_between((x,0,z),(x+rng.uniform(-.12,.12),.65,z+rng.uniform(-.12,.12)),.035,6),f'Twig_{i+1}',BARK_DARK)
    empty(s,'MF_Anchor_Root',(0,0,0)); empty(s,'MF_Anchor_Canopy',(0,.65,0)); return s


def grass_scene(seed, count=13, broad=False) -> trimesh.Scene:
    rng=np.random.default_rng(seed); s=trimesh.Scene()
    for i in range(count):
        angle=rng.uniform(-math.pi,math.pi); radius=rng.uniform(.05,.55 if broad else .42); x=math.cos(angle)*radius; z=math.sin(angle)*radius
        h=rng.uniform(.45,.9 if broad else .72); w=rng.uniform(.045,.085); lean=rng.uniform(-.12,.12)
        add(s,blade_mesh(x,z,h,w,lean,rng.uniform(-math.pi,math.pi)),f'Blade_{i+1}',GRASS_MID if i%3 else GRASS_DARK)
    empty(s,'MF_Anchor_Root',(0,0,0)); empty(s,'MF_Anchor_Center',(0,.35,0)); return s


def flower_scene(seed) -> trimesh.Scene:
    rng=np.random.default_rng(seed); s=trimesh.Scene()
    for f in range(5):
        a=2*math.pi*f/5+rng.uniform(-.2,.2); dist=.18+.12*(f%2); x=math.cos(a)*dist; z=math.sin(a)*dist; h=rng.uniform(.48,.75)
        add(s,cylinder_between((x,0,z),(x,h,z),.022,6),f'Stem_{f+1}',GRASS_DARK)
        add(s,lowpoly_blob(.065,(x,h,z),(1,.45,1),1),f'Center_{f+1}',FLOWER_YELLOW)
        for p in range(6):
            pa=2*math.pi*p/6; pet=petal_mesh(.07,.18); pet.apply_transform(trimesh.transformations.rotation_matrix(pa,[0,1,0])); pet.apply_translation([x+math.cos(pa)*.13,h,z+math.sin(pa)*.13]); add(s,pet,f'Flower_{f+1}_Petal_{p+1}',FLOWER_WHITE)
    empty(s,'MF_Anchor_Root',(0,0,0)); empty(s,'MF_Anchor_Center',(0,.55,0)); return s


def puddle_scene() -> trimesh.Scene:
    s=trimesh.Scene(); add(s,irregular_puddle(), 'Puddle', WATER); empty(s,'MF_Anchor_Center',(0,.04,0)); return s


def cloud_scene(seed, break_cloud=False) -> trimesh.Scene:
    rng=np.random.default_rng(seed); s=trimesh.Scene()
    positions=[(-1.05,0,.05),(-.45,.25,0),(.15,.12,-.05),(.78,.2,.04),(1.25,-.02,.0),(-.15,-.18,.05)]
    if break_cloud: positions=[p for i,p in enumerate(positions) if i not in (2,)]
    for i,(x,y,z) in enumerate(positions):
        sx=rng.uniform(.75,1.12); sy=rng.uniform(.42,.68); sz=rng.uniform(.65,.95)
        material=CLOUD_LIGHT if break_cloud and i in (1,2) else (CLOUD_MID if i%2 else CLOUD_DARK)
        add(s,lowpoly_blob(1,(x,y,z),(sx,sy,sz),1),f'CloudMass_{i+1}',material)
    empty(s,'MF_Anchor_Center',(0,0,0)); empty(s,'MF_Anchor_Underside',(0,-.45,0)); return s


def hero_drop_scene() -> trimesh.Scene:
    s=trimesh.Scene(); add(s,teardrop_mesh(1.0),'HeroDroplet',WATER_GLASS)
    # Thin faceted inner lens breaks the single-primitive read even before PB2 shaders.
    inner=teardrop_mesh(.76); inner.apply_scale([.94,1,.94]); add(s,inner,'InnerLens',GLASS_EDGE)
    empty(s,'MF_Anchor_Center',(0,0,0)); empty(s,'MF_Anchor_Input',(-.72,.145,0)); empty(s,'MF_Anchor_Bend',(-.2,-.095,0)); empty(s,'MF_Anchor_Reflect',(.14,-.655,0)); empty(s,'MF_Anchor_Exit',(.62,-.335,0))
    for name,pos in [('Red',(.66,-.125,.12)),('Orange',(.68,-.175,.08)),('Yellow',(.70,-.225,.04)),('Green',(.72,-.275,0)),('Blue',(.74,-.325,-.05)),('Violet',(.76,-.375,-.10))]: empty(s,f'MF_Anchor_{name}',pos)
    return s


def small_drop_scene() -> trimesh.Scene:
    s=trimesh.Scene(); add(s,teardrop_mesh(.36),'RainDroplet',WATER_GLASS); empty(s,'MF_Anchor_Center',(0,0,0)); return s


def prism_scene() -> trimesh.Scene:
    s=trimesh.Scene(); add(s,triangular_prism(),'OpticalPrism',PRISM_GLASS)
    empty(s,'MF_Anchor_Center',(0,0,0)); empty(s,'MF_Anchor_Input',(-.9,.05,0)); empty(s,'MF_Anchor_Exit',(.9,.0,0)); empty(s,'MF_Anchor_OpticalCenter',(0,0,0))
    return s


def main() -> None:
    assets = [
        (NATURE/'tree-oak-a.glb', tree_oak_a()),
        (NATURE/'tree-oak-b.glb', tree_oak_b()),
        (NATURE/'tree-pine-a.glb', tree_pine_a()),
        (NATURE/'tree-young-a.glb', tree_young_a()),
        (NATURE/'rock-a.glb', rock_scene(101,(.82,.58,.72))),
        (NATURE/'rock-b.glb', rock_scene(205,(1.12,.72,.86))),
        (NATURE/'rock-cluster-a.glb', rock_scene(309,(.78,.52,.68),True)),
        (NATURE/'bush-a.glb', bush_scene(401,False)),
        (NATURE/'bush-b.glb', bush_scene(503,True)),
        (NATURE/'grass-cluster-a.glb', grass_scene(601,12,False)),
        (NATURE/'grass-cluster-b.glb', grass_scene(703,18,True)),
        (NATURE/'flower-cluster-a.glb', flower_scene(809)),
        (NATURE/'puddle-a.glb', puddle_scene()),
        (NATURE/'cloud-storm-a.glb', cloud_scene(907,False)),
        (NATURE/'cloud-storm-b.glb', cloud_scene(1009,False)),
        (NATURE/'cloud-break-a.glb', cloud_scene(1103,True)),
        (OPTICS/'hero-rain-droplet.glb', hero_drop_scene()),
        (OPTICS/'rain-droplet-small.glb', small_drop_scene()),
        (OPTICS/'optical-prism.glb', prism_scene()),
    ]
    for path, scene in assets: export(scene,path)


if __name__ == '__main__':
    main()
