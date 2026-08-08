import { useQuery } from "@tanstack/react-query";
import { getSensors } from "@/lib/api";

export function useSensorsQuery(options?: { enabled?: boolean; refetchInterval?: number }) {
  return useQuery({ queryKey: ["sensorsData"], queryFn: getSensors, ...options });
}
