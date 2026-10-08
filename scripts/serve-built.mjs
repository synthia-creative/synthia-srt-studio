import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('dist');
const prefix = '/synthia-srt-studio/';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.txt': 'text/plain; charset=utf-8' };
http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (!url.pathname.startsWith(prefix)) { res.writeHead(404); res.end('Not found'); return; }
  const local = path.resolve(root, decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html');
  if (!local.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(local, (error, data) => { if (error) { res.writeHead(404); res.end('Not found'); return; } res.setHeader('Content-Type', mime[path.extname(local)] ?? 'application/octet-stream'); res.end(data); });
}).listen(5187, '127.0.0.1', () => console.log('Built app at http://127.0.0.1:5187/synthia-srt-studio/'));
