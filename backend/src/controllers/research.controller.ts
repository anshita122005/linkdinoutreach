import type { Request, Response } from "express";
import { researchService } from "../services/research.service";
import { sessionManager } from "../lib/session-manager";
import { successResponse, errorResponse } from "../utils/api";

export const researchController = {
  async startResearch(req: Request, res: Response): Promise<void> {
    const { linkedinUrl } = req.body as { linkedinUrl: string };
    const result = await researchService.startResearch(linkedinUrl);
    res.status(202).json(successResponse(result));
  },

  async getJobStatus(req: Request, res: Response): Promise<void> {
    const jobId = String(req.params["jobId"]);
    const job = await researchService.getJobStatus(jobId);
    res.status(200).json(successResponse(job));
  },

  async getHistory(_req: Request, res: Response): Promise<void> {
    const history = await researchService.getHistory();
    res.status(200).json(successResponse(history));
  },

  async deleteJob(req: Request, res: Response): Promise<void> {
    const jobId = String(req.params["jobId"]);
    await researchService.deleteJob(jobId);
    res.status(200).json(successResponse({ deleted: true }));
  },

  async getSessionStatus(_req: Request, res: Response): Promise<void> {
    const authenticated = await sessionManager.isAuthenticated();
    res.status(200).json(
      successResponse({
        authenticated,
        message: authenticated
          ? "LinkedIn session is active."
          : "Not authenticated. Open the browser profile and log in to LinkedIn.",
      }),
    );
  },

  handleError(err: unknown, res: Response): void {
    const statusCode =
      err instanceof Error && "statusCode" in err ? (err as Error & { statusCode: number }).statusCode : 500;
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(statusCode).json(errorResponse(message));
  },
};
