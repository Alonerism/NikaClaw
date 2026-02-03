import express from 'express';
import fs from 'node:fs';
import path from 'node:path';

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.PORT || 3999);
const HOST = process.env.HOST || '0.0.0.0';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DATA_DIR = path.join(ROOT, 'data');
const TASKS_PATH = path.join(DATA_DIR, 'tasks.json');
const EVENTS_PATH = path.join(DATA_DIR, 'events.jsonl');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function ensureTasksFile() {
  ensureDir();
  if (!fs.existsSync(TASKS_PATH)) fs.writeFileSync(TASKS_PATH, JSON.stringify({ tasks: [] }, null, 2));
}

function readTasks() {
  ensureTasksFile();
  try {
    const raw = fs.readFileSync(TASKS_PATH, 'utf8');
    const json = JSON.parse(raw);
    if (!json.tasks || !Array.isArray(json.tasks)) return { tasks: [] };
    return json;
  } catch {
    return { tasks: [] };
  }
}

function writeTasks(payload) {
  ensureTasksFile();
  fs.writeFileSync(TASKS_PATH, JSON.stringify(payload, null, 2));
}

function appendEvent(evt) {
  ensureDir();
  const row = {
    ts: new Date().toISOString(),
    ...evt,
  };
  fs.appendFileSync(EVENTS_PATH, JSON.stringify(row) + '\n');
  return row;
}

function readEvents(limit = 200) {
  ensureDir();
  if (!fs.existsSync(EVENTS_PATH)) return [];
  const raw = fs.readFileSync(EVENTS_PATH, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const tail = lines.slice(Math.max(0, lines.length - limit));
  const out = [];
  for (const l of tail) {
    try { out.push(JSON.parse(l)); } catch {}
  }
  return out;
}

function newestOpenclawLogPath() {
  const dir = '/tmp/openclaw';
  if (!fs.existsSync(dir)) return null;
  const candidates = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('openclaw-') && f.endsWith('.log'))
    .map((f) => path.join(dir, f));
  if (!candidates.length) return null;
  candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return candidates[0];
}

function tailLines(text, n) {
  const lines = text.split(/\r?\n/);
  return lines.slice(Math.max(0, lines.length - n)).join('\n');
}

function extractActivityFromLog(raw, limit = 200) {
  // Very lightweight: keep only interesting lines.
  const interesting = [
    '[heartbeat]',
    '[cron]',
    '[gateway]',
    '[telegram]',
    '[whatsapp]',
    '[security]',
    '[ws]',
    '[diagnostic]',
    'Error:',
    'WARNING',
  ];
  const lines = raw.split(/\r?\n/).filter((l) => interesting.some((k) => l.includes(k)));
  return lines.slice(Math.max(0, lines.length - limit));
}

// ---- API ----
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.get('/api/tasks', (req, res) => {
  res.json(readTasks());
});

app.post('/api/tasks', (req, res) => {
  const { id, title, status, detail } = req.body || {};
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing title' });
  }
  const now = new Date().toISOString();
  const data = readTasks();
  const tasks = data.tasks;
  const taskId = (id && String(id)) || `t_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  const idx = tasks.findIndex((t) => t.id === taskId);
  const next = {
    id: taskId,
    title,
    status: status || (idx === -1 ? 'not_started' : tasks[idx].status),
    detail: detail || (idx === -1 ? '' : tasks[idx].detail),
    updatedAt: now,
    createdAt: idx === -1 ? now : tasks[idx].createdAt,
  };
  if (idx === -1) tasks.unshift(next);
  else tasks[idx] = next;

  writeTasks({ tasks });
  appendEvent({ type: 'task.upsert', task: next });
  res.json({ ok: true, task: next });
});

app.get('/api/logs', (req, res) => {
  const lines = Math.min(5000, Math.max(10, Number(req.query.lines || 200)));
  const p = newestOpenclawLogPath();
  if (!p) return res.json({ ok: false, error: 'No log found in /tmp/openclaw', lines: '' });
  const raw = fs.readFileSync(p, 'utf8');
  res.json({ ok: true, path: p, lines: tailLines(raw, lines) });
});

app.get('/api/activity', (req, res) => {
  const p = newestOpenclawLogPath();
  if (!p) return res.json({ ok: false, error: 'No log found', items: [] });
  const raw = fs.readFileSync(p, 'utf8');
  const items = extractActivityFromLog(raw, 250);
  res.json({ ok: true, path: p, items });
});

app.get('/api/events', (req, res) => {
  const limit = Math.min(2000, Math.max(10, Number(req.query.limit || 200)));
  res.json({ ok: true, events: readEvents(limit) });
});

app.post('/api/events', (req, res) => {
  const { type, detail } = req.body || {};
  if (!type) return res.status(400).json({ ok: false, error: 'Missing type' });
  const evt = appendEvent({ type: String(type), detail: detail ?? null });
  res.json({ ok: true, event: evt });
});

// static web
app.use('/', express.static(path.join(ROOT, 'web')));

app.listen(PORT, HOST, () => {
  console.log(`[command-center] listening on http://${HOST}:${PORT}`);
  appendEvent({ type: 'server.start', detail: { host: HOST, port: PORT } });
});
