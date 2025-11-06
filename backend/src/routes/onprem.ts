/* eslint-disable @typescript-eslint/no-explicit-any */
import { Router } from "express";
import { z } from "zod";
import { db } from "../index";

export const onpremRouter = Router();

// ===== Middleware: Validate API Key =====
async function validateApiKey(req: any, res: any, next: any) {
  try {
    const apiKey = req.headers["x-api-key"];
    const tenantId = req.headers["x-tenant-id"] || req.params.tenantId;

    if (!apiKey) {
      return res.status(401).json({
        error: "Unauthorized: No API key provided",
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        error: "Bad Request: No tenant ID provided",
      });
    }

    // Validate API key in Firestore
    const apiKeyDoc = await db
      .collection("tenants")
      .doc(tenantId)
      .collection("apiKeys")
      .doc(apiKey)
      .get();

    if (!apiKeyDoc.exists) {
      return res.status(401).json({
        error: "Unauthorized: Invalid API key",
      });
    }

    const apiKeyData = apiKeyDoc.data();

    // Check if API key is active
    if (!apiKeyData?.isActive) {
      return res.status(401).json({
        error: "Unauthorized: API key is inactive",
      });
    }

    // Check if API key is expired
    if (apiKeyData.expiresAt && apiKeyData.expiresAt.toDate() < new Date()) {
      return res.status(401).json({
        error: "Unauthorized: API key has expired",
      });
    }

    // Attach tenant info to request
    req.tenantId = tenantId;
    req.apiKey = apiKey;
    req.allowedTags = apiKeyData?.allowedTags || []; // Attach allowed tags

    next();
  } catch (error: any) {
    console.error("Error validating API key:", error);
    res.status(500).json({ error: error.message });
  }
}

// ===== POST /api/onprem/authenticate =====
const AuthenticateSchema = z.object({
  apiKey: z.string(),
});

onpremRouter.post("/authenticate", async (req, res) => {
  try {
    const { apiKey } = AuthenticateSchema.parse(req.body);

    // Search for API key across all tenants
    const tenantsSnapshot = await db.collection("tenants").get();

    let foundTenant: any = null;
    let foundApiKeyData: any = null;

    // Search through all tenants for this API key
    for (const tenantDoc of tenantsSnapshot.docs) {
      const apiKeyDoc = await db
        .collection("tenants")
        .doc(tenantDoc.id)
        .collection("apiKeys")
        .doc(apiKey)
        .get();

      if (apiKeyDoc.exists) {
        foundTenant = { id: tenantDoc.id, ...tenantDoc.data() };
        foundApiKeyData = apiKeyDoc.data();
        break;
      }
    }

    if (!foundTenant || !foundApiKeyData) {
      return res.status(401).json({
        success: false,
        error: "Invalid API key",
      });
    }

    // Check if active
    if (!foundApiKeyData.isActive) {
      return res.status(401).json({
        success: false,
        error: "API key is inactive",
      });
    }

    // Check if expired
    if (
      foundApiKeyData.expiresAt &&
      foundApiKeyData.expiresAt.toDate() < new Date()
    ) {
      return res.status(401).json({
        success: false,
        error: "API key has expired",
      });
    }

    // Check activation limit
    const maxActivations = foundApiKeyData.maxActivations;
    const activationCount = foundApiKeyData.activationCount || 0;

    if (maxActivations !== null && maxActivations !== undefined) {
      if (activationCount >= maxActivations) {
        return res.status(401).json({
          success: false,
          error: `API key has reached maximum activation limit (${maxActivations})`,
        });
      }
    }

    // Track activation
    const clientIP = req.ip || req.headers["x-forwarded-for"] || "unknown";
    const activationEntry = {
      timestamp: new Date().toISOString(),
      ip: clientIP,
      userAgent: req.headers["user-agent"] || "unknown",
    };

    // Update activation count and log
    await db
      .collection("tenants")
      .doc(foundTenant.id)
      .collection("apiKeys")
      .doc(apiKey)
      .update({
        activationCount: (activationCount || 0) + 1,
        lastActivatedAt: new Date(),
        activationLog: [
          ...(foundApiKeyData.activationLog || []),
          activationEntry,
        ].slice(-10), // Keep last 10 activations
      });

    console.log(
      `✅ API Key activated for tenant ${foundTenant.id} (Count: ${
        activationCount + 1
      })`
    );

    // Return tenant info with allowed tags
    res.json({
      success: true,
      tenant: foundTenant,
      allowedTags: foundApiKeyData.allowedTags || [],
    });
  } catch (error: any) {
    console.error("Error authenticating:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== GET /api/onprem/config =====
// Get tenant configuration (for initial setup)
onpremRouter.get("/config", validateApiKey, async (req: any, res) => {
  try {
    const { tenantId } = req;

    const tenantDoc = await db.collection("tenants").doc(tenantId).get();

    if (!tenantDoc.exists) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    res.json({
      tenant: {
        id: tenantDoc.id,
        ...tenantDoc.data(),
      },
    });
  } catch (error: any) {
    console.error("Error getting config:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== GET /api/onprem/dashboards =====
// Get all dashboards for OnPrem (filtered by allowed tags)
onpremRouter.get("/dashboards", validateApiKey, async (req: any, res) => {
  try {
    const { tenantId, allowedTags } = req;

    const dashboardsSnapshot = await db
      .collection("tenants")
      .doc(tenantId)
      .collection("dashboards")
      .get();

    let dashboards = dashboardsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter dashboards by allowed tags (if specified)
    if (allowedTags && allowedTags.length > 0) {
      dashboards = dashboards.filter((dashboard: any) => {
        const dashboardTags = dashboard.tags || [];
        // Check if dashboard has at least one allowed tag
        return dashboardTags.some((tag: string) => allowedTags.includes(tag));
      });

      console.log(
        `🔍 [OnPrem] Filtered dashboards by tags ${JSON.stringify(
          allowedTags
        )}: ${dashboards.length} dashboards`
      );
    } else {
      console.log(
        `🔍 [OnPrem] No tag filter - returning all ${dashboards.length} dashboards`
      );
    }

    res.json(dashboards);
  } catch (error: any) {
    console.error("Error getting dashboards:", error);
    res.status(500).json({ error: error.message });
  }
});

// ===== GET /api/onprem/dashboards/:dashboardId/version =====
// Get active version for a dashboard
onpremRouter.get(
  "/dashboards/:dashboardId/version",
  validateApiKey,
  async (req: any, res) => {
    try {
      const { tenantId } = req;
      const { dashboardId } = req.params;

      console.log(
        `🔍 [OnPrem] Getting dashboard version for: ${dashboardId}, tenant: ${tenantId}`
      );

      // Get dashboard document to find currentVersion
      const dashboardDoc = await db
        .collection("tenants")
        .doc(tenantId)
        .collection("dashboards")
        .doc(dashboardId)
        .get();

      if (!dashboardDoc.exists) {
        console.log(`❌ [OnPrem] Dashboard not found: ${dashboardId}`);
        return res.status(404).json({ error: "Dashboard not found" });
      }

      const dashboardData = dashboardDoc.data();
      const currentVersion = dashboardData?.currentVersion;

      if (!currentVersion) {
        console.log(
          `❌ [OnPrem] No currentVersion field in dashboard: ${dashboardId}`
        );
        return res.status(404).json({ error: "No current version set" });
      }

      console.log(`📌 [OnPrem] Current version: ${currentVersion}`);

      // Get the specific version document
      const versionDoc = await db
        .collection("tenants")
        .doc(tenantId)
        .collection("dashboards")
        .doc(dashboardId)
        .collection("versions")
        .doc(currentVersion)
        .get();

      if (!versionDoc.exists) {
        console.log(`❌ [OnPrem] Version not found: ${currentVersion}`);
        return res.status(404).json({ error: "Version not found" });
      }

      console.log(`✅ [OnPrem] Returning version: ${currentVersion}`);
      res.json({
        id: versionDoc.id,
        ...versionDoc.data(),
      });
    } catch (error: any) {
      console.error("Error getting dashboard version:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== GET /api/onprem/datasources/:dataSourceId =====
// Get data source details
onpremRouter.get(
  "/datasources/:dataSourceId",
  validateApiKey,
  async (req: any, res) => {
    try {
      const { tenantId } = req;
      const { dataSourceId } = req.params;

      console.log(
        `🔍 [OnPrem] Getting datasource: ${dataSourceId} for tenant: ${tenantId}`
      );

      const dsDoc = await db
        .doc(`tenants/${tenantId}/datasources/${dataSourceId}`)
        .get();

      if (!dsDoc.exists) {
        console.log(`❌ [OnPrem] Data source not found: ${dataSourceId}`);
        return res.status(404).json({ error: "Data source not found" });
      }

      console.log(`✅ [OnPrem] Data source found: ${dataSourceId}`);
      res.json({
        id: dsDoc.id,
        ...dsDoc.data(),
      });
    } catch (error: any) {
      console.error("Error getting data source:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// ===== POST /api/onprem/datasources/:dataSourceId/query =====
// Execute query on data source
onpremRouter.post(
  "/datasources/:dataSourceId/query",
  validateApiKey,
  async (req: any, res) => {
    try {
      const { tenantId } = req;
      const { dataSourceId } = req.params;
      const { query } = req.body;

      // Get data source config
      const dsDoc = await db
        .doc(`tenants/${tenantId}/datasources/${dataSourceId}`)
        .get();

      if (!dsDoc.exists) {
        return res.status(404).json({ error: "Data source not found" });
      }

      const dsData = dsDoc.data();
      if (!dsData) {
        return res.status(404).json({ error: "Data source data not found" });
      }

      console.log(
        `🔍 [OnPrem] Datasource data:`,
        JSON.stringify(dsData, null, 2)
      );
      console.log(
        `🔍 [OnPrem] Type: ${dsData.type}, Connection:`,
        dsData.connection
      );
      console.log(`📝 [OnPrem] Query received:`, query);

      // Import database connector
      const { executeQuery } = await import("../utils/database-connectors");

      // Execute query with timeout (use 'connection' not 'config')
      console.log(`⏳ [OnPrem] Executing query...`);
      const startTime = Date.now();

      const result = await executeQuery(dsData.type, dsData.connection, query);

      const duration = Date.now() - startTime;
      console.log(`✅ [OnPrem] Query executed successfully in ${duration}ms`);
      console.log(`📊 [OnPrem] Returned ${result.data?.length || 0} rows`);

      res.json(result);
    } catch (error: any) {
      console.error("❌ Query execution error:", error);
      console.error("Stack trace:", error.stack);
      res.status(500).json({ error: error.message });
    }
  }
);

export { validateApiKey };
