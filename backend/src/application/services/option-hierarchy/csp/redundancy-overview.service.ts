// backend/src/application/services/option-hierarchy/csp/redundancy-overview.service.ts
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
   * Redundant = identical (option_code, option_value) on the same object
   * from ≥ 2 distinct sources.
   */
  async getRedundancyOverview(): Promise<RedundancyOverviewItemDto[]> {
    const rows = await this.allAssignmentsRepo.findRedundancyOverviewFromBase();

    const out: RedundancyOverviewItemDto[] = rows.map((r) => {
      // de-duplicate exact source entries
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
        objectId: r.object_id, // used by frontend to jump to tree
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

    // stable UI order
    out.sort((a, b) =>
      `${a.level}|${a.name ?? ''}|${a.address ?? ''}|${a.redundantOption.code}`.localeCompare(
        `${b.level}|${b.name ?? ''}|${b.address ?? ''}|${b.redundantOption.code}`,
      ),
    );

    this.logger.log(`Redundancy overview built with ${out.length} entries.`);
    return out;
  }
}
