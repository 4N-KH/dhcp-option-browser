import { useQuery } from "@tanstack/react-query";
import { fetchOptionCodeOverview } from "@/services/option-overview.service";
import { OptionCodeOverviewDto } from "@/types/dto/option-code-overview.dto";

export function useOptionCodeOverview() {
  return useQuery<OptionCodeOverviewDto[]>({
    queryKey: ["optionCodeOverview"],
    queryFn: fetchOptionCodeOverview,
    staleTime: 10 * 60 * 1000,
  });
}
