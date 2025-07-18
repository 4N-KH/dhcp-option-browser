import { useQuery } from "@tanstack/react-query";
import { fetchDhcpLightTree } from "@/services/dhcp-hierarchy.service";
import { DhcpLightTreeDto } from "@/types/dto/dhcp-light-tree.dto";

/**
 * Fetches the DHCP Light-Tree via react-query (für TreeView).
 * Gibt { data, isLoading, error } zurück.
 * 
 * Nutze immer den Light-Tree-Endpoint!
 */
export function useDhcpHierarchy() {
  const queryKey = ["dhcpLightHierarchy"];
  const queryFn = fetchDhcpLightTree;

  const result = useQuery<DhcpLightTreeDto>({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    data: result.data,
    isLoading: result.isLoading,
    error: result.error,
  };
}
