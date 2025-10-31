import { Router, Request, Response } from "express";
import { z } from "zod";
import { db } from "../index";
import { authenticateUser, requireAdmin } from "../middleware/auth";

const router = Router();

/**
 * Zod schemas for validation
 */
const DashboardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  layout: z.enum(["grid", "flex", "single"]).default("grid"),
  gridColumns: z.number().int().min(1).max(12).optional(),
  widgets: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().min(1),
        type: z.string().min(1),
        size: z
          .object({
            width: z.number().int().min(1),
            height: z.number().int().min(1),
          })
          .optional(),
        config: z.record(z.any()).optional(),
      })
    )
    .optional(),
});

const ConfigSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  dashboards: z.array(DashboardSchema).optional(),
});

type DashboardConfig = z.infer<typeof ConfigSchema>;

/**
 * GET /api/tenants
 * Fetch list of all tenants
 */
router.get(
  "/",
  authenticateUser,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const tenantsSnapshot = await db.collection("tenants").get();

      const tenants = tenantsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || doc.id,
          description: data.description || "",
          createdAt: data.createdAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || null,
        };
      });

      res.json(tenants);
    } catch (error) {
      console.error("Error fetching tenants:", error);
      res.status(500).json({
        error: "Failed to fetch tenants",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * GET /api/tenants/:tenantId/config
 * Fetch configuration for a specific tenant
 */
router.get(
  "/:tenantId/config",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        return res.status(400).json({ error: "tenantId is required" });
      }

      const tenantDoc = await db.collection("tenants").doc(tenantId).get();

      if (!tenantDoc.exists) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const tenantData = tenantDoc.data();
      const config = tenantData?.config || {};

      res.json({
        tenantId,
        name: tenantData?.name || "",
        description: tenantData?.description || "",
        ...config,
      });
    } catch (error) {
      console.error("Error fetching config:", error);
      res.status(500).json({
        error: "Failed to fetch configuration",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /api/tenants/:tenantId/config
 * Create or update configuration for a tenant
 */
router.post("/:tenantId/config", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const body = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: "tenantId is required" });
    }

    // Validate config schema
    const validatedConfig = ConfigSchema.parse(body);

    // Ensure tenantId matches
    validatedConfig.tenantId = tenantId;

    // Save to Firestore
    const tenantRef = db.collection("tenants").doc(tenantId);
    await tenantRef.set(
      {
        name: validatedConfig.name,
        description: validatedConfig.description,
        config: {
          dashboards: validatedConfig.dashboards || [],
        },
        updatedAt: new Date(),
      },
      { merge: true }
    );

    res.status(201).json({
      success: true,
      message: "Configuration saved successfully",
      tenantId,
      config: validatedConfig,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid configuration format",
        details: error.errors,
      });
    }

    console.error("Error saving config:", error);
    res.status(500).json({
      error: "Failed to save configuration",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * PUT /api/tenants/:tenantId/config
 * Update specific fields of configuration
 */
router.put("/:tenantId/config", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const updates = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: "tenantId is required" });
    }

    // Partial validation - only validate fields being updated
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updates.name) {
      updateData.name = updates.name;
    }
    if (updates.description) {
      updateData.description = updates.description;
    }
    if (updates.dashboards) {
      updateData.config = {
        dashboards: updates.dashboards,
      };
    }

    const tenantRef = db.collection("tenants").doc(tenantId);
    await tenantRef.update(updateData);

    const updatedDoc = await tenantRef.get();
    const tenantData = updatedDoc.data();

    res.json({
      success: true,
      message: "Configuration updated successfully",
      tenantId,
      config: tenantData?.config,
    });
  } catch (error) {
    console.error("Error updating config:", error);
    res.status(500).json({
      error: "Failed to update configuration",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * DELETE /api/tenants/:tenantId/config
 * Delete configuration for a tenant
 */
router.delete("/:tenantId/config", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: "tenantId is required" });
    }

    const tenantRef = db.collection("tenants").doc(tenantId);

    // Check if tenant exists
    const tenantDoc = await tenantRef.get();
    if (!tenantDoc.exists) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    // Delete only the config field, keep tenant data
    await tenantRef.update({
      config: {},
      updatedAt: new Date(),
    });

    res.json({
      success: true,
      message: "Configuration deleted successfully",
      tenantId,
    });
  } catch (error) {
    console.error("Error deleting config:", error);
    res.status(500).json({
      error: "Failed to delete configuration",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/tenants/:tenantId/dashboards
 * Get all dashboards for a tenant
 */
router.get("/:tenantId/dashboards", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: "tenantId is required" });
    }

    const tenantDoc = await db.collection("tenants").doc(tenantId).get();

    if (!tenantDoc.exists) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    const dashboards = tenantDoc.data()?.config?.dashboards || [];

    res.json({
      tenantId,
      dashboards,
      count: dashboards.length,
    });
  } catch (error) {
    console.error("Error fetching dashboards:", error);
    res.status(500).json({
      error: "Failed to fetch dashboards",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/tenants/:tenantId/dashboards/:dashboardId
 * Get a specific dashboard for a tenant
 */
router.get(
  "/:tenantId/dashboards/:dashboardId",
  async (req: Request, res: Response) => {
    try {
      const { tenantId, dashboardId } = req.params;

      if (!tenantId || !dashboardId) {
        return res
          .status(400)
          .json({ error: "tenantId and dashboardId are required" });
      }

      const tenantDoc = await db.collection("tenants").doc(tenantId).get();

      if (!tenantDoc.exists) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      const dashboards = tenantDoc.data()?.config?.dashboards || [];
      const dashboard = dashboards.find((d: any) => d.id === dashboardId);

      if (!dashboard) {
        return res.status(404).json({ error: "Dashboard not found" });
      }

      res.json({
        tenantId,
        dashboard,
      });
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      res.status(500).json({
        error: "Failed to fetch dashboard",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
