import admin from "firebase-admin";
import { Firestore } from "@google-cloud/firestore";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables - .env.local overrides .env
// Load .env first as base
dotenv.config({ path: path.join(__dirname, "../.env") });
// Then override with .env.local if it exists
dotenv.config({ path: path.join(__dirname, "../.env.local"), override: true });

console.log("📁 Loaded environment files: .env and .env.local");

// Determine environment (default to production)
const environment =
  process.env.NODE_ENV === "development" ? "sandbox" : "production";
const serviceAccountEnvKey =
  environment === "sandbox"
    ? "FIREBASE_SERVICE_ACCOUNT_SANDBOX"
    : "FIREBASE_SERVICE_ACCOUNT_PRODUCTION";

console.log(`🌍 Environment: ${environment}`);
console.log(`🔑 Using: ${serviceAccountEnvKey}`);
console.log(
  `🤖 Gemini API Key: ${process.env.GEMINI_API_KEY ? "✅ Set" : "❌ Not Set"}`
);

// Parse service account for reuse
let serviceAccount: any = null;

// Initialize Firebase Admin
if (process.env[serviceAccountEnvKey]) {
  // Use environment-specific service account
  serviceAccount = JSON.parse(process.env[serviceAccountEnvKey]);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  console.log(`✅ Firebase initialized with ${environment} service account`);
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Fallback to legacy FIREBASE_SERVICE_ACCOUNT
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  serviceAccountCredentials = serviceAccount;

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase initialized with legacy service account");
} else {
  // Try to use service account file for flexboard-v2
  try {
    const serviceAccount = require(path.join(
      __dirname,
      "../flexboard-v2-firebase-adminsdk-fbsvc-fca7f36834.json"
    ));
    serviceAccountCredentials = serviceAccount;

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log(
      "✅ Firebase initialized with flexboard-v2 service account file"
    );
  } catch (error) {
    console.error(
      `❌ Error: ${serviceAccountEnvKey} not found in environment variables and flexboard-v2 service account file not found`
    );
    console.error(`   Please set ${serviceAccountEnvKey} in .env file`);
    process.exit(1);
  }
}

// Export Firestore instance with specific database
const databaseId = process.env.FIRESTORE_DATABASE_ID;

// Helper function to get the correct Firestore instance
export const getFirestore = (): Firestore => {
  if (databaseId && databaseId !== "(default)") {
    console.log(`📊 Using Firestore database: ${databaseId}`);
    // Create Firestore instance with specific database
    if (serviceAccount) {
      // Use the service account credentials
      return new Firestore({
        projectId: admin.app().options.projectId,
        databaseId: databaseId,
        credentials: serviceAccount,
      });
    } else {
      // Fallback to using projectId only (will use application default credentials)
      return new Firestore({
        projectId: admin.app().options.projectId,
        databaseId: databaseId,
      });
    }
  }
  return admin.firestore();
};

// Export default db instance (for backward compatibility)
export const db = getFirestore();

console.log(
  `📊 Firestore configured for database: ${databaseId || "(default)"}`
);

// ===== Import Routes =====
import { authRouter } from "./routes/auth.js";
import inviteCodesRouter from "./routes/inviteCodes.js";
import configRouter from "./routes/config.js";
import { tenantsRouter } from "./routes/tanents.js"; // Fixed: Import tenantsRouter
import { dashboardsRouter } from "./routes/dashboards.js";
import { dataSourcesRouter } from "./routes/datasources.js";
import columnsRouter from "./routes/columns.js";
import adminUIRouter from "./routes/adminUIReact.js"; // ใช้ React version
import { onpremRouter } from "./routes/onprem.js"; // OnPrem API routes
import { apiKeysRouter } from "./routes/apiKeys.js"; // API Keys management
import aiAssistantRouter from "./routes/ai-assistant.js"; // AI Assistant routes
import chatHistoryRouter from "./routes/chat-history.js"; // Chat History routes
import { mockDataRouter } from "./routes/mockdata.js"; // Mock Data routes

// ===== Express App =====
const app = express();

// ===== Middleware =====
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.tailwindcss.com",
          "https://esm.sh",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://esm.sh"], // เพิ่ม esm.sh สำหรับ source maps
      },
    },
  })
);
app.use(
  cors({
    origin: [
      "http://localhost:9002",
      "http://localhost:3000",
      "http://localhost:5001",

      // FlexBoard Production
      "https://admin.fittflexb.com",
      "https://app.fittflexb.com",
      "https://api.fittflexb.com",

      // FlexBoard Staging
      "https://admin-staging.fittflexb.com",
      "https://app-staging.fittflexb.com",
      "https://api-staging.fittflexb.com",

      // Cloud Run default URLs (for testing)
      /^https:\/\/flexboard-.*\.run\.app$/,
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== Request Logging =====
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ===== Health Check =====
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "NAPP Backend API",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ===== API Routes =====
app.use("/api/auth", authRouter);
app.use("/api/onprem", onpremRouter); // OnPrem API routes
app.use("/api/tenants", tenantsRouter); // Fixed: Use tenantsRouter instead of configRouter
app.use("/api/tenants", dashboardsRouter); // Dashboard routes
app.use("/api/tenants", dataSourcesRouter); // Data source routes
app.use("/api/tenants/:tenantId/api-keys", apiKeysRouter); // API Keys management
app.use("/api", aiAssistantRouter); // AI Assistant routes
app.use("/api", chatHistoryRouter); // Chat History routes
app.use("/api", columnsRouter); // Columns routes
app.use("/api/tenants", mockDataRouter); // Mock data import and query routes

// Invite Codes Route
app.use("/api/invite-codes", inviteCodesRouter);

// Admin UI Route (HTML)
app.use("/admin", adminUIRouter);

// ===== 404 Handler =====
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found" });
});

// ===== Error Handler =====
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
  });
});

// ===== Start Server =====
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log("\n🚀FlexB Backend Server is running!");
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`🔐 API: http://localhost:${PORT}/api`);
  console.log("✅ Ready to accept requests!\n");
});

export default app;
