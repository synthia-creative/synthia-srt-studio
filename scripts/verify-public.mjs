import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const base = 'https://synthia-creative.github.io/synthia-srt-studio/';
async function files(folder) {
  const entries = await fs.readdir(folder, { withFileTypes: true });
  return (await Promise.all(entries.map(item => item.isDirectory() ? files(path.join(folder, item.name)) : path.join(folder, item.name)))).flat();
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const results = await Promise.all((await files('dist')).map(async file => {
  const relative = path.relative('dist', file).replaceAll('\\', '/'), response = await fetch(new URL(relative, base), { signal: AbortSignal.timeout(30000) });
  const bytes = Buffer.from(await response.arrayBuffer()), localHash = hash(await fs.readFile(file)), remoteHash = hash(bytes);
  return { file: relative, status: response.status, bytes: bytes.length, localHash, remoteHash, matches: response.ok && localHash === remoteHash };
}));
const passed = results.every(item => item.matches);
await fs.mkdir('docs/qa', { recursive: true });
await fs.writeFile('docs/qa/beginner-public-files.json', JSON.stringify({ checkedAt: new Date().toISOString(), base, passed, results }, null, 2) + '\n');
console.log(JSON.stringify({ passed, files: results.length, results: results.map(({ file, status, matches }) => ({ file, status, matches })) }, null, 2));
if (!passed) process.exitCode = 1;
