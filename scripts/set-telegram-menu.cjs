const fs = require("fs");
const path = require("path");

// Load .env
const envPath = path.join(__dirname, "..", ".env");
let env = {};
if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split("\n").forEach(line => {
        const [key, ...value] = line.split("=");
        if (key && value) env[key.trim()] = value.join("=").trim();
    });
}

const botToken = env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
    console.error("Error: TELEGRAM_BOT_TOKEN not found in .env");
    process.exit(1);
}

// Get the latest URL from runtime file
const runtimeFile = path.join(__dirname, "..", "runtime", "cinema_public_base_url.txt");
let baseUrl = "";
if (fs.existsSync(runtimeFile)) {
    baseUrl = fs.readFileSync(runtimeFile, "utf-8").trim();
} else {
    baseUrl = env.PUBLIC_BASE_URL;
}

if (!baseUrl) {
    console.error("Error: No public base URL found in runtime or .env");
    process.exit(1);
}

const webAppUrl = `${baseUrl}/cinema/`;

async function setMenuButton() {
    console.log(`Setting Bot Menu Button to: ${webAppUrl}`);
    const response = await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            menu_button: {
                type: "web_app",
                text: "Cinema VIP",
                web_app: { url: webAppUrl }
            }
        })
    });

    const data = await response.json();
    if (data.ok) {
        console.log("Success: Telegram Bot Menu Button updated!");
    } else {
        console.error("Error setting menu button:", data.description);
    }
}

setMenuButton();
