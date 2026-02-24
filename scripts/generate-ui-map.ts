#!/usr/bin/env bun
import crypto from 'node:crypto';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';

const traverse = traverseModule.default ?? traverseModule;

const argv = yargs(hideBin(process.argv))
  .option('src', { type: 'string', default: 'src' })
  .option('entry', { type: 'string', demandOption: true })
  .option('out', { type: 'string', default: 'docs/ui-map' })
  .option('rootComponent', { type: 'string' })
  .option('alias', {
    type: 'array',
    default: [],
    describe: 'Path aliases like --alias @=src --alias ~=src',
  })
  .help()
  .parseSync();

const projectRoot = process.cwd();
const srcDir = path.resolve(projectRoot, argv.src);
const entryFile = path.resolve(projectRoot, argv.entry);
const outBase = path.resolve(projectRoot, argv.out);

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

const EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];
const INDEX_FILES = EXTENSIONS.map((ext) => `index${ext}`);

function rel(filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join('/');
}

function isComponentName(name) {
  return /^[A-Z]/.test(name ?? '');
}

function stableId(value) {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, 8);
}

async function fileExists(filePath) {
  return Bun.file(filePath).exists();
}

function parseAst(code, filename) {
  return parse(code, {
    sourceType: 'module',
    sourceFilename: filename,
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

  if (await fileExists(basePath)) {
    const stats = await stat(basePath);
    if (stats.isFile()) {
      return basePath;
    }
    if (stats.isDirectory()) {
      for (const indexFile of INDEX_FILES) {
        const candidate = path.join(basePath, indexFile);
        if (await fileExists(candidate)) {
          return candidate;
        }
      }
    }
  }

  for (const ext of EXTENSIONS) {
    const candidate = `${basePath}${ext}`;
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  for (const indexFile of INDEX_FILES) {
    const candidate = path.join(basePath, indexFile);
    if (await fileExists(candidate)) {
      return candidate;
    }
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
    return null;
  }

  for (const statement of node.body.body) {
    if (statement.type === 'ReturnStatement' && statement.argument) {
      if (statement.argument.type === 'JSXElement' || statement.argument.type === 'JSXFragment') {
        return statement.argument;
      }
    }
  }

  return null;
}

function getRootWrapperClass(jsxNode) {
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

function collectRenderedComponents(jsxNode) {
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

    if (node.type === 'CallExpression') {
      stack.push(node.callee);
      for (const argument of node.arguments ?? []) {
        stack.push(argument);
      }
      continue;
    }

    if (node.type === 'ConditionalExpression') {
      stack.push(node.test, node.consequent, node.alternate);
      continue;
    }

    if (node.type === 'LogicalExpression') {
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
        if (property && property.type === 'ObjectProperty') {
          stack.push(property.value);
        }
      }
    }
  }

  return [...rendered];
}

async function analyzeFile(filePath) {
  const source = await Bun.file(filePath).text();
  const ast = parseAst(source, filePath);

  const imports = new Map();
  const exportsNamed = new Map();
  let exportDefault = null;
  const components = [];

  traverse(ast, {
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
        if (specifier.type === 'ExportSpecifier') {
          exportsNamed.set(specifier.exported.name, specifier.local.name);
        }
      }
    },

    FunctionDeclaration(nodePath) {
      const name = nodePath.node.id?.name;
      if (!isComponentName(name)) {
        return;
      }
      const returnJsx = extractReturnJsx(nodePath.node);
      if (!returnJsx) {
        return;
      }
      components.push({
        fileAbs: filePath,
        name,
        wrapperClass: getRootWrapperClass(returnJsx),
        renders: collectRenderedComponents(returnJsx),
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
      if (
        nodePath.node.init.type !== 'ArrowFunctionExpression' &&
        nodePath.node.init.type !== 'FunctionExpression'
      ) {
        return;
      }
      const returnJsx = extractReturnJsx(nodePath.node.init);
      if (!returnJsx) {
        return;
      }
      components.push({
        fileAbs: filePath,
        name,
        wrapperClass: getRootWrapperClass(returnJsx),
        renders: collectRenderedComponents(returnJsx),
      });
    },
  });

  return {
    absPath: filePath,
    relPath: rel(filePath),
    imports,
    exportsNamed,
    exportDefault,
    components,
  };
}

function buildAsciiTree({ rootKey, nodesByKey, childrenByKey }) {
  const lines = [];
  const visited = new Set();

  function labelForKey(key) {
    const node = nodesByKey.get(key);
    if (!node) {
      return key;
    }
    const classSuffix = node.wrapperClass ? ` (${node.wrapperClass})` : '';
    return `[${node.name}] - ${node.fileRel}${classSuffix}`;
  }

  function walk(key, prefix, isLast, depth) {
    const connector = depth === 0 ? '' : isLast ? '└── ' : '├── ';
    lines.push(`${prefix}${connector}${labelForKey(key)}`);

    if (visited.has(key)) {
      lines.push(`${prefix}${isLast ? '    ' : '│   '}↳ (cycle or duplicate omitted)`);
      return;
    }
    visited.add(key);

    const children = childrenByKey.get(key) ?? [];
    for (let index = 0; index < children.length; index += 1) {
      const child = children[index];
      const childIsLast = index === children.length - 1;
      const childPrefix = depth === 0 ? '' : `${prefix}${isLast ? '    ' : '│   '}`;
      walk(child, childPrefix, childIsLast, depth + 1);
    }
  }

  walk(rootKey, '', true, 0);
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

  const analyses = await Promise.all(files.map((file) => analyzeFile(file)));

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
        mermaidId,
      });
      keysByFileAndName.set(`${analysis.absPath}::${component.name}`, key);
    }
  }

  async function resolveRenderedToKey(fromFileAbs, renderedName) {
    if (renderedName.includes('.')) {
      const [namespace] = renderedName.split('.');
      const importRecord = exportsIndex.get(fromFileAbs)?.imports.get(namespace);
      if (!importRecord) {
        return null;
      }
      const targetFile = await resolveImportToFile(fromFileAbs, importRecord.source);
      if (!targetFile) {
        return null;
      }
      const componentNames = [...(componentsIndex.get(targetFile)?.keys() ?? [])];
      return componentNames.length === 1
        ? (keysByFileAndName.get(`${targetFile}::${componentNames[0]}`) ?? null)
        : null;
    }

    const imported = exportsIndex.get(fromFileAbs)?.imports.get(renderedName);
    if (imported) {
      const targetFile = await resolveImportToFile(fromFileAbs, imported.source);
      if (!targetFile) {
        return null;
      }
      const targetExports = exportsIndex.get(targetFile);
      const targetComponents = componentsIndex.get(targetFile);
      if (!targetExports || !targetComponents) {
        return null;
      }

      if (imported.kind === 'default') {
        const defaultLocal = targetExports.exportDefaultLocal;
        if (defaultLocal && targetComponents.has(defaultLocal)) {
          return keysByFileAndName.get(`${targetFile}::${defaultLocal}`) ?? null;
        }
        const componentNames = [...targetComponents.keys()];
        if (componentNames.length === 1) {
          return keysByFileAndName.get(`${targetFile}::${componentNames[0]}`) ?? null;
        }
        return null;
      }

      if (imported.kind === 'named') {
        const localName =
          targetExports.exportsNamed.get(imported.importedName) ?? imported.importedName;
        if (targetComponents.has(localName)) {
          return keysByFileAndName.get(`${targetFile}::${localName}`) ?? null;
        }
      }
      return null;
    }

    const sameFileMatch = keysByFileAndName.get(`${fromFileAbs}::${renderedName}`);
    if (sameFileMatch) {
      return sameFileMatch;
    }

    const globalMatches = [];
    for (const [key, node] of nodesByKey.entries()) {
      if (node.name === renderedName) {
        globalMatches.push(key);
      }
    }
    return globalMatches.length === 1 ? globalMatches[0] : null;
  }

  const edges = [];
  const edgeSet = new Set();
  const childrenByKey = new Map();

  for (const analysis of analyses) {
    for (const component of analysis.components) {
      const fromKey = `${component.name}@${analysis.relPath}`;
      for (const renderedName of component.renders) {
        const toKey = await resolveRenderedToKey(analysis.absPath, renderedName);
        if (!toKey) {
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

  await mkdir(path.dirname(outBase), { recursive: true });

  const ascii = buildAsciiTree({ rootKey, nodesByKey, childrenByKey });
  const mermaid = buildMermaidGraph({ nodesByKey, edges });
  const graphJson = {
    generatedAt: new Date().toISOString(),
    rootKey,
    nodes: [...nodesByKey.values()],
    edges,
  };

  await Bun.write(`${outBase}.ascii.txt`, `${ascii}\n`);
  await Bun.write(`${outBase}.mmd`, `${mermaid}\n`);
  await Bun.write(`${outBase}.json`, `${JSON.stringify(graphJson, null, 2)}\n`);

  console.log(`Wrote:\n- ${rel(outBase)}.ascii.txt\n- ${rel(outBase)}.mmd\n- ${rel(outBase)}.json`);
}

main().catch((error) => {
  console.error('generate-ui-map failed:', error?.message ?? error);
  process.exit(1);
});
