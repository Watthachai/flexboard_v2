import admin from "firebase-admin";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Determine environment (default to production)
const environment =
  process.env.NODE_ENV === "development" ? "sandbox" : "production";
const serviceAccountEnvKey =
  environment === "sandbox"
    ? "FIREBASE_SERVICE_ACCOUNT_SANDBOX"
    : "FIREBASE_SERVICE_ACCOUNT_PRODUCTION";

console.log(`🌍 Environment: ${environment}`);
console.log(`🔑 Using: ${serviceAccountEnvKey}`);

// Initialize Firebase Admin
if (process.env[serviceAccountEnvKey]) {
  // Use environment-specific service account
  const serviceAccount = JSON.parse(process.env[serviceAccountEnvKey]);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  console.log(`✅ Firebase initialized with ${environment} service account`);
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Fallback to legacy FIREBASE_SERVICE_ACCOUNT
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase initialized with legacy service account");
} else {
  // Try to use service account file
  try {
    const serviceAccount = require(path.join(
      __dirname,
      "../service_account_key.json"
    ));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase initialized with service_account_key.json");
  } catch (error) {
    console.error(
      `❌ Error: ${serviceAccountEnvKey} not found in environment variables and service_account_key.json not found`
    );
    console.error(`   Please set ${serviceAccountEnvKey} in .env file`);
    process.exit(1);
  }
}

// Export Firestore instance
export const db = admin.firestore();

// ===== Import Routes =====
import { authRouter } from "./routes/auth";
import inviteCodesRouter from "./routes/inviteCodes";
import configRouter from "./routes/config";
import adminUIRouter from "./routes/adminUIReact"; // ใช้ React version

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

      // Production Frontend
      //"https://nappaint.fittsystem.com",
      // Staging Frontend
      //"https://sandbox-nappaint.fittsystem.com",
    ],
    credentials: true,
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
app.use("/api/tenants", configRouter);

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
  console.log("\n🚀 NAPP Backend Server is running!");
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`🔐 API: http://localhost:${PORT}/api`);
  console.log("✅ Ready to accept requests!\n");
});

export default app;
