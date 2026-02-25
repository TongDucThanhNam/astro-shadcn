#!/usr/bin/env bun
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

import { parseArgs } from 'util';

import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = traverseModule.default ?? traverseModule;

const HELP_TEXT = `Usage: bun scripts/generate-ui-map.ts [options]

Options:
  --src <path>             Source directory (default: src)
  --entry <path>           Entry file (required)
  --out <path>             Optional output base path (writes .ascii/.mmd/.json)
  --format <kind>          stdout format: ascii|mermaid|json|all (default: ascii)
  --rootComponent <name>   Root component name override
  --alias <key=value>      Path aliases, repeatable (e.g. --alias @=src)
  --focus <name>           Show only ancestor chain + subtree of this component
  --layoutOnly             Strip decorative classes, keep layout-relevant only
  -h, --help               Show this help
`;

const { values: cliValues } = parseArgs({
  args: Bun.argv,
  options: {
    src: { type: 'string', default: 'src' },
    entry: { type: 'string' },
    out: { type: 'string' },
    format: { type: 'string', default: 'ascii' },
    rootComponent: { type: 'string' },
    alias: { type: 'string', multiple: true, default: [] },
    focus: { type: 'string' },
    layoutOnly: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
  strict: true,
  allowPositionals: true,
});

if (cliValues.help) {
  console.log(HELP_TEXT);
  process.exit(0);
}

if (!cliValues.entry) {
  console.error('Error: --entry is required\n');
  console.log(HELP_TEXT);
  process.exit(1);
}

const argv = {
  src: cliValues.src ?? 'src',
  entry: cliValues.entry,
  out: cliValues.out,
  format: cliValues.format ?? 'ascii',
  rootComponent: cliValues.rootComponent,
  alias: cliValues.alias ?? [],
  focus: cliValues.focus,
  layoutOnly: cliValues.layoutOnly ?? false,
};

const validFormats = new Set(['ascii', 'mermaid', 'json', 'all']);
if (!validFormats.has(argv.format)) {
  console.error(`Error: --format must be one of: ${[...validFormats].join(', ')}`);
  process.exit(1);
}

const projectRoot = process.cwd();
const srcDir = path.resolve(projectRoot, argv.src);
const entryFile = path.resolve(projectRoot, argv.entry);
const outBase = argv.out ? path.resolve(projectRoot, argv.out) : null;

const aliasMap = Object.fromEntries(
  (argv.alias ?? []).map((value) => {
    const pair = String(value);
    const idx = pair.indexOf('=');
    if (idx < 0) {
      return [pair, ''];
    }
    return [pair.slice(0, idx), pair.slice(idx + 1)];
  }),
);

const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js', '.astro'];
const INDEX_FILES = EXTENSIONS.map((ext) => `index${ext}`);

function rel(filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join('/');
}

function isComponentName(name) {
  return /^[A-Z][A-Za-z0-9]*$/.test(name ?? '');
}

function stableId(value) {
  return Bun.hash(value).toString(16).slice(0, 8);
}

function parseAst(code, filename, allowReturnOutsideFunction = false) {
  return parse(code, {
    sourceType: 'module',
    sourceFilename: filename,
    allowReturnOutsideFunction,
    plugins: [
      'jsx',
      'typescript',
      'classProperties',
      'decorators-legacy',
      'dynamicImport',
      'topLevelAwait',
    ],
  });
}

function resolveAliasImport(source) {
  for (const [prefix, target] of Object.entries(aliasMap)) {
    if (!prefix || !target) {
      continue;
    }
    if (source === prefix) {
      return path.resolve(projectRoot, target);
    }
    if (source.startsWith(`${prefix}/`)) {
      return path.resolve(projectRoot, target, source.slice(prefix.length + 1));
    }
  }
  return null;
}

function isProjectImportSource(source) {
  if (!source) {
    return false;
  }
  if (source.startsWith('.')) {
    return true;
  }
  for (const [prefix, target] of Object.entries(aliasMap)) {
    if (!prefix || !target) {
      continue;
    }
    if (source === prefix || source.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  return false;
}

async function resolveImportToFile(fromFile, source) {
  if (!source) {
    return null;
  }

  let basePath = null;
  if (source.startsWith('.')) {
    basePath = path.resolve(path.dirname(fromFile), source);
  } else {
    basePath = resolveAliasImport(source);
  }
  if (!basePath) {
    return null;
  }

  // Exact path (files with extension) — Bun.file().exists() returns false for directories
  if (await Bun.file(basePath).exists()) {
    return basePath;
  }

  // Try appending known extensions (e.g. import './utils' → './utils.ts')
  for (const ext of EXTENSIONS) {
    const candidate = `${basePath}${ext}`;
    if (await Bun.file(candidate).exists()) {
      return candidate;
    }
  }

  // Try index files (basePath may be a directory, e.g. '@/components/ui')
  for (const indexFile of INDEX_FILES) {
    const candidate = path.join(basePath, indexFile);
    if (await Bun.file(candidate).exists()) {
      return candidate;
    }
  }

  return null;
}

function pushClassString(tokens, value) {
  if (!value) {
    return;
  }
  const chunks = String(value)
    .split(/\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  for (const chunk of chunks) {
    tokens.push(chunk);
  }
}

function normalizeClassTokens(tokens) {
  const seen = new Set();
  const out = [];
  for (const token of tokens) {
    if (!token || seen.has(token)) {
      continue;
    }
    seen.add(token);
    out.push(token);
  }
  return out.join(' ');
}

function extractClassTokensFromExpression(node, outTokens = [], cvaClassMap = null) {
  if (!node || typeof node !== 'object') {
    return outTokens;
  }

  if (node.type === 'StringLiteral') {
    pushClassString(outTokens, node.value);
    return outTokens;
  }

  if (node.type === 'TemplateLiteral') {
    for (const quasi of node.quasis ?? []) {
      pushClassString(outTokens, quasi.value?.cooked ?? quasi.value?.raw ?? '');
    }
    for (const expression of node.expressions ?? []) {
      extractClassTokensFromExpression(expression, outTokens, cvaClassMap);
    }
    return outTokens;
  }

  if (node.type === 'ParenthesizedExpression') {
    extractClassTokensFromExpression(node.expression, outTokens, cvaClassMap);
    return outTokens;
  }

  if (
    node.type === 'TSAsExpression' ||
    node.type === 'TSTypeAssertion' ||
    node.type === 'TSNonNullExpression'
  ) {
    extractClassTokensFromExpression(node.expression, outTokens, cvaClassMap);
    return outTokens;
  }

  if (node.type === 'CallExpression') {
    if (node.callee?.type === 'Identifier' && cvaClassMap?.has(node.callee.name)) {
      pushClassString(outTokens, cvaClassMap.get(node.callee.name));
      return outTokens;
    }

    extractClassTokensFromExpression(node.callee, outTokens, cvaClassMap);
    for (const argument of node.arguments ?? []) {
      extractClassTokensFromExpression(argument, outTokens, cvaClassMap);
    }
    return outTokens;
  }

  if (node.type === 'ArrayExpression') {
    for (const element of node.elements ?? []) {
      extractClassTokensFromExpression(element, outTokens, cvaClassMap);
    }
    return outTokens;
  }

  if (node.type === 'ObjectExpression') {
    for (const property of node.properties ?? []) {
      if (!property) {
        continue;
      }
      if (property.type === 'ObjectProperty') {
        if (!property.computed) {
          if (property.key.type === 'StringLiteral') {
            pushClassString(outTokens, property.key.value);
          } else if (property.key.type === 'Identifier' && property.key.name.includes('-')) {
            pushClassString(outTokens, property.key.name);
          }
        }
        extractClassTokensFromExpression(property.value, outTokens, cvaClassMap);
      } else if (property.type === 'SpreadElement') {
        extractClassTokensFromExpression(property.argument, outTokens, cvaClassMap);
      }
    }
    return outTokens;
  }

  if (
    node.type === 'ConditionalExpression' ||
    node.type === 'LogicalExpression' ||
    node.type === 'BinaryExpression'
  ) {
    if (node.left) {
      extractClassTokensFromExpression(node.left, outTokens, cvaClassMap);
    }
    if (node.right) {
      extractClassTokensFromExpression(node.right, outTokens, cvaClassMap);
    }
    if (node.consequent) {
      extractClassTokensFromExpression(node.consequent, outTokens, cvaClassMap);
    }
    if (node.alternate) {
      extractClassTokensFromExpression(node.alternate, outTokens, cvaClassMap);
    }
    return outTokens;
  }

  if (node.type === 'SequenceExpression') {
    for (const expression of node.expressions ?? []) {
      extractClassTokensFromExpression(expression, outTokens, cvaClassMap);
    }
    return outTokens;
  }

  if (node.type === 'AssignmentExpression') {
    extractClassTokensFromExpression(node.right, outTokens, cvaClassMap);
    return outTokens;
  }

  if (node.type === 'UnaryExpression' || node.type === 'AwaitExpression') {
    extractClassTokensFromExpression(node.argument, outTokens, cvaClassMap);
    return outTokens;
  }

  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
    if (node.body?.type === 'BlockStatement') {
      for (const statement of node.body.body ?? []) {
        if (statement.type === 'ReturnStatement' && statement.argument) {
          extractClassTokensFromExpression(statement.argument, outTokens, cvaClassMap);
        }
      }
    } else {
      extractClassTokensFromExpression(node.body, outTokens, cvaClassMap);
    }
    return outTokens;
  }

  if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
    extractClassTokensFromExpression(node.object, outTokens, cvaClassMap);
    if (node.computed) {
      extractClassTokensFromExpression(node.property, outTokens, cvaClassMap);
    }
    return outTokens;
  }

  return outTokens;
}

function findJsxInExpression(node) {
  if (!node || typeof node !== 'object') {
    return null;
  }

  if (node.type === 'JSXElement' || node.type === 'JSXFragment') {
    return node;
  }

  if (
    node.type === 'ParenthesizedExpression' ||
    node.type === 'TSAsExpression' ||
    node.type === 'TSTypeAssertion' ||
    node.type === 'TSNonNullExpression'
  ) {
    return findJsxInExpression(node.expression);
  }

  if (node.type === 'CallExpression') {
    for (const argument of node.arguments ?? []) {
      const fromArg = findJsxInExpression(argument);
      if (fromArg) {
        return fromArg;
      }
    }
    return findJsxInExpression(node.callee);
  }

  if (node.type === 'ArrayExpression') {
    for (const element of node.elements ?? []) {
      const fromElement = findJsxInExpression(element);
      if (fromElement) {
        return fromElement;
      }
    }
    return null;
  }

  if (node.type === 'ObjectExpression') {
    for (const property of node.properties ?? []) {
      if (!property) {
        continue;
      }
      if (property.type === 'ObjectProperty') {
        const fromValue = findJsxInExpression(property.value);
        if (fromValue) {
          return fromValue;
        }
      } else if (property.type === 'SpreadElement') {
        const fromSpread = findJsxInExpression(property.argument);
        if (fromSpread) {
          return fromSpread;
        }
      }
    }
    return null;
  }

  if (
    node.type === 'ConditionalExpression' ||
    node.type === 'LogicalExpression' ||
    node.type === 'BinaryExpression'
  ) {
    const left = node.left ? findJsxInExpression(node.left) : null;
    if (left) {
      return left;
    }
    const right = node.right ? findJsxInExpression(node.right) : null;
    if (right) {
      return right;
    }
    const consequent = node.consequent ? findJsxInExpression(node.consequent) : null;
    if (consequent) {
      return consequent;
    }
    return node.alternate ? findJsxInExpression(node.alternate) : null;
  }

  if (node.type === 'SequenceExpression') {
    for (const expression of node.expressions ?? []) {
      const fromExpression = findJsxInExpression(expression);
      if (fromExpression) {
        return fromExpression;
      }
    }
    return null;
  }

  if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
    return extractReturnJsx(node);
  }

  if (node.type === 'AssignmentExpression') {
    return findJsxInExpression(node.right);
  }

  if (node.type === 'UnaryExpression' || node.type === 'AwaitExpression') {
    return findJsxInExpression(node.argument);
  }

  if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
    const fromObject = findJsxInExpression(node.object);
    if (fromObject) {
      return fromObject;
    }
    if (node.computed) {
      return findJsxInExpression(node.property);
    }
    return null;
  }

  return null;
}

function findReturnJsxInStatement(statement) {
  if (!statement || typeof statement !== 'object') {
    return null;
  }

  if (statement.type === 'ReturnStatement') {
    if (!statement.argument) {
      return null;
    }
    return findJsxInExpression(statement.argument);
  }

  if (statement.type === 'BlockStatement') {
    for (const child of statement.body ?? []) {
      const found = findReturnJsxInStatement(child);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (statement.type === 'IfStatement') {
    const fromConsequent = findReturnJsxInStatement(statement.consequent);
    if (fromConsequent) {
      return fromConsequent;
    }
    return statement.alternate ? findReturnJsxInStatement(statement.alternate) : null;
  }

  if (statement.type === 'SwitchStatement') {
    for (const switchCase of statement.cases ?? []) {
      for (const child of switchCase.consequent ?? []) {
        const found = findReturnJsxInStatement(child);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  if (statement.type === 'TryStatement') {
    const fromBlock = findReturnJsxInStatement(statement.block);
    if (fromBlock) {
      return fromBlock;
    }
    const fromHandler = statement.handler?.body
      ? findReturnJsxInStatement(statement.handler.body)
      : null;
    if (fromHandler) {
      return fromHandler;
    }
    return statement.finalizer ? findReturnJsxInStatement(statement.finalizer) : null;
  }

  if (
    statement.type === 'ForStatement' ||
    statement.type === 'ForInStatement' ||
    statement.type === 'ForOfStatement' ||
    statement.type === 'WhileStatement' ||
    statement.type === 'DoWhileStatement' ||
    statement.type === 'LabeledStatement'
  ) {
    return findReturnJsxInStatement(statement.body);
  }

  return null;
}

function extractReturnJsx(node) {
  if (
    node.type === 'ArrowFunctionExpression' &&
    (node.body.type === 'JSXElement' || node.body.type === 'JSXFragment')
  ) {
    return node.body;
  }

  if (node.body?.type !== 'BlockStatement') {
    return findJsxInExpression(node.body);
  }

  for (const statement of node.body.body ?? []) {
    const found = findReturnJsxInStatement(statement);
    if (found) {
      return found;
    }
  }

  return null;
}

function getRootWrapperClassFromJsx(jsxNode, cvaClassMap = null) {
  if (!jsxNode || jsxNode.type !== 'JSXElement') {
    return null;
  }

  for (const attribute of jsxNode.openingElement.attributes ?? []) {
    if (attribute.type !== 'JSXAttribute') {
      continue;
    }
    if (attribute.name.type !== 'JSXIdentifier' || attribute.name.name !== 'className') {
      continue;
    }

    const value = attribute.value;
    if (!value) {
      return null;
    }

    if (value.type === 'StringLiteral') {
      return value.value;
    }

    if (value.type === 'JSXExpressionContainer' && value.expression.type === 'StringLiteral') {
      return value.expression.value;
    }

    if (value.type === 'JSXExpressionContainer' && value.expression.type === 'TemplateLiteral') {
      if (value.expression.expressions.length === 0) {
        return value.expression.quasis.map((item) => item.value.cooked ?? '').join('');
      }
    }

    if (value.type === 'JSXExpressionContainer') {
      const tokens = extractClassTokensFromExpression(value.expression, [], cvaClassMap);
      const normalized = normalizeClassTokens(tokens);
      return normalized || null;
    }

    return null;
  }

  return null;
}

function jsxNameToString(nameNode) {
  if (!nameNode) {
    return null;
  }
  if (nameNode.type === 'JSXIdentifier') {
    return nameNode.name;
  }
  if (nameNode.type === 'JSXMemberExpression') {
    const left = jsxNameToString(nameNode.object);
    const right = jsxNameToString(nameNode.property);
    return left && right ? `${left}.${right}` : null;
  }
  return null;
}

function expressionNameToString(node) {
  if (!node || typeof node !== 'object') {
    return null;
  }

  if (node.type === 'Identifier') {
    return node.name;
  }

  if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
    const objectName = expressionNameToString(node.object);
    let propertyName = null;
    if (node.property?.type === 'Identifier') {
      propertyName = node.property.name;
    } else if (node.property?.type === 'StringLiteral') {
      propertyName = node.property.value;
    }
    if (!objectName || !propertyName) {
      return null;
    }
    return `${objectName}.${propertyName}`;
  }

  if (
    node.type === 'ParenthesizedExpression' ||
    node.type === 'TSAsExpression' ||
    node.type === 'TSTypeAssertion' ||
    node.type === 'TSNonNullExpression'
  ) {
    return expressionNameToString(node.expression);
  }

  return null;
}

function collectRenderedComponentsFromJsx(jsxNode) {
  const rendered = new Set();
  const stack = [jsxNode];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') {
      continue;
    }

    if (node.type === 'JSXElement') {
      const name = jsxNameToString(node.openingElement?.name);
      if (name) {
        if (name.includes('.')) {
          const parts = name.split('.');
          const maybeComponent = parts[parts.length - 1];
          if (isComponentName(maybeComponent)) {
            rendered.add(name);
          }
        } else if (isComponentName(name)) {
          rendered.add(name);
        }
      }
      for (const child of node.children ?? []) {
        stack.push(child);
      }
      continue;
    }

    if (node.type === 'JSXFragment') {
      for (const child of node.children ?? []) {
        stack.push(child);
      }
      continue;
    }

    if (node.type === 'JSXExpressionContainer') {
      stack.push(node.expression);
      continue;
    }

    if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') {
      if (node.body?.type === 'BlockStatement') {
        for (const statement of node.body.body ?? []) {
          stack.push(statement);
        }
      } else if (node.body) {
        stack.push(node.body);
      }
      continue;
    }

    if (node.type === 'BlockStatement') {
      for (const statement of node.body ?? []) {
        stack.push(statement);
      }
      continue;
    }

    if (node.type === 'ReturnStatement') {
      if (node.argument) {
        stack.push(node.argument);
      }
      continue;
    }

    if (node.type === 'IfStatement') {
      stack.push(node.test, node.consequent);
      if (node.alternate) {
        stack.push(node.alternate);
      }
      continue;
    }

    if (node.type === 'CallExpression') {
      stack.push(node.callee);
      for (const argument of node.arguments ?? []) {
        stack.push(argument);
      }
      continue;
    }

    if (node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') {
      stack.push(node.object);
      if (node.computed) {
        stack.push(node.property);
      }
      continue;
    }

    if (node.type === 'ConditionalExpression') {
      stack.push(node.test, node.consequent, node.alternate);
      continue;
    }

    if (node.type === 'LogicalExpression' || node.type === 'BinaryExpression') {
      stack.push(node.left, node.right);
      continue;
    }

    if (node.type === 'ArrayExpression') {
      for (const element of node.elements ?? []) {
        stack.push(element);
      }
      continue;
    }

    if (node.type === 'ObjectExpression') {
      for (const property of node.properties ?? []) {
        if (property?.type === 'ObjectProperty') {
          stack.push(property.value);
        } else if (property?.type === 'SpreadElement') {
          stack.push(property.argument);
        }
      }
      continue;
    }

    if (node.type === 'VariableDeclaration') {
      for (const declaration of node.declarations ?? []) {
        stack.push(declaration);
      }
      continue;
    }

    if (node.type === 'VariableDeclarator') {
      if (node.init) {
        stack.push(node.init);
      }
      continue;
    }

    if (
      node.type === 'ForStatement' ||
      node.type === 'ForInStatement' ||
      node.type === 'ForOfStatement'
    ) {
      if (node.init) {
        stack.push(node.init);
      }
      if (node.test) {
        stack.push(node.test);
      }
      if (node.update) {
        stack.push(node.update);
      }
      if (node.left) {
        stack.push(node.left);
      }
      if (node.right) {
        stack.push(node.right);
      }
      if (node.body) {
        stack.push(node.body);
      }
      continue;
    }

    if (node.type === 'WhileStatement' || node.type === 'DoWhileStatement') {
      stack.push(node.test, node.body);
      continue;
    }

    if (node.type === 'LabeledStatement') {
      stack.push(node.body);
      continue;
    }

    if (node.type === 'SwitchStatement') {
      stack.push(node.discriminant);
      for (const switchCase of node.cases ?? []) {
        stack.push(switchCase);
      }
      continue;
    }

    if (node.type === 'SwitchCase') {
      if (node.test) {
        stack.push(node.test);
      }
      for (const consequent of node.consequent ?? []) {
        stack.push(consequent);
      }
      continue;
    }

    if (node.type === 'TryStatement') {
      stack.push(node.block);
      if (node.handler) {
        stack.push(node.handler);
      }
      if (node.finalizer) {
        stack.push(node.finalizer);
      }
      continue;
    }

    if (node.type === 'CatchClause') {
      if (node.body) {
        stack.push(node.body);
      }
      continue;
    }

    if (node.type === 'SequenceExpression') {
      for (const expression of node.expressions ?? []) {
        stack.push(expression);
      }
      continue;
    }

    if (node.type === 'AssignmentExpression') {
      stack.push(node.right);
      continue;
    }

    if (node.type === 'UnaryExpression' || node.type === 'AwaitExpression') {
      stack.push(node.argument);
      continue;
    }

    if (
      node.type === 'ParenthesizedExpression' ||
      node.type === 'TSAsExpression' ||
      node.type === 'TSTypeAssertion' ||
      node.type === 'TSNonNullExpression'
    ) {
      stack.push(node.expression);
    }
  }

  return [...rendered];
}

function toPascalCase(value) {
  const parts = value
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return 'AstroComponent';
  }
  const name = parts.map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`).join('');
  return /^[A-Z]/.test(name) ? name : `Astro${name}`;
}

function inferAstroComponentName(filePath) {
  const ext = path.extname(filePath);
  let base = path.basename(filePath, ext);
  if (base.toLowerCase() === 'index') {
    base = path.basename(path.dirname(filePath));
  }
  return toPascalCase(base);
}

function splitAstroSource(source) {
  const firstLineEnd = source.indexOf('\n');
  if (firstLineEnd < 0) {
    return { frontmatter: '', template: source };
  }

  const openingFence = source.slice(0, firstLineEnd).trim();
  if (openingFence !== '---') {
    return { frontmatter: '', template: source };
  }

  let cursor = firstLineEnd + 1;
  while (cursor <= source.length) {
    const nextLineEnd = source.indexOf('\n', cursor);
    const lineEnd = nextLineEnd === -1 ? source.length : nextLineEnd;
    const rawLine = source.slice(cursor, lineEnd);
    const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;

    if (line === '---') {
      const frontmatter = source.slice(firstLineEnd + 1, cursor).replace(/\r?\n$/, '');
      const templateStart = nextLineEnd === -1 ? source.length : nextLineEnd + 1;
      return {
        frontmatter,
        template: source.slice(templateStart),
      };
    }

    if (nextLineEnd === -1) {
      break;
    }
    cursor = nextLineEnd + 1;
  }

  return { frontmatter: '', template: source };
}

function collectRenderedComponentsFromAstroTemplate(template) {
  const rendered = new Set();
  const sanitizedTemplate = template
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
  const componentTagRe = /<([A-Z][A-Za-z0-9]*(?:\.[A-Z][A-Za-z0-9]*)*)\b/g;
  let match = componentTagRe.exec(sanitizedTemplate);
  while (match) {
    if (match[1] !== 'Fragment') {
      rendered.add(match[1]);
    }
    match = componentTagRe.exec(sanitizedTemplate);
  }
  return [...rendered];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractBracedAttributeExpression(attrs, attributeName) {
  const matcher = new RegExp(`(?:^|\\s)${escapeRegExp(attributeName)}\\s*=\\s*\\{`, 'm');
  const match = matcher.exec(attrs);
  if (!match) {
    return null;
  }

  const start = (match.index ?? 0) + match[0].length;
  let depth = 1;
  let index = start;
  let quote = null;

  while (index < attrs.length) {
    const ch = attrs[index];

    if (quote) {
      if (ch === '\\') {
        index += 2;
        continue;
      }
      if (ch === quote) {
        quote = null;
      }
      index += 1;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      index += 1;
      continue;
    }

    if (ch === '{') {
      depth += 1;
      index += 1;
      continue;
    }

    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return attrs.slice(start, index).trim();
      }
      index += 1;
      continue;
    }

    index += 1;
  }

  return null;
}

function extractClassTokensFromExpressionSource(expressionSource, sourceLabel) {
  if (!expressionSource?.trim()) {
    return [];
  }
  try {
    const expressionAst = parseAst(
      `const __class_expr = (${expressionSource});`,
      `${sourceLabel}#class-expression`,
      true,
    );
    let initNode = null;
    traverse(expressionAst, {
      VariableDeclarator(nodePath) {
        if (
          nodePath.node.id?.type === 'Identifier' &&
          nodePath.node.id.name === '__class_expr' &&
          nodePath.node.init
        ) {
          initNode = nodePath.node.init;
          nodePath.stop();
        }
      },
    });
    if (!initNode) {
      return [];
    }
    return extractClassTokensFromExpression(initNode, []);
  } catch {
    return [];
  }
}

function extractClassFromAstroAttributes(attrs, sourceLabel) {
  const tokens = [];

  const classDoubleQuoted = attrs.match(/(?:^|\s)class\s*=\s*"([^"]*)"/);
  if (classDoubleQuoted?.[1]) {
    pushClassString(tokens, classDoubleQuoted[1]);
  }

  const classSingleQuoted = attrs.match(/(?:^|\s)class\s*=\s*'([^']*)'/);
  if (classSingleQuoted?.[1]) {
    pushClassString(tokens, classSingleQuoted[1]);
  }

  const classExpression = extractBracedAttributeExpression(attrs, 'class');
  if (classExpression) {
    const extracted = extractClassTokensFromExpressionSource(classExpression, sourceLabel);
    for (const token of extracted) {
      tokens.push(token);
    }
  }

  const classListExpression = extractBracedAttributeExpression(attrs, 'class:list');
  if (classListExpression) {
    const extracted = extractClassTokensFromExpressionSource(classListExpression, sourceLabel);
    for (const token of extracted) {
      tokens.push(token);
    }
  }

  const normalized = normalizeClassTokens(tokens);
  return normalized || null;
}

function findFirstAstroRootTag(template) {
  const withoutComments = template.replace(/<!--[\s\S]*?-->/g, ' ');
  const withoutScripts = withoutComments
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ');

  const rootTagRe = /<([A-Za-z][\w:-]*)([\s\S]*?)>/g;
  let match = rootTagRe.exec(withoutScripts);

  while (match) {
    const full = match[0] ?? '';
    const tagName = match[1] ?? '';
    if (full.startsWith('</')) {
      match = rootTagRe.exec(withoutScripts);
      continue;
    }

    const lowerTag = tagName.toLowerCase();
    if (lowerTag === 'script' || lowerTag === 'style' || lowerTag === 'fragment') {
      match = rootTagRe.exec(withoutScripts);
      continue;
    }

    return {
      tagName,
      attrs: match[2] ?? '',
    };
  }

  return null;
}

function getRootWrapperClassFromAstroTemplate(template, sourceLabel = 'astro-template') {
  const rootTag = findFirstAstroRootTag(template);
  if (!rootTag) {
    return null;
  }
  return extractClassFromAstroAttributes(rootTag.attrs, sourceLabel);
}

function collectImportsFromAst(frontmatterAst) {
  const imports = new Map();

  traverse(frontmatterAst, {
    ImportDeclaration(nodePath) {
      const importSource = nodePath.node.source.value;
      for (const specifier of nodePath.node.specifiers ?? []) {
        if (specifier.type === 'ImportDefaultSpecifier') {
          imports.set(specifier.local.name, {
            source: importSource,
            kind: 'default',
            importedName: 'default',
          });
        } else if (specifier.type === 'ImportSpecifier') {
          const importedName =
            specifier.imported.type === 'Identifier'
              ? specifier.imported.name
              : specifier.imported.value;
          imports.set(specifier.local.name, { source: importSource, kind: 'named', importedName });
        } else if (specifier.type === 'ImportNamespaceSpecifier') {
          imports.set(specifier.local.name, {
            source: importSource,
            kind: 'namespace',
            importedName: '*',
          });
        }
      }
    },
  });

  return imports;
}

function collectCvaBaseClasses(ast) {
  const classesByName = new Map();

  traverse(ast, {
    VariableDeclarator(nodePath) {
      if (nodePath.node.id?.type !== 'Identifier' || !nodePath.node.init) {
        return;
      }

      const init = nodePath.node.init;
      if (init.type !== 'CallExpression') {
        return;
      }

      const isCvaCall =
        (init.callee.type === 'Identifier' && init.callee.name === 'cva') ||
        (init.callee.type === 'MemberExpression' &&
          init.callee.property?.type === 'Identifier' &&
          init.callee.property.name === 'cva');
      if (!isCvaCall) {
        return;
      }

      const firstArg = init.arguments?.[0];
      if (!firstArg || typeof firstArg !== 'object') {
        return;
      }

      const tokens = extractClassTokensFromExpression(firstArg, []);
      const normalized = normalizeClassTokens(tokens);
      if (normalized) {
        classesByName.set(nodePath.node.id.name, normalized);
      }
    },
  });

  return classesByName;
}

function unwrapComponentFunction(initNode) {
  let current = initNode;
  const seen = new Set();

  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);

    if (
      current.type === 'ArrowFunctionExpression' ||
      current.type === 'FunctionExpression' ||
      current.type === 'FunctionDeclaration'
    ) {
      return current;
    }

    if (
      current.type === 'ParenthesizedExpression' ||
      current.type === 'TSAsExpression' ||
      current.type === 'TSTypeAssertion' ||
      current.type === 'TSNonNullExpression'
    ) {
      current = current.expression;
      continue;
    }

    if (current.type === 'CallExpression') {
      const functionArg = (current.arguments ?? []).find(
        (argument) =>
          argument &&
          typeof argument === 'object' &&
          (argument.type === 'ArrowFunctionExpression' || argument.type === 'FunctionExpression'),
      );
      if (functionArg) {
        return functionArg;
      }

      const nestedArg = (current.arguments ?? []).find(
        (argument) =>
          argument &&
          typeof argument === 'object' &&
          (argument.type === 'CallExpression' ||
            argument.type === 'ParenthesizedExpression' ||
            argument.type === 'TSAsExpression' ||
            argument.type === 'TSNonNullExpression'),
      );
      if (nestedArg) {
        current = nestedArg;
        continue;
      }
    }

    break;
  }

  return null;
}

function unwrapAliasTarget(initNode) {
  let current = initNode;
  const seen = new Set();

  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);

    if (
      current.type === 'ParenthesizedExpression' ||
      current.type === 'TSAsExpression' ||
      current.type === 'TSTypeAssertion' ||
      current.type === 'TSNonNullExpression'
    ) {
      current = current.expression;
      continue;
    }

    if (
      current.type === 'Identifier' ||
      current.type === 'MemberExpression' ||
      current.type === 'OptionalMemberExpression'
    ) {
      return current;
    }

    break;
  }

  return null;
}

async function analyzeJsLikeFile(filePath, externalCvaClassMap) {
  const source = await Bun.file(filePath).text();
  const ast = parseAst(source, filePath);

  const imports = collectImportsFromAst(ast);
  const cvaClassMap = collectCvaBaseClasses(ast);
  if (externalCvaClassMap) {
    for (const [name, classes] of externalCvaClassMap) {
      if (!cvaClassMap.has(name)) {
        cvaClassMap.set(name, classes);
      }
    }
  }
  const exportsNamed = new Map();
  let exportDefault = null;
  const components = [];

  traverse(ast, {
    ExportDefaultDeclaration(nodePath) {
      const declaration = nodePath.node.declaration;
      if (declaration.type === 'Identifier') {
        exportDefault = declaration.name;
      } else if (declaration.type === 'FunctionDeclaration' && declaration.id?.name) {
        exportDefault = declaration.id.name;
      }
    },

    ExportNamedDeclaration(nodePath) {
      const declaration = nodePath.node.declaration;
      if (declaration?.type === 'FunctionDeclaration' && declaration.id?.name) {
        exportsNamed.set(declaration.id.name, declaration.id.name);
      }
      if (declaration?.type === 'VariableDeclaration') {
        for (const declarationNode of declaration.declarations) {
          if (declarationNode.id?.type === 'Identifier') {
            exportsNamed.set(declarationNode.id.name, declarationNode.id.name);
          }
        }
      }
      for (const specifier of nodePath.node.specifiers ?? []) {
        if (specifier.type !== 'ExportSpecifier') {
          continue;
        }

        const exportedName =
          specifier.exported.type === 'Identifier'
            ? specifier.exported.name
            : specifier.exported.value;
        if (specifier.local.type === 'Identifier' && exportedName) {
          exportsNamed.set(exportedName, specifier.local.name);
        }
      }
    },

    FunctionDeclaration(nodePath) {
      const name = nodePath.node.id?.name;
      if (!isComponentName(name)) {
        return;
      }
      const returnJsx = extractReturnJsx(nodePath.node);
      components.push({
        fileAbs: filePath,
        name,
        wrapperClass: returnJsx ? getRootWrapperClassFromJsx(returnJsx, cvaClassMap) : null,
        renders: returnJsx ? collectRenderedComponentsFromJsx(returnJsx) : [],
        acceptsChildren: hasChildrenParam(nodePath.node),
      });
    },

    VariableDeclarator(nodePath) {
      if (nodePath.node.id?.type !== 'Identifier') {
        return;
      }
      const name = nodePath.node.id.name;
      if (!isComponentName(name) || !nodePath.node.init) {
        return;
      }

      const componentFunction = unwrapComponentFunction(nodePath.node.init);
      if (componentFunction) {
        const returnJsx = extractReturnJsx(componentFunction);
        components.push({
          fileAbs: filePath,
          name,
          wrapperClass: returnJsx ? getRootWrapperClassFromJsx(returnJsx, cvaClassMap) : null,
          renders: returnJsx ? collectRenderedComponentsFromJsx(returnJsx) : [],
          acceptsChildren: hasChildrenParam(componentFunction),
        });
        return;
      }

      const aliasTarget = unwrapAliasTarget(nodePath.node.init);
      if (aliasTarget) {
        const aliasRef = expressionNameToString(aliasTarget);
        components.push({
          fileAbs: filePath,
          name,
          wrapperClass: null,
          renders: aliasRef ? [aliasRef] : [],
          acceptsChildren: false,
        });
      }
    },
  });

  return {
    absPath: filePath,
    relPath: rel(filePath),
    imports,
    exportsNamed,
    exportDefault,
    components,
    cvaClassMap,
  };
}

async function analyzeAstroFile(filePath) {
  const source = await Bun.file(filePath).text();
  const { frontmatter, template } = splitAstroSource(source);

  const imports = new Map();
  if (frontmatter.trim().length > 0) {
    const frontmatterAst = parseAst(frontmatter, `${filePath}#frontmatter`, true);
    const frontmatterImports = collectImportsFromAst(frontmatterAst);
    for (const [key, value] of frontmatterImports.entries()) {
      imports.set(key, value);
    }
  }

  const componentName = inferAstroComponentName(filePath);

  return {
    absPath: filePath,
    relPath: rel(filePath),
    imports,
    exportsNamed: new Map(),
    exportDefault: null,
    components: [
      {
        fileAbs: filePath,
        name: componentName,
        wrapperClass: getRootWrapperClassFromAstroTemplate(template, filePath),
        renders: collectRenderedComponentsFromAstroTemplate(template),
        acceptsChildren: hasSlotInAstroTemplate(template),
      },
    ],
    cvaClassMap: new Map(),
  };
}

async function analyzeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.astro') {
    return analyzeAstroFile(filePath);
  }
  return analyzeJsLikeFile(filePath);
}

const LAYOUT_CLASS_EXACT = new Set([
  'relative',
  'absolute',
  'fixed',
  'sticky',
  'static',
  'flex',
  'grid',
  'block',
  'inline',
  'hidden',
  'table',
  'contents',
  'grow',
  'shrink',
]);

const LAYOUT_CLASS_PREFIXES = [
  'top-',
  'right-',
  'bottom-',
  'left-',
  'inset-',
  '-top-',
  '-right-',
  '-bottom-',
  '-left-',
  '-inset-',
  'items-',
  'justify-',
  'self-',
  'place-',
  'content-',
  'order-',
  'inline-',
  'table-',
  'basis-',
  'flex-',
  'grow-',
  'shrink-',
  'col-',
  'row-',
  'auto-cols-',
  'auto-rows-',
  'grid-',
  'gap-',
  'space-x-',
  'space-y-',
  'w-',
  'h-',
  'min-w-',
  'min-h-',
  'max-w-',
  'max-h-',
  'size-',
  'p-',
  'px-',
  'py-',
  'pt-',
  'pr-',
  'pb-',
  'pl-',
  'ps-',
  'pe-',
  'm-',
  'mx-',
  'my-',
  'mt-',
  'mr-',
  'mb-',
  'ml-',
  'ms-',
  'me-',
  '-m-',
  '-mx-',
  '-my-',
  '-mt-',
  '-mr-',
  '-mb-',
  '-ml-',
  'overflow-',
  'overscroll-',
  'z-',
  '-z-',
  'aspect-',
];

function isLayoutClass(token) {
  const base = token.replace(/^(?:[a-zA-Z0-9_-]+:)+/, '');
  if (LAYOUT_CLASS_EXACT.has(base)) {
    return true;
  }
  for (const prefix of LAYOUT_CLASS_PREFIXES) {
    if (base.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}

function filterLayoutClasses(classString) {
  if (!classString) {
    return null;
  }
  const filtered = classString.split(/\s+/).filter(Boolean).filter(isLayoutClass);
  return filtered.length > 0 ? filtered.join(' ') : null;
}

function hasSlotInAstroTemplate(template) {
  const sanitized = template
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
  return /<slot[\s/>]/i.test(sanitized);
}

function hasChildrenParam(funcNode) {
  for (const param of funcNode?.params ?? []) {
    if (param.type !== 'ObjectPattern') {
      continue;
    }
    for (const prop of param.properties ?? []) {
      if (
        prop.type === 'ObjectProperty' &&
        prop.key?.type === 'Identifier' &&
        prop.key.name === 'children'
      ) {
        return true;
      }
    }
  }
  return false;
}

function findPathToNode(rootKey, targetKey, childrenByKey) {
  if (rootKey === targetKey) {
    return [rootKey];
  }
  const visited = new Set();
  const parentMap = new Map();
  const queue = [rootKey];
  let head = 0;
  visited.add(rootKey);
  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    for (const child of childrenByKey.get(current) ?? []) {
      if (visited.has(child)) {
        continue;
      }
      visited.add(child);
      parentMap.set(child, current);
      if (child === targetKey) {
        const nodePath = [];
        let cursor = targetKey;
        while (cursor !== undefined) {
          nodePath.unshift(cursor);
          cursor = parentMap.get(cursor);
        }
        return nodePath;
      }
      queue.push(child);
    }
  }
  return null;
}

function buildFocusedAsciiTree({ rootKey, focusKey, nodesByKey, childrenByKey, layoutOnly }) {
  const lines = [];

  function classStr(node) {
    if (!node?.wrapperClass) {
      return '';
    }
    const cls = layoutOnly ? filterLayoutClasses(node.wrapperClass) : node.wrapperClass;
    return cls ? ` (${cls})` : '';
  }

  const ancestorPath = findPathToNode(rootKey, focusKey, childrenByKey);
  if (ancestorPath && ancestorPath.length > 1) {
    lines.push('Ancestor chain (layout context):');
    for (let index = 0; index < ancestorPath.length; index += 1) {
      const node = nodesByKey.get(ancestorPath[index]);
      if (!node) {
        continue;
      }
      const indent = '  '.repeat(index + 1);
      const connector = index === 0 ? '' : '└ ';
      const marker = index === ancestorPath.length - 1 ? '★ ' : '';
      lines.push(`${indent}${connector}${marker}[${node.name}]${classStr(node)} - ${node.fileRel}`);
    }
    lines.push('');
  }

  const subtree = buildAsciiTree({ rootKey: focusKey, nodesByKey, childrenByKey, layoutOnly });
  lines.push(subtree);
  return lines.join('\n');
}

function buildAsciiTree({ rootKey, nodesByKey, childrenByKey, layoutOnly = false }) {
  const lines = [];

  function labelForKey(key) {
    const node = nodesByKey.get(key);
    if (!node) {
      return key;
    }
    const rawClass = layoutOnly ? filterLayoutClasses(node.wrapperClass) : node.wrapperClass;
    const classSuffix = rawClass ? ` (${rawClass})` : '';
    const slotMark = node.acceptsChildren ? ' ⊞' : '';
    return `[${node.name}] - ${node.fileRel}${classSuffix}${slotMark}`;
  }

  function walk(key, prefix, isLast, depth, pathVisited) {
    const connector = depth === 0 ? '' : isLast ? '└── ' : '├── ';
    lines.push(`${prefix}${connector}${labelForKey(key)}`);

    if (pathVisited.has(key)) {
      lines.push(`${prefix}${isLast ? '    ' : '│   '}↳ (recursive cycle omitted)`);
      return;
    }
    pathVisited.add(key);

    const children = childrenByKey.get(key) ?? [];
    for (let index = 0; index < children.length; index += 1) {
      const child = children[index];
      const childIsLast = index === children.length - 1;
      const childPrefix = depth === 0 ? '' : `${prefix}${isLast ? '    ' : '│   '}`;
      walk(child, childPrefix, childIsLast, depth + 1, pathVisited);
    }

    pathVisited.delete(key);
  }

  walk(rootKey, '', true, 0, new Set());
  return lines.join('\n');
}

function buildMermaidGraph({ nodesByKey, edges }) {
  const lines = ['```mermaid', 'graph TD'];

  for (const [from, to] of edges) {
    const fromNode = nodesByKey.get(from);
    const toNode = nodesByKey.get(to);
    if (!fromNode || !toNode) {
      continue;
    }
    lines.push(
      `  ${fromNode.mermaidId}["${fromNode.name}<br/>${fromNode.fileRel}"] --> ${toNode.mermaidId}["${toNode.name}<br/>${toNode.fileRel}"]`,
    );
  }

  lines.push('```');
  return lines.join('\n');
}

function commonPrefixLength(left, right) {
  const max = Math.min(left.length, right.length);
  let length = 0;
  for (let index = 0; index < max; index += 1) {
    if (left[index] !== right[index]) {
      break;
    }
    length += 1;
  }
  return length;
}

function chooseClosestNodeKey(fromFileAbs, candidateKeys, nodesByKey) {
  if (!candidateKeys || candidateKeys.length === 0) {
    return null;
  }
  if (candidateKeys.length === 1) {
    return candidateKeys[0];
  }

  const fromDirSegments = rel(path.dirname(fromFileAbs)).split('/').filter(Boolean);
  const ranked = candidateKeys
    .map((key) => {
      const node = nodesByKey.get(key);
      if (!node) {
        return null;
      }
      const candidateDirSegments = rel(path.dirname(node.fileAbs)).split('/').filter(Boolean);
      const prefix = commonPrefixLength(fromDirSegments, candidateDirSegments);
      const distance = fromDirSegments.length + candidateDirSegments.length - 2 * prefix;
      const score = prefix * 1000 - distance;
      return { key, score };
    })
    .filter(Boolean);

  if (ranked.length === 0) {
    return null;
  }

  ranked.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.key.localeCompare(right.key);
  });

  return ranked[0].key;
}

function summarizeUnresolvedRefs(unresolvedRefs) {
  const unresolvedByReason = {};
  for (const unresolved of unresolvedRefs) {
    unresolvedByReason[unresolved.reason] = (unresolvedByReason[unresolved.reason] ?? 0) + 1;
  }
  return unresolvedByReason;
}

function isExternalRefReason(reason) {
  return typeof reason === 'string' && reason.startsWith('external_');
}

async function main() {
  const glob = new Bun.Glob('**/*.{ts,tsx,js,jsx,astro}');
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
  files.sort((a, b) => a.localeCompare(b));

  const analyses = [];
  const batchSizeRaw = Number(process.env.UI_MAP_ANALYZE_BATCH_SIZE ?? 40);
  const analyzeBatchSize =
    Number.isFinite(batchSizeRaw) && batchSizeRaw > 0 ? Math.floor(batchSizeRaw) : 40;

  for (let index = 0; index < files.length; index += analyzeBatchSize) {
    const batchFiles = files.slice(index, index + analyzeBatchSize);
    const batchAnalyses = await Promise.all(batchFiles.map((file) => analyzeFile(file)));
    analyses.push(...batchAnalyses);
  }

  const exportsIndex = new Map();
  const componentsIndex = new Map();
  const nodesByKey = new Map();
  const keysByFileAndName = new Map();

  for (const analysis of analyses) {
    const componentMap = new Map();
    for (const component of analysis.components) {
      componentMap.set(component.name, component);
    }
    componentsIndex.set(analysis.absPath, componentMap);
    exportsIndex.set(analysis.absPath, {
      exportDefaultLocal: analysis.exportDefault,
      exportsNamed: analysis.exportsNamed,
      imports: analysis.imports,
    });

    for (const component of analysis.components) {
      const key = `${component.name}@${analysis.relPath}`;
      const mermaidId = `${component.name}_${stableId(key)}`.replace(/[^A-Za-z0-9_]/g, '_');
      nodesByKey.set(key, {
        key,
        name: component.name,
        fileAbs: analysis.absPath,
        fileRel: analysis.relPath,
        wrapperClass: component.wrapperClass ?? null,
        renders: component.renders,
        acceptsChildren: component.acceptsChildren ?? false,
        mermaidId,
      });
      keysByFileAndName.set(`${analysis.absPath}::${component.name}`, key);
    }
  }

  // ── CVA cross-file enrichment (second pass) ─────────────────────
  const fileCvaExports = new Map();
  for (const analysis of analyses) {
    if (analysis.cvaClassMap?.size) {
      fileCvaExports.set(analysis.absPath, analysis.cvaClassMap);
    }
  }

  if (fileCvaExports.size > 0) {
    const reAnalysisQueue = [];
    for (const analysis of analyses) {
      const ext = path.extname(analysis.absPath).toLowerCase();
      if (ext === '.astro') continue;

      const externalCva = new Map();
      for (const [localName, importInfo] of analysis.imports) {
        const targetFile = await resolveImportToFile(analysis.absPath, importInfo.source);
        if (!targetFile || !fileCvaExports.has(targetFile)) continue;

        const targetCva = fileCvaExports.get(targetFile);
        const targetExportInfo = exportsIndex.get(targetFile);
        if (!targetExportInfo) continue;

        let resolvedLocal;
        if (importInfo.kind === 'named') {
          resolvedLocal = targetExportInfo.exportsNamed.get(importInfo.importedName);
        } else if (importInfo.kind === 'default') {
          resolvedLocal = targetExportInfo.exportDefaultLocal;
        }

        if (resolvedLocal && targetCva.has(resolvedLocal)) {
          externalCva.set(localName, targetCva.get(resolvedLocal));
        }
      }

      if (externalCva.size > 0) {
        reAnalysisQueue.push({ absPath: analysis.absPath, externalCva });
      }
    }

    for (const { absPath, externalCva } of reAnalysisQueue) {
      const reAnalysis = await analyzeJsLikeFile(absPath, externalCva);
      for (const component of reAnalysis.components) {
        const key = `${component.name}@${reAnalysis.relPath}`;
        const existing = nodesByKey.get(key);
        if (existing) {
          existing.wrapperClass = component.wrapperClass;
        }
      }
    }
  }

  async function resolveRenderedToKey(fromFileAbs, renderedName) {
    const fail = (reason, detail = null) => ({ toKey: null, reason, detail });
    const success = (toKey, missingReason = 'resolved_key_missing', missingDetail = null) =>
      toKey ? { toKey, reason: null, detail: null } : fail(missingReason, missingDetail);

    if (renderedName.includes('.')) {
      const [namespace] = renderedName.split('.');
      const memberParts = renderedName.split('.');
      const lastMember = memberParts[memberParts.length - 1] ?? '';
      const importRecord = exportsIndex.get(fromFileAbs)?.imports.get(namespace);
      if (!importRecord) {
        return fail('namespace_import_not_found', namespace);
      }
      const targetFile = await resolveImportToFile(fromFileAbs, importRecord.source);
      if (!targetFile) {
        if (!isProjectImportSource(importRecord.source)) {
          return fail('external_namespace_reference', importRecord.source);
        }
        return fail('namespace_target_not_found', importRecord.source);
      }
      const componentNames = [...(componentsIndex.get(targetFile)?.keys() ?? [])];
      if (isComponentName(lastMember) && componentNames.includes(lastMember)) {
        return success(
          keysByFileAndName.get(`${targetFile}::${lastMember}`) ?? null,
          'namespace_key_not_indexed',
          `${lastMember} in ${rel(targetFile)}`,
        );
      }
      if (componentNames.length === 1) {
        return success(
          keysByFileAndName.get(`${targetFile}::${componentNames[0]}`) ?? null,
          'namespace_single_component_not_indexed',
          rel(targetFile),
        );
      }
      if (componentNames.length === 0) {
        return fail('namespace_target_has_no_components', rel(targetFile));
      }
      return fail('namespace_member_not_resolved', `${renderedName} -> ${rel(targetFile)}`);
    }

    const imported = exportsIndex.get(fromFileAbs)?.imports.get(renderedName);
    if (imported) {
      const targetFile = await resolveImportToFile(fromFileAbs, imported.source);
      if (!targetFile) {
        if (!isProjectImportSource(imported.source)) {
          return fail('external_component_reference', imported.source);
        }
        return fail('import_target_not_found', imported.source);
      }
      const targetExports = exportsIndex.get(targetFile);
      const targetComponents = componentsIndex.get(targetFile);
      if (!targetExports || !targetComponents) {
        return fail('import_target_not_indexed', rel(targetFile));
      }

      if (imported.kind === 'default') {
        const defaultLocal = targetExports.exportDefaultLocal;
        if (defaultLocal && targetComponents.has(defaultLocal)) {
          return success(
            keysByFileAndName.get(`${targetFile}::${defaultLocal}`) ?? null,
            'default_export_key_not_indexed',
            `${defaultLocal} in ${rel(targetFile)}`,
          );
        }
        const componentNames = [...targetComponents.keys()];
        if (componentNames.length === 1) {
          return success(
            keysByFileAndName.get(`${targetFile}::${componentNames[0]}`) ?? null,
            'default_import_single_component_not_indexed',
            rel(targetFile),
          );
        }
        return fail('default_import_component_not_resolved', rel(targetFile));
      }

      if (imported.kind === 'named') {
        const localName =
          targetExports.exportsNamed.get(imported.importedName) ?? imported.importedName;
        if (targetComponents.has(localName)) {
          return success(
            keysByFileAndName.get(`${targetFile}::${localName}`) ?? null,
            'named_export_key_not_indexed',
            `${localName} in ${rel(targetFile)}`,
          );
        }
        return fail(
          'named_import_component_not_resolved',
          `${imported.importedName} in ${rel(targetFile)}`,
        );
      }

      if (imported.kind === 'namespace') {
        return fail('namespace_import_requires_member_render', renderedName);
      }

      return fail('unsupported_import_kind', imported.kind);
    }

    const sameFileMatch = keysByFileAndName.get(`${fromFileAbs}::${renderedName}`);
    if (sameFileMatch) {
      return success(sameFileMatch);
    }

    const globalMatches = [];
    for (const [key, node] of nodesByKey.entries()) {
      if (node.name === renderedName) {
        globalMatches.push(key);
      }
    }
    if (globalMatches.length > 1) {
      const closestKey = chooseClosestNodeKey(fromFileAbs, globalMatches, nodesByKey);
      if (closestKey) {
        return success(closestKey);
      }
      return fail('ambiguous_global_name', renderedName);
    }
    if (globalMatches.length === 1) {
      return success(globalMatches[0]);
    }

    return fail('component_not_found', renderedName);
  }

  const edges = [];
  const edgeSet = new Set();
  const childrenByKey = new Map();
  const unresolvedRefs = [];
  let totalRenderedRefs = 0;

  for (const analysis of analyses) {
    for (const component of analysis.components) {
      const fromKey = `${component.name}@${analysis.relPath}`;
      for (const renderedName of component.renders) {
        totalRenderedRefs += 1;
        const resolution = await resolveRenderedToKey(analysis.absPath, renderedName);
        const toKey = resolution.toKey;
        if (!toKey) {
          unresolvedRefs.push({
            fromKey,
            fromFile: analysis.relPath,
            fromComponent: component.name,
            renderedName,
            reason: resolution.reason ?? 'unknown',
            detail: resolution.detail ?? null,
          });
          continue;
        }
        const edgeKey = `${fromKey}=>${toKey}`;
        if (edgeSet.has(edgeKey)) {
          continue;
        }
        edgeSet.add(edgeKey);
        edges.push([fromKey, toKey]);

        const children = childrenByKey.get(fromKey) ?? [];
        children.push(toKey);
        childrenByKey.set(fromKey, children);
      }
    }
  }

  let rootKey = null;
  if (argv.rootComponent) {
    for (const [key, node] of nodesByKey.entries()) {
      if (node.name === argv.rootComponent) {
        rootKey = key;
        break;
      }
    }
  }

  if (!rootKey) {
    const entryAnalysis = analyses.find(
      (analysis) => path.resolve(analysis.absPath) === path.resolve(entryFile),
    );
    if (entryAnalysis) {
      const defaultLocal = exportsIndex.get(entryAnalysis.absPath)?.exportDefaultLocal;
      if (defaultLocal) {
        rootKey = keysByFileAndName.get(`${entryAnalysis.absPath}::${defaultLocal}`) ?? null;
      }
      if (!rootKey) {
        const componentNames = [...(componentsIndex.get(entryAnalysis.absPath)?.keys() ?? [])];
        if (componentNames.length > 0) {
          rootKey = keysByFileAndName.get(`${entryAnalysis.absPath}::${componentNames[0]}`) ?? null;
        }
      }
    }
  }

  if (!rootKey) {
    for (const [key, node] of nodesByKey.entries()) {
      if (node.name === 'App') {
        rootKey = key;
        break;
      }
    }
  }

  if (!rootKey) {
    throw new Error('Cannot determine root component. Provide --rootComponent or check --entry.');
  }

  if (outBase) {
    await mkdir(path.dirname(outBase), { recursive: true });
  }

  let ascii;
  if (argv.focus) {
    let focusKey = null;
    for (const [key, node] of nodesByKey.entries()) {
      if (node.name === argv.focus) {
        const reachable = findPathToNode(rootKey, key, childrenByKey);
        if (reachable) {
          focusKey = key;
          break;
        }
        if (!focusKey) {
          focusKey = key;
        }
      }
    }
    if (!focusKey) {
      throw new Error(`Focus component "${argv.focus}" not found in the component tree.`);
    }
    ascii = buildFocusedAsciiTree({
      rootKey,
      focusKey,
      nodesByKey,
      childrenByKey,
      layoutOnly: argv.layoutOnly,
    });
  } else {
    ascii = buildAsciiTree({
      rootKey,
      nodesByKey,
      childrenByKey,
      layoutOnly: argv.layoutOnly,
    });
  }
  const mermaid = buildMermaidGraph({ nodesByKey, edges });
  const unresolvedByReason = summarizeUnresolvedRefs(unresolvedRefs);
  const externalRefs = unresolvedRefs.filter((entry) => isExternalRefReason(entry.reason)).length;
  const unresolvedInternalRefs = unresolvedRefs.length - externalRefs;
  const graphJson = {
    generatedAt: new Date().toISOString(),
    rootKey,
    nodes: [...nodesByKey.values()],
    edges,
    unresolvedRefs,
    stats: {
      totalNodes: nodesByKey.size,
      totalEdges: edges.length,
      totalRenderedRefs,
      resolvedRefs: totalRenderedRefs - unresolvedRefs.length,
      unresolvedRefs: unresolvedRefs.length,
      unresolvedInternalRefs,
      externalRefs,
      unresolvedByReason,
    },
  };

  if (outBase) {
    await Bun.write(`${outBase}.ascii.txt`, `${ascii}\n`);
    await Bun.write(`${outBase}.mmd`, `${mermaid}\n`);
    await Bun.write(`${outBase}.json`, `${JSON.stringify(graphJson, null, 2)}\n`);
  }

  if (argv.format === 'ascii') {
    console.log(ascii);
    return;
  }
  if (argv.format === 'mermaid') {
    console.log(mermaid);
    return;
  }
  if (argv.format === 'json') {
    console.log(JSON.stringify(graphJson, null, 2));
    return;
  }

  if (argv.format === 'all') {
    console.log('=== UI_MAP_ASCII ===');
    console.log(ascii);
    console.log('\n=== UI_MAP_MERMAID ===');
    console.log(mermaid);
    console.log('\n=== UI_MAP_JSON ===');
    console.log(JSON.stringify(graphJson, null, 2));
  }
}

main().catch((error) => {
  console.error('generate-ui-map failed:', error?.message ?? error);
  process.exit(1);
});
