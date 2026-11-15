import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';
import * as ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const guest = `${root}src/engine/script/guest/`;
const sourceCache = new Map<string, string>();

function normalizeFileName(fileName: string) {
  return fileName.replaceAll('\\', '/');
}


function firstChangedLine(previous: string | undefined, current: string) {
  if (!previous) return 1;
  const oldLines = previous.split(/\r?\n/);
  const newLines = current.split(/\r?\n/);
  const limit = Math.max(oldLines.length, newLines.length);
  for (let index = 0; index < limit; index += 1) {
    if (oldLines[index] !== newLines[index]) return index + 1;
  }
  return 1;
}

function traceTransformer(): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    const f = context.factory;
    let sourceFile: ts.SourceFile;
    const hasAwait = (node: ts.Node) => {
      let found = false;
      const visitAwait: ts.Visitor = (child) => {
        if (ts.isAwaitExpression(child)) found = true;
        if (!found) ts.forEachChild(child, visitAwait);
        return child;
      };
      visitAwait(node);
      return found;
    };
    const asyncCallback = (statement: ts.Statement) => f.createArrowFunction(
      [f.createModifier(ts.SyntaxKind.AsyncKeyword)], undefined, [], undefined,
      f.createToken(ts.SyntaxKind.EqualsGreaterThanToken), f.createBlock([statement], true),
    );
    const flowCall = (statement: ts.Statement, line: number) => f.createExpressionStatement(
      f.createAwaitExpression(f.createCallExpression(f.createIdentifier('__flowStep'), undefined, [
        f.createStringLiteral(`${normalizeFileName(sourceFile.fileName)}:${line}`),
        asyncCallback(statement),
      ])),
    );
    const flowStatement = (statement: ts.Statement, line: number): ts.Statement => {
      if (ts.isExpressionStatement(statement) && hasAwait(statement.expression)) return flowCall(statement, line);
      if (ts.isVariableStatement(statement)) {
        const declarations = statement.declarationList.declarations.map((declaration) => {
          if (!declaration.initializer || !hasAwait(declaration.initializer)) return declaration;
          const initializer = f.createAwaitExpression(f.createCallExpression(f.createIdentifier('__flowStep'), undefined, [
            f.createStringLiteral(`${normalizeFileName(sourceFile.fileName)}:${line}`),
            f.createArrowFunction([f.createModifier(ts.SyntaxKind.AsyncKeyword)], undefined, [], undefined,
              f.createToken(ts.SyntaxKind.EqualsGreaterThanToken), declaration.initializer),
          ]));
          return f.updateVariableDeclaration(declaration, declaration.name, declaration.exclamationToken, declaration.type, initializer);
        });
        return f.updateVariableStatement(statement, statement.modifiers, f.updateVariableDeclarationList(statement.declarationList, declarations));
      }
      if (ts.isReturnStatement(statement) && statement.expression && hasAwait(statement.expression)) {
        const expression = f.createAwaitExpression(f.createCallExpression(f.createIdentifier('__flowStep'), undefined, [
          f.createStringLiteral(`${normalizeFileName(sourceFile.fileName)}:${line}`),
          f.createArrowFunction([f.createModifier(ts.SyntaxKind.AsyncKeyword)], undefined, [], undefined,
            f.createToken(ts.SyntaxKind.EqualsGreaterThanToken), statement.expression),
        ]));
        return f.updateReturnStatement(statement, expression);
      }
      return statement;
    };
    const instrument = (statements: readonly ts.Statement[]) => statements.flatMap((statement) => {
      if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) || ts.isEmptyStatement(statement)) return [statement];
      const line = sourceFile.getLineAndCharacterOfPosition(statement.getStart(sourceFile)).line + 1;
      // Trace synchronously so ordinary async JavaScript does not gain an extra
      // microtask boundary. Only statements containing an awaited engine call
      // are wrapped in __flowStep below.
      const traced = f.createExpressionStatement(f.createCallExpression(f.createIdentifier('__trace'), undefined, [f.createStringLiteral(sourceFile.fileName), f.createNumericLiteral(line)]));
      return [traced, flowStatement(statement, line)];
    });
    const visit: ts.Visitor = (node) => {
      if (ts.isFunctionLike(node)) {
        const isAsync = ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword);
        if (!isAsync) return node;
      }
      const visited = ts.visitEachChild(node, visit, context);
      if (ts.isBlock(visited)) return f.updateBlock(visited, instrument(visited.statements));
      if (ts.isCaseClause(visited)) return f.updateCaseClause(visited, visited.expression, instrument(visited.statements));
      if (ts.isDefaultClause(visited)) return f.updateDefaultClause(visited, instrument(visited.statements));
      return visited;
    };
    return (input) => {
      sourceFile = input;
      const visited = ts.visitEachChild(input, visit, context);
      return visited;
    };
  };
}

/** Bundle ordinary TS scene modules as VM source, not executable browser modules. */
export function scriptVmPlugin(): Plugin {
  return {
    name: 'kosuzu-script-vm',
    resolveId(id) {
      const virtualId = id.split('?')[0];
      if (virtualId === 'virtual:game-script' || virtualId === 'virtual:game-script-hmr' || virtualId === 'virtual:script-sdk') return `\0${id}`;
    },
    async load(id) {
      const virtualId = id.split('?')[0];
      if (virtualId !== '\0virtual:game-script' && virtualId !== '\0virtual:game-script-hmr' && virtualId !== '\0virtual:script-sdk') return;
      const game = virtualId === '\0virtual:game-script' || virtualId === '\0virtual:game-script-hmr';
      const scriptSources: Record<string, string> = {};
      const result = await build({
        absWorkingDir: root,
        entryPoints: [game ? `${root}src/engine/script/game-entry.ts` : `${root}src/engine/script/sdk-entry.ts`],
        outdir: `${root}.tmp-script-bundle`,
        bundle: true,
        write: false,
        format: 'iife',
        globalName: game ? 'GameScript' : 'ScriptSDK',
        target: 'es2022',
        sourcemap: false,
        metafile: true,
        plugins: [{
          name: 'guest-host-boundary',
          setup(builder) {
            builder.onResolve({ filter: /(?:core\/Runtime|\.\/Runtime)$/ }, (args) => {
              if (args.importer.replaceAll('\\', '/').includes('/guest/')) return;
              return { path: `${guest}Runtime.ts` };
            });
            builder.onResolve({ filter: /(?:\/i18n|\/render\/CharacterAudioManager)$/ }, () => ({ path: `${guest}services.ts` }));
          },
        }, {
          name: 'trace-game-scenes',
          setup(builder) {
            builder.onLoad({ filter: /[\\/]src[\\/]game[\\/]scenes[\\/].*\.ts$/ }, (args) => {
              const contents = readFileSync(args.path, 'utf8');
              sourceCache.set(normalizeFileName(args.path), contents);
              scriptSources[normalizeFileName(args.path)] = contents;
              const transformed = ts.transpileModule(contents, {
                fileName: args.path,
                compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
                transformers: { before: [traceTransformer()] },
              });
              return { contents: transformed.outputText, loader: 'js', resolveDir: dirname(args.path) };
            });
          },
        }],
      });
      for (const file of Object.keys(result.metafile.inputs)) this.addWatchFile(`${root}${file}`);
      const source = result.outputFiles[0]!.text.replace(/^\s*\/\/.*$/gm, '');
      return `export default ${JSON.stringify(source)};\nexport const scriptSources = ${JSON.stringify(scriptSources)};`;
    },
    handleHotUpdate(ctx) {
      if (/[/\\]src[/\\](game[/\\](scenes|actors)|engine[/\\](core[/\\]BaseActor|script[/\\]guest))/.test(ctx.file)) {
        const nextSource = readFileSync(ctx.file, 'utf8');
        const normalizedFile = normalizeFileName(ctx.file);
        const line = firstChangedLine(sourceCache.get(normalizedFile), nextSource);
        sourceCache.set(normalizedFile, nextSource);
        for (const id of ['\0virtual:game-script', '\0virtual:game-script-hmr', '\0virtual:script-sdk']) {
          const module = ctx.server.moduleGraph.getModuleById(id);
          if (module) ctx.server.moduleGraph.invalidateModule(module);
        }
        ctx.server.ws.send({
          type: 'custom',
          event: 'kosuzu:script-update',
          data: { file: ctx.file, line },
        });
        return [];
      }
    },
  };
}
