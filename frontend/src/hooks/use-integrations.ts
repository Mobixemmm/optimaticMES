import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createConnection,
  deleteConnection,
  getConnectionLogs,
  getConnections,
  getConnectors,
  syncConnectionOrders,
  testConnection,
  updateConnection,
} from "@/lib/api";

export function useConnectorsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["integrations", "connectors"],
    queryFn: getConnectors,
    ...options,
  });
}

export function useConnectionsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["integrations", "connections"],
    queryFn: getConnections,
    ...options,
  });
}

export function useConnectionLogsQuery(id: number | null) {
  return useQuery({
    queryKey: ["integrations", "logs", id],
    queryFn: () => getConnectionLogs(id as number),
    enabled: id !== null,
  });
}

export function useIntegrationMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["integrations"] });
  };
  // Import zleceń tworzy wiersze w module zleceń — bez tego lista zleceń
  // pokazywałaby stan sprzed synchronizacji aż do odświeżenia strony.
  const invalidateWithOrders = () => {
    invalidate();
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const createMutation = useMutation({ mutationFn: createConnection, onSuccess: invalidate });
  const updateMutation = useMutation({ mutationFn: updateConnection, onSuccess: invalidate });
  const deleteMutation = useMutation({ mutationFn: deleteConnection, onSuccess: invalidate });
  const testMutation = useMutation({ mutationFn: testConnection, onSuccess: invalidate });
  const syncMutation = useMutation({
    mutationFn: syncConnectionOrders,
    onSuccess: invalidateWithOrders,
  });

  return { createMutation, updateMutation, deleteMutation, testMutation, syncMutation };
}
