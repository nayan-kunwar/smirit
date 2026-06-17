export interface ListOptions {
  limit: number;
  offset: number;
}

export const DEFAULT_LIST_OPTIONS: ListOptions = {
  limit: 50,
  offset: 0,
};

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
