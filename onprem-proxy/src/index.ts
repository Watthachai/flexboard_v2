/**
 * FlexBoard OnPrem SQL Proxy
 *
 * Lightweight service for executing SQL queries on local databases
 * Fetches connection config from Cloud Backend based on dataSourceId
 *
 * Endpoints:
 *   POST /query - Execute SQL query (requires dataSourceId)
 *   GET /health - Health check
 *   GET /datasources/:id/test - Test connection for specific datasource
 *   GET /datasources/:id/tables - Get tables for specific datasource
 */

import express from "express";
import cors from "cors";
import sql from "mssql";

const app = express();
const PORT = process.env.PORT || 5001;

// Cloud Backend URL (to fetch DataSource configs)
const CLOUD_BACKEND_URL =
  process.env.CLOUD_BACKEND_URL || "https://api.fittflexb.com";

// Check if running in Docker (for localhost remapping)
const IS_DOCKER = process.env.IS_DOCKER === "true";

/**
 * Remap localhost to host.docker.internal when running in Docker
 * This allows DataSource configs to use "localhost" and work both:
 * - When backend runs locally (localhost → localhost)
 * - When proxy runs in Docker (localhost → host.docker.internal)
 */
function remapHost(host: string): string {
  if (!IS_DOCKER) return host;

  const localhostPatterns = ["localhost", "127.0.0.1", "0.0.0.0"];
  if (localhostPatterns.includes(host.toLowerCase())) {
    console.log(`🔄 Remapping ${host} → host.docker.internal (Docker mode)`);
    return "host.docker.internal";
  }
  return host;
}

// Cache for database connections (keyed by dataSourceId)
const connectionPools: Map<string, sql.ConnectionPool> = new Map();

// Cache for datasource configs (to avoid repeated API calls)
const datasourceCache: Map<string, { config: any; expiry: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch DataSource config from Cloud Backend
 */
async function getDataSourceConfig(
  dataSourceId: string,
  apiKey: string,
  tenantId: string
): Promise<any> {
  // Check cache first
  const cached = datasourceCache.get(dataSourceId);
  if (cached && cached.expiry > Date.now()) {
    console.log(`📦 Using cached config for dataSource: ${dataSourceId}`);
    return cached.config;
  }

  console.log(`🌐 Fetching dataSource config from Cloud: ${dataSourceId}`);

  const response = await fetch(
    `${CLOUD_BACKEND_URL}/api/onprem/datasources/${dataSourceId}`,
    {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        "X-Tenant-ID": tenantId,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Failed to fetch dataSource: ${response.status} - ${error}`
    );
  }

  const config = await response.json();

  // Cache the config
  datasourceCache.set(dataSourceId, {
    config,
    expiry: Date.now() + CACHE_TTL,
  });

  return config;
}

/**
 * Get or create connection pool for a DataSource
 */
async function getPool(
  dataSourceId: string,
  connection: any
): Promise<sql.ConnectionPool> {
  // Check if pool exists and is connected
  let pool = connectionPools.get(dataSourceId);
  if (pool && pool.connected) {
    return pool;
  }

  console.log(
    `🔌 Creating new connection pool for dataSource: ${dataSourceId}`
  );

  // Remap localhost when running in Docker
  const server = remapHost(connection.host || "localhost");

  const dbConfig: sql.config = {
    server: server,
    port: connection.port || 1433,
    user: connection.username || connection.user || "sa",
    password: connection.password || "",
    database: connection.database || "master",
    options: {
      encrypt: connection.ssl || false,
      trustServerCertificate: true,
    },
    connectionTimeout: 30000,
    requestTimeout: 30000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };

  pool = await sql.connect(dbConfig);
  connectionPools.set(dataSourceId, pool);
  console.log(
    `✅ Connected to: ${connection.host}:${connection.port}/${connection.database}`
  );

  return pool;
}

// ===== Middleware =====
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ===== Health Check =====
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "flexboard-onprem-proxy",
    timestamp: new Date().toISOString(),
    cloudBackend: CLOUD_BACKEND_URL,
  });
});

// ===== Execute Query =====
// Requires: dataSourceId, query in body
// Headers: X-API-Key, X-Tenant-ID
app.post("/query", async (req, res) => {
  try {
    const { dataSourceId, query } = req.body;
    const apiKey = req.headers["x-api-key"] as string;
    const tenantId = req.headers["x-tenant-id"] as string;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    if (!dataSourceId) {
      return res.status(400).json({ error: "dataSourceId is required" });
    }

    if (!apiKey || !tenantId) {
      return res.status(401).json({
        error: "Missing X-API-Key or X-Tenant-ID headers",
      });
    }

    // 1. Fetch dataSource config from Cloud Backend
    const dataSource = await getDataSourceConfig(
      dataSourceId,
      apiKey,
      tenantId
    );

    if (!dataSource || !dataSource.connection) {
      return res.status(404).json({ error: "DataSource not found or invalid" });
    }

    // Only support MSSQL for now
    if (dataSource.type !== "mssql") {
      return res.status(400).json({
        error: `Unsupported database type: ${dataSource.type}. Only mssql is supported.`,
      });
    }

    console.log(
      `📝 Executing query on ${dataSource.name}: ${query.substring(0, 100)}...`
    );
    const startTime = Date.now();

    // 2. Get connection pool for this dataSource
    const pool = await getPool(dataSourceId, dataSource.connection);

    // 3. Execute query
    const result = await pool.request().query(query);

    const duration = Date.now() - startTime;
    console.log(
      `✅ Query executed in ${duration}ms, rows: ${
        result.recordset?.length || 0
      }`
    );

    // Get column names
    const columns =
      result.recordset?.length > 0 ? Object.keys(result.recordset[0]) : [];

    res.json({
      data: result.recordset || [],
      columns,
      rowCount: result.recordset?.length || 0,
      duration,
    });
  } catch (error: any) {
    console.error("❌ Query error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ===== Test Connection for DataSource =====
app.get("/datasources/:dataSourceId/test", async (req, res) => {
  try {
    const { dataSourceId } = req.params;
    const apiKey = req.headers["x-api-key"] as string;
    const tenantId = req.headers["x-tenant-id"] as string;

    if (!apiKey || !tenantId) {
      return res.status(401).json({
        error: "Missing X-API-Key or X-Tenant-ID headers",
      });
    }

    // Fetch dataSource config
    const dataSource = await getDataSourceConfig(
      dataSourceId,
      apiKey,
      tenantId
    );

    if (!dataSource || !dataSource.connection) {
      return res.status(404).json({ error: "DataSource not found" });
    }

    // Get pool and test connection
    const pool = await getPool(dataSourceId, dataSource.connection);
    const result = await pool.request().query("SELECT 1 as test");

    res.json({
      status: "connected",
      dataSourceName: dataSource.name,
      database: dataSource.connection.database,
      server: `${dataSource.connection.host}:${dataSource.connection.port}`,
      testResult: result.recordset,
    });
  } catch (error: any) {
    console.error("❌ Connection test failed:", error.message);
    res.status(500).json({
      status: "error",
      error: error.message,
    });
  }
});

// ===== Get Tables for DataSource =====
app.get("/datasources/:dataSourceId/tables", async (req, res) => {
  try {
    const { dataSourceId } = req.params;
    const apiKey = req.headers["x-api-key"] as string;
    const tenantId = req.headers["x-tenant-id"] as string;

    if (!apiKey || !tenantId) {
      return res.status(401).json({
        error: "Missing X-API-Key or X-Tenant-ID headers",
      });
    }

    // Fetch dataSource config
    const dataSource = await getDataSourceConfig(
      dataSourceId,
      apiKey,
      tenantId
    );

    if (!dataSource || !dataSource.connection) {
      return res.status(404).json({ error: "DataSource not found" });
    }

    // Get pool
    const pool = await getPool(dataSourceId, dataSource.connection);

    const result = await pool.request().query(`
      SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `);

    res.json({
      dataSourceName: dataSource.name,
      tables: result.recordset,
    });
  } catch (error: any) {
    console.error("❌ Error getting tables:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ===== Get Table Schema for DataSource =====
app.get(
  "/datasources/:dataSourceId/tables/:tableName/schema",
  async (req, res) => {
    try {
      const { dataSourceId, tableName } = req.params;
      const apiKey = req.headers["x-api-key"] as string;
      const tenantId = req.headers["x-tenant-id"] as string;

      if (!apiKey || !tenantId) {
        return res.status(401).json({
          error: "Missing X-API-Key or X-Tenant-ID headers",
        });
      }

      // Fetch dataSource config
      const dataSource = await getDataSourceConfig(
        dataSourceId,
        apiKey,
        tenantId
      );

      if (!dataSource || !dataSource.connection) {
        return res.status(404).json({ error: "DataSource not found" });
      }

      // Get pool
      const pool = await getPool(dataSourceId, dataSource.connection);

      const result = await pool
        .request()
        .input("tableName", sql.VarChar, tableName).query(`
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          IS_NULLABLE,
          CHARACTER_MAXIMUM_LENGTH,
          COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = @tableName
        ORDER BY ORDINAL_POSITION
      `);

      res.json({
        dataSourceName: dataSource.name,
        table: tableName,
        columns: result.recordset,
      });
    } catch (error: any) {
      console.error("❌ Error getting schema:", error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== Clear Cache (for debugging) =====
app.post("/cache/clear", (req, res) => {
  datasourceCache.clear();
  res.json({ message: "Cache cleared" });
});

// ===== Start Server =====
app.listen(PORT, () => {
  console.log("\n🚀 FlexBoard OnPrem SQL Proxy");
  console.log("==============================");
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`🌐 Cloud:  ${CLOUD_BACKEND_URL}`);
  console.log("");
  console.log("Usage:");
  console.log("  POST /query");
  console.log("    Body: { dataSourceId: '...', query: 'SELECT ...' }");
  console.log("    Headers: X-API-Key, X-Tenant-ID");
  console.log("");
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("🛑 Shutting down...");
  for (const [id, pool] of connectionPools) {
    console.log(`   Closing pool: ${id}`);
    await pool.close();
  }
  process.exit(0);
});
