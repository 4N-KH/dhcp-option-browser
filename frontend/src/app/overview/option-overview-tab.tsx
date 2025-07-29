'use client';
import React from "react";
import { useOptionCodeOverview } from "@/hooks/useOptionCodeOverview";
import OptionOverviewPanel from "@/features/option-view/OptionOverviewPanel";
import {
  fetchOptionValues,
  fetchOptionValueOccurrences,
} from "@/services/option-overview.service";
import { OptionCodeOverviewDto } from "@/types/dto/option-code-overview.dto";

// Wrapper-Funktionen, damit die Signaturen passen:
function fetchValues(option: OptionCodeOverviewDto) {
  // Du kannst hier noch Typen explizit angeben, wenn du willst.
  return fetchOptionValues(option.code, option.name);
}
function fetchOccurrences(option: OptionCodeOverviewDto, value: string) {
  return fetchOptionValueOccurrences(option.code, option.name, value);
}

const OptionOverviewTab: React.FC = () => {
  const { data, isLoading, error } = useOptionCodeOverview();
  return (
    <OptionOverviewPanel
      options={data ?? []}
      loading={isLoading}
      error={error ? String(error) : undefined}
      fetchValues={fetchValues}
      fetchOccurrences={fetchOccurrences}
    />
  );
};

export default OptionOverviewTab;
