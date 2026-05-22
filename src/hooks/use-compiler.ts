import { useCallback, useState } from "react";
import { Scanner } from "../lexic/scanner";
import { Parser } from "../syntactic/parser";
import type {
  LexicalError,
  Log,
  SemanticError,
  SemanticWarning,
  SyntaxError,
} from "../types";
import { SemanticAnalyzer } from "../semantic/semantic";
import { IntermediateCodeGenerator } from "../intermediate/code-generator";
import {
  IntermediateCodeOptimizer,
  type OptimizationLog,
} from "../intermediate/code-optimizer";
import { SimpSimGenerator } from "../machine/simpsim-generator";

interface CompilerResult {
  lexicalErrors: LexicalError[];
  syntaxErrors: SyntaxError[];
  semanticErrors: SemanticError[];
  semanticWarnings: SemanticWarning[];
  intermediateCode: string[];
  optimizedCode: string[];
  optimizationLogs: OptimizationLog[];
  machineCode: string[];
  logs: Log[];
}

interface UseCompilerReturn extends CompilerResult {
  compile: (source: string) => void;
  hasErrors: boolean;
}

export function useCompiler(): UseCompilerReturn {
  const [result, setResult] = useState<CompilerResult>({
    lexicalErrors: [],
    syntaxErrors: [],
    semanticErrors: [],
    semanticWarnings: [],
    intermediateCode: [],
    optimizedCode: [],
    optimizationLogs: [],
    machineCode: [],
    logs: [],
  });

  const compile = useCallback((source: string) => {
    console.clear();
    const logs: Log[] = [];
    const timestamp = new Date().toLocaleTimeString();

    const scanner = new Scanner(source);
    const { tokens, errors: lexicalErrors } = scanner.scanTokens();

    if (lexicalErrors.length > 0) {
      lexicalErrors.forEach((err) =>
        logs.push({
          type: "error",
          message: `[ERRO LEXICO] Linha ${err.line}, Coluna ${err.column}: ${err.message}`,
          timestamp,
        }),
      );
    } else {
      logs.push({
        type: "success",
        message: "Analise lexica concluida com sucesso.",
        timestamp,
      });
    }

    const parser = new Parser(tokens);
    const { ast, errors: syntaxErrors } = parser.parse();

    if (syntaxErrors.length > 0) {
      syntaxErrors.forEach((err) =>
        logs.push({
          type: "error",
          message: `[ERRO SINTATICO] Linha ${err.line}, Coluna ${err.column}: ${err.message}`,
          timestamp,
        }),
      );
    } else {
      logs.push({
        type: "success",
        message: "Analise sintatica concluida com sucesso.",
        timestamp,
      });
    }

    let semanticErrors: SemanticError[] = [];
    let semanticWarnings: SemanticWarning[] = [];
    let intermediateCode: string[] = [];
    let optimizedCode: string[] = [];
    let optimizationLogs: OptimizationLog[] = [];
    let machineCode: string[] = [];

    if (ast) {
      const semantic = new SemanticAnalyzer();
      semantic.analyze(ast);
      semanticErrors = semantic.errors;
      semanticWarnings = semantic.warnings;

      if (semanticErrors.length > 0) {
        semanticErrors.forEach((err) =>
          logs.push({
            type: "error",
            message: `[ERRO SEMANTICO] Linha ${err.line}, Coluna ${err.column}: ${err.message}`,
            timestamp,
          }),
        );
      } else {
        logs.push({
          type: "success",
          message: "Analise semantica concluida com sucesso.",
          timestamp,
        });
      }

      semanticWarnings.forEach((warning) =>
        logs.push({
          type: "warning",
          message: `[AVISO SEMANTICO] Linha ${warning.line}, Coluna ${warning.column}: ${warning.message}`,
          timestamp,
        }),
      );
    }

    if (
      lexicalErrors.length === 0 &&
      syntaxErrors.length === 0 &&
      semanticErrors.length === 0
    ) {
      const intermediateGenerator = new IntermediateCodeGenerator();
      intermediateCode = intermediateGenerator.generate(ast).instructions;

      logs.push({
        type: "success",
        message: "Geracao de codigo intermediario concluida com sucesso.",
        timestamp,
      });

      if (intermediateCode.length > 0) {
        const optimizer = new IntermediateCodeOptimizer();
        const optimizationResult = optimizer.optimize(intermediateCode);
        optimizedCode = optimizationResult.instructions;
        optimizationLogs = optimizationResult.optimizations;

        logs.push({
          type: "success",
          message: `Otimizacao de codigo intermediario concluida: ${intermediateCode.length} instrucoes originais, ${optimizedCode.length} apos otimizacao.`,
          timestamp,
        });

        if (optimizationLogs.length > 0) {
          const appliedRules = new Set(
            optimizationLogs.map((optimization) => optimization.rule),
          );

          logs.push({
            type: "info",
            message: `Regras aplicadas: ${Array.from(appliedRules).join(", ")}.`,
            timestamp,
          });
        } else {
          logs.push({
            type: "info",
            message:
              "Nenhuma otimizacao aplicavel ao codigo intermediario gerado.",
            timestamp,
          });
        }

        const simpsimGenerator = new SimpSimGenerator();
        machineCode = simpsimGenerator.generate(optimizedCode).instructions;

        logs.push({
          type: "success",
          message: `Geracao de codigo SimpSIM concluida: ${machineCode.length} linhas geradas.`,
          timestamp,
        });
      } else {
        logs.push({
          type: "info",
          message: "Nenhuma instrucao intermediaria gerada.",
          timestamp,
        });
      }
    }

    setResult({
      lexicalErrors,
      syntaxErrors,
      semanticErrors,
      semanticWarnings,
      intermediateCode,
      optimizedCode,
      optimizationLogs,
      machineCode,
      logs,
    });
  }, []);

  return {
    ...result,
    compile,
    hasErrors:
      result.lexicalErrors.length > 0 ||
      result.syntaxErrors.length > 0 ||
      result.semanticErrors.length > 0,
  };
}
