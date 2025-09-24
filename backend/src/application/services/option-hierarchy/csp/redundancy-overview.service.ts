import { Injectable, Logger } from '@nestjs/common';
import { RedundancyOverviewItemDto } from '@/domain/dto/csp/redundancy-overview-item.dto';
import {
  AllDhcpOptionAssignmentRepository,
  SourceJson,
} from '@/infrastructure/database/csp/all-dhcp-option-assignment.repository';

@Injectable()
export class RedundancyOverviewService {
  private readonly logger = new Logger(RedundancyOverviewService.name);

  constructor(
    private readonly allAssignmentsRepo: AllDhcpOptionAssignmentRepository,
  ) {}

  /**
   * Panel-strict redundancy:
   * An option code appears on the same object from ≥ 2 different sources,
   * regardless of whether the values are identical or different.
   * - If values differ, the value is returned as "<multiple>".
   * - "setIn" contains the inheritance status (explicit | inherited) per source.
   */
  async getRedundancyOverview(): Promise<RedundancyOverviewItemDto[]> {
    const rows =
      await this.allAssignmentsRepo.findRedundancyOverviewPanelStrictFromBase();

    const out: RedundancyOverviewItemDto[] = rows.map((r) => {
      const seen = new Set<string>();
      const setIn: SourceJson[] = [];
      for (const s of r.sources ?? []) {
        const key = `${s.from}|${s.inheritanceType}`;
        if (!seen.has(key)) {
          seen.add(key);
          setIn.push(s);
        }
      }

      return {
        level: r.object_type as RedundancyOverviewItemDto['level'],
        objectId: r.object_id,
        name: r.object_label ?? null,
        address: r.address ?? null,
        redundantOption: {
          code: r.option_code,
          name: r.option_name ?? String(r.option_code),
          value: r.option_value ?? '',
          type: r.option_type ?? undefined,
          setIn,
        },
      };
    });

    out.sort((a, b) =>
      `${a.level}|${a.name ?? ''}|${a.address ?? ''}|${a.redundantOption.code}`.localeCompare(
        `${b.level}|${b.name ?? ''}|${b.address ?? ''}|${b.redundantOption.code}`,
      ),
    );

    this.logger.log(`Panel-strict redundancy overview: ${out.length} entries.`);
    return out;
  }
}
