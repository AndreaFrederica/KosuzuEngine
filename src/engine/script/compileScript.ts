import * as ts from 'typescript';

/** Debug hooks belong only in async scopes; synchronous TS keeps its semantics. */
export function compileScript(source: string, filename = 'script.ts') {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.ES2022, true);
  if (file.statements.some((s) => ts.isImportDeclaration(s) || ts.isExportDeclaration(s))) {
    throw new Error('编辑器脚本请使用内置 API；多文件 import 场景请放入 src/game/scenes，由构建流程打包。');
  }
  const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
    const f = context.factory;
    let sf: ts.SourceFile;
    const instrument = (statements: readonly ts.Statement[]) => statements.flatMap((statement) => {
      if (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) || ts.isEmptyStatement(statement)) return [statement];
      const line = sf.getLineAndCharacterOfPosition(statement.getStart(sf)).line + 1;
      return [f.createExpressionStatement(f.createAwaitExpression(f.createCallExpression(f.createIdentifier('__trace'), undefined, [f.createNumericLiteral(line)]))), statement];
    });
    const visit: ts.Visitor = (node) => {
      if (ts.isFunctionLike(node)) {
        const async = ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
        if (!async) return node;
      }
      const visited = ts.visitEachChild(node, visit, context);
      if (ts.isBlock(visited)) return f.updateBlock(visited, instrument(visited.statements));
      if (ts.isCaseClause(visited)) return f.updateCaseClause(visited, visited.expression, instrument(visited.statements));
      if (ts.isDefaultClause(visited)) return f.updateDefaultClause(visited, instrument(visited.statements));
      return visited;
    };
    return (input) => {
      sf = input;
      const visited = ts.visitEachChild(input, visit, context);
      return f.updateSourceFile(visited, instrument(visited.statements));
    };
  };
  const result = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
    transformers: { before: [transformer] },
  });
  const errors = result.diagnostics?.filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors?.length) throw new Error(errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
  return result.outputText;
}
