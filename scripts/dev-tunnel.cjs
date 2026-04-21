const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
const serverPort = "8081"; // User confirmed Docker, so we tunnel the Nginx gateway
const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const targetUrl = `http://192.168.1.13:${serverPort}`;

let currentUrl = "";
let tunnelProcess = null;
let devProcess = null;
let watchdogInterval = null;
let healthCheckFailures = 0;

function updateEnv(url) {
    let content = "";
    try {
        content = fs.readFileSync(envPath, "utf-8");
    } catch (e) {
        if (e.code !== "ENOENT") throw e;
    }

    const baseUrlRegex = /^PUBLIC_BASE_URL=.*$/m;
    if (baseUrlRegex.test(content)) {
        content = content.replace(baseUrlRegex, `PUBLIC_BASE_URL=${url}`);
    } else {
        content += `\nPUBLIC_BASE_URL=${url}\n`;
    }

    fs.writeFileSync(envPath, content);
    console.log(`[Auto-Tunnel] Updated .env with PUBLIC_BASE_URL = ${url}`);

    // Update runtime file for Docker
    const runtimeDir = path.join(__dirname, "..", "runtime");
    const runtimeFile = path.join(runtimeDir, "cinema_public_base_url.txt");
    try {
        if (!fs.existsSync(runtimeDir)) fs.mkdirSync(runtimeDir, { recursive: true });
        fs.writeFileSync(runtimeFile, url);
    } catch (e) {
        console.error(`[Auto-Tunnel] Failed to update runtime file: ${e.message}`);
    }
}

async function checkTunnelHealth() {
    if (!currentUrl) return;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`${currentUrl}/health`, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
            if (healthCheckFailures > 0) console.log(`[Watchdog] Tunnel is healthy again.`);
            healthCheckFailures = 0;
            return true;
        }
        console.warn(`[Watchdog] Health check failed: HTTP ${res.status}`);
    } catch (e) {
        console.warn(`[Watchdog] Health check error: ${e.message}`);
    }

    healthCheckFailures++;
    if (healthCheckFailures >= 3) {
        console.error(`[Watchdog] Tunnel appears dead (3 failures). Restarting...`);
        restartTunnel();
    }
    return false;
}

function spawnCloudflared() {
    console.log(`[Auto-Tunnel] Starting cloudflared tunnel to ${targetUrl} (protocol: http2)...`);

    const proc = spawn(npxCmd, [
        "cloudflared",
        "tunnel",
        "--url", targetUrl,
        "--protocol", "http2"
    ], { stdio: ["ignore", "pipe", "pipe"], shell: true });

    proc.stdout.on("data", (data) => process.stdout.write(data.toString()));

    proc.stderr.on("data", (data) => {
        const line = data.toString();
        process.stderr.write(line);

        const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (match && !currentUrl) {
            currentUrl = match[0];
            console.log(`\n[Auto-Tunnel] Found NEW tunnel URL: ${currentUrl}`);
            updateEnv(currentUrl);

            if (!devProcess && !process.env.SKIP_DEV_SERVER) {
                console.log("[Auto-Tunnel] Starting local DEV server...\n");
                devProcess = spawn(npmCmd, ["run", "dev:server"], { stdio: "inherit", shell: true });
                devProcess.on("exit", (code) => {
                    console.log(`[Auto-Tunnel] Dev server exited. Shutting down...`);
                    cleanupAndExit(code || 0);
                });
            }
        }
    });

    proc.on("exit", (code) => {
        if (code !== 0 && !tunnelProcess) {
            console.log(`[Auto-Tunnel] Tunnel process exited with code ${code}.`);
        }
    });

    return proc;
}

function restartTunnel() {
    if (tunnelProcess) {
        tunnelProcess.kill();
        tunnelProcess = null;
    }
    currentUrl = "";
    healthCheckFailures = 0;
    tunnelProcess = spawnCloudflared();
}

function cleanupAndExit(code) {
    if (watchdogInterval) clearInterval(watchdogInterval);
    if (tunnelProcess) tunnelProcess.kill();
    if (devProcess) devProcess.kill();
    process.exit(code);
}

// Initial start
tunnelProcess = spawnCloudflared();

// Watchdog interval
watchdogInterval = setInterval(checkTunnelHealth, 60000);

process.on("SIGINT", () => {
    console.log("\n[Auto-Tunnel] Shutting down...");
    cleanupAndExit(0);
});

