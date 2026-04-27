import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const distDir = path.resolve('dist');
const indexPath = path.join(distDir, 'index.html');

const html = await readFile(indexPath, 'utf8');

const scriptMatch = html.match(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/);
const cssMatch = html.match(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/);
const faviconMatch = html.match(/<link rel="icon" type="image\/png" href="\.\/(assets\/[^"]+\.png)" \/>/);

if (!scriptMatch || !cssMatch || !faviconMatch) {
  throw new Error('Expected built asset references were not found in dist/index.html');
}

const [scriptSource, scriptAsset] = scriptMatch;
const [cssSource, cssAsset] = cssMatch;
const [faviconSource, faviconAsset] = faviconMatch;

const [scriptContent, cssContent, faviconContent] = await Promise.all([
  readFile(path.join(distDir, scriptAsset), 'utf8'),
  readFile(path.join(distDir, cssAsset), 'utf8'),
  readFile(path.join(distDir, faviconAsset)),
]);

const scriptBase64 = Buffer.from(scriptContent, 'utf8').toString('base64');
const faviconBase64 = faviconContent.toString('base64');

const bootstrapScript = `<script type="module">
const source = atob('${scriptBase64}');
const blob = new Blob([source], { type: 'text/javascript' });
const url = URL.createObjectURL(blob);
import(url).finally(() => URL.revokeObjectURL(url));
</script>`;

const inlinedHtml = html
  .replace(faviconSource, `<link rel="icon" type="image/png" href="data:image/png;base64,${faviconBase64}" />`)
  .replace(cssSource, `<style>\n${cssContent}\n</style>`)
  .replace(scriptSource, bootstrapScript);

await writeFile(indexPath, inlinedHtml, 'utf8');

console.log('Inlined built JS, CSS, and favicon into dist/index.html');
