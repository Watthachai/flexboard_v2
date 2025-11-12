import express from "express";
import { z } from "zod";
import { db } from "../index.js";
import { authenticateUser, requireAdmin } from "../middleware/auth.js";
import admin from "firebase-admin";

const router = express.Router();

// ===== Helper Functions =====
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ไม่มี O, I, 0, 1 เพื่อป้องกันสับสน
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function isCodeUnique(code: string): Promise<boolean> {
  const doc = await db.collection("globalInviteCodes").doc(code).get();
  return !doc.exists;
}

async function generateUniqueCode(): Promise<string> {
  let code = generateInviteCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (!(await isCodeUnique(code)) && attempts < maxAttempts) {
    code = generateInviteCode();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    throw new Error("Failed to generate unique invite code");
  }

  return code;
}

// ===== Validation Schemas =====
const CreateInviteCodeSchema = z.object({
  tenantId: z.string().min(1),
  tenantName: z.string().min(1),
  role: z.enum(["admin", "sales", "viewer"]),
  maxUses: z.number().int().min(1).optional(),
  expiresAt: z.string().optional(), // ISO date string
  allowedDomains: z.array(z.string()).optional(), // เช่น ["xxx.co.th", "yyy.com"]
  description: z.string().optional(),
});

const UpdateInviteCodeSchema = z.object({
  isActive: z.boolean().optional(),
  maxUses: z.number().int().min(1).optional(),
  description: z.string().optional(),
  allowedDomains: z.array(z.string()).optional(),
});

// ===== Routes =====

/**
 * GET /api/invite-codes
 * ดึงรายการ invite codes ทั้งหมด (Super Admin เห็นทุก tenant, Tenant Admin เห็นแค่ของตัวเอง)
 */
router.get("/", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const isSuperAdmin = user.isSuperAdmin === true || user.isAdmin === true;

    let query = db.collection("globalInviteCodes").orderBy("createdAt", "desc");

    // ถ้าไม่ใช่ Super Admin ให้ filter เฉพาะ tenant ของตัวเอง
    if (!isSuperAdmin && user.tenantId) {
      query = query.where("tenantId", "==", user.tenantId) as any;
    }

    const snapshot = await query.get();

    const inviteCodes = snapshot.docs.map(
      (doc: admin.firestore.QueryDocumentSnapshot) => ({
        code: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        expiresAt: doc.data().expiresAt?.toDate(),
      })
    );

    res.json(inviteCodes);
  } catch (error: any) {
    console.error("Error fetching invite codes:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/invite-codes/:code
 * ดึงข้อมูล invite code เฉพาะ
 */
router.get("/:code", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { code } = req.params;
    const user = (req as any).user;
    const isSuperAdmin = user.isSuperAdmin === true || user.isAdmin === true;

    const doc = await db.collection("globalInviteCodes").doc(code).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Invite code not found" });
    }

    const data = doc.data();

    // Super Admin เห็นทุก code, Tenant Admin เห็นแค่ของตัวเอง
    if (!isSuperAdmin && data?.tenantId !== user.tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({
      code: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate(),
      expiresAt: data?.expiresAt?.toDate(),
    });
  } catch (error: any) {
    console.error("Error fetching invite code:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/invite-codes
 * สร้าง invite code ใหม่ (Super Admin สามารถสร้างให้ tenant ใดก็ได้)
 * ถ้า tenant ยังไม่มีใน database จะสร้างให้อัตโนมัติ
 */
router.post("/", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const user = (req as any).user;
    const validated = CreateInviteCodeSchema.parse(req.body);

    // ตรวจสอบว่า tenant มีอยู่แล้วหรือยัง ถ้ายังไม่มีให้สร้างใหม่
    const tenantRef = db.doc(`tenants/${validated.tenantId}`);
    const tenantDoc = await tenantRef.get();

    if (!tenantDoc.exists) {
      // สร้าง tenant document ใหม่
      await tenantRef.set({
        name: validated.tenantName,
        description: "",
        status: "active",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: user.uid,
      });
    }

    // Generate unique code
    const code = await generateUniqueCode();

    // คำนวณ expiresAt
    let expiresAt = null;
    if (validated.expiresAt) {
      expiresAt = admin.firestore.Timestamp.fromDate(
        new Date(validated.expiresAt)
      );
    }

    const inviteCodeData = {
      tenantId: validated.tenantId,
      tenantName: validated.tenantName,
      role: validated.role,
      isActive: true,
      maxUses: validated.maxUses || null,
      usedCount: 0,
      createdBy: user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
      allowedDomains: validated.allowedDomains || null,
      description: validated.description || null,
    };

    await db.collection("globalInviteCodes").doc(code).set(inviteCodeData);

    res.status(201).json({
      code,
      ...inviteCodeData,
      createdAt: new Date(),
      expiresAt: expiresAt?.toDate(),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
    }
    console.error("Error creating invite code:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/invite-codes/:code
 * อัปเดต invite code
 */
router.put("/:code", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { code } = req.params;
    const user = (req as any).user;
    const isSuperAdmin = user.isSuperAdmin === true || user.isAdmin === true;

    const validated = UpdateInviteCodeSchema.parse(req.body);

    const docRef = db.collection("globalInviteCodes").doc(code);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Invite code not found" });
    }

    const data = doc.data();

    // Super Admin แก้ได้ทุก code, Tenant Admin แก้ได้แค่ของตัวเอง
    if (!isSuperAdmin && data?.tenantId !== user.tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    await docRef.update({
      ...validated,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updated = await docRef.get();
    const updatedData = updated.data();

    res.json({
      code: updated.id,
      ...updatedData,
      createdAt: updatedData?.createdAt?.toDate(),
      expiresAt: updatedData?.expiresAt?.toDate(),
      updatedAt: updatedData?.updatedAt?.toDate(),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
    }
    console.error("Error updating invite code:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/invite-codes/:code
 * ลบ invite code
 */
router.delete("/:code", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { code } = req.params;
    const user = (req as any).user;
    const isSuperAdmin = user.isSuperAdmin === true || user.isAdmin === true;

    const docRef = db.collection("globalInviteCodes").doc(code);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Invite code not found" });
    }

    const data = doc.data();

    // Super Admin ลบได้ทุก code, Tenant Admin ลบได้แค่ของตัวเอง
    if (!isSuperAdmin && data?.tenantId !== user.tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    await docRef.delete();

    res.json({ message: "Invite code deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting invite code:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/invite-codes/:code/revoke
 * Revoke (ยกเลิก) invite code โดยไม่ลบ
 */
router.post(
  "/:code/revoke",
  authenticateUser,
  requireAdmin,
  async (req, res) => {
    try {
      const { code } = req.params;
      const user = (req as any).user;
      const isSuperAdmin = user.isSuperAdmin === true || user.isAdmin === true;

      const docRef = db.collection("globalInviteCodes").doc(code);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: "Invite code not found" });
      }

      const data = doc.data();

      // Super Admin revoke ได้ทุก code, Tenant Admin revoke ได้แค่ของตัวเอง
      if (!isSuperAdmin && data?.tenantId !== user.tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      await docRef.update({
        isActive: false,
        revokedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({ message: "Invite code revoked successfully" });
    } catch (error: any) {
      console.error("Error revoking invite code:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
