import * as THREE from 'three';
import type { CameraState } from '@mindforge/engine';

/** Build a CameraState the environment exposes as its default framing. */
export function makeCameraState(
  position: [number, number, number],
  target: [number, number, number],
  fov: number,
): CameraState {
  return {
    position: new THREE.Vector3(...position),
    target: new THREE.Vector3(...target),
    fov,
  };
}

/**
 * A large enclosing gradient backdrop — the shared cosmic atmosphere. The
 * gradient runs bottom (Void Ink) to top (violet) so the frame reads as
 * depth, never a flat colour.
 */
export function createGradientBackdrop(bottom: THREE.Color, top: THREE.Color): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      colorTop: { value: top },
      colorBottom: { value: bottom },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 colorTop;
      uniform vec3 colorBottom;
      varying vec2 vUv;
      void main() {
        float t = smoothstep(0.15, 0.95, vUv.y);
        gl_FragColor = vec4(mix(colorBottom, colorTop, t), 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), material);
  mesh.name = 'backdrop';
  return mesh;
}

/**
 * A sparse, faint starfield for depth. Positions are deterministic (index-based)
 * so playback is reproducible. Returned as a Group that callers can rotate.
 */
export function createStarfield(count: number, radius: number, color: THREE.Color): THREE.Group {
  const group = new THREE.Group();
  group.name = 'starfield';
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * 2.399963229728653;
    positions[i * 3] = Math.cos(theta) * r * radius;
    positions[i * 3 + 1] = y * radius * 0.6 + radius * 0.2;
    positions[i * 3 + 2] = Math.sin(theta) * r * radius;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    size: 0.12,
    color,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    toneMapped: false,
  });
  group.add(new THREE.Points(geometry, material));
  return group;
}
