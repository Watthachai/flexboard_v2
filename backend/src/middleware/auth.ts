/* eslint-disable @typescript-eslint/no-explicit-any */
import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";
import { z, ZodSchema } from "zod";

/**
 * Middleware: Authenticate user with Firebase ID Token
 */
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const idToken = authHeader.split("Bearer ")[1];

    // Verify Firebase ID Token
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Super Admin email list
    const SUPER_ADMIN_EMAILS = ["wattchaichai@gmail.com"];

    // Check if user is super admin by email
    const isSuperAdminByEmail = SUPER_ADMIN_EMAILS.includes(
      decodedToken.email || ""
    );

    // If user is super admin by email but doesn't have the claim, set it
    // NOTE: Temporarily disabled due to permission issues
    // Will be enabled once service account has proper permissions
    /*
    if (isSuperAdminByEmail && !decodedToken.isSuperAdmin) {
      console.log("🔧 Setting super admin claims for:", decodedToken.email);
      await admin.auth().setCustomUserClaims(decodedToken.uid, {
        isSuperAdmin: true,
        isAdmin: true,
        role: "admin",
      });

      // Note: The claims won't be in this token, but will be in the next one
      // For this request, we'll manually add them
      decodedToken.isSuperAdmin = true;
      decodedToken.isAdmin = true;
      decodedToken.role = decodedToken.role || "admin";
    }
    */

    // Attach user info to request (decodedToken already includes all custom claims)
    (req as any).user = {
      ...decodedToken,
      isSuperAdmin: decodedToken.isSuperAdmin || isSuperAdminByEmail,
      isAdmin: decodedToken.isAdmin || isSuperAdminByEmail,
      customClaims: {
        role: decodedToken.role,
        tenantId: decodedToken.tenantId,
        isAdmin: decodedToken.isAdmin || isSuperAdminByEmail,
        isSuperAdmin: decodedToken.isSuperAdmin || isSuperAdminByEmail,
      },
    };

    next();
  } catch (error: any) {
    console.error("Auth error:", error.message);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

/**
 * Middleware: Require tenant assignment
 */
export const requireTenant = (
  req: Request,
  res: Response,
  next: NextFunction
): any => {
  const user = (req as any).user;

  if (!user?.tenantId) {
    return res.status(403).json({
      error: "Forbidden: No tenant assigned",
      message: "Please join a company first",
    });
  }

  next();
};

/**
 * Middleware: Require specific role
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): any => {
    const user = (req as any).user;

    if (!allowedRoles.includes(user?.role)) {
      return res.status(403).json({
        error: "Forbidden: Insufficient permissions",
        requiredRoles: allowedRoles,
        yourRole: user?.role || "none",
      });
    }

    next();
  };
};

/**
 * Middleware: Require admin or super admin
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): any => {
  const user = (req as any).user;

  if (user?.isSuperAdmin === true || user?.isAdmin === true) {
    return next();
  }

  if (user?.role === "admin" && user?.tenantId) {
    return next();
  }

  return res.status(403).json({
    error: "Forbidden: Admin access required",
    message: "Only admins can access this resource",
  });
};

/**
 * Middleware: Validate request body with Zod schema
 */
export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): any => {
    try {
      schema.parse(req.body);
      next();
    } catch (error: any) {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
    }
  };
};
