import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { SortDir } from "@/types/list-query";

type SortButtonProps = Readonly<{
  field: string;
  label: string;
  activeField?: string;
  direction?: SortDir;
  onSort: (field: string) => void;
}>;

function SortButton({ field, label, activeField, direction, onSort }: SortButtonProps) {
  const isActive = activeField === field;
  const Icon = isActive ? (direction === "desc" ? ArrowDown : ArrowUp) : ChevronsUpDown;
  return (
    <button type="button" className="sortable-header" onClick={() => onSort(field)}>
      {label}
      <Icon size={12} aria-hidden />
    </button>
  );
}

/**
 * Drop-in replacement for a plain `<th>` on any column a `<table>`-based
 * list wants to make sortable — columns without this stay plain
 * `<th>text</th>`, so sortability is opt-in per column rather than
 * table-wide.
 */
export function SortableHeader(props: SortButtonProps) {
  const isActive = props.activeField === props.field;
  return (
    <th aria-sort={isActive ? (props.direction === "desc" ? "descending" : "ascending") : "none"}>
      <SortButton {...props} />
    </th>
  );
}
