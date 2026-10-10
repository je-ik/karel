import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const jsDir = path.join(rootDir, 'js');

const files = [
  'ast.js',
  'lexer.js',
  'world.js',
  'parser.js',
  'audio.js',
  'renderer.js',
  'interpreter.js',
  'examples.js',
  'app.js',
];

let bundleContent = `/**
 * Karel the Robot - Standalone Web Bundle (Pure Vanilla JavaScript)
 * Zero external dependencies. Works on file:/// and http:// protocols.
 */
(function () {
  'use strict';
`;

for (const file of files) {
  const filePath = path.join(jsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Remove import lines
  content = content.replace(/^import\s+[\s\S]*?from\s+['"].*?['"];?\s*$/gm, '');

  // Strip export keywords
  content = content.replace(/^export\s+(const|let|var|class|function)\s+/gm, '$1 ');
  content = content.replace(/^export\s*\{[\s\S]*?\};?\s*$/gm, '');
  content = content.replace(/^export\s+default\s+/gm, '');

  bundleContent += `\n/* --- File: ${file} --- */\n`;
  bundleContent += content + '\n';
}

bundleContent += `\n})();\n`;

const outputPath = path.join(jsDir, 'bundle.js');
fs.writeFileSync(outputPath, bundleContent, 'utf-8');
console.log(`Bundle created successfully: ${outputPath} (${bundleContent.length} bytes)`);
