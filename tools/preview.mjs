import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const root = new URL('../apps-script/', import.meta.url);
const server = createServer(async (request, response) => {
  if (new URL(request.url, 'http://localhost').pathname !== '/') {
    response.writeHead(404); response.end('Not found'); return;
  }
  try {
    let html = await readFile(new URL('Index.html', root), 'utf8');
    for (const name of ['Styles', 'Client']) {
      let content = await readFile(new URL(name + '.html', root), 'utf8');
      if (name === 'Client') content = '<script>' + await readFile(new URL('demo.js', import.meta.url), 'utf8') + '</script>\n' + content;
      html = html.replace(`<?!= include_('${name}'); ?>`, () => content);
    }
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(html);
  } catch (error) { console.error(error); response.writeHead(500); response.end('Preview failed'); }
});
server.listen(4173, '127.0.0.1', () => console.log('Smart Boxes demo: http://127.0.0.1:4173'));
