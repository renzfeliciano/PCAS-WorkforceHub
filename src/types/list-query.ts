export type SortDir = "asc" | "desc";

export type ListQuery = {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: SortDir;
};

export type ListResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
