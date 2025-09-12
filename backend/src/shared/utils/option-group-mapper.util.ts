import { OptionGroup } from '@/infrastructure/database/csp/option-group.entity';

/**
 * Resolves all unique OptionGroup entities (case-insensitive, whitespace-robust, id-support) from a DHCP option list.
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
    logger.warn?.(
      `[DEBUG] Trying to resolve groupKeys: ${groupKeys.join(', ')}`,
    );
    logger.warn?.(
      `[DEBUG] OptionGroupMap KEYS: ${Array.from(optionGroupMap.keys()).join(', ')}`,
    );
  }

  const result: OptionGroup[] = [];
  for (const groupKey of groupKeys) {
    // Direkter Map-Lookup
    let optionGroup = optionGroupMap.get(groupKey);

    // Fallback: Auch nach GUID (ohne Prefix) suchen
    if (!optionGroup && groupKey.startsWith('dhcp/option_group/')) {
      const guid = groupKey.replace('dhcp/option_group/', '');
      optionGroup = optionGroupMap.get(guid);
    }

    // Fallback: Suche auch nach ID oder exakten Namen (case-insensitive)
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
      if (logger)
        logger.warn?.(
          `[DEBUG] OptionGroup resolved: ${groupKey} -> ${optionGroup.name} (${optionGroup.externalId})`,
        );
    } else if (logger) {
      logger.warn?.(`[DEBUG] OptionGroup '${groupKey}' not found!`);
    }
  }
  return result;
}
