export enum TokenType {
  IDENTIFICADOR,
  NUMERO,
  CARACTERE,
  BOOLEANO,
  TIPO,
  MAIS,
  MENOS,
  MULTIPLICACAO,
  DIVISAO,
  MOD,
  OPERADOR_RELACIONAL,
  OPERADOR_LOGICO,
  IF,
  ELSE,
  WHILE,
  ABRE_PARENTESES,
  FECHA_PARENTESES,
  ABRE_CHAVES,
  FECHA_CHAVES,
  PONTO_VIRGULA,
  ATRIBUICAO,
  EOF,
}

export interface Token {
  lexeme: string;
  type: TokenType;
  line: number;
  column: number;
}

export interface LexicalError {
  message: string;
  line: number;
  column: number;
  length: number;
}

export interface SyntaxError {
  message: string;
  line: number;
  column: number;
  length: number;
}

export interface SymbolInfo {
  name: string;
  type: string;
  isInitialized: boolean;
  isUsed: boolean;
  line: number;
  column: number;
}

export interface SemanticError {
  message: string;
  line: number;
  column: number;
  length: number;
}

export type LogType = "info" | "error" | "warning" | "success";

export interface Log {
  type: LogType;
  message: string;
  timestamp: string;
}
