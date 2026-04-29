import { useState, useCallback, useRef } from "react";
import { Scanner } from "../lexic/scanner";
import { Parser } from "../syntactic/parser";
import type { LexicalError, SemanticError, SyntaxError, Log } from "../types";
import { SemanticAnalyzer } from "../semantic/semantic";

interface CompilerResult {
  lexicalErrors: LexicalError[];
  syntaxErrors: SyntaxError[];
  semanticErrors: SemanticError[];
  logs: Log[];
}

interface UseCompilerReturn extends CompilerResult {
  compile: (source: string) => void;
  hasErrors: boolean;
}

const DEBOUNCE_MS = 400;

export function useCompiler(): UseCompilerReturn {
  const [result, setResult] = useState<CompilerResult>({
    lexicalErrors: [],
    syntaxErrors: [],
    semanticErrors: [],
    logs: [],
  });

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const compile = useCallback((source: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      console.clear();
      const logs: Log[] = [];
      const timestamp = new Date().toLocaleTimeString();

      // Análise Léxica
      const scanner = new Scanner(source);
      const { tokens, errors: lexicalErrors } = scanner.scanTokens();

      if (lexicalErrors.length > 0) {
        lexicalErrors.forEach((err) =>
          logs.push({
            type: "error",
            message: `[ERRO LÉXICO] Linha ${err.line}, Coluna ${err.column}: ${err.message}`,
            timestamp,
          })
        );
      } else {
        logs.push({
          type: "success",
          message: "Análise léxica concluída com sucesso.",
          timestamp,
        });
      }

      // Análise Sintática
      const parser = new Parser(tokens);
      const { ast, errors: syntaxErrors } = parser.parse();

      if (syntaxErrors.length > 0) {
        syntaxErrors.forEach((err) =>
          logs.push({
            type: "error",
            message: `[ERRO SINTÁTICO] Linha ${err.line}, Coluna ${err.column}: ${err.message}`,
            timestamp,
          })
        );
      } else {
        logs.push({
          type: "success",
          message: "Análise sintática concluída com sucesso.",
          timestamp,
        });
      }

      // Análise Semântica
      let semanticErrors: SemanticError[] = [];
      if (ast) {
        const semantic = new SemanticAnalyzer();
        semantic.analyze(ast);
        semanticErrors = semantic.errors;

        if (semanticErrors.length > 0) {
          semanticErrors.forEach((err) =>
            logs.push({
              type: "error",
              message: `[ERRO SEMÂNTICO] Linha ${err.line}, Coluna ${err.column}: ${err.message}`,
              timestamp,
            })
          );
        } else {
          logs.push({
            type: "success",
            message: "Análise semântica concluída com sucesso.",
            timestamp,
          });
        }
      }

      setResult({ lexicalErrors, syntaxErrors, semanticErrors, logs });
    }, DEBOUNCE_MS);
  }, []);

  return {
    ...result,
    compile,
    hasErrors:
      result.lexicalErrors.length > 0 || result.syntaxErrors.length > 0,
  };
}
