const { Client, GatewayIntentBits, Events } = require("discord.js");
const token = process.env.DISCORD_TOKEN;
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const timeout = setTimeout(() => {
  console.log("TIMEOUT_NO_READY");
  client.destroy();
  process.exit(2);
}, 20000);
client.once(Events.ClientReady, () => {
  clearTimeout(timeout);
  console.log("READY", client.user?.tag);
  client.destroy();
  process.exit(0);
});
client.on("error", (e) => {
  console.log("CLIENT_ERROR", e?.message || String(e));
});
client.login(token).catch((e) => {
  clearTimeout(timeout);
  console.log("LOGIN_ERROR", e?.message || String(e));
  process.exit(1);
});
