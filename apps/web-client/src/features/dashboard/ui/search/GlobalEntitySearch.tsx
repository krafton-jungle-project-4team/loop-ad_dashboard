import type { DashboardEntitySearchResult, DashboardEntityType } from "@loopad/shared";
import { Badge } from "@loopad/ui/shadcn/badge";
import { Button } from "@loopad/ui/shadcn/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@loopad/ui/shadcn/command";
import { Popover, PopoverContent, PopoverTrigger } from "@loopad/ui/shadcn/popover";
import { Spinner } from "@loopad/ui/shadcn/spinner";
import { cn } from "@loopad/ui/shadcn/utils";
import { useQuery } from "@tanstack/react-query";
import { Megaphone, Search, Tag, Users, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchDashboardEntitySearch } from "../../api/entity-search-api.js";
import { formatStatusLabel } from "../../model/dashboard-labels.js";
import { dashboardEntitySearchQueryKey } from "../../model/dashboard-query-keys.js";

const SEARCH_DEBOUNCE_MS = 250;

const ENTITY_GROUPS = [
  { icon: Megaphone, label: "캠페인", value: "campaign" },
  { icon: Tag, label: "프로모션", value: "promotion" },
  { icon: Users, label: "고객군", value: "segment" }
] satisfies ReadonlyArray<{ icon: LucideIcon; label: string; value: DashboardEntityType }>;

const EMPTY_RESULTS: DashboardEntitySearchResult[] = [];

export type GlobalEntitySearchProps = {
  projectId: string;
  onResultSelect: (result: DashboardEntitySearchResult) => void;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
};

export function GlobalEntitySearch({
  className,
  disabled = false,
  onResultSelect,
  placeholder = "캠페인, 프로모션, 고객군 검색",
  projectId
}: GlobalEntitySearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(normalizedQuery, SEARCH_DEBOUNCE_MS);
  const isDisabled = disabled || projectId.trim().length === 0;
  const canSearch = !isDisabled && isOpen && debouncedQuery.length >= 1;
  const isQueryReady = normalizedQuery.length >= 1 && debouncedQuery === normalizedQuery;
  const entitySearch = useQuery({
    enabled: canSearch,
    queryFn: ({ signal }) => fetchDashboardEntitySearch(projectId, debouncedQuery, "all", signal),
    queryKey: dashboardEntitySearchQueryKey(projectId, debouncedQuery, "all"),
    staleTime: 30_000
  });
  const results = entitySearch.data?.results ?? EMPTY_RESULTS;

  const handleResultSelect = (result: DashboardEntitySearchResult) => {
    setIsOpen(false);
    onResultSelect(result);
  };

  return (
    <div className={cn("flex min-w-0", className)}>
      <Popover onOpenChange={setIsOpen} open={isOpen}>
        <PopoverTrigger asChild>
          <Button
            aria-expanded={isOpen}
            aria-label={placeholder}
            className="min-w-0 flex-1 justify-start"
            disabled={isDisabled}
            role="combobox"
            size="sm"
            type="button"
            variant="outline"
          >
            <Search data-icon="inline-start" />
            <span className="truncate text-muted-foreground">{placeholder}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[min(28rem,calc(100vw-2rem))] gap-0 p-0"
          sideOffset={8}
        >
          <Command label="프로젝트 항목 검색" shouldFilter={false}>
            <CommandInput
              aria-label="검색어"
              autoFocus
              onValueChange={setQuery}
              placeholder="이름이나 설명을 입력해 주세요"
              value={query}
            />
            <CommandList>
              <SearchState
                isError={entitySearch.isError}
                isLoading={entitySearch.isLoading}
                isQueryReady={isQueryReady}
                onRetry={() => void entitySearch.refetch()}
                query={normalizedQuery}
                resultCount={results.length}
              />
              {isQueryReady && !entitySearch.isLoading && !entitySearch.isError
                ? ENTITY_GROUPS.map((group) => {
                    const groupResults = results.filter(
                      (result) => result.entity_type === group.value
                    );

                    if (groupResults.length === 0) {
                      return null;
                    }

                    const EntityIcon = group.icon;

                    return (
                      <CommandGroup heading={group.label} key={group.value}>
                        {groupResults.map((result) => (
                          <CommandItem
                            key={`${result.entity_type}:${result.entity_id}`}
                            onSelect={() => handleResultSelect(result)}
                            value={`${result.entity_type}:${result.entity_id}:${result.display_name}`}
                          >
                            <EntityIcon aria-hidden="true" className="text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {result.display_name}
                            </span>
                            <Badge variant="outline">{formatStatusLabel(result.status)}</Badge>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    );
                  })
                : null}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SearchState({
  isError,
  isLoading,
  isQueryReady,
  onRetry,
  query,
  resultCount
}: {
  isError: boolean;
  isLoading: boolean;
  isQueryReady: boolean;
  onRetry: () => void;
  query: string;
  resultCount: number;
}) {
  if (query.length === 0) {
    return <CommandEmpty>검색어를 입력해 주세요.</CommandEmpty>;
  }

  if (!isQueryReady || isLoading) {
    return (
      <CommandEmpty>
        <span className="flex items-center justify-center gap-2 text-muted-foreground">
          <Spinner aria-label="검색 중" />
          검색 중…
        </span>
      </CommandEmpty>
    );
  }

  if (isError) {
    return (
      <CommandEmpty>
        <span className="flex flex-col items-center gap-2">
          <span className="text-destructive">검색하지 못했어요.</span>
          <Button onClick={onRetry} size="sm" type="button" variant="ghost">
            다시 시도
          </Button>
        </span>
      </CommandEmpty>
    );
  }

  if (resultCount === 0) {
    return <CommandEmpty>일치하는 결과가 없어요.</CommandEmpty>;
  }

  return null;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
}
