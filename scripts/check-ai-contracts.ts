#!/usr/bin/env bun
import path from 'node:path';

import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('src', { type: 'string', default: 'src' })
  .help()
  .parseSync();

const projectRoot = process.cwd();
const srcDir = path.resolve(projectRoot, argv.src);

function rel(filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join('/');
}

function hasBreadcrumb(headerChunk) {
  return /(^|\n)\s*\/\/\s*BREADCRUMB:\s*.+/m.test(headerChunk);
}

function hasJsdocContract(sourceText) {
  const requiredTags = ['@component', '@hierarchy', '@layout_context', '@tailwind_contract'];
  const blocks = sourceText.match(/\/\*\*[\s\S]*?\*\//g) ?? [];
  return blocks.some((block) => requiredTags.every((tag) => block.includes(tag)));
}

function looksLikeReactComponentFile(sourceText) {
  return /<\w+|<\/\w+|return\s*\(|return\s*<|=>\s*</m.test(sourceText);
}

async function main() {
  const glob = new Bun.Glob('**/*.{ts,tsx,js,jsx}');
  const files = [];
  for await (const matchedPath of glob.scan({ cwd: srcDir, absolute: true, dot: true })) {
    const normalized = String(matchedPath).replaceAll('\\', '/');
    if (normalized.includes('/__tests__/')) {
      continue;
    }
    if (normalized.includes('.test.') || normalized.includes('.spec.')) {
      continue;
    }
    if (normalized.endsWith('.d.ts')) {
      continue;
    }
    files.push(path.resolve(String(matchedPath)));
  }

  const failures = [];

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.tsx' && ext !== '.jsx') {
      continue;
    }

    const sourceText = await Bun.file(filePath).text();
    if (!looksLikeReactComponentFile(sourceText)) {
      continue;
    }

    const headerChunk = sourceText.split('\n').slice(0, 40).join('\n');
    const missing = [];
    if (!hasBreadcrumb(headerChunk)) {
      missing.push('BREADCRUMB');
    }
    if (!hasJsdocContract(sourceText)) {
      missing.push('JSDOC_CONTRACT');
    }
    if (missing.length > 0) {
      failures.push({ file: rel(filePath), missing });
    }
  }

  if (failures.length > 0) {
    console.error('AI contract checks failed:\n');
    for (const failure of failures) {
      console.error(`- ${failure.file}: missing ${failure.missing.join(', ')}`);
    }
    console.error(
      '\nFix: add top-of-file breadcrumb + JSDoc tags (@component/@hierarchy/@layout_context/@tailwind_contract).',
    );
    process.exit(1);
  }

  console.log('AI contracts OK');
}

main().catch((error) => {
  console.error('check-ai-contracts failed:', error?.message ?? error);
  process.exit(1);
});
