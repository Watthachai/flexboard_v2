import express, { Request, Response } from "express";
import { getFirestore } from "../index.js";
import { authenticateUser } from "../middleware/auth.js";
import crypto from "crypto";

const apiTokensRouter = express.Router({ mergeParams: true });

// Apply authentication middleware to all routes
apiTokensRouter.use(authenticateUser);

// Encryption key - ควรเก็บใน environment variable
const ENCRYPTION_KEY =
  process.env.API_TOKEN_ENCRYPTION_KEY ||
  "default-key-change-this-in-production";
const ALGORITHM = "aes-256-cbc";

// Encrypt token
function encryptToken(token: string): { encrypted: string; iv: string } {
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  return { encrypted, iv: iv.toString("hex") };
}

// Decrypt token
function decryptToken(encrypted: string, ivHex: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// GET /api/tenants/:tenantId/api-tokens
// Get all API token names (not values) for a tenant
apiTokensRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const db = getFirestore();

    const tenantDoc = await db.collection("tenants").doc(tenantId).get();

    if (!tenantDoc.exists) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    const tenantData = tenantDoc.data();
    const apiTokens = tenantData?.apiTokens || {};

    // Return only token names, not values
    const tokenNames = Object.keys(apiTokens);

    res.json({ tokens: tokenNames });
  } catch (error: any) {
    console.error("Error fetching API tokens:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tenants/:tenantId/api-tokens
// Add or update an API token
apiTokensRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { name, token } = req.body;

    if (!name || !token) {
      return res.status(400).json({ error: "Name and token are required" });
    }

    const db = getFirestore();
    const tenantRef = db.collection("tenants").doc(tenantId);
    const tenantDoc = await tenantRef.get();

    if (!tenantDoc.exists) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    // Encrypt the token
    const { encrypted, iv } = encryptToken(token);

    // Update tenant document
    await tenantRef.update({
      [`apiTokens.${name}`]: {
        encrypted,
        iv,
        updatedAt: new Date().toISOString(),
      },
    });

    res.json({ message: "API token saved successfully", name });
  } catch (error: any) {
    console.error("Error saving API token:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tenants/:tenantId/api-tokens/:name
// Get a specific API token (decrypted)
apiTokensRouter.get("/:name", async (req: Request, res: Response) => {
  try {
    const { tenantId, name } = req.params;
    const db = getFirestore();

    const tenantDoc = await db.collection("tenants").doc(tenantId).get();

    if (!tenantDoc.exists) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    const tenantData = tenantDoc.data();
    const tokenData = tenantData?.apiTokens?.[name];

    if (!tokenData) {
      return res.status(404).json({ error: "API token not found" });
    }

    // Decrypt the token
    const decrypted = decryptToken(tokenData.encrypted, tokenData.iv);

    res.json({ name, token: decrypted });
  } catch (error: any) {
    console.error("Error fetching API token:", error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tenants/:tenantId/api-tokens/:name
// Delete an API token
apiTokensRouter.delete("/:name", async (req: Request, res: Response) => {
  try {
    const { tenantId, name } = req.params;
    const db = getFirestore();

    const tenantRef = db.collection("tenants").doc(tenantId);
    const tenantDoc = await tenantRef.get();

    if (!tenantDoc.exists) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    // Remove the token
    await tenantRef.update({
      [`apiTokens.${name}`]: null,
    });

    res.json({ message: "API token deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting API token:", error);
    res.status(500).json({ error: error.message });
  }
});

export { apiTokensRouter };
