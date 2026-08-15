import type { FrameContext } from './EngineTypes';

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/**
 * The one authoritative time source. Motions, effects, cameras, and the
 * timeline all read time / delta from here; none keep a private clock. This is
 * what makes pause, restart, scrubbing, reverse seek, and slow motion
 * deterministic.
 */
export class PlaybackController {
  private _time = 0;
  private _duration: number;
  private _speed = 1;
  private _playing = false;
  private _lastDelta = 0;

  constructor(duration: number) {
    this._duration = Math.max(0, duration);
  }

  get time(): number {
    return this._time;
  }
  get duration(): number {
    return this._duration;
  }
  get speed(): number {
    return this._speed;
  }
  get playing(): boolean {
    return this._playing;
  }
  get hasEnded(): boolean {
    return this._duration > 0 && this._time >= this._duration;
  }
  get normalizedTime(): number {
    return this._duration > 0 ? clamp(this._time / this._duration, 0, 1) : 0;
  }

  setDuration(duration: number): void {
    this._duration = Math.max(0, duration);
    this._time = clamp(this._time, 0, this._duration);
  }

  play(): void {
    if (this.hasEnded) this._time = 0;
    this._playing = true;
  }

  pause(): void {
    this._playing = false;
    this._lastDelta = 0;
  }

  resume(): void {
    this.play();
  }

  /** Return to zero. Playback state is preserved by design. */
  restart(): void {
    this._time = 0;
    this._lastDelta = 0;
  }

  /** Jump directly to a time. Delta becomes 0 so seeking stays deterministic. */
  seek(time: number): void {
    this._time = clamp(time, 0, this._duration);
    this._lastDelta = 0;
  }

  setSpeed(speed: number): void {
    this._speed = Math.max(0, speed);
  }

  /**
   * Advance by real elapsed seconds (scaled by speed) when playing. Clamps at
   * the duration boundary and stops. Returns the resulting frame snapshot.
   */
  advance(realDelta: number): FrameContext {
    if (this._playing && this._duration > 0) {
      let next = this._time + realDelta * this._speed;
      if (next >= this._duration) {
        next = this._duration;
        this._playing = false;
      }
      this._lastDelta = next - this._time;
      this._time = next;
    } else {
      this._lastDelta = 0;
    }
    return this.frame();
  }

  /** Build a frame snapshot for the current time (delta defaults to last step). */
  frame(delta: number = this._lastDelta): FrameContext {
    return {
      time: this._time,
      delta,
      duration: this._duration,
      normalizedTime: this.normalizedTime,
    };
  }
}
