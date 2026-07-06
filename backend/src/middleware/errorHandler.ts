import type { ErrorRequestHandler } from "express";
import { errorResponse } from "../utils/api";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof Error) {
    return res.status(500).json(errorResponse(err.message));
  }

  return res.status(500).json(errorResponse("Internal server error"));
};
