/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from "express";
import admin from "firebase-admin";
import { z } from "zod";
import { db } from "../index.js";
import { authenticateUser, validateBody } from "../middleware/auth.js";

export const authRouter = Router();

// ===== Schemas =====
const AssignTenantSchema = z.object({
  inviteCode: z.string().optional(),
});

// ===== POST /api/auth/assign-tenant =====
authRouter.post(
  "/assign-tenant",
  authenticateUser,
  validateBody(AssignTenantSchema),
  async (req, res) => {
    try {
      const user = (req as any).user;
      const { inviteCode } = req.body;

      let tenantId: string;
      let role = "viewer";

      if (inviteCode) {
        // 🆕 ค้นหา invite code ใน globalInviteCodes collection
        const inviteRef = db.collection("globalInviteCodes").doc(inviteCode);
        const inviteDoc = await inviteRef.get();

        if (!inviteDoc.exists) {
          return res.status(404).json({
            error: "Invalid invite code",
          });
        }

        const inviteData = inviteDoc.data();

        // ตรวจสอบสถานะ
        if (!inviteData?.isActive) {
          return res.status(400).json({
            error: "Invite code is inactive",
          });
        }

        // 🆕 ตรวจสอบ allowedDomains
        if (inviteData.allowedDomains && inviteData.allowedDomains.length > 0) {
          const userDomain = user.email.split("@")[1];
          const isAllowed = inviteData.allowedDomains.some((domain: string) =>
            userDomain.toLowerCase().endsWith(domain.toLowerCase())
          );

          if (!isAllowed) {
            return res.status(403).json({
              error: "Email domain not allowed",
              message: `This invite code is restricted to: ${inviteData.allowedDomains.join(
                ", "
              )}`,
            });
          }
        }

        // ตรวจสอบว่าหมดอายุหรือยัง
        if (
          inviteData.expiresAt &&
          inviteData.expiresAt.toDate() < new Date()
        ) {
          return res.status(400).json({
            error: "Invite code has expired",
          });
        }

        // ตรวจสอบจำนวนการใช้งาน (เฉพาะถ้ามี maxUses กำหนดไว้)
        if (inviteData.maxUses !== null && inviteData.maxUses !== undefined) {
          if (inviteData.usedCount >= inviteData.maxUses) {
            return res.status(400).json({
              error: "Invite code has reached maximum usage",
            });
          }
        }

        // เพิ่ม usedCount
        await inviteRef.update({
          usedCount: admin.firestore.FieldValue.increment(1),
          lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        tenantId = inviteData.tenantId;
        role = inviteData.role || "viewer";
      } else {
        // Auto-assign by email domain
        const domain = user.email.split("@")[1];

        const tenantSnapshot = await db
          .collection("tenants")
          .where("domain", "==", domain)
          .where("autoAssign", "==", true)
          .limit(1)
          .get();

        if (tenantSnapshot.empty) {
          return res.status(404).json({
            error: "No tenant found for this email domain",
            message: "Please use an invite code or contact your administrator",
          });
        }

        tenantId = tenantSnapshot.docs[0].id;
      }

      // Set Custom Claims
      await admin.auth().setCustomUserClaims(user.uid, {
        tenantId,
        role,
      });

      // Create user document in Firestore
      await db.doc(`tenants/${tenantId}/users/${user.uid}`).set(
        {
          email: user.email,
          displayName: user.name || user.email,
          role,
          tenantId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      res.json({
        success: true,
        tenantId,
        role,
        message: "Tenant assigned successfully",
      });
    } catch (error: any) {
      console.error("Error assigning tenant:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== GET /api/auth/me =====
authRouter.get("/me", authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;

    // Get fresh user data from Firebase Auth to show current claims
    const userRecord = await admin.auth().getUser(user.uid);

    res.json({
      user: {
        uid: user.uid,
        email: user.email,
        emailVerified: userRecord.emailVerified,
        displayName: user.name,
        photoURL: userRecord.photoURL,
        // Custom claims from token
        tokenClaims: {
          role: user.role,
          tenantId: user.tenantId,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
        },
        // Custom claims from Firebase (latest)
        firebaseClaims: userRecord.customClaims || {},
      },
    });
  } catch (error: any) {
    console.error("Error getting user:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== GET /api/auth/profile =====
// Get user profile (simplified version for onprem frontend)
authRouter.get("/profile", authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;

    // Get fresh user data from Firebase Auth
    const userRecord = await admin.auth().getUser(user.uid);

    res.json({
      uid: user.uid,
      email: user.email,
      displayName: userRecord.displayName || user.name,
      photoURL: userRecord.photoURL,
      tenantId: user.tenantId,
      role: user.role,
    });
  } catch (error: any) {
    console.error("Error getting profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== PUT /api/auth/profile =====
// Update user profile
authRouter.put("/profile", authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { displayName, photoURL } = req.body;

    const updates: any = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (photoURL !== undefined) updates.photoURL = photoURL;

    // Update Firebase Auth
    await admin.auth().updateUser(user.uid, updates);

    // Update Firestore if user has tenant
    if (user.tenantId) {
      await db.doc(`tenants/${user.tenantId}/users/${user.uid}`).set(
        {
          displayName: displayName || user.name,
          photoURL,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== POST /api/auth/remove-user =====
// ลบ user ออกจาก tenant และ clear custom claims
authRouter.post("/remove-user", authenticateUser, async (req, res) => {
  try {
    const requestUser = (req as any).user;
    const { userId, email } = req.body;

    // ตรวจสอบว่าเป็น admin (รองรับทั้ง Tenant Admin และ Super Admin)
    const isAdmin =
      requestUser.role === "admin" ||
      requestUser.isAdmin === true ||
      requestUser.isSuperAdmin === true;

    if (!isAdmin) {
      return res.status(403).json({ error: "Only admin can remove users" });
    }

    // ถ้าส่ง email มาแทน userId ให้ค้นหา user จาก email
    let targetUserId = userId;
    if (!targetUserId && email) {
      try {
        const userRecord = await admin.auth().getUserByEmail(email);
        targetUserId = userRecord.uid;
      } catch (error) {
        return res
          .status(404)
          .json({ error: "User not found with this email" });
      }
    }

    if (!targetUserId) {
      return res
        .status(400)
        .json({ error: "Either userId or email is required" });
    }

    // ดึงข้อมูล user เพื่อหา tenantId
    const userRecord = await admin.auth().getUser(targetUserId);
    const customClaims = userRecord.customClaims || {};
    const tenantId = customClaims.tenantId;

    if (!tenantId) {
      return res
        .status(400)
        .json({ error: "User is not assigned to any tenant" });
    }

    // ตรวจสอบว่าเป็น Super Admin หรือไม่
    const isSuperAdmin =
      requestUser.isAdmin === true || requestUser.isSuperAdmin === true;

    // ถ้าเป็น Tenant Admin (ไม่ใช่ Super Admin) ตรวจสอบว่าลบได้เฉพาะคนใน tenant ของตัวเอง
    if (!isSuperAdmin && requestUser.tenantId !== tenantId) {
      return res.status(403).json({
        error: "You can only remove users from your own tenant",
      });
    }

    // ลบ user document ใน Firestore
    await db.doc(`tenants/${tenantId}/users/${targetUserId}`).delete();

    // Clear custom claims
    await admin.auth().setCustomUserClaims(targetUserId, {
      tenantId: null,
      role: null,
    });

    console.log(`✅ User ${targetUserId} removed from tenant ${tenantId}`);

    res.json({
      success: true,
      message: "User removed successfully. User needs to sign in again.",
      removedUser: {
        userId: targetUserId,
        email: userRecord.email,
        tenantId,
      },
    });
  } catch (error: any) {
    console.error("Error removing user:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== POST /api/auth/refresh-claims =====
// Force refresh claims (สำหรับ debugging)
authRouter.post("/refresh-claims", authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;

    res.json({
      success: true,
      message: "Claims refreshed. Client should call getIdToken(true)",
      currentClaims: {
        tenantId: user.tenantId,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("Error refreshing claims:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== GET /api/auth/list-all-users =====
// List all users across all tenants (Super Admin only)
authRouter.get("/list-all-users", authenticateUser, async (req, res) => {
  try {
    const requestUser = (req as any).user;

    // ตรวจสอบว่าเป็น Super Admin
    const isSuperAdmin =
      requestUser.isAdmin === true || requestUser.isSuperAdmin === true;

    if (!isSuperAdmin) {
      return res.status(403).json({
        error: "Only Super Admin can list all users",
      });
    }

    // ดึง users ทั้งหมดจาก Firebase Auth
    const listUsersResult = await admin.auth().listUsers();

    const users = listUsersResult.users.map((user) => ({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      emailVerified: user.emailVerified,
      disabled: user.disabled,
      metadata: {
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime,
      },
      customClaims: user.customClaims || {},
      tenantId: user.customClaims?.tenantId || null,
      role: user.customClaims?.role || null,
    }));

    res.json({ users });
  } catch (error: any) {
    console.error("Error listing users:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== POST /api/auth/set-custom-claims =====
// ตั้งค่า Custom Claims สำหรับ User (Super Admin only)
const SetCustomClaimsSchema = z.object({
  uid: z.string(),
  // รองรับทั้ง claims และ customClaims
  claims: z
    .object({
      isAdmin: z.boolean().optional(),
      isSuperAdmin: z.boolean().optional(),
      role: z.enum(["admin", "sales", "viewer"]).optional(),
      tenantId: z.string().optional(),
    })
    .optional(),
  customClaims: z
    .object({
      isAdmin: z.boolean().optional(),
      isSuperAdmin: z.boolean().optional(),
      role: z.enum(["admin", "sales", "viewer"]).optional(),
      tenantId: z.string().optional(),
    })
    .optional(),
});

authRouter.post(
  "/set-custom-claims",
  authenticateUser,
  validateBody(SetCustomClaimsSchema),
  async (req, res) => {
    try {
      const currentUser = (req as any).user;
      // รองรับทั้ง claims และ customClaims
      const { uid, claims, customClaims } = req.body;
      const claimsToSet = claims || customClaims;

      console.log("🔍 Set custom claims request:", { uid, claimsToSet });
      console.log("🔍 Current user:", currentUser);

      if (!claimsToSet) {
        return res.status(400).json({
          error: "Either claims or customClaims is required",
        });
      }

      // ตรวจสอบว่าเป็น Super Admin
      const isSuperAdmin =
        currentUser.isSuperAdmin === true || currentUser.isAdmin === true;

      if (!isSuperAdmin) {
        return res.status(403).json({
          error: "Only Super Admin can set custom claims",
          debug: {
            isAdmin: currentUser.isAdmin,
            isSuperAdmin: currentUser.isSuperAdmin,
          },
        });
      }

      // ดึงข้อมูล User ปัจจุบัน
      const targetUser = await admin.auth().getUser(uid);
      const currentClaims = targetUser.customClaims || {};

      // Merge claims ใหม่กับ claims เดิม
      const newClaims = {
        ...currentClaims,
        ...claimsToSet,
      };

      // ตั้งค่า Custom Claims
      await admin.auth().setCustomUserClaims(uid, newClaims);

      console.log(`✅ Updated claims for ${targetUser.email}:`, newClaims);

      res.json({
        success: true,
        message: "Custom claims updated successfully",
        uid: uid,
        email: targetUser.email,
        newClaims: newClaims,
      });
    } catch (error: any) {
      console.error("Error setting custom claims:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== PATCH /api/auth/update-role =====
// อัปเดต Role และ TenantId ของ User (เฉพาะ Admin)
const UpdateRoleSchema = z.object({
  uid: z.string(),
  role: z.enum(["admin", "sales", "viewer"]),
  tenantId: z.string().optional(),
});

authRouter.patch(
  "/update-role",
  authenticateUser,
  validateBody(UpdateRoleSchema),
  async (req, res) => {
    try {
      const currentUser = (req as any).user;
      const { uid, role, tenantId } = req.body;

      // Debug: ดู Custom Claims ของ current user
      console.log(
        "🔍 Current user claims:",
        JSON.stringify(currentUser.customClaims, null, 2)
      );

      // ตรวจสอบว่าเป็น Admin หรือ Super Admin
      const isAdmin = currentUser.customClaims?.role === "admin";
      const isSuperAdmin = currentUser.customClaims?.isSuperAdmin === true;
      const isAdminRole = currentUser.customClaims?.isAdmin === true;

      console.log("🔐 Permission check:", {
        isAdmin,
        isSuperAdmin,
        isAdminRole,
      });

      if (!isAdmin && !isSuperAdmin && !isAdminRole) {
        return res.status(403).json({
          error: "Only Admin can update user roles",
          debug: {
            role: currentUser.customClaims?.role,
            isAdmin: currentUser.customClaims?.isAdmin,
            isSuperAdmin: currentUser.customClaims?.isSuperAdmin,
          },
        });
      }

      // ดึงข้อมูล User ปัจจุบัน
      const targetUser = await admin.auth().getUser(uid);
      const currentClaims = targetUser.customClaims || {};

      // สร้าง Claims ใหม่
      const newClaims: any = {
        ...currentClaims,
        role: role,
      };

      // ถ้ามี tenantId ให้อัปเดตด้วย
      if (tenantId) {
        newClaims.tenantId = tenantId;
      }

      // ตั้งค่า Custom Claims
      await admin.auth().setCustomUserClaims(uid, newClaims);

      console.log(`✅ Updated role for ${targetUser.email} to ${role}`);

      res.json({
        message: "Role updated successfully",
        uid: uid,
        email: targetUser.email,
        newClaims: newClaims,
      });
    } catch (error: any) {
      console.error("Error updating role:", error);
      res.status(500).json({ error: error.message });
    }
  }
);
