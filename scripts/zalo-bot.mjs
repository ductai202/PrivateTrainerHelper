// Helper for the Zalo Bot Platform (official API). Reads .env.local.
//
//   node scripts/zalo-bot.mjs check                       -> getMe: is the token valid?
//   node scripts/zalo-bot.mjs set-webhook https://app/api/zalo-bot/webhook
//   node scripts/zalo-bot.mjs delete-webhook
//
// NOTE: the endpoint names follow the Telegram-style API described by community SDKs
// (getMe / setWebhook / deleteWebhook). They have NOT been verified against Zalo's official
// documentation; if a call fails, compare with the official docs and adjust ZALO_BOT_API_BASE
// or the method names below.
import { readFileSync } from 'node:fs';

function loadEnv() {
  const env = { ...process.env };
  try {
    for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && env[m[1]] === undefined) env[m[1]] = m[2];
    }
  } catch {
    // no .env.local: rely on the process environment
  }
  return env;
}

const env = loadEnv();
const token = env.ZALO_BOT_TOKEN;
const base = (env.ZALO_BOT_API_BASE || 'https://bot-api.zaloplatforms.com').replace(/\/$/, '');
const [command, arg] = process.argv.slice(2);

if (!token) {
  console.error('ZALO_BOT_TOKEN is missing (set it in .env.local).');
  process.exit(1);
}

async function call(method, body) {
  const res = await fetch(`${base}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  console.log(`${method} -> HTTP ${res.status}`);
  console.log(text);
  return res.ok;
}

let ok = false;
if (command === 'check') {
  ok = await call('getMe');
} else if (command === 'set-webhook') {
  if (!arg || !arg.startsWith('https://')) {
    console.error('Usage: set-webhook https://<your-app>/api/zalo-bot/webhook (HTTPS required)');
    process.exit(1);
  }
  if (!env.ZALO_BOT_WEBHOOK_SECRET) {
    console.error('ZALO_BOT_WEBHOOK_SECRET is missing (8-256 characters).');
    process.exit(1);
  }
  ok = await call('setWebhook', { url: arg, secret_token: env.ZALO_BOT_WEBHOOK_SECRET });
} else if (command === 'delete-webhook') {
  ok = await call('deleteWebhook');
} else {
  console.error('Commands: check | set-webhook <url> | delete-webhook');
  process.exit(1);
}
process.exit(ok ? 0 : 1);
