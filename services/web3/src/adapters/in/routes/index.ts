/**
 * Web3 Service Routes
 *
 * Input adapters for HTTP endpoints following Hexagonal Architecture
 */

import { Router } from "express";
import healthRoutes from "./health";
import walletRoutes from "./wallets";
import transactionRoutes from "./transactions";
import tokenRoutes from "./tokens";
import contractRoutes from "./contracts";
import { verifyServiceToken } from "../middleware/auth";

const router = Router();

// Health check routes (no authentication required)
router.use("/api/web3/health", healthRoutes);

// All other routes require service token authentication
router.use("/api/web3/wallets", verifyServiceToken, walletRoutes);
router.use("/api/web3/transactions", verifyServiceToken, transactionRoutes);
router.use("/api/web3/tokens", verifyServiceToken, tokenRoutes);
router.use("/api/web3/nfts", verifyServiceToken, tokenRoutes); // NFTs are handled by token routes
router.use("/api/web3/contracts", verifyServiceToken, contractRoutes);

export default router;

