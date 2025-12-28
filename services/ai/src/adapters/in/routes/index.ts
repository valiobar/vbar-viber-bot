/**
 * AI Service Routes
 *
 * Input adapters for HTTP endpoints following Hexagonal Architecture
 */

import { Router } from "express";
import healthRoutes from "./health";

const router = Router();

// Health check routes
router.use("/api/health", healthRoutes);

export default router;


