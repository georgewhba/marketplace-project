import { describe, it, expect } from 'vitest';
import { AppError } from '../../utils/errors.js';

describe('AppError', () => {
  it('badRequest returns 400 with BAD_REQUEST code', () => {
    const err = AppError.badRequest('حقل غير صالح');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.message).toBe('حقل غير صالح');
    expect(err).toBeInstanceOf(AppError);
    expect(err).toBeInstanceOf(Error);
  });

  it('badRequest passes details through', () => {
    const details = { field: 'email', reason: 'invalid' };
    const err = AppError.badRequest('خطأ', details);
    expect(err.details).toEqual(details);
  });

  it('unauthorized returns 401 with UNAUTHORIZED code', () => {
    const err = AppError.unauthorized();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('unauthorized accepts custom message', () => {
    const err = AppError.unauthorized('رمز منتهي');
    expect(err.message).toBe('رمز منتهي');
  });

  it('forbidden returns 403 with FORBIDDEN code', () => {
    const err = AppError.forbidden();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('notFound returns 404 with NOT_FOUND code', () => {
    const err = AppError.notFound('المنتج');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('المنتج غير موجود');
  });

  it('conflict returns 409 with CONFLICT code', () => {
    const err = AppError.conflict('بريد مكرر');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
    expect(err.message).toBe('بريد مكرر');
  });

  it('tooManyRequests returns 429', () => {
    const err = AppError.tooManyRequests();
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('TOO_MANY_REQUESTS');
  });

  it('internal returns 500 with INTERNAL_ERROR code', () => {
    const err = AppError.internal();
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
  });

  it('unprocessable returns 422 with UNPROCESSABLE_ENTITY code', () => {
    const err = AppError.unprocessable('بيانات غير قابلة للمعالجة', { issues: ['x'] });
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('UNPROCESSABLE_ENTITY');
    expect(err.details).toEqual({ issues: ['x'] });
  });
});
