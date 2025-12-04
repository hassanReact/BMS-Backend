import { Router } from "express";
import { asyncHandler } from "../utils/asyncWrapper.js";
import { isSystemInitialized } from "../middlewares/ensureSuperAdmin.middleware.js";
import User from "../models/user.model.js";
import Company from "../models/company.model.js";

const router = Router();

// System health check
router.get("/health", asyncHandler(async (req, res) => {
  const systemInitialized = await isSystemInitialized();
  const superAdminCount = await User.countDocuments({ role: 'admin' });
  const companyCount = await Company.countDocuments({ isDeleted: false });
  const userCount = await User.countDocuments({ isDeleted: false });

  res.status(200).json({
    success: true,
    message: "System health check",
    data: {
      status: systemInitialized ? 'initialized' : 'needs_setup',
      database: 'connected',
      superAdminCount,
      companyCount,
      userCount,
      timestamp: new Date().toISOString(),
      environment: process.env.ENV || 'development'
    },
    instructions: systemInitialized ? null : {
      message: "System needs to be set up",
      steps: [
        "Run: npm run setup",
        "Or run: npm run create-admin:interactive"
      ]
    }
  });
}));

// System initialization status
router.get("/init-status", asyncHandler(async (req, res) => {
  const systemInitialized = await isSystemInitialized();
  
  if (!systemInitialized) {
    return res.status(503).json({
      success: false,
      message: "System not initialized",
      error: "NO_SUPER_ADMIN",
      instructions: {
        setup: "npm run setup",
        interactive: "npm run create-admin:interactive",
        automated: "npm run create-admin:env"
      }
    });
  }

  res.status(200).json({
    success: true,
    message: "System properly initialized",
    data: {
      initialized: true,
      timestamp: new Date().toISOString()
    }
  });
}));

export default router;