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

const RULES = [
  {
    id: 'NO_ARBITRARY_WIDTH_HEIGHT',
    re: /\b(w|h|min-w|min-h|max-w|max-h)-\[(?!var\(|--)[^\]]+\]/g,
    msg: 'Avoid arbitrary sizing like w-[...] / h-[...]. Prefer tokens in theme or relative sizing.',
  },
  {
    id: 'NO_ARBITRARY_COLOR',
    re: /\b(bg|text|border|ring)-\[#([0-9a-fA-F]{3,8})\]/g,
    msg: 'Avoid arbitrary hex colors like bg-[#...]. Use semantic tokens.',
  },
  {
    id: 'NO_APPLY',
    re: /@apply\b/g,
    msg: 'Avoid @apply unless explicitly documented as an exception in spec.md.',
  },
];

function rel(filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join('/');
}

async function main() {
  const glob = new Bun.Glob('**/*.{ts,tsx,js,jsx,css}');
  const files = [];
  for await (const matchedPath of glob.scan({ cwd: srcDir, absolute: true, dot: true })) {
    const normalized = String(matchedPath).replaceAll('\\', '/');
    if (normalized.includes('/__tests__/')) {
      continue;
    }
    if (normalized.includes('.test.') || normalized.includes('.spec.')) {
      continue;
    }
    files.push(path.resolve(String(matchedPath)));
  }

  const hits = [];

  for (const filePath of files) {
    const sourceText = await Bun.file(filePath).text();

    for (const rule of RULES) {
      const matches = [...sourceText.matchAll(rule.re)];
      if (matches.length === 0) {
        continue;
      }
      for (const match of matches.slice(0, 10)) {
        hits.push({
          file: rel(filePath),
          rule: rule.id,
          sample: match[0],
          message: rule.msg,
        });
      }
    }
  }

  if (hits.length > 0) {
    console.error('Tailwind safety checks failed:\n');
    for (const hit of hits) {
      console.error(`- ${hit.file} [${hit.rule}]: "${hit.sample}"\n  -> ${hit.message}`);
    }
    console.error('\nFix: replace magic values with design tokens or documented exceptions.');
    process.exit(1);
  }

  console.log('Tailwind safety OK');
}

main().catch((error) => {
  console.error('check-tailwind-safety failed:', error?.message ?? error);
  process.exit(1);
});
