import type { Color } from 'three';

/** Options accepted by the procedural humanoid rig. */
export interface HumanoidOptions {
  /** Uniform height scale (1 ≈ 1.8 m). */
  scale?: number;
  /** Override the body colour (defaults to the Character Body material). */
  bodyColor?: Color;
}

/** Expression parameters resolved per face state. */
export interface ExpressionParams {
  browAngle: number;
  browLift: number;
  eyeOpen: number;
  mouthOpen: number;
  mouthWidth: number;
  mouthCurve: number;
}
