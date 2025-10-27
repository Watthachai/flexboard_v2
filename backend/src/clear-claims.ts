/**
 * Utility Script: Clear Custom Claims
 *
 * ใช้สำหรับลบ Custom Claims ของ user ที่ถูกลบออกจาก tenant
 *
 * Usage:
 *   ts-node clear-claims.ts <userId>
 *
 * Example:
 *   ts-node clear-claims.ts ZmVbY8k98AgMItLszSiUVi9nTN82
 */

import * as admin from "firebase-admin";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Option 1: Use service account from environment variable
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  // Option 2: Use service account file
  try {
    const serviceAccount = require(path.join(
      __dirname,
      "../service_account_key.json"
    ));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error(
      "❌ Error: service_account_key.json not found and FIREBASE_SERVICE_ACCOUNT env not set"
    );
    process.exit(1);
  }
}

async function clearCustomClaims(userId: string) {
  try {
    console.log(`\n🔧 Clearing custom claims for user: ${userId}`);

    // Get current claims
    const user = await admin.auth().getUser(userId);
    console.log("📋 Current custom claims:", user.customClaims);

    // Clear claims
    await admin.auth().setCustomUserClaims(userId, {
      tenantId: null,
      role: null,
    });

    console.log("✅ Custom claims cleared successfully!");
    console.log("ℹ️  User must sign in again to get new token.");

    // Verify
    const updatedUser = await admin.auth().getUser(userId);
    console.log("📋 Updated custom claims:", updatedUser.customClaims);

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error clearing claims:", error.message);
    process.exit(1);
  }
}

// Get userId from command line
const userId = process.argv[2];

if (!userId) {
  console.error("❌ Error: Please provide userId");
  console.log("\nUsage:");
  console.log("  ts-node clear-claims.ts <userId>");
  console.log("\nExample:");
  console.log("  ts-node clear-claims.ts ZmVbY8k98AgMItLszSiUVi9nTN82");
  process.exit(1);
}

clearCustomClaims(userId);
