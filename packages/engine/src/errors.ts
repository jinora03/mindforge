/**
 * Engine error types. Every message is built to include the ids that make a
 * failure actionable: episode, event, entity, registry, and a plain
 * explanation. The Engine must never fail silently.
 */

export interface ErrorLocation {
  episodeId?: string;
  eventId?: string;
  entityId?: string;
  registryId?: string;
}

function suffix(loc: ErrorLocation): string {
  const parts: string[] = [];
  if (loc.episodeId) parts.push(`episode="${loc.episodeId}"`);
  if (loc.eventId) parts.push(`event="${loc.eventId}"`);
  if (loc.entityId) parts.push(`entity="${loc.entityId}"`);
  if (loc.registryId) parts.push(`id="${loc.registryId}"`);
  return parts.length ? ` (${parts.join(', ')})` : '';
}

export class MindForgeError extends Error {
  public readonly location: ErrorLocation;
  constructor(message: string, location: ErrorLocation = {}) {
    super(`${message}${suffix(location)}`);
    this.name = 'MindForgeError';
    this.location = location;
  }
}

/** A registry id referenced by content does not exist. */
export class UnknownRegistryIdError extends MindForgeError {
  constructor(registryName: string, id: string, location: ErrorLocation = {}) {
    super(`Unknown ${registryName} id "${id}"`, { ...location, registryId: id });
    this.name = 'UnknownRegistryIdError';
  }
}

/** A registry id was registered twice. */
export class DuplicateRegistryIdError extends MindForgeError {
  constructor(registryName: string, id: string) {
    super(`Duplicate ${registryName} id "${id}"`, { registryId: id });
    this.name = 'DuplicateRegistryIdError';
  }
}

/** A timeline event referenced an entity that was never created. */
export class MissingEntityError extends MindForgeError {
  constructor(entityId: string, location: ErrorLocation = {}) {
    super(`Missing entity "${entityId}"`, { ...location, entityId });
    this.name = 'MissingEntityError';
  }
}

/** An anchor reference could not be resolved on its entity. */
export class MissingAnchorError extends MindForgeError {
  constructor(ref: string, available: string[], location: ErrorLocation = {}) {
    super(
      `Missing anchor "${ref}"; available anchors: ${available.join(', ') || '(none)'}`,
      location,
    );
    this.name = 'MissingAnchorError';
  }
}

/** A timeline event used a type the Engine does not know how to execute. */
export class UnsupportedEventError extends MindForgeError {
  constructor(type: string, location: ErrorLocation = {}) {
    super(`Unsupported timeline event type "${type}"`, location);
    this.name = 'UnsupportedEventError';
  }
}

/** A factory threw while creating a runtime instance. */
export class InstanceCreationError extends MindForgeError {
  constructor(what: string, cause: unknown, location: ErrorLocation = {}) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`Failed to create ${what}: ${reason}`, location);
    this.name = 'InstanceCreationError';
  }
}
