// Central error handler. Converts thrown `HttpError` into HTTP responses
// and logs any unexpected error for observability.
import type { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message ?? code);
  }
}

export const notFound = (_req: Request, res: Response) => {
  res.status(404).json({ error: "NOT_FOUND" });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code, message: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: "VALIDATION", issues: err.issues });
    return;
  }
  console.error("[error]", err);
  res.status(500).json({ error: "INTERNAL" });
};

export const asyncRoute = <T extends Request>(
  fn: (req: T, res: Response) => Promise<unknown>,
) => (req: Request, res: Response, next: NextFunction) => {
  void Promise.resolve(fn(req as T, res)).catch(next);
};
