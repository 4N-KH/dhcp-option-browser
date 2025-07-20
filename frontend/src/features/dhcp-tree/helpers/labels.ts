/**
 * Gibt ein schönes Label für "Inherited from X Y" zurück.
 * @param originLevel Typ (z. B. 'subnet', 'ipSpace', 'addressBlock', ...)
 * @param originLevelLabel Label/Text aus dem Backend (z. B. 'ipSpace KH', 'subnet labor_vm', 'address block RFC1918')
 * @param originLevelId Fallback: ID falls Name fehlt
 */
export function getInheritedLabel(
  originLevel?: string,
  originLevelLabel?: string,
  originLevelId?: number
) {
  if (!originLevel) return "Inherited";
  if (originLevelLabel && originLevelLabel.trim().length > 0) {
    return `Inherited from ${originLevelLabel}`;
  }
  const typeMap: Record<string, string> = {
    ipSpace: "ipSpace",
    addressBlock: "address block",
    subnet: "subnet",
    range: "range",
    global: "global config",
    fixedAddress: "fixed address",
  };
  const typeLabel = typeMap[originLevel] || originLevel;
  if (originLevelId) return `Inherited from ${typeLabel} #${originLevelId}`;
  return `Inherited from ${typeLabel}`;
}
