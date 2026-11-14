// Build-only check: no Cloudflare/D1 reads or writes.
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
const base = '/games/multicolor-sweeper/play/';
const html = readFileSync('dist/index.html', 'utf8');
assert.ok(html.includes(`href="${base}icon.svg"`));
assert.ok(html.includes(`href="${base}apple-touch-icon.png"`));
assert.ok(html.includes(`href="https://hanage.app/games/multicolor-sweeper/play/"`));
assert.ok(html.includes(base + 'assets/'), 'JS/CSS assets must load from hub path');
const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8'));
assert.equal(manifest.start_url, base);
assert.equal(manifest.scope, base);
assert.equal(manifest.id, base);
for (const icon of manifest.icons) assert.ok(icon.src.startsWith(base));
assert.ok(existsSync('dist/sw.js'), 'PWA Worker output');
const assets = readdirSync('dist/assets');
assert.ok(assets.some(x=>x.endsWith('.js')));
assert.ok(assets.some(x=>x.endsWith('.css')));
console.log('PASS: Sweeper hub base path, icons, canonical, hashed assets and PWA scope');
