export interface IResponse<T> {
  data: T;
  meta: {
    currentPage: number;
    itemsPerPage: number;
    total: number;
  };
}
