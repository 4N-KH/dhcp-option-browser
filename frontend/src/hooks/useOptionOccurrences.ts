import { useQuery } from "@tanstack/react-query";
import { fetchOptionValueOccurrences } from "@/services/option-overview.service";
import { OptionOccurrenceDto } from "@/types/dto/option-occurrence.dto";

export function useOptionOccurrences(code: string, name: string, value: string, type?: string, source?: string) {
  return useQuery<OptionOccurrenceDto[]>({
    queryKey: ["optionOccurrences", code, name, value, type, source],
    queryFn: () => fetchOptionValueOccurrences(code, name, value, type, source),
    enabled: !!code && !!name && value !== undefined,
    staleTime: 2 * 60 * 1000,
  });
}
