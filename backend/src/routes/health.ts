import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { successResponse } from "../utils/api";

const router = Router();

router.get(
  "/health",
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json(
      successResponse({
        status: "ok",
        service: "ai-executive-outreach-copilot",
        timestamp: new Date().toISOString(),
        database: "connected",
      }),
    );
  }),
);

export default router;
