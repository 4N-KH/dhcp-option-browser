/**
 * Indicates the provenance of a DHCP option value.
 * Set for every effective option and used throughout the hierarchy for evaluation.
 */
export enum OptionSource {
  /** The option is set directly (explicitly) on this object */
  EXPLICIT = 'explicit',
  /** The option originates from an Option Group assigned to this object */
  GROUP = 'group',
  /** The option is inherited from a parent object */
  INHERITED = 'inherited',
  /** The option is inherited but overridden at this level */
  OVERRIDDEN = 'overridden',
  /** The option originates from the global configuration */
  GLOBAL = 'global',
}
