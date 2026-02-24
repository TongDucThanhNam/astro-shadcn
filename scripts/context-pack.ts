#!/usr/bin/env bun
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('out', { type: 'string', default: '.ai/context.txt' })
  .option('inlineRules', {
    type: 'boolean',
    default: false,
    describe: 'Inline CLAUDE.md contents into context pack',
  })
  .help()
  .parseSync();

const projectRoot = process.cwd();

async function readIfExists(relativePath) {
  const file = Bun.file(path.resolve(projectRoot, relativePath));
  try {
    if (!(await file.exists())) {
      return null;
    }
    return await file.text();
  } catch {
    return null;
  }
}

function buildSection(title, body) {
  const trimmed = body?.trim();
  if (!trimmed) {
    return '';
  }
  return `\n\n# ${title}\n\n${trimmed}\n`;
}

async function main() {
  const parts = [`# AI CONTEXT PACK\nGeneratedAt: ${new Date().toISOString()}\n`];

  parts.push(buildSection('UI TREE (ASCII)', await readIfExists('docs/ui-map.ascii.txt')));
  parts.push(buildSection('UI GRAPH (Mermaid)', await readIfExists('docs/ui-map.mmd')));

  if (argv.inlineRules) {
    parts.push(buildSection('PROJECT AI RULES', await readIfExists('CLAUDE.md')));
  }
  parts.push(buildSection('SPEC', await readIfExists('docs/spec.md')));
  parts.push(buildSection('TAILWIND CONFIG', await readIfExists('tailwind.config.ts')));
  parts.push(
    buildSection(
      'BIOME CONFIG',
      (await readIfExists('biome.json')) ?? (await readIfExists('biome.jsonc')),
    ),
  );

  const outFile = path.resolve(projectRoot, argv.out);
  await mkdir(path.dirname(outFile), { recursive: true });
  await Bun.write(outFile, `${parts.join('').trim()}\n`);

  console.log(`Wrote context pack: ${argv.out}`);
}

main().catch((error) => {
  console.error('context-pack failed:', error?.message ?? error);
  process.exit(1);
});
