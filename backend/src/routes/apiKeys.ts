/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import admin from "firebase-admin";
import { db } from "../index.js";
import { authenticateUser } from "../middleware/auth.js";

export const apiKeysRouter = Router({ mergeParams: true });

// ===== GET /api/tenants/:tenantId/api-keys =====
// List all API keys for tenant
apiKeysRouter.get("/", authenticateUser, async (req: any, res) => {
  try {
    const { tenantId } = req.params;
    const user = req.user;

    // Check if user has access to this tenant
    if (user.tenantId !== tenantId && !user.isSuperAdmin) {
      return res.status(403).json({
        error: "You don't have access to this tenant",
      });
    }

    // Get all API keys
    const apiKeysSnapshot = await db
      .collection("tenants")
      .doc(tenantId)
      .collection("apiKeys")
      .orderBy("createdAt", "desc")
      .get();

    const apiKeys = apiKeysSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        tenantId: data.tenantId,
        isActive: data.isActive,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        createdBy: data.createdBy,
        expiresAt: data.expiresAt?.toDate?.()?.toISOString() || null,
        description: data.description,
        allowedTags: data.allowedTags || [],
        maxActivations: data.maxActivations || null,
        activationCount: data.activationCount || 0,
        lastActivatedAt:
          data.lastActivatedAt?.toDate?.()?.toISOString() || null,
      };
    });

    res.json(apiKeys);
  } catch (error: any) {
    console.error("Error listing API keys:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== POST /api/tenants/:tenantId/api-keys =====
// Create new API key
const CreateApiKeySchema = z.object({
  expiresInDays: z.number().optional(),
  description: z.string().optional(),
  allowedTags: z.array(z.string()).optional(), // Tags that this key can access
  maxActivations: z.number().optional(), // Maximum number of times this key can be activated
});

apiKeysRouter.post("/", authenticateUser, async (req: any, res) => {
  try {
    const { tenantId } = req.params;
    const user = req.user;
    const { expiresInDays, description, allowedTags, maxActivations } =
      CreateApiKeySchema.parse(req.body);

    // Check if user is admin of this tenant
    if (user.tenantId !== tenantId && !user.isSuperAdmin) {
      return res.status(403).json({
        error: "You don't have permission to create API keys",
      });
    }

    if (user.role !== "admin" && !user.isSuperAdmin) {
      return res.status(403).json({
        error: "Only admins can create API keys",
      });
    }

    // Generate API key (32 characters, URL-safe)
    const apiKey = crypto.randomBytes(24).toString("base64url");

    // Calculate expiration date
    let expiresAt = null;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Create API key document
    await db
      .collection("tenants")
      .doc(tenantId)
      .collection("apiKeys")
      .doc(apiKey)
      .set({
        tenantId,
        isActive: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: user.uid,
        expiresAt: expiresAt
          ? admin.firestore.Timestamp.fromDate(expiresAt)
          : null,
        description: description || "OnPrem Dashboard Access",
        allowedTags: allowedTags || [], // Empty array means all dashboards
        maxActivations: maxActivations || null, // null means unlimited
        activationCount: 0, // Track how many times this key has been used
        lastActivatedAt: null, // Track last usage
        activationLog: [], // Track activation history (IP, timestamp)
      });

    console.log(`✅ API Key created for tenant ${tenantId}`);

    res.json({
      success: true,
      apiKey,
      tenantId,
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      description: description || "OnPrem Dashboard Access",
    });
  } catch (error: any) {
    console.error("Error creating API key:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== PATCH /api/tenants/:tenantId/api-keys/:keyId =====
// Update API key (toggle active/inactive)
const UpdateApiKeySchema = z.object({
  isActive: z.boolean(),
});

apiKeysRouter.patch("/:keyId", authenticateUser, async (req: any, res) => {
  try {
    const { tenantId, keyId } = req.params;
    const user = req.user;
    const { isActive } = UpdateApiKeySchema.parse(req.body);

    // Check permissions
    if (user.tenantId !== tenantId && !user.isSuperAdmin) {
      return res.status(403).json({
        error: "You don't have permission to update API keys",
      });
    }

    if (user.role !== "admin" && !user.isSuperAdmin) {
      return res.status(403).json({
        error: "Only admins can update API keys",
      });
    }

    // Update API key
    await db
      .collection("tenants")
      .doc(tenantId)
      .collection("apiKeys")
      .doc(keyId)
      .update({
        isActive,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: user.uid,
      });

    console.log(
      `✅ API Key ${keyId} ${isActive ? "activated" : "deactivated"}`
    );

    res.json({
      success: true,
      message: `API Key ${isActive ? "activated" : "deactivated"} successfully`,
    });
  } catch (error: any) {
    console.error("Error updating API key:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== DELETE /api/tenants/:tenantId/api-keys/:keyId =====
// Delete API key
apiKeysRouter.delete("/:keyId", authenticateUser, async (req: any, res) => {
  try {
    const { tenantId, keyId } = req.params;
    const user = req.user;

    // Check permissions
    if (user.tenantId !== tenantId && !user.isSuperAdmin) {
      return res.status(403).json({
        error: "You don't have permission to delete API keys",
      });
    }

    if (user.role !== "admin" && !user.isSuperAdmin) {
      return res.status(403).json({
        error: "Only admins can delete API keys",
      });
    }

    // Delete API key
    await db
      .collection("tenants")
      .doc(tenantId)
      .collection("apiKeys")
      .doc(keyId)
      .delete();

    console.log(`✅ API Key ${keyId} deleted`);

    res.json({
      success: true,
      message: "API Key deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting API key:", error);
    res.status(500).json({ error: error.message });
  }
});
