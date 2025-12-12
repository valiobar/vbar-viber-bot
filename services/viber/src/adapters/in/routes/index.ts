/**
 * Route definitions for Viber Service
 */

import { Router } from "express";
import { healthCheckHandler } from "./health";

const router = Router();

// Health check route
router.get("/health", healthCheckHandler);

export default router;

