/**
 * Post-processing configuration (Design Bible §6, Motion Bible §11). This is
 * plain data — the Engine builds the actual composer. Bloom is deliberately
 * restrained so it never destroys silhouettes; vignette focuses the eye.
 */
export interface PostProcessingConfig {
  readonly enabled?: boolean;
  readonly bloom?: { strength: number; radius: number; threshold: number };
  readonly vignette?: { offset: number; darkness: number };
}

/** Controlled defaults. Bloom belongs to active information, not everything. */
export const POST_PROCESSING: PostProcessingConfig = {
  enabled: true,
  bloom: { strength: 0.85, radius: 0.4, threshold: 0.82 },
  vignette: { offset: 1.1, darkness: 1.05 },
};
