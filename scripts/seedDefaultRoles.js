import "dotenv/config";

import AppDataSource from "../src/core/database/data-source.js";
import initializeRoles from "../src/core/database/initializeRoles.js";

const seedDefaultRoles = async () => {
  try {
    await AppDataSource.initialize();

    await initializeRoles();

    console.log("✅ Default roles seed completed successfully");
  } catch (error) {
    console.error("❌ Default roles seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
};

seedDefaultRoles();