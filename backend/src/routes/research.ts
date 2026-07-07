import { Router } from "express";
import { z } from "zod";
import { researchController } from "../controllers/research.controller";
import { validate } from "../middleware/validate";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

const startResearchSchema = z.object({
  linkedinUrl: z.string().url("Must be a valid URL."),
});

router.post(
  "/",
  validate(startResearchSchema),
  asyncHandler(async (req, res) => {
    await researchController.startResearch(req, res);
  }),
);

router.get(
  "/history",
  asyncHandler(async (req, res) => {
    await researchController.getHistory(req, res);
  }),
);

router.get(
  "/session",
  asyncHandler(async (req, res) => {
    await researchController.getSessionStatus(req, res);
  }),
);

router.get(
  "/:jobId",
  asyncHandler(async (req, res) => {
    await researchController.getJobStatus(req, res);
  }),
);

router.delete(
  "/:jobId",
  asyncHandler(async (req, res) => {
    await researchController.deleteJob(req, res);
  }),
);

export default router;
