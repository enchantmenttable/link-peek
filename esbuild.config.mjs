import * as esbuild from 'esbuild';
import { cpSync, mkdirSync } from 'fs';

// Bundle content script, background script, and popup script
await Promise.all([
  esbuild.build({
    entryPoints: ['src/content/index.js'],
    bundle: true,
    format: 'iife',
    outfile: 'dist/content.js',
  }),
  esbuild.build({
    entryPoints: ['src/background/index.js'],
    bundle: true,
    format: 'iife',
    outfile: 'dist/background.js',
  }),
  esbuild.build({
    entryPoints: ['src/popup/popup.js'],
    bundle: true,
    format: 'iife',
    outfile: 'dist/popup.js',
  }),
  esbuild.build({
    entryPoints: ['src/options/options.js'],
    bundle: true,
    format: 'iife',
    outfile: 'dist/options.js',
  }),
]);

// Copy public files to dist
mkdirSync('dist', { recursive: true });
cpSync('public', 'dist', { recursive: true });

console.log('Build complete!');
