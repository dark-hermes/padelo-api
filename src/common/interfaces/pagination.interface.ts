export interface PaginationMeta {
  currentPage: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginationLinks {
  first?: string;
  previous?: string;
  next?: string;
  last?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  links: PaginationLinks;
}
