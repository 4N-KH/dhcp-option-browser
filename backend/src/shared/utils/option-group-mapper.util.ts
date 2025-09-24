import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';

/**
 * Resolves all unique OptionGroup entities from a DHCP option list.
 * Matching is case-insensitive, trims whitespace, and supports IDs and GUIDs.
 */
export function resolveOptionGroupsFromOptions(
  dhcpOptions: { group?: string | null }[] | undefined,
  optionGroupMap: Map<string, OptionGroup>,
  logger: {
    warn: (msg: string) => void;
    log?: (msg: string) => void;
  } | null = null,
): OptionGroup[] {
  if (!dhcpOptions) return [];

  // Collect normalized group keys
  const groupKeys = Array.from(
    new Set(
      dhcpOptions
        .map((opt) =>
          typeof opt.group === 'string' ? opt.group.trim().toLowerCase() : null,
        )
        .filter((g): g is string => !!g),
    ),
  );

  if (logger) {
    logger.warn?.(`[DEBUG] Resolving groupKeys: ${groupKeys.join(', ')}`);
    logger.warn?.(
      `[DEBUG] OptionGroupMap keys: ${Array.from(optionGroupMap.keys()).join(', ')}`,
    );
  }

  const result: OptionGroup[] = [];
  for (const groupKey of groupKeys) {
    // Direct map lookup
    let optionGroup = optionGroupMap.get(groupKey);

    // Fallback: lookup by GUID without prefix
    if (!optionGroup && groupKey.startsWith('dhcp/option_group/')) {
      const guid = groupKey.replace('dhcp/option_group/', '');
      optionGroup = optionGroupMap.get(guid);
    }

    // Fallback: lookup by name, externalId, or numeric id
    if (!optionGroup) {
      optionGroup = Array.from(optionGroupMap.values()).find(
        (g) =>
          (g.name && g.name.trim().toLowerCase() === groupKey) ||
          (g.externalId && g.externalId.trim().toLowerCase() === groupKey) ||
          String(g.id) === groupKey,
      );
    }

    if (optionGroup) {
      result.push(optionGroup);
      logger?.warn?.(
        `[DEBUG] OptionGroup resolved: ${groupKey} -> ${optionGroup.name} (${optionGroup.externalId})`,
      );
    } else {
      logger?.warn?.(`[DEBUG] OptionGroup '${groupKey}' not found`);
    }
  }

  return result;
}
