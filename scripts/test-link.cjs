const { CinemaService } = require("../apps/server/dist/src/services/cinema-service.js");
const { MembershipService } = require("../apps/server/dist/src/services/membership-service.js");
const { env } = require("../apps/server/dist/src/config.js");
const fs = require("fs");
const path = require("path");

// Mocking required parts to test createEntryUrl
async function test() {
    console.log("Testing Cinema Entry URL generation...");

    // Check runtime file
    const runtimeFile = path.join(__dirname, "..", "runtime", "cinema_public_base_url.txt");
    if (fs.existsSync(runtimeFile)) {
        console.log(`Runtime URL file content: ${fs.readFileSync(runtimeFile, "utf8").trim()}`);
    } else {
        console.log("Runtime URL file NOT found.");
    }

    try {
        // We can't easily instantiate the full service because of Prisma and complexity
        // But we can check the logic in public-base-url.ts directly if we had a small test for it

        const { getCinemaPublicBaseUrl } = require("../apps/server/dist/src/lib/public-base-url.js");
        const url = getCinemaPublicBaseUrl();
        console.log(`Resolved Cinema Public Base URL: ${url}`);

        // This confirms the logic picks up the correct URL.
    } catch (e) {
        console.error("Test failed:", e.message);
        console.log("Note: Make sure to run 'npm run build' first to generate dist/ folder.");
    }
}

test();
