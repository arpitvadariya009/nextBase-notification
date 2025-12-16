import dotenv from "dotenv";
import { startWorker } from "./notificationWorker.js";

dotenv.config();

async function main() {
    console.log("\n");
    console.log("╔════════════════════════════════════════════╗");
    console.log("║  🚀 Notification Worker Service           ║");
    console.log("╠════════════════════════════════════════════╣");
    console.log("║  Version: 1.0.0                            ║");
    console.log("║  Environment: " + (process.env.NODE_ENV || "development").padEnd(28) + "║");
    console.log("╚════════════════════════════════════════════╝");
    console.log("\n");

    try {
        await startWorker();
        console.log("\n✅ Worker service started successfully\n");
    } catch (error) {
        console.error("\n❌ Failed to start worker:", error);
        process.exit(1);
    }
}

main();