export interface ImportConfigPort {
  /** Maximum runtime of a full import in milliseconds; aborts with TIMED_OUT after this limit. */
  maxRuntimeMs: number;

  /** Enabled phases in the desired order (used only for display/counting). */
  phases: string[];
}
