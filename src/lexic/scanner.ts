import { TokenType, type Token, type LexicalError } from "../types";

export class Scanner {
  private source: string;
  private tokens: Token[] = [];
  public errors: LexicalError[] = [];

  private current = 0;
  private start = 0;

  private line = 1;
  private column = 1;

  constructor(source: string) {
    this.source = source;
  }

  scanTokens(): { tokens: Token[]; errors: LexicalError[] } {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.scanToken();
    }

    this.tokens.push({
      lexeme: "",
      type: TokenType.EOF,
      column: this.column,
      line: this.line,
    });

    this.printReport();

    return { tokens: this.tokens, errors: this.errors };
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }

  private scanToken() {
    const char = this.advance();

    switch (char) {
      case "+":
        this.addToken(TokenType.MAIS);
        break;

      case "-":
        this.addToken(TokenType.MENOS);
        break;

      case "*":
        this.addToken(TokenType.MULTIPLICACAO);
        break;

      case "/":
        this.addToken(TokenType.DIVISAO);
        break;

      case "%":
        this.addToken(TokenType.MOD);
        break;

      case "(":
        this.addToken(TokenType.ABRE_PARENTESES);
        break;

      case ")":
        this.addToken(TokenType.FECHA_PARENTESES);
        break;

      case "{":
        this.addToken(TokenType.ABRE_CHAVES);
        break;

      case "}":
        this.addToken(TokenType.FECHA_CHAVES);
        break;

      case ";":
        this.addToken(TokenType.PONTO_VIRGULA);
        break;

      case "=":
        if (this.match("=")) {
          this.addToken(TokenType.OPERADOR_RELACIONAL); // ==
        } else {
          this.addToken(TokenType.ATRIBUICAO);
        }
        break;

      case "!":
        if (this.match("=")) {
          this.addToken(TokenType.OPERADOR_RELACIONAL); // !=
        } else {
          this.addToken(TokenType.OPERADOR_LOGICO);
        }
        break;

      case ">":
      case "<":
        if (this.match("=")) {
          this.addToken(TokenType.OPERADOR_RELACIONAL); // >= <=
        } else {
          this.addToken(TokenType.OPERADOR_RELACIONAL);
        }
        break;

      case "&":
      case "|":
        this.addToken(TokenType.OPERADOR_LOGICO);
        break;

      case " ":
      case "\r":
      case "\t":
        break;

      case "\n":
        this.line++;
        this.column = 1;
        break;

      case "'":
        this.char();
        break;

      default:
        if (this.isDigit(char)) {
          this.number();
        } else if (this.isAlpha(char)) {
          this.identifier();
        } else {
          this.errors.push({
            message: `Caractere '${char}' inválido`,
            line: this.line,
            column: this.column - 1,
            length: 1,
          });
        }
    }
  }

  private advance(): string {
    this.column++;
    return this.source[this.current++];
  }

  private addToken(type: TokenType) {
    const text = this.source.substring(this.start, this.current);

    this.tokens.push({
      lexeme: text,
      type,
      line: this.line,
      column: this.column,
    });
  }

  private match(expected: string) {
    if (this.isAtEnd()) return false;
    if (this.source[this.current] !== expected) return false;

    this.current++;
    return true;
  }

  private peek() {
    if (this.isAtEnd()) return "\0";
    return this.source[this.current];
  }

  private isDigit(char: string) {
    return /[0-9]/.test(char);
  }

  private isAlpha(char: string) {
    return /[a-zA-Z]/.test(char);
  }

  private isAlphaNumeric(char: string) {
    return /[a-zA-Z0-9_]/.test(char);
  }

  private number() {
    while (this.isDigit(this.peek())) {
      this.advance();
    }

    if (this.peek() === "." && this.isDigit(this.peekNext())) {
      this.advance();

      while (this.isDigit(this.peek())) {
        this.advance();
      }
    }

    this.addToken(TokenType.NUMERO);
  }

  private peekNext() {
    if (this.current + 1 >= this.source.length) return "\0";
    return this.source[this.current + 1];
  }

  private identifier() {
    while (this.isAlphaNumeric(this.peek())) {
      this.advance();
    }

    const text = this.source.substring(this.start, this.current);

    const keywords: Record<string, TokenType> = {
      if: TokenType.IF,
      else: TokenType.ELSE,
      while: TokenType.WHILE,
      true: TokenType.BOOLEANO,
      false: TokenType.BOOLEANO,

      int: TokenType.TIPO,
      decimal: TokenType.TIPO,
      char: TokenType.TIPO,
      bool: TokenType.TIPO,
    };

    const type = keywords[text] ?? TokenType.IDENTIFICADOR;

    this.tokens.push({
      lexeme: text,
      type,
      line: this.line,
      column: this.column,
    });
  }

  private char() {
    const startCol = this.column - 1;

    if (this.isAtEnd() || this.peek() === "'") {
      this.errors.push({
        message: "Cadeia de caracteres mal formatada ou não fechada",
        line: this.line,
        column: startCol,
        length: this.current - this.start,
      });
      return;
    }

    this.advance();

    if (this.isAtEnd() || this.peek() !== "'") {
      this.errors.push({
        message: "Cadeia de caracteres não fechada",
        line: this.line,
        column: startCol,
        length: this.current - this.start,
      });
      return;
    }

    this.advance();
    this.addToken(TokenType.CARACTERE);
  }

  public printReport() {
    const tableData = this.tokens.map((t) => ({
      Lexema: t.lexeme,
      "Categoria (Token)": TokenType[t.type],
      Linha: t.line,
      Coluna: t.column,
    }));
    console.table(tableData);

    if (this.errors.length > 0) {
      this.errors.forEach((err) => {
        console.error(
          `[ERRO LÉXICO] ${err.message} na linha ${err.line}, coluna ${err.column}.`,
        );
      });
    }
  }
}
