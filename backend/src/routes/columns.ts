import { Router, Request, Response } from "express";
import { authenticateUser } from "../middleware/auth.js";
import { getDatabaseConnector } from "../utils/database-connectors.js";
import { db } from "..";

const router = Router();

/**
 * GET /api/tenants/:tenantId/datasources/:dataSourceId/tables/:tableName/columns
 * Get columns information for a specific table
 */
router.get(
  "/tenants/:tenantId/datasources/:dataSourceId/tables/:tableName/columns",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { tenantId, dataSourceId, tableName } = req.params;

      // Get data source from Firestore
      const dataSourceDoc = await db
        .collection("tenants")
        .doc(tenantId)
        .collection("datasources")
        .doc(dataSourceId)
        .get();

      if (!dataSourceDoc.exists) {
        return res.status(404).json({
          error: "Data source not found",
        });
      }

      const dataSource = dataSourceDoc.data();

      if (!dataSource) {
        return res.status(404).json({
          error: "Data source data not found",
        });
      }

      // Get connector
      const connector = getDatabaseConnector(
        dataSource.type,
        dataSource.connection
      );

      // Get columns information
      const columns = await connector.getColumns(tableName);

      res.json({
        success: true,
        columns,
        tableName,
      });
    } catch (error: any) {
      console.error("Error getting columns:", error);
      res.status(500).json({
        error: "Failed to get columns",
        message: error.message,
      });
    }
  }
);

export default router;
