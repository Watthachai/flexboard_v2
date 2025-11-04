/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from "express";
import { z } from "zod";
import { db } from "../index";
import {
  authenticateUser,
  requireTenant,
  validateBody,
} from "../middleware/auth";

export const dataSourcesRouter = Router();

// ===== Validation Schemas =====

const CreateDataSourceSchema = z.object({
  name: z.string().min(1, "Data source name is required"),
  type: z.enum([
    "mssql",
    "mysql",
    "postgresql",
    "firestore",
    "bigquery",
    "rest_api",
    "google_sheet",
  ]),
  connection: z.object({
    // SQL connections
    host: z.string().optional(),
    port: z.number().optional(),
    database: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    schema: z.string().optional(),

    // API connections
    url: z.string().optional(),
    apiKey: z.string().optional(),
    headers: z.record(z.string()).optional(),

    // Google Sheets
    spreadsheetId: z.string().optional(),
    sheetName: z.string().optional(),

    // SSL/TLS
    ssl: z.boolean().optional(),
    sslCert: z.string().optional(),
  }),
});

const TestConnectionSchema = z.object({
  type: z.enum([
    "mssql",
    "mysql",
    "postgresql",
    "firestore",
    "bigquery",
    "rest_api",
    "google_sheet",
  ]),
  connection: z.object({
    host: z.string().optional(),
    port: z.number().optional(),
    database: z.string().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    schema: z.string().optional(),
    url: z.string().optional(),
    apiKey: z.string().optional(),
    headers: z.record(z.string()).optional(),
    spreadsheetId: z.string().optional(),
    sheetName: z.string().optional(),
    ssl: z.boolean().optional(),
  }),
});

const ExecuteQuerySchema = z.object({
  query: z.string().min(1, "Query is required"),
  limit: z.number().optional(),
});

// All routes require authentication and tenant
dataSourcesRouter.use(authenticateUser);
dataSourcesRouter.use(requireTenant);

// ===== GET /api/tenants/:tenantId/datasources =====
// List all data sources for a tenant
dataSourcesRouter.get("/:tenantId/datasources", async (req: any, res: any) => {
  try {
    const { tenantId } = req.params;
    const user = req.user;

    // Verify user has access (Super Admin can access any tenant)
    if (!user.isSuperAdmin && user.tenantId !== tenantId) {
      return res
        .status(403)
        .json({ error: "Access denied to this tenant's data sources" });
    }

    const dsSnapshot = await db
      .collection(`tenants/${tenantId}/datasources`)
      .orderBy("createdAt", "desc")
      .get();

    const dataSources = dsSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      // Don't expose password in list view
      const connection = { ...data.connection };
      if (connection.password) {
        connection.password = "********";
      }
      if (connection.apiKey) {
        connection.apiKey = "********";
      }

      return {
        id: doc.id,
        name: data.name,
        type: data.type,
        connection,
        availableTables: data.availableTables || [],
        lastTested: data.lastTested?.toDate(),
        status: data.status || "untested",
        errorMessage: data.errorMessage,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      };
    });

    res.json(dataSources);
  } catch (error: any) {
    console.error("Error fetching data sources:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== GET /api/tenants/:tenantId/datasources/:dataSourceId =====
// Get specific data source
dataSourcesRouter.get(
  "/:tenantId/datasources/:dataSourceId",
  async (req: any, res: any) => {
    try {
      const { tenantId, dataSourceId } = req.params;
      const user = req.user;

      // Verify user has access (Super Admin can access any tenant)
      if (!user.isSuperAdmin && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const doc = await db
        .doc(`tenants/${tenantId}/datasources/${dataSourceId}`)
        .get();

      if (!doc.exists) {
        return res.status(404).json({ error: "Data source not found" });
      }

      const data = doc.data();
      res.json({
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate(),
        updatedAt: data?.updatedAt?.toDate(),
        lastTested: data?.lastTested?.toDate(),
      });
    } catch (error: any) {
      console.error("Error fetching data source:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== POST /api/tenants/:tenantId/datasources =====
// Create new data source
dataSourcesRouter.post(
  "/:tenantId/datasources",
  validateBody(CreateDataSourceSchema),
  async (req: any, res: any) => {
    try {
      const { tenantId } = req.params;
      const { name, type, connection } = req.body;
      const user = req.user;

      // Verify user has access (Super Admin can access any tenant)
      if (!user.isSuperAdmin && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // TODO: In production, encrypt password before storing
      const dataSourceRef = db
        .collection(`tenants/${tenantId}/datasources`)
        .doc();

      const dataSourceData = {
        name,
        type,
        connection,
        availableTables: [],
        status: "untested",
        createdAt: new Date(),
        createdBy: user.uid,
        updatedAt: new Date(),
      };

      await dataSourceRef.set(dataSourceData);

      res.status(201).json({
        id: dataSourceRef.id,
        ...dataSourceData,
      });
    } catch (error: any) {
      console.error("Error creating data source:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== PUT /api/tenants/:tenantId/datasources/:dataSourceId =====
// Update data source
dataSourcesRouter.put(
  "/:tenantId/datasources/:dataSourceId",
  validateBody(CreateDataSourceSchema),
  async (req: any, res: any) => {
    try {
      const { tenantId, dataSourceId } = req.params;
      const { name, type, connection } = req.body;
      const user = req.user;

      // Verify user has access (Super Admin can access any tenant)
      if (!user.isSuperAdmin && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const docRef = db.doc(`tenants/${tenantId}/datasources/${dataSourceId}`);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: "Data source not found" });
      }

      await docRef.update({
        name,
        type,
        connection,
        updatedAt: new Date(),
      });

      const updatedDoc = await docRef.get();
      res.json({
        id: updatedDoc.id,
        ...updatedDoc.data(),
      });
    } catch (error: any) {
      console.error("Error updating data source:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== DELETE /api/tenants/:tenantId/datasources/:dataSourceId =====
// Delete data source
dataSourcesRouter.delete(
  "/:tenantId/datasources/:dataSourceId",
  async (req: any, res: any) => {
    try {
      const { tenantId, dataSourceId } = req.params;
      const user = req.user;

      // Verify user has access (Super Admin can access any tenant)
      if (!user.isSuperAdmin && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check if any dashboards are using this data source
      const dashboardsSnapshot = await db
        .collection(`tenants/${tenantId}/dashboards`)
        .where("dataSourceId", "==", dataSourceId)
        .get();

      if (!dashboardsSnapshot.empty) {
        return res.status(400).json({
          error: "Cannot delete data source that is being used by dashboards",
          dashboardCount: dashboardsSnapshot.size,
        });
      }

      const docRef = db.doc(`tenants/${tenantId}/datasources/${dataSourceId}`);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: "Data source not found" });
      }

      await docRef.delete();

      res.json({ message: "Data source deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting data source:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== POST /api/tenants/:tenantId/datasources/test =====
// Test connection (without saving)
dataSourcesRouter.post(
  "/:tenantId/datasources/test",
  validateBody(TestConnectionSchema),
  async (req: any, res: any) => {
    try {
      const { tenantId } = req.params;
      const { type, connection } = req.body;
      const user = req.user;

      // Verify user has access (Super Admin can access any tenant)
      if (!user.isSuperAdmin && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // TODO: Implement actual connection testing for each database type
      // For now, return mock success
      console.log(
        `Testing ${type} connection for tenant ${tenantId}:`,
        connection
      );

      // Mock implementation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock response based on type
      let mockTables: string[] = [];
      if (type === "mssql" || type === "mysql" || type === "postgresql") {
        mockTables = ["users", "products", "orders", "categories"];
      } else if (type === "firestore") {
        mockTables = ["users", "dashboards", "reports"];
      }

      res.json({
        success: true,
        message: "Connection successful",
        availableTables: mockTables,
      });
    } catch (error: any) {
      console.error("Error testing connection:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ===== GET /api/tenants/:tenantId/datasources/:dataSourceId/tables =====
// Get list of tables from data source
dataSourcesRouter.get(
  "/:tenantId/datasources/:dataSourceId/tables",
  async (req: any, res: any) => {
    try {
      const { tenantId, dataSourceId } = req.params;
      const user = req.user;

      // Verify user has access (Super Admin can access any tenant)
      if (!user.isSuperAdmin && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const doc = await db
        .doc(`tenants/${tenantId}/datasources/${dataSourceId}`)
        .get();

      if (!doc.exists) {
        return res.status(404).json({ error: "Data source not found" });
      }

      const data = doc.data();

      // TODO: Implement actual table fetching
      // For now, return cached tables
      const tables =
        data?.availableTables?.map((name: string) => ({
          name,
          schema: data.connection?.schema || "dbo",
          rowCount: null,
        })) || [];

      res.json({ tables });
    } catch (error: any) {
      console.error("Error fetching tables:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== POST /api/tenants/:tenantId/datasources/:dataSourceId/columns =====
// Get columns for a specific table
dataSourcesRouter.post(
  "/:tenantId/datasources/:dataSourceId/columns",
  async (req: any, res: any) => {
    try {
      const { tenantId, dataSourceId } = req.params;
      const { table } = req.body;
      const user = req.user;

      // Verify user has access (Super Admin can access any tenant)
      if (!user.isSuperAdmin && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!table) {
        return res.status(400).json({ error: "Table name is required" });
      }

      const doc = await db
        .doc(`tenants/${tenantId}/datasources/${dataSourceId}`)
        .get();

      if (!doc.exists) {
        return res.status(404).json({ error: "Data source not found" });
      }

      // TODO: Implement actual column fetching from database
      // For now, return mock columns
      const mockColumns = [
        { name: "id", type: "int", nullable: false },
        { name: "name", type: "varchar", nullable: false },
        { name: "created_at", type: "datetime", nullable: true },
        { name: "updated_at", type: "datetime", nullable: true },
      ];

      res.json({ columns: mockColumns });
    } catch (error: any) {
      console.error("Error fetching columns:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== POST /api/tenants/:tenantId/datasources/:dataSourceId/query =====
// Execute query on data source
dataSourcesRouter.post(
  "/:tenantId/datasources/:dataSourceId/query",
  validateBody(ExecuteQuerySchema),
  async (req: any, res: any) => {
    try {
      const { tenantId, dataSourceId } = req.params;
      const { query, limit } = req.body;
      const user = req.user;

      // Verify user has access (Super Admin can access any tenant)
      if (!user.isSuperAdmin && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const doc = await db
        .doc(`tenants/${tenantId}/datasources/${dataSourceId}`)
        .get();

      if (!doc.exists) {
        return res.status(404).json({ error: "Data source not found" });
      }

      // TODO: Implement actual query execution
      // For now, return mock data
      console.log(`Executing query on ${dataSourceId}:`, query);

      const mockData = [
        { id: 1, name: "Product A", quantity: 100, price: 1500 },
        { id: 2, name: "Product B", quantity: 50, price: 2500 },
        { id: 3, name: "Product C", quantity: 75, price: 1800 },
      ];

      res.json({
        data: mockData.slice(0, limit || 100),
        columns: ["id", "name", "quantity", "price"],
        rowCount: mockData.length,
        executionTime: 125, // ms
      });
    } catch (error: any) {
      console.error("Error executing query:", error);
      res.status(500).json({ error: error.message });
    }
  }
);
