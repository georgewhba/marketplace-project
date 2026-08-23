export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'غير مصرح لك بالدخول'): AppError {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'ليس لديك صلاحية للوصول'): AppError {
    return new AppError(403, 'FORBIDDEN', message);
  }

  static notFound(resource = 'المورد'): AppError {
    return new AppError(404, 'NOT_FOUND', `${resource} غير موجود`);
  }

  static conflict(message: string): AppError {
    return new AppError(409, 'CONFLICT', message);
  }

  static tooManyRequests(message = 'عدد الطلبات كثير جداً، حاول بعد قليل'): AppError {
    return new AppError(429, 'TOO_MANY_REQUESTS', message);
  }

  static internal(message = 'حدث خطأ في الخادم'): AppError {
    return new AppError(500, 'INTERNAL_ERROR', message);
  }

  static unprocessable(message: string, details?: unknown): AppError {
    return new AppError(422, 'UNPROCESSABLE_ENTITY', message, details);
  }
}
