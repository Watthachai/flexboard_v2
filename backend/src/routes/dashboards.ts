/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from "express";
import { z } from "zod";
import { db } from "../index.js";
import {
  authenticateUser,
  requireTenant,
  validateBody,
} from "../middleware/auth.js";

export const dashboardsRouter = Router();

// ===== Validation Schemas =====

const CreateDashboardSchema = z.object({
  name: z.string().min(1, "Dashboard name is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  dataSourceId: z.string().optional(), // Made optional - can be set later
  config: z.object({
    layout: z.enum(["grid", "single-page", "custom"]),
    theme: z.enum(["light", "dark", "auto"]),
    gridCols: z.number().optional(),
    gridRowHeight: z.number().optional(),
    widgets: z.array(z.any()),
    autoRefresh: z.boolean().optional(),
    refreshInterval: z.number().optional(),
    globalFilters: z.array(z.any()).optional(),
  }),
});

const UpdateDashboardSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  visibility: z.enum(["private", "public", "org"]).optional(),
  dataSourceId: z.string().optional(), // Allow updating data source
  selectedTable: z.string().optional(), // Allow updating selected table
  currentVersion: z.string().optional(), // Allow updating current version
});

const CreateVersionSchema = z.object({
  config: z.object({
    layout: z.enum(["grid", "single-page", "custom"]),
    theme: z.enum(["light", "dark", "auto"]),
    widgets: z.array(z.any()),
    gridCols: z.number().optional(),
    gridRowHeight: z.number().optional(),
    autoRefresh: z.boolean().optional(),
    refreshInterval: z.number().optional(),
    globalFilters: z.array(z.any()).optional(),
  }),
  changeLog: z.string().optional(),
});

// All routes require authentication and tenant
dashboardsRouter.use(authenticateUser);
dashboardsRouter.use(requireTenant);

// ===== GET /api/tenants/:tenantId/dashboards =====
// List all dashboards for a tenant
dashboardsRouter.get("/:tenantId/dashboards", async (req: any, res: any) => {
  try {
    const { tenantId } = req.params;
    const user = req.user;

    // Verify user has access to this tenant (Super Admin can access any tenant)
    if (!user.isSuperAdmin && user.tenantId !== tenantId) {
      return res
        .status(403)
        .json({ error: "Access denied to this tenant's dashboards" });
    }

    const dashboardsSnapshot = await db
      .collection(`tenants/${tenantId}/dashboards`)
      .orderBy("createdAt", "desc")
      .get();

    const dashboards = await Promise.all(
      dashboardsSnapshot.docs.map(async (doc: any) => {
        const data = doc.data();

        // Get data source info if exists
        let dataSource = null;
        if (data.dataSourceId) {
          try {
            const dsDoc = await db
              .doc(`tenants/${tenantId}/datasources/${data.dataSourceId}`)
              .get();
            if (dsDoc.exists) {
              dataSource = { id: dsDoc.id, ...dsDoc.data() };
            }
          } catch (err) {
            console.error("Error fetching data source:", err);
          }
        }

        return {
          id: doc.id,
          tenantId,
          name: data.name,
          description: data.description || "",
          category: data.category || "",
          tags: data.tags || [],
          currentVersion: data.currentVersion || "1.0.0",
          dataSourceId: data.dataSourceId,
          dataSource,
          status: data.status || "draft",
          visibility: data.visibility || "private",
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          updatedAt: data.updatedAt?.toDate() || new Date(),
          updatedBy: data.updatedBy,
        };
      })
    );

    res.json(dashboards);
  } catch (error: any) {
    console.error("Error fetching dashboards:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== GET /api/tenants/:tenantId/dashboards-tags =====
// Get all unique tags from dashboards in a tenant
dashboardsRouter.get(
  "/:tenantId/dashboards-tags",
  async (req: any, res: any) => {
    try {
      const { tenantId } = req.params;
      const user = req.user;

      // Verify user has access to this tenant
      if (!user.isSuperAdmin && user.tenantId !== tenantId) {
        return res
          .status(403)
          .json({ error: "Access denied to this tenant's dashboards" });
      }

      const dashboardsSnapshot = await db
        .collection(`tenants/${tenantId}/dashboards`)
        .get();

      // Collect all unique tags
      const tagsSet = new Set<string>();
      dashboardsSnapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        if (data.tags && Array.isArray(data.tags)) {
          data.tags.forEach((tag: string) => {
            if (tag && tag.trim()) {
              tagsSet.add(tag.trim());
            }
          });
        }
      });

      // Convert to sorted array
      const tags = Array.from(tagsSet).sort();

      res.json({ tags });
    } catch (error: any) {
      console.error("Error fetching dashboard tags:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== GET /api/tenants/:tenantId/dashboards/:dashboardId =====
// Get specific dashboard
dashboardsRouter.get(
  "/:tenantId/dashboards/:dashboardId",
  async (req: any, res: any) => {
    try {
      const { tenantId, dashboardId } = req.params;
      const user = req.user;

      // Verify user has access (Super Admin can access any tenant)
      if (!user.isSuperAdmin && user.tenantId !== tenantId) {
        return res
          .status(403)
          .json({ error: "Access denied to this dashboard" });
      }

      const doc = await db
        .doc(`tenants/${tenantId}/dashboards/${dashboardId}`)
        .get();

      if (!doc.exists) {
        return res.status(404).json({ error: "Dashboard not found" });
      }

      const data = doc.data();

      // Get current version config
      let currentVersionConfig = null;
      if (data?.currentVersion) {
        const versionDoc = await db
          .doc(
            `tenants/${tenantId}/dashboards/${dashboardId}/versions/${data.currentVersion}`
          )
          .get();
        if (versionDoc.exists) {
          currentVersionConfig = versionDoc.data()?.config;
        }
      }

      // Get data source
      let dataSource = null;
      if (data?.dataSourceId) {
        const dsDoc = await db
          .doc(`tenants/${tenantId}/datasources/${data.dataSourceId}`)
          .get();
        if (dsDoc.exists) {
          dataSource = { id: dsDoc.id, ...dsDoc.data() };
        }
      }

      res.json({
        id: doc.id,
        tenantId,
        ...data,
        dataSource,
        config: currentVersionConfig,
        createdAt: data?.createdAt?.toDate(),
        updatedAt: data?.updatedAt?.toDate(),
      });
    } catch (error: any) {
      console.error("Error fetching dashboard:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== POST /api/tenants/:tenantId/dashboards =====
// Create new dashboard
dashboardsRouter.post(
  "/:tenantId/dashboards",
  validateBody(CreateDashboardSchema),
  async (req: any, res: any) => {
    try {
      const { tenantId } = req.params;
      const { name, description, category, tags, dataSourceId, config } =
        req.body;
      const user = req.user;

      // Verify user has access (Super Admin can access any tenant)
      if (!user.isSuperAdmin && user.tenantId !== tenantId) {
        return res
          .status(403)
          .json({ error: "Access denied to create dashboard in this tenant" });
      }

      // Verify data source exists (if provided)
      if (dataSourceId) {
        const dsDoc = await db
          .doc(`tenants/${tenantId}/datasources/${dataSourceId}`)
          .get();
        if (!dsDoc.exists) {
          return res.status(404).json({ error: "Data source not found" });
        }
      }

      // Create dashboard
      const dashboardRef = db
        .collection(`tenants/${tenantId}/dashboards`)
        .doc();
      const dashboardId = dashboardRef.id;

      const dashboardData: any = {
        name,
        description: description || "",
        category: category || "",
        tags: tags || [],
        currentVersion: "1.0.0",
        status: "draft",
        visibility: "private",
        createdAt: new Date(),
        createdBy: user.uid,
        updatedAt: new Date(),
        updatedBy: user.uid,
      };

      // Only add dataSourceId if it's provided (Firestore doesn't accept undefined)
      if (dataSourceId) {
        dashboardData.dataSourceId = dataSourceId;
      }

      await dashboardRef.set(dashboardData);

      // Create initial version
      const versionRef = db.doc(
        `tenants/${tenantId}/dashboards/${dashboardId}/versions/1.0.0`
      );

      await versionRef.set({
        dashboardId,
        versionNumber: "1.0.0",
        config,
        changeLog: "Initial version",
        isActive: true,
        publishedAt: new Date(),
        publishedBy: user.uid,
      });

      res.status(201).json({
        id: dashboardId,
        tenantId,
        ...dashboardData,
        config,
      });
    } catch (error: any) {
      console.error("Error creating dashboard:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== PUT /api/tenants/:tenantId/dashboards/:dashboardId =====
// Update dashboard metadata
dashboardsRouter.put(
  "/:tenantId/dashboards/:dashboardId",
  validateBody(UpdateDashboardSchema),
  async (req: any, res: any) => {
    try {
      const { tenantId, dashboardId } = req.params;
      const updates = req.body;
      const user = req.user;

      // Verify user has access (Super Admin can access any tenant)
      if (!user.isSuperAdmin && user.tenantId !== tenantId) {
        return res
          .status(403)
          .json({ error: "Access denied to update this dashboard" });
      }

      const docRef = db.doc(`tenants/${tenantId}/dashboards/${dashboardId}`);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: "Dashboard not found" });
      }

      await docRef.update({
        ...updates,
        updatedAt: new Date(),
        updatedBy: user.uid,
      });

      const updatedDoc = await docRef.get();
      res.json({
        id: updatedDoc.id,
        tenantId,
        ...updatedDoc.data(),
      });
    } catch (error: any) {
      console.error("Error updating dashboard:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== DELETE /api/tenants/:tenantId/dashboards/:dashboardId =====
// Delete dashboard
dashboardsRouter.delete(
  "/:tenantId/dashboards/:dashboardId",
  async (req: any, res: any) => {
    try {
      const { tenantId, dashboardId } = req.params;
      const user = req.user;

      // Verify user has access (Super Admin can access any tenant)
      if (!user.isSuperAdmin && user.tenantId !== tenantId) {
        return res
          .status(403)
          .json({ error: "Access denied to delete this dashboard" });
      }

      const docRef = db.doc(`tenants/${tenantId}/dashboards/${dashboardId}`);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: "Dashboard not found" });
      }

      // Delete all versions
      const versionsSnapshot = await db
        .collection(`tenants/${tenantId}/dashboards/${dashboardId}/versions`)
        .get();

      const batch = db.batch();
      versionsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      batch.delete(docRef);

      await batch.commit();

      res.json({ message: "Dashboard deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting dashboard:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== GET /api/tenants/:tenantId/dashboards/:dashboardId/versions =====
// List all versions of a dashboard
dashboardsRouter.get(
  "/:tenantId/dashboards/:dashboardId/versions",
  async (req: any, res: any) => {
    try {
      const { tenantId, dashboardId } = req.params;
      const user = req.user;

      // Verify user has access (Super Admin can access any tenant)
      if (!user.isSuperAdmin && user.tenantId !== tenantId) {
        return res
          .status(403)
          .json({ error: "Access denied to this dashboard" });
      }

      const versionsSnapshot = await db
        .collection(`tenants/${tenantId}/dashboards/${dashboardId}/versions`)
        .orderBy("publishedAt", "desc")
        .get();

      const versions = versionsSnapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          dashboardId,
          versionNumber: data.versionNumber,
          changeLog: data.changeLog || "",
          isActive: data.isActive || false,
          publishedAt: data.publishedAt?.toDate() || new Date(),
          publishedBy: data.publishedBy,
          // Don't include full config in list view
        };
      });

      res.json(versions);
    } catch (error: any) {
      console.error("Error fetching versions:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== GET /api/tenants/:tenantId/dashboards/:dashboardId/versions/:versionId =====
// Get specific version
dashboardsRouter.get(
  "/:tenantId/dashboards/:dashboardId/versions/:versionId",
  async (req: any, res: any) => {
    try {
      const { tenantId, dashboardId, versionId } = req.params;
      const user = req.user;

      // Verify user has access (Super Admin can access any tenant)
      if (!user.isSuperAdmin && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const doc = await db
        .doc(
          `tenants/${tenantId}/dashboards/${dashboardId}/versions/${versionId}`
        )
        .get();

      if (!doc.exists) {
        return res.status(404).json({ error: "Version not found" });
      }

      const data = doc.data();
      res.json({
        id: doc.id,
        dashboardId,
        ...data,
        publishedAt: data?.publishedAt?.toDate(),
      });
    } catch (error: any) {
      console.error("Error fetching version:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== POST /api/tenants/:tenantId/dashboards/:dashboardId/versions =====
// Create new version
dashboardsRouter.post(
  "/:tenantId/dashboards/:dashboardId/versions",
  validateBody(CreateVersionSchema),
  async (req: any, res: any) => {
    try {
      const { tenantId, dashboardId } = req.params;
      const { config, changeLog } = req.body;
      const user = req.user;

      // Verify user has access (Super Admin can access any tenant)
      if (!user.isSuperAdmin && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get dashboard
      const dashboardDoc = await db
        .doc(`tenants/${tenantId}/dashboards/${dashboardId}`)
        .get();

      if (!dashboardDoc.exists) {
        return res.status(404).json({ error: "Dashboard not found" });
      }

      const dashboardData = dashboardDoc.data();
      const currentVersion = dashboardData?.currentVersion || "1.0.0";

      // Calculate new version number (simple increment)
      const versionParts = currentVersion.split(".");
      versionParts[2] = String(Number(versionParts[2]) + 1);
      const newVersion = versionParts.join(".");

      // NOTE: Do NOT deactivate current version
      // Let "Publish Dashboard" button handle activation

      // Create new version (NOT active by default)
      const newVersionRef = db.doc(
        `tenants/${tenantId}/dashboards/${dashboardId}/versions/${newVersion}`
      );

      const versionData = {
        dashboardId,
        versionNumber: newVersion,
        config,
        changeLog: changeLog || `Version ${newVersion}`,
        isActive: false, // New versions are NOT active by default
        publishedAt: new Date(),
        publishedBy: user.uid,
      };

      await newVersionRef.set(versionData);

      // Update dashboard's current version (but keep existing active version)
      await dashboardDoc.ref.update({
        currentVersion: newVersion,
        updatedAt: new Date(),
        updatedBy: user.uid,
      });

      res.status(201).json({
        id: newVersion,
        ...versionData,
      });
    } catch (error: any) {
      console.error("Error creating version:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== PUT /api/tenants/:tenantId/dashboards/:dashboardId/versions/:versionId =====
// Update an existing version's config
dashboardsRouter.put(
  "/:tenantId/dashboards/:dashboardId/versions/:versionId",
  async (req: any, res: any) => {
    try {
      const { tenantId, dashboardId, versionId } = req.params;
      const { config, changeLog } = req.body;
      const user = req.user;

      // Verify user has access (Super Admin can access any tenant)
      if (!user.isSuperAdmin && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Verify dashboard exists
      const dashboardDoc = await db
        .doc(`tenants/${tenantId}/dashboards/${dashboardId}`)
        .get();

      if (!dashboardDoc.exists) {
        return res.status(404).json({ error: "Dashboard not found" });
      }

      // Verify version exists
      const versionRef = db.doc(
        `tenants/${tenantId}/dashboards/${dashboardId}/versions/${versionId}`
      );
      const versionDoc = await versionRef.get();

      if (!versionDoc.exists) {
        return res.status(404).json({ error: "Version not found" });
      }

      // Update version
      await versionRef.update({
        config,
        changeLog: changeLog || `Updated v${versionId}`,
        updatedAt: new Date(),
        updatedBy: user.uid,
      });

      // Return updated version
      const updatedVersion = await versionRef.get();
      res.json({
        id: updatedVersion.id,
        ...updatedVersion.data(),
      });
    } catch (error: any) {
      console.error("Error updating version:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== PUT /api/tenants/:tenantId/dashboards/:dashboardId/versions/:versionId/activate =====
// Activate a specific version
dashboardsRouter.put(
  "/:tenantId/dashboards/:dashboardId/versions/:versionId/activate",
  async (req: any, res: any) => {
    try {
      const { tenantId, dashboardId, versionId } = req.params;
      const user = req.user;

      // Verify user has access (Super Admin can access any tenant)
      if (!user.isSuperAdmin && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Verify version exists
      const versionDoc = await db
        .doc(
          `tenants/${tenantId}/dashboards/${dashboardId}/versions/${versionId}`
        )
        .get();

      if (!versionDoc.exists) {
        return res.status(404).json({ error: "Version not found" });
      }

      // Deactivate all versions
      const versionsSnapshot = await db
        .collection(`tenants/${tenantId}/dashboards/${dashboardId}/versions`)
        .get();

      const batch = db.batch();
      versionsSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { isActive: false });
      });

      // Activate target version
      batch.update(versionDoc.ref, { isActive: true });

      // Update dashboard's current version
      const dashboardRef = db.doc(
        `tenants/${tenantId}/dashboards/${dashboardId}`
      );
      batch.update(dashboardRef, {
        currentVersion: versionId,
        updatedAt: new Date(),
        updatedBy: user.uid,
      });

      await batch.commit();

      res.json({ message: "Version activated successfully" });
    } catch (error: any) {
      console.error("Error activating version:", error);
      res.status(500).json({ error: error.message });
    }
  }
);
