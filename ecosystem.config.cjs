const path = require('path');
const dotenv = require('dotenv');
const result = dotenv.config({ path: path.join(__dirname, '.env') });
console.log('PM2 loading .env result:', result.error ? 'FAILED' : 'SUCCESS');
if (result.parsed) {
  console.log('Loaded variables:', Object.keys(result.parsed).filter(k => k.startsWith('TELEGRAM_')));
}

module.exports = {
  apps: [
    {
      name: "app-server",
      script: "node",
      args: "D:\\nodejs\\node_modules\\npm\\bin\\npm-cli.js run dev",
      cwd: "d:\\discordvip-cinema-web\\apps\\server",
      env: process.env
    },
    {
      name: "telethon-stream",
      script: "C:\\Users\\hatha\\AppData\\Local\\Programs\\Python\\Python313\\python.exe",
      args: "telethon_stream_server.py",
      cwd: "d:\\discordvip-cinema-web\\scripts",
      interpreter: "none",
      env: {
        ...process.env,
        PYTHONPATH: "."
      }
    },
    /*
        {
          name: "telegram-bot-manager",
          script: "C:\\Users\\hatha\\AppData\\Local\\Programs\\Python\\Python313\\python.exe",
          args: "-u telegram_bot_manager.py",
          cwd: "d:\\discordvip-cinema-web\\scripts",
          interpreter: "none",
          env: {
            ...process.env,
            PYTHONPATH: "."
          }
        },
    */
    {
      name: "cloudflared-tunnel",
      script: "node",
      args: "scripts/run-tunnel.js",
      cwd: "d:\\discordvip-cinema-web",
      env: process.env
    }
  ]
}
