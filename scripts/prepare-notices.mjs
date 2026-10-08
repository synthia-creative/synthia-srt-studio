import fs from 'node:fs/promises';
await fs.mkdir('public', { recursive: true });
const upstream = await fs.readFile('docs/reference/LICENSE', 'utf8');
await fs.writeFile('public/LICENSE-SRT-Tap-Timer.txt', upstream);
let notices = 'SYNTHIA SRT Studio v1.0.0 — Third-party notices\n\nReference and adapted operation semantics / parser conventions:\ncityedge/SRT Tap Timer v1.64.2\nhttps://github.com/cityedge/srt-tap-timer\nRetrieved 2026-10-08. The source repository was not modified.\n\n' + upstream;
for (const name of ['react', 'react-dom', 'scheduler']) {
  const pkg = JSON.parse(await fs.readFile(`node_modules/${name}/package.json`, 'utf8'));
  const license = await fs.readFile(`node_modules/${name}/LICENSE`, 'utf8');
  notices += `\n\n${name} ${pkg.version}\n${license}`;
}
await fs.writeFile('public/THIRD_PARTY_NOTICES.txt', notices);
