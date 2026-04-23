const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const runtimeDir = path.join(__dirname, '../runtime');
if (!fs.existsSync(runtimeDir)) fs.mkdirSync(runtimeDir, { recursive: true });

const urlFile = path.join(runtimeDir, 'cinema_public_base_url.txt');

console.log('Starting cloudflared tunnel...');
const cf = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', 'http://localhost:3000', '--ha-connections', '1']);

cf.stderr.on('data', (data) => {
    const msg = data.toString();
    process.stderr.write(msg);

    // Look for the trycloudflare URL
    const match = msg.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match) {
        const url = match[0];
        console.log('\n\x1b[32m%s\x1b[0m', `FOUND TUNNEL URL: ${url}`);
        fs.writeFileSync(urlFile, url);
        console.log(`Updated ${urlFile}`);
    }
});

cf.on('close', (code) => {
    console.log(`cloudflared process exited with code ${code}`);
});
