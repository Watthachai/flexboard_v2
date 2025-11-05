/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from "express";
import { z } from "zod";
import { db } from "../index";
import {
  authenticateUser,
  requireTenant,
  validateBody,
} from "../middleware/auth";
import { testDatabaseConnection } from "../utils/database-connectors";

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
  status: z.string().optional(),
  availableTables: z.array(z.string()).optional(),
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
      // Return connection with real password for editing
      // Note: In production, consider encrypting passwords in Firestore
      // and only show them when explicitly requested by authenticated users
      const connection = { ...data.connection };

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
      const { name, type, connection, status, availableTables } = req.body;
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
        availableTables: availableTables || [],
        status: status || "untested",
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
      const { name, type, connection, status, availableTables, selectedTable } =
        req.body;
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

      // If password is all dots (unchanged), keep the existing password
      const existingData = doc.data();
      const updateConnection = { ...connection };

      // Check if password is masked (all dots or asterisks)
      if (
        updateConnection.password &&
        /^[*•]+$/.test(updateConnection.password)
      ) {
        // Keep existing password
        updateConnection.password =
          existingData?.connection?.password || updateConnection.password;
      }

      // Prepare update data
      const updateData: any = {
        name,
        type,
        connection: updateConnection,
        updatedAt: new Date(),
      };

      // Include status if provided
      if (status !== undefined) {
        updateData.status = status;
      }

      // Include availableTables if provided
      if (availableTables !== undefined) {
        updateData.availableTables = availableTables;
      }

      // Include selectedTable if provided
      if (selectedTable !== undefined) {
        updateData.selectedTable = selectedTable;
      }

      await docRef.update(updateData);

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

      console.log(
        `\n🔵 ===== Testing Connection for Tenant: ${tenantId} =====`
      );
      console.log("Type:", type);
      console.log("Connection Config:", {
        ...connection,
        password: connection.password ? "***hidden***" : undefined,
      });

      // Use real connection testing
      const result = await testDatabaseConnection(type, connection);

      console.log("Test Result:", {
        success: result.success,
        message: result.message,
        tablesCount: result.availableTables?.length || 0,
      });

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          availableTables: result.availableTables || [],
          tables: result.availableTables || [], // Alias for backward compatibility
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          error: result.error,
        });
      }
    } catch (error: any) {
      console.error("❌ Error testing connection:", error);
      res.status(500).json({
        success: false,
        message: `Internal error: ${error.message}`,
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

      const dataSource = doc.data();
      if (!dataSource) {
        return res.status(404).json({ error: "Data source not found" });
      }

      const { type, connection } = dataSource as any;

      // Get columns from database using the connector
      const { getDatabaseConnector } = await import(
        "../utils/database-connectors"
      );
      const connector = getDatabaseConnector(type, connection);
      const columns = await connector.getColumns(table);

      res.json({ columns });
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

// ===== GET /api/tenants/:tenantId/datasources/:dataSourceId/preview =====
// Preview data from a specific table
dataSourcesRouter.get(
  "/:tenantId/datasources/:dataSourceId/preview",
  async (req: any, res: any) => {
    try {
      const { tenantId, dataSourceId } = req.params;
      const { table, limit = 5 } = req.query;
      const user = req.user;

      // Verify user has access
      if (!user.isSuperAdmin && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!table) {
        return res.status(400).json({ error: "Table name is required" });
      }

      const docRef = db.doc(`tenants/${tenantId}/datasources/${dataSourceId}`);
      const doc = await docRef.get();

      if (!doc.exists) {
        return res.status(404).json({ error: "Data source not found" });
      }

      const dataSource = doc.data();
      if (!dataSource) {
        return res.status(404).json({ error: "Data source not found" });
      }

      const { type, connection } = dataSource as any;

      // Execute query based on database type
      let query = "";
      if (type === "mssql" || type === "mysql" || type === "postgresql") {
        query = `SELECT TOP ${limit} * FROM ${table}`;
        if (type === "postgresql" || type === "mysql") {
          query = `SELECT * FROM ${table} LIMIT ${limit}`;
        }
      }

      // Import database connectors
      const { executeQuery } = await import("../utils/database-connectors");

      const result = await executeQuery(type, connection, query);

      res.json({
        data: result.data,
        columns: result.columns,
        rowCount: result.rowCount,
        totalRecords: result.totalRecords || result.rowCount,
      });
    } catch (error: any) {
      console.error("Error previewing data:", error);
      res.status(500).json({ error: error.message });
    }
  }
);
