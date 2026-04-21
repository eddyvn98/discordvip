import { getCinemaPublicBaseUrl } from "../apps/server/src/lib/public-base-url.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function test() {
    console.log("--- Cinema Link Generation Test ---");

    // 1. Check runtime file
    const runtimeFile = path.resolve(__dirname, "../runtime/cinema_public_base_url.txt");
    console.log(`Checking runtime file: ${runtimeFile}`);

    if (fs.existsSync(runtimeFile)) {
        const content = fs.readFileSync(runtimeFile, "utf8").trim();
        console.log(`[File System] Current runtime URL: ${content}`);
    } else {
        console.log("[File System] Runtime URL file NOT found.");
    }

    try {
        // 2. Resolve via logic
        const resolvedUrl = getCinemaPublicBaseUrl();
        console.log(`[Logic] Resolved Public Base URL: ${resolvedUrl}`);

        if (fs.existsSync(runtimeFile)) {
            const content = fs.readFileSync(runtimeFile, "utf8").trim();
            if (resolvedUrl === content) {
                console.log("✅ SUCCESS: Logic correctly used the runtime file URL.");
            } else {
                console.log("❌ FAILURE: Logic did NOT match the runtime file URL.");
            }
        }
    } catch (e) {
        console.error("Test error:", e.message);
    }
    console.log("------------------------------------");
}

test();
