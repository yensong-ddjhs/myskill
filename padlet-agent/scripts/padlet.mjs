#!/usr/bin/env node

const BASE_URL = "https://api.padlet.dev/v1";
const MUTATIONS = new Set(["post", "comment", "react"]);

function usage() {
  console.error(`Usage:
  node padlet.mjs board --board ID [--include posts,sections,comments]
  node padlet.mjs post --board ID [--subject TEXT] [--body TEXT] [--attachment-url URL] [--caption TEXT] [--color COLOR] [--section ID] [--dry-run]
  node padlet.mjs comment --post ID [--html HTML] [--attachment-url URL] [--dry-run]
  node padlet.mjs react --post ID --value NUMBER [--type like|star|grade|vote] [--dry-run]`);
}

function parseArgs(values) {
  const options = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) throw new Error(`Unexpected argument: ${value}`);
    const key = value.slice(2);
    if (key === "dry-run") { options[key] = true; continue; }
    const next = values[index + 1];
    if (!next || next.startsWith("--")) throw new Error(`Missing value for --${key}`);
    options[key] = next;
    index += 1;
  }
  return options;
}

function required(options, name) {
  if (!options[name]) throw new Error(`--${name} is required`);
  return options[name];
}

function attachment(options) {
  return options["attachment-url"]
    ? { url: options["attachment-url"], ...(options.caption ? { caption: options.caption } : {}) }
    : undefined;
}

function postPayload(options) {
  const content = {
    ...(options.subject ? { subject: options.subject } : {}),
    ...(options.body ? { body: options.body } : {}),
    ...(attachment(options) ? { attachment: attachment(options) } : {}),
  };
  if (Object.keys(content).length === 0) throw new Error("Provide --subject, --body, or --attachment-url");
  return {
    data: {
      type: "post",
      attributes: { content, ...(options.color ? { color: options.color } : {}) },
      ...(options.section ? { relationships: { section: { data: { id: options.section } } } } : {}),
    },
  };
}

function commentPayload(options) {
  const body = {
    ...(options.html ? { htmlContent: options.html } : {}),
    ...(attachment(options) ? { attachment: attachment(options) } : {}),
  };
  if (Object.keys(body).length === 0) throw new Error("Provide --html or --attachment-url");
  return { data: { type: "comment", attributes: body } };
}

function reactionPayload(options) {
  const value = Number(required(options, "value"));
  if (!Number.isFinite(value)) throw new Error("--value must be a number");
  return { data: { type: "reaction", attributes: { value, ...(options.type ? { reactionType: options.type } : {}) } } };
}

async function request(method, path, body) {
  const apiKey = process.env.PADLET_API_KEY;
  if (!apiKey) throw new Error("Set PADLET_API_KEY in the environment before making a request");
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: { "X-API-KEY": apiKey, Accept: "application/vnd.api+json", ...(body ? { "Content-Type": "application/vnd.api+json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(`Padlet API ${response.status}: ${JSON.stringify(data)}`);
  console.log(JSON.stringify(data, null, 2));
}

async function main() {
  const [action, ...rest] = process.argv.slice(2);
  if (!action || action === "--help" || action === "-h") { usage(); process.exit(action ? 0 : 1); }
  const options = parseArgs(rest);
  if (action === "board") {
    const board = required(options, "board");
    const include = options.include ? `?include=${encodeURIComponent(options.include)}` : "";
    await request("GET", `/boards/${encodeURIComponent(board)}${include}`);
    return;
  }
  if (!MUTATIONS.has(action)) throw new Error(`Unknown action: ${action}`);
  let path;
  let body;
  if (action === "post") {
    path = "/boards/" + encodeURIComponent(required(options, "board")) + "/posts";
    body = postPayload(options);
  } else if (action === "comment") {
    path = "/posts/" + encodeURIComponent(required(options, "post")) + "/comments";
    body = commentPayload(options);
  } else {
    path = "/posts/" + encodeURIComponent(required(options, "post")) + "/reactions";
    body = reactionPayload(options);
  }
  if (options["dry-run"]) { console.log(JSON.stringify({ method: "POST", path, body }, null, 2)); return; }
  await request("POST", path, body);
}

main().catch((error) => { console.error(`Error: ${error.message}`); process.exit(1); });
