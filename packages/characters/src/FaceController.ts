import * as THREE from 'three';
import type { FaceState } from '@mindforge/engine';
import { createSignalLight, createForgeCeramic } from '@mindforge/style';
import type { ExpressionParams } from './CharacterTypes';

const EXPRESSIONS: Record<FaceState, ExpressionParams> = {
  neutral: { browAngle: 0, browLift: 0, eyeOpen: 1, mouthOpen: 0.15, mouthWidth: 1, mouthCurve: 0 },
  confused: { browAngle: 0.28, browLift: 0.008, eyeOpen: 1, mouthOpen: 0.1, mouthWidth: 0.78, mouthCurve: -0.12 },
  focused: { browAngle: -0.16, browLift: -0.008, eyeOpen: 0.72, mouthOpen: 0.05, mouthWidth: 0.9, mouthCurve: 0 },
  disappointed: { browAngle: -0.2, browLift: -0.014, eyeOpen: 0.62, mouthOpen: 0.1, mouthWidth: 0.9, mouthCurve: -0.28 },
  surprised: { browAngle: 0.12, browLift: 0.03, eyeOpen: 1.45, mouthOpen: 0.55, mouthWidth: 0.82, mouthCurve: 0.12 },
  laughing: { browAngle: 0.16, browLift: 0.02, eyeOpen: 0.5, mouthOpen: 0.6, mouthWidth: 1.12, mouthCurve: 0.38 },
};

/**
 * The Observer's face. Six readable, stylised expressions built from a few
 * faceted features. Expressions are set on narrative beats and applied
 * deterministically (a function of the requested state, not of wall time).
 */
export class FaceController {
  readonly group = new THREE.Group();
  private readonly browLeft: THREE.Mesh;
  private readonly browRight: THREE.Mesh;
  private readonly eyeLeft: THREE.Mesh;
  private readonly eyeRight: THREE.Mesh;
  private readonly mouth: THREE.Group;
  private readonly mouthCorners: THREE.Group;
  private readonly browBaseY = 0.055;
  private readonly mouthBaseY = -0.055;

  constructor() {
    this.group.name = 'face';
    this.group.position.set(0, 0.01, 0.108);

    const eyeMaterial = createSignalLight({ color: 'insightWhite' });
    const accentMaterial = createSignalLight({ color: 'signalPink' });
    const darkMaterial = createForgeCeramic({ color: 'voidInk', emissiveIntensity: 0 });

    const eyeGeometry = new THREE.SphereGeometry(0.02, 12, 8);
    this.eyeLeft = new THREE.Mesh(eyeGeometry, eyeMaterial);
    this.eyeLeft.position.set(-0.045, 0.02, 0);
    this.eyeRight = new THREE.Mesh(eyeGeometry, eyeMaterial);
    this.eyeRight.position.set(0.045, 0.02, 0);

    const browGeometry = new THREE.BoxGeometry(0.05, 0.008, 0.01);
    this.browLeft = new THREE.Mesh(browGeometry, darkMaterial);
    this.browLeft.position.set(-0.045, this.browBaseY, 0);
    this.browRight = new THREE.Mesh(browGeometry, darkMaterial);
    this.browRight.position.set(0.045, this.browBaseY, 0);

    this.mouth = new THREE.Group();
    this.mouth.position.set(0, this.mouthBaseY, 0);
    const mouthBar = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.01), accentMaterial);
    this.mouth.add(mouthBar);

    this.mouthCorners = new THREE.Group();
    const cornerGeometry = new THREE.BoxGeometry(0.015, 0.012, 0.01);
    const cornerLeft = new THREE.Mesh(cornerGeometry, accentMaterial);
    cornerLeft.position.set(-0.04, 0, 0);
    const cornerRight = new THREE.Mesh(cornerGeometry, accentMaterial);
    cornerRight.position.set(0.04, 0, 0);
    this.mouthCorners.add(cornerLeft, cornerRight);
    this.mouth.add(this.mouthCorners);

    this.group.add(this.eyeLeft, this.eyeRight, this.browLeft, this.browRight, this.mouth);
    this.setFace('neutral');
  }

  /** Apply an expression, optionally blended from neutral by `weight`. */
  setFace(state: FaceState, weight = 1): void {
    const target = EXPRESSIONS[state];
    const base = EXPRESSIONS.neutral;
    const p: ExpressionParams = {
      browAngle: lerp(base.browAngle, target.browAngle, weight),
      browLift: lerp(base.browLift, target.browLift, weight),
      eyeOpen: lerp(base.eyeOpen, target.eyeOpen, weight),
      mouthOpen: lerp(base.mouthOpen, target.mouthOpen, weight),
      mouthWidth: lerp(base.mouthWidth, target.mouthWidth, weight),
      mouthCurve: lerp(base.mouthCurve, target.mouthCurve, weight),
    };

    this.browLeft.rotation.z = p.browAngle;
    this.browRight.rotation.z = -p.browAngle;
    this.browLeft.position.y = this.browBaseY + p.browLift;
    this.browRight.position.y = this.browBaseY + p.browLift;

    this.eyeLeft.scale.y = p.eyeOpen;
    this.eyeRight.scale.y = p.eyeOpen;

    this.mouth.scale.set(p.mouthWidth, 0.4 + p.mouthOpen * 3, 1);
    this.mouthCorners.children[0].position.y = p.mouthCurve * 0.06;
    this.mouthCorners.children[1].position.y = p.mouthCurve * 0.06;
  }

  dispose(): void {
    this.group.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
