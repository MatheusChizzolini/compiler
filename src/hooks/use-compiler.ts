import { useState, useCallback, useRef } from "react";
import { Scanner } from "../lexer/scanner";
import { Parser } from "../parser/parser";
import type { LexicalError, SyntaxError } from "../types";

interface CompilerResult {
  lexicalErrors: LexicalError[];
  syntaxErrors: SyntaxError[];
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
      const { errors: syntaxErrors } = parser.parse();
      parser.printReport();

      setResult({ lexicalErrors, syntaxErrors });
    }, DEBOUNCE_MS);
  }, []);

  return {
    ...result,
    compile,
    hasErrors:
      result.lexicalErrors.length > 0 || result.syntaxErrors.length > 0,
  };
}
