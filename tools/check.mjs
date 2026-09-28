import { readFile, readdir } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../apps-script/', import.meta.url);
for (const file of await readdir(root)) {
  const content = await readFile(new URL(file, root), 'utf8');
  if (file.endsWith('.gs')) new vm.Script(content, { filename: file });
  if (file === 'Client.html') new vm.Script(content.replace(/^<script>\s*|\s*<\/script>\s*$/g, ''), { filename: file });
  if (file.endsWith('.json')) JSON.parse(content);
}
new vm.Script(await readFile(new URL('demo.js', import.meta.url), 'utf8'));
console.log('Apps Script, browser JavaScript and manifest syntax: OK');
