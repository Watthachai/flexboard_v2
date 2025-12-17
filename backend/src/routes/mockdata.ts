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
  maxRows: z.number().optional(), // Limit number of rows to import
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
  // Support SQL Server style: [dbo].[TableName] or [TableName]
  const createTableMatch = sql.match(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:\[?\w+\]?\.)?\[?(\w+)\]?/i
  );
  const insertMatch = sql.match(
    /INSERT\s+(?:INTO\s+)?(?:\[?\w+\]?\.)?\[?(\w+)\]?/i
  );
  const tableName =
    createTableMatch?.[1] || insertMatch?.[1] || "unknown_table";

  // Extract column names from INSERT statement - handle multi-line with comments
  const columnsMatch = sql.match(/INSERT[^(]*\(([\s\S]+?)\)\s*VALUES/i);
  let columns: string[] = [];
  if (columnsMatch) {
    // Remove SQL comments from column list
    let columnText = columnsMatch[1]
      .replace(/--[^\n]*\n/g, "\n") // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ""); // Remove multi-line comments

    columns = columnText
      .split(",")
      .map(
        (col) =>
          col
            .trim()
            .replace(/\[|\]/g, "") // Remove SQL Server brackets
            .replace(/`/g, "") // Remove backticks
            .replace(/\s+/g, " ") // Normalize whitespace
      )
      .filter((c) => c.length > 0); // Remove empty strings
  }

  const data: any[] = [];

  // Detect format: Check if it's multi-row INSERT or single-row per INSERT
  const multiRowPattern = /VALUES\s*\([^)]+\)\s*,\s*\(/i;
  const isMultiRow = multiRowPattern.test(sql);

  if (isMultiRow) {
    // Format 1: Multi-row INSERT - VALUES (...), (...), (...)
    console.log("📊 Detected multi-row INSERT format");

    const valuesMatch = sql.match(/VALUES\s+([\s\S]+?)(?:;|\s*$)/i);
    if (!valuesMatch) {
      return { tableName, columns, data: [] };
    }

    let valuesStr = valuesMatch[1].trim();
    valuesStr = valuesStr.replace(/;?\s*$/, "");

    // Simple approach: split by "),(" for basic multi-row inserts
    const valueGroups = valuesStr.split(/\)\s*,\s*\(/);

    valueGroups.forEach((group, idx) => {
      // Clean up: remove leading/trailing parentheses
      let cleanGroup = group.trim();
      if (idx === 0) cleanGroup = cleanGroup.replace(/^\(/, "");
      if (idx === valueGroups.length - 1)
        cleanGroup = cleanGroup.replace(/\)$/, "");

      const row: any = {};

      // Simple value parsing for basic format
      const valueMatches = cleanGroup.match(
        /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|-?\d+\.?\d*|NULL)/gi
      );

      if (valueMatches && columns.length > 0) {
        valueMatches.forEach((val, colIdx) => {
          if (colIdx >= columns.length) return;

          let parsedValue: any = val.trim();

          if (parsedValue.toUpperCase() === "NULL") {
            parsedValue = null;
          } else if (
            parsedValue.startsWith("'") ||
            parsedValue.startsWith('"')
          ) {
            parsedValue = parsedValue.slice(1, -1);
            parsedValue = parsedValue
              .replace(/\\'/g, "'")
              .replace(/\\"/g, '"')
              .replace(/\\n/g, "\n")
              .replace(/\\r/g, "\r")
              .replace(/\\t/g, "\t")
              .replace(/\\\\/g, "\\");
          } else if (!isNaN(Number(parsedValue))) {
            parsedValue = Number(parsedValue);
          }

          row[columns[colIdx]] = parsedValue;
        });

        if (Object.keys(row).length > 0) {
          data.push(row);
        }
      }
    });
  } else {
    // Format 2: Single-row per INSERT (SQL Server style)
    console.log("📊 Detected single-row per INSERT format");
    console.log(
      `📊 Expecting ${columns.length} columns: ${columns
        .slice(0, 5)
        .join(", ")}...`
    );

    // Split into individual INSERT statements
    const insertStatements = sql
      .split(/INSERT\s+(?:INTO\s+)?/i)
      .filter((s) => s.includes("VALUES"));

    console.log(`📊 Found ${insertStatements.length} INSERT statements`);

    for (const statement of insertStatements) {
      // Extract columns if not already found
      if (columns.length === 0) {
        const colMatch = statement.match(/\(([^)]+)\)\s*VALUES/i);
        if (colMatch) {
          let columnText = colMatch[1]
            .replace(/--[^\n]*\n/g, "\n")
            .replace(/\/\*[\s\S]*?\*\//g, "");
          columns = columnText
            .split(",")
            .map((c) => c.trim().replace(/\[|\]/g, ""))
            .filter((c) => c.length > 0);
        }
      }

      // Extract VALUES section - match until semicolon or next INSERT/end
      const valuesMatch = statement.match(/VALUES\s*\(([\s\S]+?)\);/i);
      if (!valuesMatch) {
        console.log("⚠️ No VALUES match in statement");
        continue;
      }

      let valuesContent = valuesMatch[1].trim();

      // Remove SQL comments from VALUES
      valuesContent = valuesContent.replace(/--[^\n]*\n/g, "\n");

      console.log(`📊 Parsing VALUES content (${valuesContent.length} chars)`);
      const row: any = {};

      // Parse each value - handle CAST, N-prefixed strings, numbers, NULL
      let currentValue = "";
      let inString = false;
      let stringChar = "";
      let parenDepth = 0;
      const values: string[] = [];

      for (let i = 0; i < valuesContent.length; i++) {
        const char = valuesContent[i];

        // Handle string literals
        if ((char === "'" || char === '"') && valuesContent[i - 1] !== "\\") {
          if (!inString) {
            inString = true;
            stringChar = char;
            currentValue += char;
          } else if (char === stringChar) {
            inString = false;
            currentValue += char;
          } else {
            currentValue += char;
          }
          continue;
        }

        if (inString) {
          currentValue += char;
          continue;
        }

        // Track parentheses depth (for CAST functions)
        if (char === "(") {
          parenDepth++;
          currentValue += char;
          continue;
        }
        if (char === ")") {
          parenDepth--;
          currentValue += char;
          continue;
        }

        // Split on comma at depth 0
        if (char === "," && parenDepth === 0) {
          values.push(currentValue.trim());
          currentValue = "";
          continue;
        }

        currentValue += char;
      }

      // Add last value
      if (currentValue.trim()) {
        values.push(currentValue.trim());
      }

      console.log(
        `📊 Split into ${values.length} values, first 3: ${values
          .slice(0, 3)
          .map((v) => v.substring(0, 20))
          .join(", ")}`
      );

      // Parse each value
      values.forEach((val, idx) => {
        if (idx >= columns.length) return;

        let parsedValue: any = val.trim();

        // Handle NULL
        if (/^NULL$/i.test(parsedValue)) {
          row[columns[idx]] = null;
          return;
        }

        // Handle CAST(...)
        const castMatch = parsedValue.match(
          /CAST\s*\(\s*(.+?)\s+AS\s+.+?\)$/is
        );
        if (castMatch) {
          parsedValue = castMatch[1].trim();
        }

        // Remove N prefix for NVARCHAR strings
        parsedValue = parsedValue.replace(/^N'/i, "'");

        // Handle quoted strings
        if (
          (parsedValue.startsWith("'") && parsedValue.endsWith("'")) ||
          (parsedValue.startsWith('"') && parsedValue.endsWith('"'))
        ) {
          parsedValue = parsedValue.slice(1, -1);
          // Unescape
          parsedValue = parsedValue
            .replace(/\\'/g, "'")
            .replace(/\\"/g, '"')
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, "\r")
            .replace(/\\t/g, "\t")
            .replace(/\\\\/g, "\\");
          row[columns[idx]] = parsedValue;
          return;
        }

        // Handle numbers
        const num = parseFloat(parsedValue);
        if (!isNaN(num) && parsedValue.match(/^-?\d+\.?\d*$/)) {
          row[columns[idx]] = num;
          return;
        }

        // Default: keep as string
        row[columns[idx]] = parsedValue;
      });

      // Only add row if it has data
      const rowKeys = Object.keys(row).length;
      if (rowKeys > 0 && rowKeys === columns.length) {
        data.push(row);
        if (data.length <= 5) {
          console.log(`✅ Row ${data.length} added with ${rowKeys} values`);
        }
      } else if (rowKeys > 0) {
        if (data.length < 5) {
          console.log(
            `⚠️ Row has ${rowKeys} values but expected ${columns.length} columns - skipping`
          );
        }
      }
    }
  }

  console.log(`📊 Parsed SQL: ${data.length} rows from table "${tableName}"`);
  return { tableName, columns, data };
}

/**
 * Simple SQL query executor for mock data
 * Supports: SELECT, WHERE (=, >, <, >=, <=, LIKE, IN, AND), GROUP BY, ORDER BY, LIMIT, aggregations
 */
export function executeMockQuery(data: any[], query: string): any[] {
  const upperQuery = query.toUpperCase();

  // SELECT * FROM table
  if (upperQuery.includes("SELECT") && upperQuery.includes("FROM")) {
    let result = [...data];

    // Handle WHERE clause
    const whereMatch = query.match(
      /WHERE\s+(.+?)(?:\s+GROUP BY|\s+ORDER BY|\s+LIMIT|$)/i
    );
    if (whereMatch) {
      const whereClause = whereMatch[1].trim();

      // Split by AND (simple approach)
      const conditions = whereClause.split(/\s+AND\s+/i);

      result = result.filter((row) => {
        return conditions.every((condition) => {
          // Handle IS NOT NULL
          const isNotNullMatch = condition.match(/(\w+)\s+IS\s+NOT\s+NULL/i);
          if (isNotNullMatch) {
            const field = isNotNullMatch[1];
            return row[field] !== null && row[field] !== undefined;
          }

          // Handle IS NULL
          const isNullMatch = condition.match(/(\w+)\s+IS\s+NULL/i);
          if (isNullMatch) {
            const field = isNullMatch[1];
            return row[field] === null || row[field] === undefined;
          }

          // Handle CAST(field AS DATE) comparisons
          const castMatch = condition.match(
            /CAST\s*\(\s*(\w+)\s+AS\s+DATE\s*\)\s*(>=|<=|>|<|=)\s*'([^']+)'/i
          );
          if (castMatch) {
            const [, field, operator, value] = castMatch;
            const rowValue = row[field];
            if (rowValue === null || rowValue === undefined) return false;

            // Parse date from row (handle various formats)
            let rowDate: Date;
            if (rowValue instanceof Date) {
              rowDate = rowValue;
            } else {
              // Try to parse string date
              rowDate = new Date(rowValue);
            }

            const filterDate = new Date(value);

            // Compare dates (ignore time)
            const rowDateOnly = new Date(
              rowDate.getFullYear(),
              rowDate.getMonth(),
              rowDate.getDate()
            );
            const filterDateOnly = new Date(
              filterDate.getFullYear(),
              filterDate.getMonth(),
              filterDate.getDate()
            );

            switch (operator) {
              case ">=":
                return rowDateOnly >= filterDateOnly;
              case "<=":
                return rowDateOnly <= filterDateOnly;
              case ">":
                return rowDateOnly > filterDateOnly;
              case "<":
                return rowDateOnly < filterDateOnly;
              case "=":
                return rowDateOnly.getTime() === filterDateOnly.getTime();
              default:
                return true;
            }
          }

          // Handle IN operator
          const inMatch = condition.match(/(\w+)\s+IN\s*\(([^)]+)\)/i);
          if (inMatch) {
            const [, field, valuesList] = inMatch;
            const values = valuesList
              .split(",")
              .map((v) => v.trim().replace(/'/g, ""));
            return values.includes(String(row[field]));
          }

          // Handle LIKE operator
          const likeMatch = condition.match(/(\w+)\s+LIKE\s+'%([^%]+)%'/i);
          if (likeMatch) {
            const [, field, value] = likeMatch;
            return String(row[field] || "")
              .toLowerCase()
              .includes(value.toLowerCase());
          }

          // Handle comparison operators (>=, <=, >, <, =)
          const compMatch = condition.match(
            /(\w+)\s*(>=|<=|>|<|=|!=)\s*'?([^']+)'?/i
          );
          if (compMatch) {
            const [, field, operator, value] = compMatch;
            const rowValue = row[field];
            const cleanValue = value.replace(/'/g, "").trim();

            // Try numeric comparison
            const numRow = parseFloat(rowValue);
            const numFilter = parseFloat(cleanValue);

            if (!isNaN(numRow) && !isNaN(numFilter)) {
              switch (operator) {
                case ">=":
                  return numRow >= numFilter;
                case "<=":
                  return numRow <= numFilter;
                case ">":
                  return numRow > numFilter;
                case "<":
                  return numRow < numFilter;
                case "=":
                  return numRow === numFilter;
                case "!=":
                  return numRow !== numFilter;
                default:
                  return true;
              }
            }

            // String comparison
            switch (operator) {
              case "=":
                return String(rowValue) === cleanValue;
              case "!=":
                return String(rowValue) !== cleanValue;
              default:
                return true;
            }
          }

          return true; // If no pattern matches, include the row
        });
      });
    }

    // Handle GROUP BY with aggregations
    const groupByMatch = query.match(
      /GROUP BY\s+(.+?)(?:\s+HAVING|\s+ORDER BY|\s+LIMIT|$)/i
    );
    const selectMatch = query.match(/SELECT\s+(.+?)\s+FROM/i);

    if (groupByMatch && selectMatch) {
      const groupByFields = groupByMatch[1].split(",").map((f) => f.trim());
      const selectClause = selectMatch[1];

      // Parse aggregations from SELECT
      const aggregations: { func: string; field: string; alias: string }[] = [];
      const aggRegex =
        /(SUM|COUNT|AVG|MIN|MAX)\s*\(\s*(\w+)\s*\)\s*(?:as\s+(\w+))?/gi;
      let aggMatch;
      while ((aggMatch = aggRegex.exec(selectClause)) !== null) {
        aggregations.push({
          func: aggMatch[1].toUpperCase(),
          field: aggMatch[2],
          alias: aggMatch[3] || aggMatch[2],
        });
      }

      // Group data
      const groups = new Map<string, any[]>();
      result.forEach((row) => {
        const key = groupByFields.map((f) => row[f]).join("|||");
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(row);
      });

      // Calculate aggregations
      result = Array.from(groups.entries()).map(([key, rows]) => {
        const groupRow: any = {};

        // Add group by fields
        groupByFields.forEach((field, idx) => {
          groupRow[field] = rows[0][field];
        });

        // Calculate aggregations
        aggregations.forEach((agg) => {
          const values = rows.map((r) => parseFloat(r[agg.field]) || 0);
          switch (agg.func) {
            case "SUM":
              groupRow[agg.alias] = values.reduce((a, b) => a + b, 0);
              break;
            case "COUNT":
              groupRow[agg.alias] = rows.length;
              break;
            case "AVG":
              groupRow[agg.alias] =
                values.reduce((a, b) => a + b, 0) / values.length;
              break;
            case "MIN":
              groupRow[agg.alias] = Math.min(...values);
              break;
            case "MAX":
              groupRow[agg.alias] = Math.max(...values);
              break;
          }
        });

        return groupRow;
      });
    }

    // Handle ORDER BY
    const orderByMatch = query.match(/ORDER BY\s+(.+?)(?:\s+LIMIT|$)/i);
    if (orderByMatch) {
      const orderClauses = orderByMatch[1].split(",").map((c) => c.trim());

      result.sort((a, b) => {
        for (const clause of orderClauses) {
          const [field, direction] = clause.split(/\s+/);
          const dir = direction?.toUpperCase() === "DESC" ? -1 : 1;

          const valA = a[field];
          const valB = b[field];

          if (valA < valB) return -1 * dir;
          if (valA > valB) return 1 * dir;
        }
        return 0;
      });
    }

    // Handle DISTINCT (must be after WHERE/ORDER BY, before LIMIT)
    const distinctMatch = query.match(/SELECT\s+DISTINCT\s+(.+?)\s+FROM/i);
    if (distinctMatch) {
      const fields = distinctMatch[1].split(",").map((f) => f.trim());

      // Create unique key for each row based on selected fields
      const seen = new Set<string>();
      result = result.filter((row) => {
        const key = fields.map((field) => String(row[field] ?? "")).join("|||");
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });

      // If only selecting specific fields, project them
      if (fields.length > 0 && fields[0] !== "*") {
        result = result.map((row) => {
          const projectedRow: any = {};
          fields.forEach((field) => {
            projectedRow[field] = row[field];
          });
          return projectedRow;
        });
      }
    }

    // Handle LIMIT
    const limitMatch = query.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      const limit = parseInt(limitMatch[1]);
      result = result.slice(0, limit);
    }

    // Handle TOP (SQL Server style)
    const topMatch = query.match(/SELECT\s+TOP\s+(\d+)/i);
    if (topMatch) {
      const top = parseInt(topMatch[1]);
      result = result.slice(0, top);
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
      const { format, data, tableName, description, maxRows } = req.body;
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

        // Apply maxRows limit if specified
        const limitedData = maxRows
          ? parsed.data.slice(0, maxRows)
          : parsed.data;
        const totalRows = parsed.data.length;

        parsedData = {
          tableName: tableName || parsed.tableName,
          columns: parsed.columns,
          data: limitedData,
          rowCount: limitedData.length,
          totalRowsInSource: totalRows,
          isLimited: Boolean(maxRows && totalRows > maxRows),
        };
      } else if (format === "json") {
        // Parse JSON
        console.log("🔍 Parsing JSON data...");
        const jsonData = JSON.parse(data);

        // Support both array and object with metadata
        if (Array.isArray(jsonData)) {
          const columns = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
          const limitedData = maxRows ? jsonData.slice(0, maxRows) : jsonData;
          const totalRows = jsonData.length;

          parsedData = {
            tableName: tableName || "data",
            columns: columns,
            data: limitedData,
            rowCount: limitedData.length,
            totalRowsInSource: totalRows,
            isLimited: Boolean(maxRows && totalRows > maxRows),
          };
        } else if (jsonData.data && Array.isArray(jsonData.data)) {
          const limitedData = maxRows
            ? jsonData.data.slice(0, maxRows)
            : jsonData.data;
          const totalRows = jsonData.data.length;

          parsedData = {
            tableName: tableName || jsonData.tableName || "data",
            columns: jsonData.columns || Object.keys(jsonData.data[0] || {}),
            data: limitedData,
            rowCount: limitedData.length,
            totalRowsInSource: totalRows,
            isLimited: Boolean(maxRows && totalRows > maxRows),
          };
        } else {
          return res.status(400).json({
            error: "Invalid JSON format. Expected array or {data: []}",
          });
        }
      }

      // Check document size (Firestore limit: 1MB)
      const docSize = JSON.stringify(parsedData).length;
      const maxSize = 1048576; // 1MB in bytes

      if (docSize > maxSize) {
        // Calculate suggested rows based on average bytes per row
        const avgBytesPerRow = docSize / parsedData.rowCount;
        const estimatedRowsForLimit = Math.floor(maxSize / avgBytesPerRow);

        return res.status(413).json({
          error: "Document size exceeds Firestore limit (1MB)",
          currentSize: docSize,
          maxSize: maxSize,
          currentRows: parsedData.rowCount,
          totalRows: parsedData.totalRowsInSource,
          suggestedMaxRows: estimatedRowsForLimit,
          message: `Try limiting to approximately ${estimatedRowsForLimit} rows or less`,
        });
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

      const limitMsg = parsedData.isLimited
        ? ` (limited from ${parsedData.totalRowsInSource} total rows)`
        : "";

      console.log(
        `✅ Mock data uploaded: ${parsedData.rowCount} rows for table "${parsedData.tableName}"${limitMsg}`
      );

      res.status(201).json({
        id: mockDataRef.id,
        ...parsedData,
        message: `Successfully uploaded ${parsedData.rowCount} rows${limitMsg}`,
        documentSize: JSON.stringify(parsedData).length,
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
      const { format, data, tableName, description, maxRows } = req.body;
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

        // Apply maxRows limit if specified
        const limitedData = maxRows
          ? parsed.data.slice(0, maxRows)
          : parsed.data;
        const totalRows = parsed.data.length;

        parsedData = {
          tableName: tableName || parsed.tableName,
          columns: parsed.columns,
          data: limitedData,
          rowCount: limitedData.length,
          totalRowsInSource: totalRows,
          isLimited: Boolean(maxRows && totalRows > maxRows),
        };
      } else if (format === "json") {
        // Parse JSON
        console.log("🔍 Parsing JSON data...");
        const jsonData = JSON.parse(data);

        // Support both array and object with metadata
        if (Array.isArray(jsonData)) {
          const columns = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
          const limitedData = maxRows ? jsonData.slice(0, maxRows) : jsonData;
          const totalRows = jsonData.length;

          parsedData = {
            tableName: tableName || "imported_data",
            columns,
            data: limitedData,
            rowCount: limitedData.length,
            totalRowsInSource: totalRows,
            isLimited: Boolean(maxRows && totalRows > maxRows),
          };
        } else if (jsonData.data && Array.isArray(jsonData.data)) {
          const limitedData = maxRows
            ? jsonData.data.slice(0, maxRows)
            : jsonData.data;
          const totalRows = jsonData.data.length;

          parsedData = {
            tableName: tableName || jsonData.tableName || "imported_data",
            columns: jsonData.columns || Object.keys(jsonData.data[0] || {}),
            data: limitedData,
            rowCount: limitedData.length,
            totalRowsInSource: totalRows,
            isLimited: Boolean(maxRows && totalRows > maxRows),
          };
        } else {
          return res.status(400).json({
            error: "Invalid JSON format. Expected array or {data: []}}",
          });
        }
      }

      // Check document size (Firestore limit: 1MB)
      const docSize = JSON.stringify(parsedData).length;
      const maxSize = 1048576; // 1MB in bytes

      if (docSize > maxSize) {
        // Calculate suggested rows based on average bytes per row
        const avgBytesPerRow = docSize / parsedData.rowCount;
        const estimatedRowsForLimit = Math.floor(maxSize / avgBytesPerRow);

        return res.status(413).json({
          error: "Document size exceeds Firestore limit (1MB)",
          currentSize: docSize,
          maxSize: maxSize,
          currentRows: parsedData.rowCount,
          totalRows: parsedData.totalRowsInSource,
          suggestedMaxRows: estimatedRowsForLimit,
          message: `Try limiting to approximately ${estimatedRowsForLimit} rows or less`,
        });
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

      const limitMsg = parsedData.isLimited
        ? ` (limited from ${parsedData.totalRowsInSource} total rows)`
        : "";

      console.log(
        `✅ Mock data imported: ${parsedData.rowCount} rows for table "${parsedData.tableName}"${limitMsg}`
      );

      res.status(201).json({
        id: mockDataRef.id,
        ...parsedData,
        message: `Successfully imported ${parsedData.rowCount} rows${limitMsg}`,
        documentSize: JSON.stringify(parsedData).length,
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
