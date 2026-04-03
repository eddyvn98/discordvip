import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

type Channel = { id: string; displayName: string };
type Item = { id: string; title: string };

function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [message, setMessage] = useState("Checking VIP session...");

  useEffect(() => {
    fetch("/api/cinema/session/me", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Cinema session not ready");
        await loadChannels();
        setMessage("VIP active");
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : "Cannot initialize"));
  }, []);

  async function loadChannels() {
    const res = await fetch("/api/cinema/channels", { credentials: "include" });
    if (!res.ok) throw new Error("Cannot load channels");
    setChannels(await res.json());
  }

  async function loadItems(channelId: string) {
    const res = await fetch(`/api/cinema/channels/${channelId}/items`, { credentials: "include" });
    if (!res.ok) throw new Error("Cannot load items");
    setItems(await res.json());
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: 20, color: "#fff", background: "#0d0d0d", minHeight: "100vh" }}>
      <h1>VIP Cinema Web</h1>
      <p>{message}</p>
      <section>
        <h2>Channels</h2>
        {channels.map((channel) => (
          <button key={channel.id} onClick={() => loadItems(channel.id)} style={{ marginRight: 8 }}>{channel.displayName}</button>
        ))}
      </section>
      <section>
        <h2>Items</h2>
        {items.map((item) => (
          <div key={item.id}>{item.title}</div>
        ))}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
