export interface ImportConfigPort {
  /** Maximale Laufzeit eines Full-Imports in Millisekunden; danach Abbruch mit TIMED_OUT. */
  maxRuntimeMs: number;

  /** Aktivierte Phasen in der gewünschten Reihenfolge (nur zur Anzeige/Zählung). */
  phases: string[];
}
