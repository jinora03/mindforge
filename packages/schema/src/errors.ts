import type { ZodIssue } from 'zod';

/** Render a Zod issue path like `timeline[2].motion` for human-readable errors. */
function formatPath(path: (string | number)[]): string {
  let out = '';
  for (const segment of path) {
    if (typeof segment === 'number') {
      out += `[${segment}]`;
    } else {
      out += out.length > 0 ? `.${segment}` : segment;
    }
  }
  return out || '(root)';
}

/** Format a list of Zod issues into an indented, readable block. */
export function formatIssues(issues: ZodIssue[]): string {
  return issues.map((issue) => `  • ${formatPath(issue.path)}: ${issue.message}`).join('\n');
}

/**
 * Thrown when an episode fails schema validation. Carries the offending
 * episode id (when known) so the Engine, Studio, and CLI can all report it.
 */
export class EpisodeValidationError extends Error {
  public readonly issues: ZodIssue[];
  public readonly episodeId?: string;

  constructor(issues: ZodIssue[], episodeId?: string) {
    const header = episodeId
      ? `Episode "${episodeId}" failed validation:`
      : 'Episode failed validation:';
    super(`${header}\n${formatIssues(issues)}`);
    this.name = 'EpisodeValidationError';
    this.issues = issues;
    this.episodeId = episodeId;
  }
}
