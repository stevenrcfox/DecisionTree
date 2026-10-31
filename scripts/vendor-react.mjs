// Optional maintainer task only. The committed runtime runs without this tool.
import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
const target = new URL('../DecisionTree/vendor/react/', import.meta.url);
await mkdir(target, { recursive: true });
await build({
    entryPoints: [new URL('./react-entry.mjs', import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, '')],
    outfile: new URL('runtime.js', target).pathname.replace(/^\/(?=[A-Za-z]:)/, ''),
    bundle: true, minify: true, format: 'esm', platform: 'browser', target: 'es2020',
    define: { 'process.env.NODE_ENV': '"production"' }, legalComments: 'linked'
});
for (const name of ['react', 'react-dom', 'scheduler']) {
    await copyFile(new URL('../node_modules/' + name + '/LICENSE', import.meta.url), new URL(name + '.LICENSE', target));
}
