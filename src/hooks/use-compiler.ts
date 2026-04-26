import { useState, useCallback, useRef } from "react";
import { Scanner } from "../lexic/scanner";
import { Parser } from "../syntactic/parser";
import type { LexicalError, SemanticError, SyntaxError } from "../types";
import { SemanticAnalyzer } from "../semantic/semantic";

interface CompilerResult {
  lexicalErrors: LexicalError[];
  syntaxErrors: SyntaxError[];
  semanticErrors: SemanticError[];
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
  });

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const compile = useCallback((source: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      console.clear();
      // Análise Léxica
      const scanner = new Scanner(source);
      const { tokens, errors: lexicalErrors } = scanner.scanTokens();

      // Análise Sintática
      const parser = new Parser(tokens);
      const { ast, errors: syntaxErrors } = parser.parse();
      parser.printReport();

      let semanticErrors: SemanticError[] = [];
      if (ast) {
        const semantic = new SemanticAnalyzer();
        semantic.analyze(ast);
        semanticErrors = semantic.errors;
      }

      setResult({ lexicalErrors, syntaxErrors, semanticErrors });
    }, DEBOUNCE_MS);
  }, []);

  return {
    ...result,
    compile,
    hasErrors:
      result.lexicalErrors.length > 0 || result.syntaxErrors.length > 0,
  };
}
