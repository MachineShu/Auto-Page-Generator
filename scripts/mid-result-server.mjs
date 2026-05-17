import http from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 3188;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const BASE_DIR = path.join(ROOT_DIR, "mid-result");

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(payload));
}

function buildFolderName(existing) {
  if (existing) {
    return existing;
  }

  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("");
  const random = Math.random().toString(36).slice(2, 8);
  return `${date}-${random}`;
}

function buildFilePrefix(action) {
  const now = new Date();
  const time = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0")
  ].join("");
  const random = Math.random().toString(36).slice(2, 6);
  return `${time}-${random}-${action}`;
}

async function handleSave(body) {
  const folderName = buildFolderName(body.folderName);
  const folderPath = path.join(BASE_DIR, folderName);
  const filePrefix = buildFilePrefix(body.action || "snapshot");

  await mkdir(folderPath, { recursive: true });

  const payload = {
    savedAt: new Date().toISOString(),
    action: body.action,
    moduleId: body.moduleId,
    moduleIndex: body.moduleIndex,
    requestBody: body.requestBody ?? null,
    responseJson: body.responseJson ?? null,
    responseText: body.responseText ?? null,
    error: body.error ?? null,
    snapshot: body.snapshot ?? null
  };

  await writeFile(
    path.join(folderPath, `${filePrefix}.json`),
    JSON.stringify(payload, null, 2),
    "utf8"
  );

  return folderName;
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 404, { ok: false });
    return;
  }

  if (req.method === "OPTIONS") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== "POST" || req.url !== "/save") {
    sendJson(res, 404, { ok: false });
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", async () => {
    try {
      const parsed = JSON.parse(body || "{}");
      const folderName = await handleSave(parsed);
      sendJson(res, 200, { ok: true, folderName });
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error instanceof Error ? error.message : "save failed"
      });
    }
  });
});

server.listen(PORT, "127.0.0.1", async () => {
  await mkdir(BASE_DIR, { recursive: true });
  console.log(`mid-result server listening on http://127.0.0.1:${PORT}`);
});
