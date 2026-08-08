import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  CrossFilterContext,
  EMPTY_FILTERS,
  type CrossFilterApi,
  type FilterDimension,
  type FilterState,
} from "./filters";

export function CrossFilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  const toggle = useCallback((dimension: FilterDimension, value: string, additive: boolean) => {
    setFilters((prev) => {
      const current = prev[dimension];
      if (additive) {
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        return { ...prev, [dimension]: next };
      }
      const isOnlySelection = current.length === 1 && current[0] === value;
      return { ...prev, [dimension]: isOnlySelection ? [] : [value] };
    });
  }, []);

  const clear = useCallback((dimension?: FilterDimension) => {
    setFilters((prev) => (dimension ? { ...prev, [dimension]: [] } : EMPTY_FILTERS));
  }, []);

  const remove = useCallback((dimension: FilterDimension, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [dimension]: prev[dimension].filter((v) => v !== value),
    }));
  }, []);

  const api = useMemo<CrossFilterApi>(() => {
    return {
      filters,
      toggle,
      clear,
      remove,
      isSelected: (dimension, value) => filters[dimension].includes(value),
      hasSelection: (dimension) => filters[dimension].length > 0,
      activeCount: Object.values(filters).reduce((sum, v) => sum + v.length, 0),
    };
  }, [filters, toggle, clear, remove]);

  return <CrossFilterContext.Provider value={api}>{children}</CrossFilterContext.Provider>;
}
