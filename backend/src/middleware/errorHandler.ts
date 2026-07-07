import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { errorResponse } from "../utils/api";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json(errorResponse("Validation failed", err.issues));
  }

  if (err instanceof Error && "statusCode" in err) {
    const statusCode = (err as Error & { statusCode: number }).statusCode;
    return res.status(statusCode).json(errorResponse(err.message));
  }

  if (err instanceof Error) {
    return res.status(500).json(errorResponse(err.message));
  }

  return res.status(500).json(errorResponse("Internal server error"));
};
