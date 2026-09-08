// import User from '../models/user.model.js';
// import logger from '../core/config/logger.js';
// import userRole from '../models/userRole.model.js';

// // Middleware to ensure super admin exists in the system
// export const ensureSuperAdminExists = async (req, res, next) => {
//   try {
//     // Skip check for certain routes that don't require super admin
//     const skipRoutes = [
//       '/api/v1/user/register',
//       '/api/v1/user/login',
//       '/api/v1/health'
//     ];

//     if (skipRoutes.some(route => req.path.includes(route))) {
//       return next();
//     }

//     // Check if any super admin exists in the system
//     const superAdminExists = await userRole.findOne({ role: 'SuperAdmin' });

//     if (!superAdminExists) {
//       logger.warn('No super admin found in the system. Database needs to be set up.');
      
//       return res.status(503).json({
//         success: false,
//         message: 'System not properly initialized. Please run the setup script.',
//         error: 'NO_SUPER_ADMIN',
//         instructions: {
//           step1: 'Run: npm run setup',
//           step2: 'Or run: npm run create-admin:interactive',
//           step3: 'Contact system administrator if issue persists'
//         }
//       });
//     }

//     next();
//   } catch (error) {
//     logger.error('Error checking super admin existence:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Internal server error while checking system initialization',
//       error: 'SYSTEM_CHECK_ERROR'
//     });
//   }
// };

// // Middleware to check if current user is super admin
// export const requireSuperAdmin = async (req, res, next) => {
//   try {
//     // Check if user is authenticated and has admin role
//     if (!req.user || req.user.role !== 'SuperAdmin') {
//       return res.status(403).json({
//         success: false,
//         message: 'Super admin access required',
//         error: 'INSUFFICIENT_PRIVILEGES'
//       });
//     }

//     // Verify the user still exists and has admin role in database
//     const adminUser = await User.findById(req.user._id);
    
//     if (!adminUser || adminUser.role !== 'admin' || adminUser.isDeleted) {
//       return res.status(403).json({
//         success: false,
//         message: 'Invalid or inactive admin account',
//         error: 'INVALID_ADMIN'
//       });
//     }

//     req.adminUser = adminUser;
//     next();
//   } catch (error) {
//     logger.error('Error in requireSuperAdmin middleware:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Error validating admin privileges',
//       error: 'ADMIN_CHECK_ERROR'
//     });
//   }
// };

// // Utility function to check if system is properly initialized
// export const isSystemInitialized = async () => {
//   try {
//     const superAdminCount = await User.countDocuments({ role: 'admin' });
//     return superAdminCount > 0;
//   } catch (error) {
//     logger.error('Error checking system initialization:', error);
//     return false;
//   }
//   console.log("ensureSuperAdmin middleware executed:", req.method, req.originalUrl);
// };

// export default {
//   ensureSuperAdminExists,
//   requireSuperAdmin,
//   isSystemInitialized
// };



import User from "../models/user.model.js";
import UserRole from "../models/userRole.model.js";
import Role from "../models/role.model.js";
import logger from "../core/config/logger.js";


// Middleware to ensure SuperAdmin exists in the system
export const ensureSuperAdminExists = async (req, res, next) => {
  try {
    const skipRoutes = [
      "/api/v1/user/register",
      "/api/v1/user/login",
      "/api/v1/health",
    ];

    if (skipRoutes.some((route) => req.path.includes(route))) {
      return next();
    }

    // Find SuperAdmin role
    const superAdminRole = await Role.findOne({
      name: "SuperAdmin",
    });

    if (!superAdminRole) {
      logger.warn("SuperAdmin role does not exist in the database.");

      return res.status(503).json({
        success: false,
        message: "System not properly initialized. Please run the setup script.",
        error: "NO_SUPER_ADMIN_ROLE",
        instructions: {
          step1: "Run: npm run setup",
          step2: "Or run: npm run create-admin:interactive",
          step3:
            "Contact system administrator if issue persists",
        },
      });
    }

    // Check if an active SuperAdmin UserRole exists
    const superAdminExists = await UserRole.findOne({
      roleId: superAdminRole._id,
      companyId: null,
      Status: "active",
    });

    if (!superAdminExists) {
      logger.warn(
        "No SuperAdmin found in the system. Database needs to be set up."
      );

      return res.status(503).json({
        success: false,
        message: "System not properly initialized. Please run the setup script.",
        error: "NO_SUPER_ADMIN",
        instructions: {
          step1: "Run: npm run setup",
          step2: "Or run: npm run create-admin:interactive",
          step3:
            "Contact system administrator if issue persists",
        },
      });
    }

    next();
  } catch (error) {
    logger.error("Error checking super admin existence:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error while checking system initialization",
      error: "SYSTEM_CHECK_ERROR",
    });
  }
};


// Middleware to check whether current user is SuperAdmin
export const requireSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
        error: "UNAUTHORIZED",
      });
    }

    // Get SuperAdmin role
    const superAdminRole = await Role.findOne({
      name: "SuperAdmin",
    });

    if (!superAdminRole) {
      return res.status(503).json({
        success: false,
        message: "SuperAdmin role is not configured",
        error: "NO_SUPER_ADMIN_ROLE",
      });
    }

    // Verify user has active SuperAdmin role
    const superAdminUserRole = await UserRole.findOne({
      userId: req.user._id,
      roleId: superAdminRole._id,
      companyId: null,
      Status: "active",
    });

    if (!superAdminUserRole) {
      return res.status(403).json({
        success: false,
        message: "Super admin access required",
        error: "INSUFFICIENT_PRIVILEGES",
      });
    }

    // Verify user still exists and is active
    const adminUser = await User.findOne({
      _id: req.user._id,
      isDeleted: false,
    });

    if (!adminUser) {
      return res.status(403).json({
        success: false,
        message: "Invalid or inactive admin account",
        error: "INVALID_ADMIN",
      });
    }

    req.adminUser = adminUser;

    next();
  } catch (error) {
    logger.error("Error in requireSuperAdmin middleware:", error);

    return res.status(500).json({
      success: false,
      message: "Error validating admin privileges",
      error: "ADMIN_CHECK_ERROR",
    });
  }
};


// Utility function to check whether system is initialized
export const isSystemInitialized = async () => {
  try {
    const superAdminRole = await Role.findOne({
      name: "SuperAdmin",
    });

    if (!superAdminRole) {
      return false;
    }

    const superAdminExists = await UserRole.exists({
      roleId: superAdminRole._id,
      companyId: null,
      Status: "active",
    });

    return !!superAdminExists;
  } catch (error) {
    logger.error(
      "Error checking system initialization:",
      error
    );

    return false;
  }
};


export default {
  ensureSuperAdminExists,
  requireSuperAdmin,
  isSystemInitialized,
};