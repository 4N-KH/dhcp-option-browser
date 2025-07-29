import { useQuery } from "@tanstack/react-query";
import { fetchOptionValues } from "@/services/option-overview.service";
import { OptionValueOverviewDto } from "@/types/dto/option-value-overview.dto";

export function useOptionValues(code: string, name: string) {
  return useQuery<OptionValueOverviewDto[]>({
    queryKey: ["optionValues", code, name],
    queryFn: () => fetchOptionValues(code, name),
    enabled: !!code && !!name,
    staleTime: 5 * 60 * 1000,
  });
}
