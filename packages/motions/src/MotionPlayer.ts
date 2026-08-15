import type {
  ActionContext,
  MotionFactory,
  MotionInstance,
  PoseableRig,
} from '@mindforge/engine';
import { InstanceCreationError } from '@mindforge/engine';
import { Pose, samplePhase, type HumanoidMotionParams } from './MotionTypes';
import type { MotionClip } from './MotionClip';
import { applyPoseToRig } from './MotionBlender';

/**
 * Binds a {@link MotionClip} to a rig: derives the phase from authoritative
 * time, samples the clip into a reused {@link Pose}, and blends it onto the rig.
 */
export class MotionPlayer {
  private readonly pose = new Pose();
  constructor(private readonly clip: MotionClip) {}

  apply(rig: PoseableRig, ctx: ActionContext, params: HumanoidMotionParams): void {
    const sample = samplePhase(ctx, this.clip.cycleSeconds, params.speed);
    this.pose.clear();
    this.clip.poseFn(sample, params, this.pose);
    applyPoseToRig(rig, this.pose, params.intensity, params.mirror);
  }
}

/**
 * Turn a clip builder into a {@link MotionFactory} that poses a character's
 * rig only while its window is active (the rig's per-frame reset restores the
 * rest pose outside the window).
 */
export function bindHumanoidMotion(
  build: () => MotionClip,
  defaults: { intensity?: number } = {},
): MotionFactory {
  return ({ target, event }): MotionInstance => {
    const rig = target.rig;
    if (!rig) {
      throw new InstanceCreationError(
        `humanoid motion "${event.motion}"`,
        new Error(`entity "${target.id}" is not a character with a rig`),
        { entityId: target.id, eventId: event.id },
      );
    }
    const player = new MotionPlayer(build());
    const params: HumanoidMotionParams = {
      intensity: event.intensity ?? defaults.intensity ?? 1,
      speed: 'speed' in event && typeof event.speed === 'number' ? event.speed : 1,
      mirror: 'mirror' in event && event.mirror === true,
    };
    return {
      apply(ctx: ActionContext): void {
        if (!ctx.active) return;
        player.apply(rig, ctx, params);
      },
      reset(): void {
        /* Rig resets each frame; nothing to undo. */
      },
    };
  };
}
