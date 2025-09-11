'use client';

import React from "react";
import { useOptionCodeOverview } from "@/hooks/useOptionCodeOverview";
import OptionOverviewPanel from "@/features/option-view/OptionOverviewPanel";
import {
  fetchOptionValues,
  fetchOptionValueOccurrences,
} from "@/services/option-overview.service";
import { OptionCodeOverviewDto } from "@/types/dto/option-code-overview.dto";

// helpers to match signatures
function getValues(option: OptionCodeOverviewDto) {
  return fetchOptionValues(option.code, option.name);
}
function getOccurrences(option: OptionCodeOverviewDto, value: string) {
  return fetchOptionValueOccurrences(option.code, option.name, value);
}

const OptionOverviewTab: React.FC = () => {
  const { data, isLoading, error } = useOptionCodeOverview();

  return (
    <OptionOverviewPanel
      options={data ?? []}
      loading={isLoading}
      error={error ? String(error) : undefined}
      fetchValues={getValues}
      fetchOccurrences={getOccurrences}
    />
  );
};

export default OptionOverviewTab;
