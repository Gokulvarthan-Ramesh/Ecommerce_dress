export function getPagination(
  page: string | string[] | qs.ParsedQs | qs.ParsedQs[] | undefined,
  limit: string | string[] | qs.ParsedQs | qs.ParsedQs[] | undefined,
  defaultPage = 1,
  defaultLimit = 20
) {
  const pageNum = parseInt(page as string, 10) || defaultPage;
  const limitNum = parseInt(limit as string, 10) || defaultLimit;
  const skip = (pageNum - 1) * limitNum;

  return { pageNum, limitNum, skip };
}

export function formatPaginationResponse(
  total: number,
  pageNum: number,
  limitNum: number
) {
  return {
    page: pageNum,
    limit: limitNum,
    total,
    totalPages: Math.ceil(total / limitNum),
  };
}
