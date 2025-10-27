/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from "express";
import { db } from "../index";
import {
  authenticateUser,
  requireTenant,
  requireRole,
  requireAdmin,
} from "../middleware/auth";

export const tenantsRouter = Router();

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

    const tenants = tenantsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      name: doc.data().name || doc.data().companyName || doc.id,
      description: doc.data().description || "",
      status: doc.data().status || "active",
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    }));

    // Sort in memory
    tenants.sort((a, b) => a.name.localeCompare(b.name));

    res.json(tenants);
  } catch (error: any) {
    console.error("Error fetching tenants:", error);
    res.status(500).json({ error: error.message });
  }
});
