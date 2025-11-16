import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { performance } from "perf_hooks";
import { serverData as baseServerData } from "./public/serverData.js";

const app = express();
const port = process.env.PORT || 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

const PING_TIMEOUT_MS = Number(process.env.PING_TIMEOUT_MS ?? 4000);

app.get("/serverData.js", async (_req, res) => {
  try {
    const payload = await buildLiveServerData();
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-store");
    res.send(`export const serverData = ${JSON.stringify(payload)};`);
  } catch (error) {
    console.error("Failed to build live server data:", error.message);
    const fallback = cloneServerData(baseServerData);
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "no-store");
    res.send(`export const serverData = ${JSON.stringify(fallback)};`);
  }
});

async function buildLiveServerData() {
  const payload = cloneServerData(baseServerData);
  const categories = Object.values(payload).filter(Array.isArray);
  await Promise.all(
    categories.map(servers => Promise.all(servers.map(updateServerFromPing)))
  );
  return payload;
}

function cloneServerData(data) {
  return JSON.parse(JSON.stringify(data));
}

async function updateServerFromPing(server) {
  if (!server || !server.link) {
    markServerOffline(server);
    return;
  }

  const pingUrl = buildPingUrl(server.link);
  if (!pingUrl) {
    markServerOffline(server);
    return;
  }

  try {
    const { latency, data } = await fetchPingInformation(pingUrl);
    applyPingSuccess(server, latency, data);
  } catch (error) {
    console.error(
      `Failed to ping ${server.name || server.id || pingUrl}:`,
      error.message
    );
    markServerOffline(server);
  }
}

async function fetchPingInformation(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      cache: "no-store",
      method: "GET",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const rawBody = await response.text();
    const data = safeJsonParse(rawBody);
    const latency = Math.max(1, Math.round(performance.now() - startTime));
    return { latency, data };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Ping request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function safeJsonParse(payload) {
  if (!payload) {
    return null;
  }
  try {
    return JSON.parse(payload);
  } catch (_error) {
    return null;
  }
}

function applyPingSuccess(server, latency, data) {
  if (!server) {
    return;
  }

  server.ping = formatPing(latency);
  server.status = { label: "Online", state: "online" };
  server.pingData = data || null;

  const players = extractPlayerCount(data);
  if (players) {
    server.players = players;
  }
}

function markServerOffline(server) {
  if (!server) {
    return;
  }
  server.status = { label: "Offline", state: "offline" };
  server.ping = { value: "N/A", quality: "" };
}

function extractPlayerCount(data) {
  if (!data) {
    return null;
  }

  const playerPayload = resolvePlayerMetrics(data);
  if (!playerPayload) {
    return null;
  }

  const { connected, capacity } = playerPayload;
  if (!Number.isFinite(connected)) {
    return null;
  }

  if (Number.isFinite(capacity) && capacity > 0) {
    return `${connected}/${capacity}`;
  }
  return `${connected}`;
}

function resolvePlayerMetrics(data) {
  const candidates = [];

  if (typeof data.players === "number") {
    candidates.push({ connected: data.players, capacity: data.maxPlayers });
  }

  if (data.players && typeof data.players === "object") {
    const {
      totalConnected,
      totalCapacity,
      activeCount,
      maxPlayers,
      total,
      count
    } = data.players;
    candidates.push({ connected: totalConnected, capacity: totalCapacity });
    candidates.push({ connected: activeCount, capacity: totalCapacity });
    candidates.push({ connected: total, capacity: maxPlayers || totalCapacity });
    candidates.push({ connected: count, capacity: maxPlayers || totalCapacity });
  }

  if (typeof data.playerCount === "number") {
    candidates.push({ connected: data.playerCount, capacity: data.maxPlayers });
  }

  if (typeof data.totalPlayers === "number") {
    candidates.push({ connected: data.totalPlayers, capacity: data.maxPlayers });
  }

  return (
    candidates.find(candidate => candidate && Number.isFinite(candidate.connected)) ||
    null
  );
}

function formatPing(latency) {
  const ms = Math.max(1, Math.round(latency));
  return {
    value: `${ms}ms`,
    quality: getPingQuality(ms)
  };
}

function getPingQuality(ms) {
  if (ms <= 80) {
    return "good";
  }
  if (ms <= 160) {
    return "medium";
  }
  return "high";
}

function buildPingUrl(baseUrl) {
  if (!baseUrl) {
    return "";
  }
  return `${baseUrl.replace(/\/+$/, "")}/ping`;
}

// Expose the entire public directory at root and under /public for absolute paths
app.use(express.static(publicDir));
app.use("/public", express.static(publicDir));

app.get("/", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
