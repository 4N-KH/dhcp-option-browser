import { useQuery } from "@tanstack/react-query";
import { fetchDhcpLightTree } from "@/services/dhcp-hierarchy.service";
import { DhcpLightTreeDto } from "@/types/dto/dhcp-light-tree.dto";

/*
 Hook to fetch the DHCP Light-Tree using react-query.
 Returns { data, isLoading, error } for consumption in TreeView components.
 Light-Tree endpoint for optimal performance.
 */
export function useDhcpHierarchy() {
  const queryKey = ["dhcpLightHierarchy"]; // Unique query identifier
  const queryFn = fetchDhcpLightTree; // Fetch function calling the API

  const result = useQuery<DhcpLightTreeDto>({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000, // Cache data for 5 minutes
    refetchOnWindowFocus: false, // Prevent auto-refetch on window focus
  });

  return {
    data: result.data, // Fetched DHCP tree data
    isLoading: result.isLoading, // Loading state
    error: result.error, // Error state if request fails
  };
}
