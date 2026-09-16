"use client";

import { Search } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useCatalogOptions } from "@/hooks/use-catalog-options";
import { CASE_CLASSIFICATION_CATEGORY, CASE_STATUS_CATEGORY } from "@/types/catalog";

export type CaseFiltersValue = {
  projectId: string;
  classificationId: string;
  statusId: string;
};

type CaseFiltersProps = Readonly<{
  query: string;
  onQueryChange: (value: string) => void;
  value: CaseFiltersValue;
  onChange: (value: CaseFiltersValue) => void;
  isFetching?: boolean;
}>;

export function CaseFilters({ query, onQueryChange, value, onChange, isFetching }: CaseFiltersProps) {
  const { activeItems: projects } = useCatalogOptions("project");
  const { activeItems: classifications } = useCatalogOptions("status", CASE_CLASSIFICATION_CATEGORY);
  const { activeItems: statuses } = useCatalogOptions("status", CASE_STATUS_CATEGORY);

  return (
    <div className="toolbar case-filters">
      <div className="search">
        {isFetching ? <Spinner size={16} /> : <Search size={16} />}
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search case name, number, counsel..."
          data-testid="case-search"
        />
      </div>
      <label className="case-filter">
        <span>Project</span>
        <select
          value={value.projectId}
          onChange={(event) => onChange({ ...value, projectId: event.target.value })}
          data-testid="case-filter-project"
        >
          <option value="">All projects</option>
          {projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="case-filter">
        <span>Classification</span>
        <select
          value={value.classificationId}
          onChange={(event) => onChange({ ...value, classificationId: event.target.value })}
          data-testid="case-filter-classification"
        >
          <option value="">All classifications</option>
          {classifications.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label className="case-filter">
        <span>Status</span>
        <select
          value={value.statusId}
          onChange={(event) => onChange({ ...value, statusId: event.target.value })}
          data-testid="case-filter-status"
        >
          <option value="">All statuses</option>
          {statuses.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
