import { Response } from 'express';

export class ApiResponse {
  static success(res: Response, data: any = null, message: string = 'Success', statusCode: number = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      ...(data && { data }),
    });
  }

  static created(res: Response, data: any = null, message: string = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  static paginated(res: Response, items: any[], meta: any, message: string = 'Success', statusCode: number = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data: {
        items,
        meta,
      },
    });
  }

  static error(res: Response, message: string = 'Internal Server Error', statusCode: number = 500, errors: any = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      ...(errors && { errors }),
    });
  }
}
