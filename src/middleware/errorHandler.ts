import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('[Error]', err);

  const status = (err as any)?.status ?? 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : String((err as any)?.message ?? err);

  res.status(status).json({ error: message });
}
