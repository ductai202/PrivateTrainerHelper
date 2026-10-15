// Tiny stand-in for OpenRouter used by the e2e suite (no key, no network, deterministic).
//   POST /api/v1/chat/completions   -> a workout plan, or an error when the prompt asks for one
//   GET  /last-request              -> the last request body, to assert what was sent
import http from 'node:http';

const PLAN = {
  warmup: ['Chạy bộ nhẹ 5 phút'],
  exercises: [
    { name: 'Squat', sets: 4, reps: '10', rest: '90s', note: 'Giữ lưng thẳng' },
    { name: 'Hip thrust', sets: 3, reps: '12', rest: '60s' },
  ],
  cooldown: ['Giãn cơ đùi trước'],
  safety: ['Dừng nếu đau'],
};

let last = null;

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/last-request') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(last));
    return;
  }
  if (req.method === 'POST' && req.url === '/api/v1/chat/completions') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      if (req.headers.authorization !== 'Bearer test-key') {
        res.writeHead(401).end('{}');
        return;
      }
      last = JSON.parse(raw);
      const prompt = last.messages.map((m) => m.content).join('\n');
      if (prompt.includes('FAIL_ME')) {
        res.writeHead(500).end('{}');
        return;
      }
      const content = prompt.includes('BAD_JSON') ? 'xin chào, tôi không biết' : JSON.stringify(PLAN);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ choices: [{ message: { content } }] }));
    });
    return;
  }
  res.writeHead(404).end();
});

server.listen(4010, '127.0.0.1', () => console.log('fake openrouter on 4010'));
