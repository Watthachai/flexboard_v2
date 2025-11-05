/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Database Connection Testing Utilities
 *
 * Before using these connectors, install the required packages:
 * npm install mssql mysql2 pg mongodb
 */

interface ConnectionConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  schema?: string;
  ssl?: boolean;
  // Add other connection properties as needed
}

interface TestResult {
  success: boolean;
  message: string;
  availableTables?: string[];
  error?: string;
}

/**
 * Test SQL Server (MSSQL) Connection
 */
export async function testMSSQLConnection(
  config: ConnectionConfig
): Promise<TestResult> {
  try {
    // Dynamic import to avoid errors if package not installed
    const sql = await import("mssql");
    const mssql = sql.default || sql;

    console.log("🔵 Testing MSSQL connection:", {
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
    });

    const poolConfig: any = {
      user: config.username,
      password: config.password,
      server: config.host || "localhost",
      port: config.port || 1433,
      database: config.database,
      options: {
        encrypt: true, // For Azure
        trustServerCertificate: true, // For local dev
        enableArithAbort: true,
      },
      connectionTimeout: 10000, // 10 seconds
      requestTimeout: 10000,
    };

    console.log("🔵 Connecting to MSSQL...");
    const pool = await mssql.connect(poolConfig);

    console.log("✅ MSSQL Connected! Fetching tables...");

    // Get list of tables
    const result = await pool
      .request()
      .query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'${
          config.schema ? ` AND TABLE_SCHEMA = '${config.schema}'` : ""
        } ORDER BY TABLE_NAME`
      );

    const tables = result.recordset.map((row: any) => row.TABLE_NAME);

    await pool.close();

    console.log("✅ MSSQL Test successful! Tables:", tables.length);

    return {
      success: true,
      message: `Connected successfully! Found ${tables.length} tables`,
      availableTables: tables,
    };
  } catch (error: any) {
    console.error("❌ MSSQL Connection failed:", error.message);
    return {
      success: false,
      message: `Connection failed: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * Test MySQL Connection
 */
export async function testMySQLConnection(
  config: ConnectionConfig
): Promise<TestResult> {
  try {
    const mysql = await import("mysql2/promise");

    console.log("🔵 Testing MySQL connection:", {
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
    });

    const connection = await mysql.createConnection({
      host: config.host || "localhost",
      port: config.port || 3306,
      user: config.username,
      password: config.password,
      database: config.database,
      connectTimeout: 10000,
    });

    console.log("✅ MySQL Connected! Fetching tables...");

    const [rows] = await connection.query("SHOW TABLES");
    const tables = (rows as any[]).map(
      (row) => Object.values(row)[0] as string
    );

    await connection.end();

    console.log("✅ MySQL Test successful! Tables:", tables.length);

    return {
      success: true,
      message: `Connected successfully! Found ${tables.length} tables`,
      availableTables: tables,
    };
  } catch (error: any) {
    console.error("❌ MySQL Connection failed:", error.message);
    return {
      success: false,
      message: `Connection failed: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * Test PostgreSQL Connection
 */
export async function testPostgreSQLConnection(
  config: ConnectionConfig
): Promise<TestResult> {
  try {
    const { Client } = await import("pg");

    console.log("🔵 Testing PostgreSQL connection:", {
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
    });

    const client = new Client({
      host: config.host || "localhost",
      port: config.port || 5432,
      user: config.username,
      password: config.password,
      database: config.database,
      connectionTimeoutMillis: 10000,
    });

    await client.connect();

    console.log("✅ PostgreSQL Connected! Fetching tables...");

    const result = await client.query(
      `SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema' ORDER BY tablename`
    );

    const tables = result.rows.map((row: { tablename: any }) => row.tablename);

    await client.end();

    console.log("✅ PostgreSQL Test successful! Tables:", tables.length);

    return {
      success: true,
      message: `Connected successfully! Found ${tables.length} tables`,
      availableTables: tables,
    };
  } catch (error: any) {
    console.error("❌ PostgreSQL Connection failed:", error.message);
    return {
      success: false,
      message: `Connection failed: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * Test MongoDB Connection
 */
export async function testMongoDBConnection(
  config: ConnectionConfig
): Promise<TestResult> {
  try {
    const { MongoClient } = await import("mongodb");

    console.log("🔵 Testing MongoDB connection:", {
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
    });

    const uri =
      config.username && config.password
        ? `mongodb://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`
        : `mongodb://${config.host}:${config.port}/${config.database}`;

    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    await client.connect();

    console.log("✅ MongoDB Connected! Fetching collections...");

    const db = client.db(config.database);
    const collections = await db.listCollections().toArray();
    const tables = collections.map((col) => col.name);

    await client.close();

    console.log("✅ MongoDB Test successful! Collections:", tables.length);

    return {
      success: true,
      message: `Connected successfully! Found ${tables.length} collections`,
      availableTables: tables,
    };
  } catch (error: any) {
    console.error("❌ MongoDB Connection failed:", error.message);
    return {
      success: false,
      message: `Connection failed: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * Main function to test any database connection
 */
export async function testDatabaseConnection(
  type: string,
  config: ConnectionConfig
): Promise<TestResult> {
  console.log(`\n🔵 ===== Testing ${type.toUpperCase()} Connection =====`);
  console.log("Config:", {
    ...config,
    password: config.password ? "***hidden***" : undefined,
  });

  try {
    switch (type) {
      case "mssql":
        return await testMSSQLConnection(config);

      case "mysql":
        return await testMySQLConnection(config);

      case "postgresql":
        return await testPostgreSQLConnection(config);

      case "mongodb":
        return await testMongoDBConnection(config);

      default:
        console.log(`⚠️ Database type '${type}' not yet implemented`);
        return {
          success: false,
          message: `Database type '${type}' connection testing not yet implemented`,
        };
    }
  } catch (error: any) {
    console.error("❌ Unexpected error:", error);
    return {
      success: false,
      message: `Unexpected error: ${error.message}`,
      error: error.message,
    };
  }
}

/**
 * Execute Query on Database
 */
export async function executeQuery(
  type: string,
  config: ConnectionConfig,
  query: string
): Promise<{
  data: any[];
  columns: string[];
  rowCount: number;
  totalRecords?: number;
}> {
  try {
    if (type === "mssql") {
      const sql = await import("mssql");
      const mssql = sql.default || sql;

      const pool = await mssql.connect({
        server: config.host || "",
        port: config.port || 1433,
        database: config.database || "",
        user: config.username || "",
        password: config.password || "",
        options: {
          encrypt: config.ssl !== false,
          trustServerCertificate: true,
        },
      });

      const result = await pool.request().query(query);
      await pool.close();

      return {
        data: result.recordset || [],
        columns:
          result.recordset.length > 0 ? Object.keys(result.recordset[0]) : [],
        rowCount: result.recordset.length,
      };
    } else if (type === "mysql") {
      const mysql = await import("mysql2/promise");

      const connection = await mysql.createConnection({
        host: config.host || "",
        port: config.port || 3306,
        user: config.username || "",
        password: config.password || "",
        database: config.database || "",
      });

      const [rows] = await connection.execute(query);
      await connection.end();

      const data = Array.isArray(rows) ? rows : [];
      return {
        data,
        columns: data.length > 0 ? Object.keys(data[0]) : [],
        rowCount: data.length,
      };
    } else if (type === "postgresql") {
      const { Client } = await import("pg");

      const client = new Client({
        host: config.host || "",
        port: config.port || 5432,
        user: config.username || "",
        password: config.password || "",
        database: config.database || "",
      });

      await client.connect();
      const result = await client.query(query);
      await client.end();

      return {
        data: result.rows || [],
        columns: result.fields?.map((f) => f.name) || [],
        rowCount: result.rowCount || 0,
      };
    } else if (type === "mongodb") {
      throw new Error("MongoDB query execution not yet implemented");
    }

    throw new Error(`Unsupported database type: ${type}`);
  } catch (error: any) {
    console.error("❌ Query execution error:", error);
    throw error;
  }
}
