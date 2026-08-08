import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // networkMode "always": TanStack Start's SSR/hydration bootstrap can leave
  // react-query's onlineManager singleton thinking the browser is offline,
  // which permanently stalls every query in fetchStatus "paused". Our API is
  // same-origin and doesn't need offline-aware pausing, so always fetch.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { networkMode: "always" },
      mutations: { networkMode: "always" },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
