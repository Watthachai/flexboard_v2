/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from "express";
import { z } from "zod";
import { db } from "../index.js";
import {
  authenticateUser,
  requireTenant,
  validateBody,
} from "../middleware/auth.js";

export const mockDataRouter = Router();

// All routes require authentication and tenant
mockDataRouter.use(authenticateUser);
mockDataRouter.use(requireTenant);

// ===== Validation Schemas =====

const ImportMockDataSchema = z.object({
  format: z.enum(["json", "sql"]),
  data: z.string(), // JSON string or SQL statements
  tableName: z.string().optional(),
  description: z.string().optional(),
});

const QueryMockDataSchema = z.object({
  query: z.string(),
  mockDataId: z.string().optional(),
});

// ===== Helper Functions =====

/**
 * Parse SQL INSERT statements and extract data
 */
function parseSQLInserts(sql: string): {
  tableName: string;
  columns: string[];
  data: any[];
} {
  // Extract table name from CREATE TABLE or INSERT INTO
  const createTableMatch = sql.match(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i
  );
  const insertMatch = sql.match(/INSERT\s+INTO\s+`?(\w+)`?/i);
  const tableName =
    createTableMatch?.[1] || insertMatch?.[1] || "unknown_table";

  // Extract column names
  const columnsMatch = sql.match(/\(([^)]+)\)\s+VALUES/i);
  let columns: string[] = [];
  if (columnsMatch) {
    columns = columnsMatch[1]
      .split(",")
      .map((col) => col.trim().replace(/`/g, ""));
  }

  // Extract all values from VALUES clause
  // Match everything after VALUES keyword
  const valuesSection = sql.match(/VALUES\s+([\s\S]+)/i);
  if (!valuesSection) {
    return { tableName, columns, data: [] };
  }

  const data: any[] = [];

  // Split by "),(" to handle multi-row inserts
  // First, clean up the values section
  let valuesStr = valuesSection[1].trim();

  // Remove trailing semicolon if exists
  valuesStr = valuesStr.replace(/;?\s*$/, "");

  // Match all value groups (including nested parentheses)
  // This regex captures content between outer parentheses
  const valueGroupRegex = /\(([^()]*(?:\([^)]*\)[^()]*)*)\)/g;
  let match;

  while ((match = valueGroupRegex.exec(valuesStr)) !== null) {
    const values = match[1];
    const row: any = {};

    // Parse values (handles strings, numbers, NULL)
    const valueMatches = values.match(
      /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|-?\d+\.?\d*|NULL)/gi
    );

    if (valueMatches && columns.length > 0) {
      valueMatches.forEach((val, idx) => {
        if (idx < columns.length) {
          let parsedValue: any = val.trim();

          if (parsedValue.toUpperCase() === "NULL") {
            parsedValue = null;
          } else if (
            parsedValue.startsWith("'") ||
            parsedValue.startsWith('"')
          ) {
            parsedValue = parsedValue.slice(1, -1); // Remove quotes
          } else if (!isNaN(Number(parsedValue))) {
            parsedValue = Number(parsedValue);
          }

          row[columns[idx]] = parsedValue;
        }
      });

      // Only add row if it has data
      if (Object.keys(row).length > 0) {
        data.push(row);
      }
    }
  }

  console.log(`📊 Parsed SQL: ${data.length} rows from table "${tableName}"`);
  return { tableName, columns, data };
}

/**
 * Simple SQL query executor for mock data
 */
function executeMockQuery(data: any[], query: string): any[] {
  const upperQuery = query.toUpperCase();

  // SELECT * FROM table
  if (upperQuery.includes("SELECT") && upperQuery.includes("FROM")) {
    let result = [...data];

    // Handle WHERE clause (very basic)
    const whereMatch = query.match(/WHERE\s+(.+?)(?:ORDER BY|LIMIT|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1].trim();

      // Simple equality check: column = 'value' or column = value
      const conditionMatch = whereClause.match(/(\w+)\s*=\s*('.*?'|\d+)/i);
      if (conditionMatch) {
        const [, column, value] = conditionMatch;
        const cleanValue = value.replace(/'/g, "");
        result = result.filter((row) => String(row[column]) === cleanValue);
      }
    }

    // Handle LIMIT
    const limitMatch = query.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      const limit = parseInt(limitMatch[1]);
      result = result.slice(0, limit);
    }

    return result;
  }

  // If query not supported, return all data
  return data;
}

// ===== POST /api/tenants/:tenantId/mockdata =====
// Upload mock data (SQL or JSON) at tenant level
mockDataRouter.post(
  "/:tenantId/mockdata",
  validateBody(ImportMockDataSchema),
  async (req: any, res: any) => {
    try {
      const { tenantId } = req.params;
      const { format, data, tableName, description } = req.body;
      const user = req.user;

      // Verify user has access (Super Admin can access any tenant)
      if (user.isSuperAdmin !== true && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      let parsedData: any = {};

      if (format === "sql") {
        // Parse SQL
        console.log("🔍 Parsing SQL data...");
        const parsed = parseSQLInserts(data);
        parsedData = {
          tableName: tableName || parsed.tableName,
          columns: parsed.columns,
          data: parsed.data,
          rowCount: parsed.data.length,
        };
      } else if (format === "json") {
        // Parse JSON
        console.log("🔍 Parsing JSON data...");
        const jsonData = JSON.parse(data);

        // Support both array and object with metadata
        if (Array.isArray(jsonData)) {
          const columns = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
          parsedData = {
            tableName: tableName || "data",
            columns: columns,
            data: jsonData,
            rowCount: jsonData.length,
          };
        } else if (jsonData.data && Array.isArray(jsonData.data)) {
          parsedData = {
            tableName: tableName || jsonData.tableName || "data",
            columns: jsonData.columns || Object.keys(jsonData.data[0] || {}),
            data: jsonData.data,
            rowCount: jsonData.data.length,
          };
        } else {
          return res.status(400).json({
            error: "Invalid JSON format. Expected array or {data: []}",
          });
        }
      }

      // Store mock data at tenant level
      const mockDataRef = db.collection(`tenants/${tenantId}/mockdata`).doc();

      await mockDataRef.set({
        ...parsedData,
        description: description || "",
        format,
        createdAt: new Date(),
        createdBy: user.uid,
        updatedAt: new Date(),
        updatedBy: user.uid,
      });

      console.log(
        `✅ Mock data uploaded: ${parsedData.rowCount} rows for table "${parsedData.tableName}"`
      );

      res.status(201).json({
        id: mockDataRef.id,
        ...parsedData,
        message: `Successfully uploaded ${parsedData.rowCount} rows`,
      });
    } catch (error: any) {
      console.error("❌ Error uploading mock data:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== POST /api/tenants/:tenantId/datasources/:dataSourceId/mockdata =====
// Import mock data (SQL or JSON)
mockDataRouter.post(
  "/:tenantId/datasources/:dataSourceId/mockdata",
  validateBody(ImportMockDataSchema),
  async (req: any, res: any) => {
    try {
      const { tenantId, dataSourceId } = req.params;
      const { format, data, tableName, description } = req.body;
      const user = req.user;

      // Verify user has access (Super Admin can access any tenant)
      if (user.isSuperAdmin !== true && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Verify datasource exists
      const dsDoc = await db
        .doc(`tenants/${tenantId}/datasources/${dataSourceId}`)
        .get();

      if (!dsDoc.exists) {
        return res.status(404).json({ error: "Data source not found" });
      }

      let parsedData: any = {};

      if (format === "sql") {
        // Parse SQL
        console.log("🔍 Parsing SQL data...");
        const parsed = parseSQLInserts(data);
        parsedData = {
          tableName: tableName || parsed.tableName,
          columns: parsed.columns,
          data: parsed.data,
          rowCount: parsed.data.length,
        };
      } else if (format === "json") {
        // Parse JSON
        console.log("🔍 Parsing JSON data...");
        const jsonData = JSON.parse(data);

        // Support both array and object with metadata
        if (Array.isArray(jsonData)) {
          const columns = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
          parsedData = {
            tableName: tableName || "imported_data",
            columns,
            data: jsonData,
            rowCount: jsonData.length,
          };
        } else if (jsonData.data && Array.isArray(jsonData.data)) {
          parsedData = {
            tableName: tableName || jsonData.tableName || "imported_data",
            columns: jsonData.columns || Object.keys(jsonData.data[0] || {}),
            data: jsonData.data,
            rowCount: jsonData.data.length,
          };
        } else {
          return res.status(400).json({
            error: "Invalid JSON format. Expected array or {data: []}}",
          });
        }
      }

      // Store mock data in Firestore
      const mockDataRef = db
        .collection(`tenants/${tenantId}/datasources/${dataSourceId}/mockdata`)
        .doc();

      await mockDataRef.set({
        ...parsedData,
        description: description || "",
        format,
        createdAt: new Date(),
        createdBy: user.uid,
        updatedAt: new Date(),
        updatedBy: user.uid,
      });

      console.log(
        `✅ Mock data imported: ${parsedData.rowCount} rows for table "${parsedData.tableName}"`
      );

      res.status(201).json({
        id: mockDataRef.id,
        ...parsedData,
        message: `Successfully imported ${parsedData.rowCount} rows`,
      });
    } catch (error: any) {
      console.error("❌ Error importing mock data:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== GET /api/tenants/:tenantId/mockdata =====
// List all mock data sets for a tenant (across all datasources)
mockDataRouter.get("/:tenantId/mockdata", async (req: any, res: any) => {
  try {
    const { tenantId } = req.params;
    const user = req.user;

    // Verify user has access
    if (user.isSuperAdmin !== true && user.tenantId !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Store mock data at tenant level instead of under datasources
    // Path: tenants/{tenantId}/mockdata/{mockDataId}
    const mockDataSnapshot = await db
      .collection(`tenants/${tenantId}/mockdata`)
      .orderBy("createdAt", "desc")
      .get();

    const mockDataSets = mockDataSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        tableName: data.tableName,
        columns: data.columns,
        rowCount: data.rowCount,
        description: data.description || "",
        format: data.format,
        createdAt: data.createdAt?.toDate(),
        createdBy: data.createdBy,
      };
    });

    res.json(mockDataSets);
  } catch (error: any) {
    console.error("❌ Error fetching mock data:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== GET /api/tenants/:tenantId/mockdata/:mockDataId =====
// Get specific mock dataset
mockDataRouter.get(
  "/:tenantId/mockdata/:mockDataId",
  async (req: any, res: any) => {
    try {
      const { tenantId, mockDataId } = req.params;
      const user = req.user;

      // Verify user has access
      if (user.isSuperAdmin !== true && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const mockDataDoc = await db
        .doc(`tenants/${tenantId}/mockdata/${mockDataId}`)
        .get();

      if (!mockDataDoc.exists) {
        return res.status(404).json({ error: "Mock data not found" });
      }

      const mockData = mockDataDoc.data();
      res.json({
        id: mockDataDoc.id,
        ...mockData,
        createdAt: mockData?.createdAt?.toDate(),
      });
    } catch (error: any) {
      console.error("❌ Error fetching mock data:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== POST /api/tenants/:tenantId/mockdata/:mockDataId/query =====
// Execute query on mock data
mockDataRouter.post(
  "/:tenantId/mockdata/:mockDataId/query",
  validateBody(QueryMockDataSchema),
  async (req: any, res: any) => {
    try {
      const { tenantId, mockDataId } = req.params;
      const { query } = req.body;
      const user = req.user;

      // Verify user has access
      if (user.isSuperAdmin !== true && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const mockDataDoc = await db
        .doc(`tenants/${tenantId}/mockdata/${mockDataId}`)
        .get();

      if (!mockDataDoc.exists) {
        return res.status(404).json({ error: "Mock data not found" });
      }

      const mockData = mockDataDoc.data();
      const data = mockData?.data || [];

      console.log(`🔍 Executing mock query: ${query}`);
      console.log(`📊 Mock data has ${data.length} rows`);

      // Execute query on mock data
      const result = executeMockQuery(data, query);

      console.log(`✅ Query returned ${result.length} rows`);

      res.json({
        columns: mockData?.columns || [],
        rows: result,
        totalRows: result.length,
      });
    } catch (error: any) {
      console.error("❌ Error executing mock query:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== DELETE /api/tenants/:tenantId/mockdata/:mockDataId =====
// Delete mock dataset
mockDataRouter.delete(
  "/:tenantId/mockdata/:mockDataId",
  async (req: any, res: any) => {
    try {
      const { tenantId, mockDataId } = req.params;
      const user = req.user;

      // Verify user has access
      if (user.isSuperAdmin !== true && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      await db.doc(`tenants/${tenantId}/mockdata/${mockDataId}`).delete();

      res.json({ success: true, message: "Mock data deleted successfully" });
    } catch (error: any) {
      console.error("❌ Error deleting mock data:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== GET /api/tenants/:tenantId/datasources/:dataSourceId/mockdata =====
// List all mock data sets for a datasource
mockDataRouter.get(
  "/:tenantId/datasources/:dataSourceId/mockdata",
  async (req: any, res: any) => {
    try {
      const { tenantId, dataSourceId } = req.params;
      const user = req.user;

      // Verify user has access
      if (user.isSuperAdmin !== true && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const mockDataSnapshot = await db
        .collection(`tenants/${tenantId}/datasources/${dataSourceId}/mockdata`)
        .orderBy("createdAt", "desc")
        .get();

      const mockDataSets = mockDataSnapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          tableName: data.tableName,
          columns: data.columns,
          rowCount: data.rowCount,
          description: data.description || "",
          format: data.format,
          createdAt: data.createdAt?.toDate(),
          createdBy: data.createdBy,
        };
      });

      res.json({ mockDataSets });
    } catch (error: any) {
      console.error("❌ Error fetching mock data:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== GET /api/tenants/:tenantId/datasources/:dataSourceId/mockdata/:mockDataId =====
// Get specific mock data set with full data
mockDataRouter.get(
  "/:tenantId/datasources/:dataSourceId/mockdata/:mockDataId",
  async (req: any, res: any) => {
    try {
      const { tenantId, dataSourceId, mockDataId } = req.params;
      const user = req.user;

      // Verify user has access
      if (user.isSuperAdmin !== true && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      const mockDataDoc = await db
        .doc(
          `tenants/${tenantId}/datasources/${dataSourceId}/mockdata/${mockDataId}`
        )
        .get();

      if (!mockDataDoc.exists) {
        return res.status(404).json({ error: "Mock data not found" });
      }

      const data = mockDataDoc.data();
      res.json({
        id: mockDataDoc.id,
        ...data,
        createdAt: data?.createdAt?.toDate(),
        updatedAt: data?.updatedAt?.toDate(),
      });
    } catch (error: any) {
      console.error("❌ Error fetching mock data:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== POST /api/tenants/:tenantId/datasources/:dataSourceId/mockdata/:mockDataId/query =====
// Execute query on mock data
mockDataRouter.post(
  "/:tenantId/datasources/:dataSourceId/mockdata/:mockDataId/query",
  validateBody(QueryMockDataSchema),
  async (req: any, res: any) => {
    try {
      const { tenantId, dataSourceId, mockDataId } = req.params;
      const { query } = req.body;
      const user = req.user;

      // Verify user has access
      if (user.isSuperAdmin !== true && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get mock data
      const mockDataDoc = await db
        .doc(
          `tenants/${tenantId}/datasources/${dataSourceId}/mockdata/${mockDataId}`
        )
        .get();

      if (!mockDataDoc.exists) {
        return res.status(404).json({ error: "Mock data not found" });
      }

      const mockData = mockDataDoc.data();
      const data = mockData?.data || [];

      console.log(`🔍 Executing mock query: ${query}`);
      console.log(`📊 Mock data has ${data.length} rows`);

      // Execute query on mock data
      const result = executeMockQuery(data, query);

      console.log(`✅ Query returned ${result.length} rows`);

      res.json({
        success: true,
        data: result,
        rowCount: result.length,
        mockDataId: mockDataDoc.id,
        tableName: mockData?.tableName,
      });
    } catch (error: any) {
      console.error("❌ Error executing mock query:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== DELETE /api/tenants/:tenantId/datasources/:dataSourceId/mockdata/:mockDataId =====
// Delete mock data
mockDataRouter.delete(
  "/:tenantId/datasources/:dataSourceId/mockdata/:mockDataId",
  async (req: any, res: any) => {
    try {
      const { tenantId, dataSourceId, mockDataId } = req.params;
      const user = req.user;

      // Verify user has access
      if (user.isSuperAdmin !== true && user.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied" });
      }

      await db
        .doc(
          `tenants/${tenantId}/datasources/${dataSourceId}/mockdata/${mockDataId}`
        )
        .delete();

      res.json({ message: "Mock data deleted successfully" });
    } catch (error: any) {
      console.error("❌ Error deleting mock data:", error);
      res.status(500).json({ error: error.message });
    }
  }
);
