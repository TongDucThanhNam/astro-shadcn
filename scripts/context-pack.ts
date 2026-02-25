#!/usr/bin/env bun
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'util';

function parseBooleanValue(rawValue, optionName) {
  const normalized = String(rawValue).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') {
    return false;
  }
  throw new Error(`Invalid value for ${optionName}: "${rawValue}" (expected true/false)`);
}

function normalizeCliArgs(rawArgs) {
  const normalizedArgs = [];
  let inlineRulesOverride;

  for (const arg of rawArgs) {
    if (arg === '--no-inlineRules') {
      inlineRulesOverride = false;
      continue;
    }
    if (arg.startsWith('--inlineRules=')) {
      const rawValue = arg.slice('--inlineRules='.length);
      inlineRulesOverride = parseBooleanValue(rawValue, '--inlineRules');
      continue;
    }
    normalizedArgs.push(arg);
  }

  return { normalizedArgs, inlineRulesOverride };
}

const { normalizedArgs, inlineRulesOverride } = normalizeCliArgs(Bun.argv.slice(2));

const { values } = parseArgs({
  args: normalizedArgs,
  options: {
    out: { type: 'string', default: '.ai/context.txt' },
    inlineRules: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  strict: true,
});

if (values.help) {
  console.log('Usage: bun scripts/context-pack.ts [--out <path>] [--inlineRules]');
  process.exit(0);
}

const projectRoot = process.cwd();
const includeInlineRules = inlineRulesOverride ?? values.inlineRules ?? false;

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

  if (includeInlineRules) {
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

  const outFile = path.resolve(projectRoot, values.out ?? '.ai/context.txt');
  await mkdir(path.dirname(outFile), { recursive: true });
  await Bun.write(outFile, `${parts.join('').trim()}\n`);

  console.log(`Wrote context pack: ${values.out}`);
}

main().catch((error) => {
  console.error('context-pack failed:', error?.message ?? error);
  process.exit(1);
});
