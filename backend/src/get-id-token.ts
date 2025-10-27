import * as admin from "firebase-admin";
import dotenv from "dotenv";
import path from "path";
import https from "https";

// Load environment variables
dotenv.config();

// Get environment from command line argument or default to sandbox
const envArg = process.argv[2]?.toLowerCase();
const environment =
  envArg === "production" || envArg === "prod" ? "production" : "sandbox";

// Firebase Configuration - Read from environment variables
const FIREBASE_CONFIGS = {
  sandbox: {
    apiKey: process.env.FIREBASE_SANDBOX_WEB_API_KEY,
    projectId: process.env.FIREBASE_SANDBOX_PROJECT_ID || "nappaint-dv",
    name: "Sandbox",
  },
  production: {
    apiKey: process.env.FIREBASE_PRODUCTION_WEB_API_KEY,
    projectId: process.env.FIREBASE_PRODUCTION_PROJECT_ID || "flexboard-466304",
    name: "Production",
  },
};

const config = FIREBASE_CONFIGS[environment];

// Validate API Key
if (!config.apiKey) {
  console.error(
    `\n❌ Error: ${environment.toUpperCase()} API Key not found in environment variables`
  );
  console.error(
    `   Please set FIREBASE_${environment.toUpperCase()}_WEB_API_KEY in .env file\n`
  );
  process.exit(1);
}

console.log(`\n🌍 Environment: ${config.name} (${config.projectId})`);

const FIREBASE_WEB_API_KEY = config.apiKey;

// Initialize Firebase Admin with correct project
const serviceAccountEnvKey =
  environment === "production"
    ? "FIREBASE_SERVICE_ACCOUNT_PRODUCTION"
    : "FIREBASE_SERVICE_ACCOUNT_SANDBOX";

const serviceAccountJson = process.env[serviceAccountEnvKey];

if (!serviceAccountJson) {
  console.error(
    `\n❌ Error: ${serviceAccountEnvKey} not found in environment variables`
  );
  console.error(`   Please set ${serviceAccountEnvKey} in .env file\n`);
  console.error(`💡 Hint: Copy the JSON content from Firebase Console:`);
  console.error(
    `   1. Go to Firebase Console > Project Settings > Service Accounts`
  );
  console.error(`   2. Click "Generate New Private Key"`);
  console.error(
    `   3. Copy the JSON content to ${serviceAccountEnvKey} in .env\n`
  );
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(serviceAccountJson);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: config.projectId,
  });
  console.log(`✅ Initialized Firebase Admin for ${config.name}`);
} catch (error) {
  console.error(`\n❌ Error: Failed to parse ${serviceAccountEnvKey}`);
  console.error(`   Please check that the JSON is valid in .env file\n`);
  process.exit(1);
}

async function getIdToken() {
  try {
    // Adjust argument positions after environment parameter
    const email = process.argv[3] || "superadmin@napp.local";
    const password = process.argv[4] || "SuperAdmin@123";

    console.log(`\n🔐 Getting ID Token for: ${email}`);

    // ตรวจสอบว่า user มีอยู่หรือไม่
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
      console.log(`✅ User found: ${user.uid}`);
    } catch (error) {
      console.log(`❌ User not found. Creating user...`);

      user = await admin.auth().createUser({
        email: email,
        password: password,
        emailVerified: true,
        displayName: "Super Admin",
      });

      console.log(`✅ User created: ${user.uid}`);
    }

    // Set admin claims
    await admin.auth().setCustomUserClaims(user.uid, {
      role: "admin",
      isAdmin: true,
      isSuperAdmin: true,
    });

    console.log(`✅ Admin claims set`);
    console.log(`⏳ Waiting for claims to propagate...`);

    // Wait for claims to propagate (important!)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Sign in with email/password to get ID token
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`;
    const data = JSON.stringify({
      email: email,
      password: password,
      returnSecureToken: true,
    });

    console.log(`\n🔄 Signing in to get ID token...`);

    const response = await new Promise<any>((resolve, reject) => {
      const req = https.request(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": data.length,
          },
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(body));
            } catch (e) {
              reject(e);
            }
          });
        }
      );

      req.on("error", reject);
      req.write(data);
      req.end();
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    const idToken = response.idToken;
    const refreshToken = response.refreshToken;
    const expiresIn = response.expiresIn;

    console.log(`\n✅ ID Token Generated Successfully!\n`);
    console.log(`════════════════════════════════════════════════════════`);
    console.log(`\n📋 ID TOKEN (copy this):\n`);
    console.log(idToken);
    console.log(`\n════════════════════════════════════════════════════════`);
    console.log(`\n📝 Details:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(
      `   Expires in: ${expiresIn} seconds (~${Math.floor(
        parseInt(expiresIn) / 60
      )} minutes)`
    );
    console.log(`\n🔄 Refresh Token (for getting new ID tokens):`);
    console.log(`   ${refreshToken}\n`);
    console.log(`\n💡 วิธีใช้:`);
    console.log(`   1. คัดลอก ID TOKEN ข้างบน`);
    console.log(
      `   2. ไปที่ https://sandbox-api-master.fittsystem.com/admin/invite-codes`
    );
    console.log(`   3. วาง token ในช่อง Authentication Token`);
    console.log(`   4. คลิก Login\n`);
    console.log(`\n📌 วิธีใช้คำสั่ง:`);
    console.log(
      `   Sandbox:    npm run get-id-token sandbox <email> <password>`
    );
    console.log(
      `   Production: npm run get-id-token production <email> <password>`
    );
    console.log(
      `   Default:    npm run get-id-token <email> <password> (= sandbox)\n`
    );
    console.log(`════════════════════════════════════════════════════════\n`);

    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Error:", error.message || error);
    process.exit(1);
  }
}

getIdToken();
