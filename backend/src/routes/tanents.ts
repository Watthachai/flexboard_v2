/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from "express";
import { z } from "zod";
import { db } from "../index";
import {
  authenticateUser,
  requireTenant,
  requireRole,
  requireAdmin,
  validateBody,
} from "../middleware/auth";

export const tenantsRouter = Router();

// Validation schemas
const CreateTenantSchema = z.object({
  name: z.string().min(1, "Tenant name is required"),
  description: z.string().optional(),
});

const UpdateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

// All routes require authentication
tenantsRouter.use(authenticateUser);

// ===== GET /api/tenants/my-tenant =====
tenantsRouter.get("/my-tenant", requireTenant, async (req: any, res: any) => {
  try {
    const user = req.user;
    const { tenantId } = user;

    const doc = await db.doc(`tenants/${tenantId}`).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    res.json({ tenant: { id: doc.id, ...doc.data() } });
  } catch (error: any) {
    console.error("Error fetching tenant:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== GET /api/tenants =====
// List all tenants (Super Admin only)
tenantsRouter.get("/", requireAdmin, async (req: any, res: any) => {
  try {
    const tenantsSnapshot = await db.collection("tenants").get();

    const tenants = tenantsSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || data.companyName || doc.id,
        description: data.description || "",
        status: data.status || "active",
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    });

    tenants.sort((a, b) => a.name.localeCompare(b.name));

    res.json(tenants);
  } catch (error: any) {
    console.error("Error fetching tenants:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== POST /api/tenants =====
// Create new tenant (Super Admin only)
tenantsRouter.post(
  "/",
  requireAdmin,
  validateBody(CreateTenantSchema),
  async (req: any, res: any) => {
    try {
      const { name, description } = req.body;
      const user = req.user;

      const tenantId = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

      const existingDoc = await db.doc(`tenants/${tenantId}`).get();
      if (existingDoc.exists) {
        return res.status(409).json({
          error: "Tenant already exists",
          message: `A tenant with ID "${tenantId}" already exists`,
        });
      }

      const tenantData = {
        name,
        description: description || "",
        status: "active",
        createdAt: new Date(),
        createdBy: user.uid,
      };

      await db.doc(`tenants/${tenantId}`).set(tenantData);

      res.status(201).json({
        id: tenantId,
        ...tenantData,
      });
    } catch (error: any) {
      console.error("❌ Error creating tenant:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== PUT /api/tenants/:id =====
// Update tenant (Super Admin only)
tenantsRouter.put(
  "/:id",
  requireAdmin,
  validateBody(UpdateTenantSchema),
  async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const docRef = db.doc(`tenants/${id}`);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      await docRef.update({
        ...updates,
        updatedAt: new Date(),
      });

      const updatedDoc = await docRef.get();

      res.json({
        id: updatedDoc.id,
        ...updatedDoc.data(),
      });
    } catch (error: any) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

tenantsRouter.delete("/:id", requireAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const docRef = db.doc(`tenants/${id}`);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    await docRef.delete();

    res.json({ message: "Tenant deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting tenant:", error);
    res.status(500).json({ error: error.message });
  }
});
