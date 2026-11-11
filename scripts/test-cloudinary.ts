import { v2 as cloudinary } from "cloudinary";

async function testCloudinaryConnection() {
  console.log("==========================================");
  console.log("MAMA INTERIOR - Cloudinary Connection Test");
  console.log("==========================================");

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error("❌ Missing Cloudinary credentials in .env file!");
    console.error("Please ensure the following variables are set in admin/.env:");
    console.error(" - CLOUDINARY_CLOUD_NAME");
    console.error(" - CLOUDINARY_API_KEY");
    console.error(" - CLOUDINARY_API_SECRET");
    process.exit(1);
  }

  if (cloudName === "dev-cloud" || apiSecret === "dev-cloudinary-api-secret") {
    console.warn("⚠️ Warning: Your .env still contains placeholder credentials ('dev-cloud').");
    console.warn("Please replace them with your actual Cloudinary dashboard credentials.\n");
  }

  console.log(`Testing connection to Cloudinary account: "${cloudName}"...`);

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  try {
    // 1. Ping Cloudinary API
    const pingResult = await cloudinary.api.ping();
    console.log("✓ Cloudinary API Ping successful:", pingResult);

    // 2. Fetch Account Usage info
    const usage = await cloudinary.api.usage();
    console.log("\n✓ Connection Verified & Active! 🎉");
    console.log("------------------------------------------");
    console.log(`• Cloud Name:       ${cloudName}`);
    console.log(`• Plan:             ${usage.plan || "Free"}`);
    console.log(`• Storage Used:     ${usage.storage?.usage ? `${(usage.storage.usage / (1024 * 1024)).toFixed(2)} MB` : "0 MB"}`);
    console.log(`• Media Count:      ${usage.objects?.usage || 0} assets`);
    console.log(`• Bandwidth Used:   ${usage.bandwidth?.usage ? `${(usage.bandwidth.usage / (1024 * 1024)).toFixed(2)} MB` : "0 MB"}`);
    console.log("------------------------------------------");
    console.log("Your Cloudinary account is ready for uploads!\n");
  } catch (error) {
    console.error("\n❌ Cloudinary Connection Failed!");
    if (error && typeof error === "object" && "message" in error) {
      console.error(`Error details: ${(error as { message: string }).message}`);
      if ((error as { http_code?: number }).http_code === 401) {
        console.error("Hint: 401 Unauthorized indicates that your CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET is incorrect.");
      } else if ((error as { http_code?: number }).http_code === 404) {
        console.error("Hint: 404 Not Found indicates that your CLOUDINARY_CLOUD_NAME does not exist.");
      }
    } else {
      console.error("Unknown error:", error);
    }
    process.exit(1);
  }
}

testCloudinaryConnection();

