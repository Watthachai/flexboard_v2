/**
 * Utility script to manually set super admin claims
 * Run with: npx tsx src/set-super-admin.ts <email>
 */

import admin from "firebase-admin";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Determine environment
const environment =
  process.env.NODE_ENV === "development" ? "sandbox" : "production";
const serviceAccountEnvKey =
  environment === "sandbox"
    ? "FIREBASE_SERVICE_ACCOUNT_SANDBOX"
    : "FIREBASE_SERVICE_ACCOUNT_PRODUCTION";

console.log(`🌍 Environment: ${environment}`);

// Initialize Firebase Admin
if (process.env[serviceAccountEnvKey]) {
  const serviceAccount = JSON.parse(process.env[serviceAccountEnvKey]);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
  console.log(`✅ Firebase initialized with ${environment} service account`);
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase initialized with legacy service account");
} else {
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
    console.error(`❌ Error: Cannot find Firebase credentials`);
    process.exit(1);
  }
}

async function setSuperAdmin(email: string) {
  try {
    console.log(`\n🔍 Looking for user with email: ${email}`);

    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);

    console.log(`✅ Found user: ${userRecord.uid}`);
    console.log(`   Email: ${userRecord.email}`);
    console.log(`   Display Name: ${userRecord.displayName || "N/A"}`);

    // Current claims
    console.log(
      `\n📋 Current claims:`,
      JSON.stringify(userRecord.customClaims, null, 2)
    );

    // Set super admin claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      isSuperAdmin: true,
      isAdmin: true,
      role: "admin",
    });

    console.log(`\n✅ Successfully set super admin claims for ${email}`);
    console.log(`\n📋 New claims:`);
    console.log(
      JSON.stringify(
        {
          isSuperAdmin: true,
          isAdmin: true,
          role: "admin",
        },
        null,
        2
      )
    );
    console.log(
      `\n⚠️  User needs to sign out and sign in again to get new token\n`
    );

    process.exit(0);
  } catch (error: any) {
    console.error(`❌ Error:`, error.message);
    process.exit(1);
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error("❌ Error: Email is required");
  console.log("\nUsage: npx tsx src/set-super-admin.ts <email>");
  console.log("Example: npx tsx src/set-super-admin.ts wattchaichai@gmail.com");
  process.exit(1);
}

setSuperAdmin(email);
