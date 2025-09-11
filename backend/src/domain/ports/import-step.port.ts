export interface ImportStepPort {
  /** Technischer Name der Phase (z. B. "optionSpaces"). */
  readonly name: string;

  /**
   * Führt den Schritt aus.
   * @param onProgress  (current, total) – nicht-blockierend, darf leer sein.
   * @param isCancelled Cancellation-Callback; aktuell deaktiviert (neverCancelled).
   */
  run(params: {
    onProgress?: (current: number, total: number) => void;
    isCancelled?: () => boolean;
  }): Promise<void>;
}
