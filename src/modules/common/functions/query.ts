import { endOfDay, startOfDay } from 'date-fns';
import { Types } from 'mongoose';
import * as R from 'ramda';

export const convertDateRange = (startDateKey: string, endDateKey: string) =>
  R.ifElse(
    R.either(R.has(startDateKey), R.has(endDateKey)),
    (query: Record<string, any>) => {
      const startDate = query[startDateKey] ? startOfDay(new Date(query[startDateKey])) : undefined;
      const endDate = query[endDateKey] ? endOfDay(new Date(query[endDateKey])) : undefined;
      const range: Record<string, any> = {};
      if (startDate) range.$gte = startDate;
      if (endDate) range.$lte = endDate;
      return range;
    },
    R.always(undefined),
  );

export const toObjectId = (id: string | Types.ObjectId) => typeof id === 'string' ? new Types.ObjectId(id) : id;

export const findLike = (field: string) =>
  R.pipe(
    R.prop(field),
    R.when(R.is(String), (value) => ({ $regex: value, $options: 'i' })),
  );

export function extractQueryParams(query: Record<string, any>) {
  const { page = '1', limit = '10', sort = null } = query;

  // Convert page to zero-based index
  const pageIndex = Math.max(0, parseInt(page) - 1);

  // Ensure limit is a positive integer
  const pageSize = Math.max(1, parseInt(limit));

  // Convert sort string to an object
  let sortField = {};
  if (sort) {
    const order: number = sort.startsWith('-') ? -1 : 1;
    const field: string = sort.startsWith('-') ? sort.slice(1) : sort;
    sortField = { [field]: order };
  }

  return {
    page: pageIndex,
    limit: pageSize,
    sort: sortField,
  };
}
