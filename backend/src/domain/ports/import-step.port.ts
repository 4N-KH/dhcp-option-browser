export interface ImportStepPort {
  /** Technical name of the phase (e.g. "optionSpaces"). */
  readonly name: string;

  /**
   * Executes the step.
   * @param onProgress  (current, total) – non-blocking, may be omitted.
   * @param isCancelled Cancellation callback; currently disabled (neverCancelled).
   */
  run(params: {
    onProgress?: (current: number, total: number) => void;
    isCancelled?: () => boolean;
  }): Promise<void>;
}
