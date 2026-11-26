import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const out = path.join(root, '_site');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const excluded = new Set(['.git', '.github', 'node_modules', '_site']);
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (excluded.has(entry.name)) continue;
  if (entry.name === 'package.json' || entry.name === 'package-lock.json') continue;
  await cp(path.join(root, entry.name), path.join(out, entry.name), { recursive: true });
}

const vendor = path.join(out, 'vendor', 'ffmpeg');
await mkdir(path.join(vendor, 'api'), { recursive: true });
await mkdir(path.join(vendor, 'util'), { recursive: true });
await mkdir(path.join(vendor, 'core'), { recursive: true });

await cp(
  path.join(root, 'node_modules', '@ffmpeg', 'ffmpeg', 'dist', 'umd'),
  path.join(vendor, 'api'),
  { recursive: true }
);
await cp(
  path.join(root, 'node_modules', '@ffmpeg', 'util', 'dist', 'umd'),
  path.join(vendor, 'util'),
  { recursive: true }
);
await cp(
  path.join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'umd'),
  path.join(vendor, 'core'),
  { recursive: true }
);

console.log('GitHub Pages site built in _site with local FFmpeg assets.');
