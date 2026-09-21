export class ApiFeatures {
  query: any;
  queryString: any;

  constructor(queryString: any) {
    this.queryString = queryString;
    this.query = {
      where: {},
      skip: 0,
      take: 10,
      orderBy: { createdAt: 'desc' },
    };
  }

  filter(searchableFields: string[] = []) {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'search'];
    excludedFields.forEach((el) => delete queryObj[el]);

    // Handle standard exact filters
    for (const key in queryObj) {
      if (queryObj[key]) {
        // Handle comma-separated array filters (like ?status=PENDING,COMPLETED)
        if (typeof queryObj[key] === 'string' && queryObj[key].includes(',')) {
          this.query.where[key] = { in: queryObj[key].split(',') };
        } else {
          this.query.where[key] = queryObj[key];
        }
      }
    }

    // Handle global text search
    if (this.queryString.search && searchableFields.length > 0) {
      this.query.where.OR = searchableFields.map((field) => ({
        [field]: { contains: this.queryString.search, mode: 'insensitive' },
      }));
    }

    return this;
  }

  sort(defaultSort: any = { createdAt: 'desc' }) {
    if (this.queryString.sort) {
      // e.g., ?sort=-price (desc) or ?sort=name (asc)
      const isDesc = this.queryString.sort.startsWith('-');
      const field = isDesc ? this.queryString.sort.substring(1) : this.queryString.sort;
      this.query.orderBy = { [field]: isDesc ? 'desc' : 'asc' };
    } else {
      this.query.orderBy = defaultSort;
    }

    return this;
  }

  paginate() {
    // Check if user wants all items (e.g. ?limit=all or ?pagination=false)
    if (this.queryString.limit === 'all' || this.queryString.pagination === 'false') {
      // Don't set skip and take, so Prisma returns all records matching the filters
      return this;
    }

    const page = parseInt(this.queryString.page as string, 10) || 1;
    const limit = parseInt(this.queryString.limit as string, 10) || 10;
    const skip = (page - 1) * limit;

    this.query.skip = skip;
    this.query.take = limit;

    return this;
  }

  static getMeta(totalItems: number, page: number, limit: number | 'all') {
    if (limit === 'all') {
      return {
        total: totalItems,
        page: 1,
        limit: totalItems,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      };
    }

    return {
      total: totalItems,
      page: page,
      limit: limit,
      totalPages: Math.ceil(totalItems / limit),
      hasNextPage: page * limit < totalItems,
      hasPrevPage: page > 1,
    };
  }
}
