import { TokenType, type Token, type SyntaxError } from "../types";
import type {
  Statement,
  Expression,
  Program,
  Declaration,
  Block,
  Assignment,
  IfStatement,
  WhileStatement,
} from "../ast/ast";

class ParseError extends Error {}

export class Parser {
  private tokens: Token[];
  private current = 0;
  public errors: SyntaxError[] = [];

  private static readonly SYNC_TOKENS = new Set([
    TokenType.PONTO_VIRGULA,
    TokenType.FECHA_CHAVES,
    TokenType.IF,
    TokenType.WHILE,
    TokenType.TIPO,
    TokenType.EOF,
  ]);

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): { ast: Program; errors: SyntaxError[] } {
    const programNode = this.programa();
    return { ast: programNode, errors: this.errors };
  }

  // programa = { linha }
  private programa(): Program {
    const body: Statement[] = [];
    while (!this.isAtEnd()) {
      const statement = this.linha();
      if (statement) {
        body.push(statement);
      }
    }
    return { kind: "Program", body };
  }

  // linha = declaracao | atribuicao | condicional | repeticao
  private linha(): Statement | undefined {
    try {
      if (this.check(TokenType.TIPO)) {
        const decl = this.declaracao();
        return decl ? decl : undefined;
      } else if (this.check(TokenType.IF)) {
        return this.condicional();
      } else if (this.check(TokenType.WHILE)) {
        return this.repeticao();
      } else if (this.check(TokenType.IDENTIFICADOR)) {
        return this.atribuicao();
      } else {
        // Token completamente inesperado — reporta e entra em modo pânico
        const token = this.peek();
        this.addError(
          `Token inesperado '${this.describeToken(token)}'. Esperado declaração, atribuição, 'if' ou 'while'`,
          token,
        );
        throw new ParseError();
      }
    } catch (e) {
      if (e instanceof ParseError) {
        this.panicMode();
        if (!this.isAtEnd()) {
          this.advance();
        }
        return undefined;
      } else {
        throw e;
      }
    }
  }

  // declaracao = tipo identificador [ "=" expressao ] ";"
  private declaracao(): Declaration | null {
    try {
      const typeToken = this.consume(
        TokenType.TIPO,
        "tipo (int, decimal, char, bool)",
      );
      const identifier = this.consume(
        TokenType.IDENTIFICADOR,
        "identificador após o tipo",
      );

      let initializer: Expression | null = null;
      if (this.match(TokenType.ATRIBUICAO)) {
        initializer = this.expressao();
      }

      this.consume(TokenType.PONTO_VIRGULA, "';' ao final da declaração");

      return {
        kind: "Declaration",
        typeToken,
        identifier,
        initializer,
      };
    } catch (e) {
      if (e instanceof ParseError) return null;
      throw e;
    }
  }

  // atribuicao = identificador "=" expressao ";"
  private atribuicao(): Assignment {
    const identifier = this.consume(TokenType.IDENTIFICADOR, "identificador");
    this.consume(TokenType.ATRIBUICAO, "'=' após o identificador");
    const value = this.expressao();
    this.consume(TokenType.PONTO_VIRGULA, "';' ao final da atribuição");

    return {
      kind: "Assignment",
      identifier,
      value,
    };
  }

  // condicional = "if" "(" expressao ")" bloco [ "else" bloco ]
  private condicional(): IfStatement {
    this.consume(TokenType.IF, "'if'");
    this.consume(TokenType.ABRE_PARENTESES, "'(' após 'if'");
    const condition = this.expressao();
    this.consume(TokenType.FECHA_PARENTESES, "')' após a condição do 'if'");
    const thenBranch = this.bloco();

    let elseBranch: Block | null = null;
    if (this.check(TokenType.ELSE)) {
      this.advance(); // consome 'else'
      elseBranch = this.bloco();
    }

    return {
      kind: "IfStatement",
      condition,
      thenBranch,
      elseBranch,
    };
  }

  // repeticao = "while" "(" expressao ")" bloco
  private repeticao(): WhileStatement {
    this.consume(TokenType.WHILE, "'while'");
    this.consume(TokenType.ABRE_PARENTESES, "'(' após 'while'");
    const condition = this.expressao();
    this.consume(TokenType.FECHA_PARENTESES, "')' após a condição do 'while'");
    const body = this.bloco();

    return {
      kind: "WhileStatement",
      condition,
      body,
    };
  }

  // bloco = "{" { linha } "}"
  private bloco(): Block {
    this.consume(TokenType.ABRE_CHAVES, "'{' para início do bloco");
    const body: Statement[] = [];

    while (!this.check(TokenType.FECHA_CHAVES) && !this.isAtEnd()) {
      const stmt = this.linha();
      if (stmt) {
        body.push(stmt);
      }
    }

    this.consume(TokenType.FECHA_CHAVES, "'}' para fechar o bloco");

    return {
      kind: "Block",
      body,
    };
  }

  // expressao = expressao_logica
  private expressao(): Expression {
    return this.expressaoLogica();
  }

  // expressao_logica = expressao_relacional { operador_logico expressao_relacional }
  private expressaoLogica(): Expression {
    let expr = this.expressaoRelacional();

    while (this.check(TokenType.OPERADOR_LOGICO)) {
      const operator = this.advance();
      const right = this.expressaoRelacional();
      expr = {
        kind: "Binary",
        left: expr,
        operator,
        right,
      };
    }

    return expr;
  }

  // expressao_relacional = expressao_aditiva { operador_relacional expressao_aditiva }
  private expressaoRelacional(): Expression {
    let expr = this.expressaoAditiva(); // expressaoAditiva já foi implementada no passo anterior

    while (this.check(TokenType.OPERADOR_RELACIONAL)) {
      const operator = this.advance();
      const right = this.expressaoAditiva();
      expr = {
        kind: "Binary",
        left: expr,
        operator,
        right,
      };
    }

    return expr;
  }

  // expressao_aditiva = termo { ( "+" | "-" ) termo }
  private expressaoAditiva(): Expression {
    let expr = this.termo(); // expr inicialmente é a árvore da esquerda

    while (this.check(TokenType.MAIS) || this.check(TokenType.MENOS)) {
      const operator = this.advance(); // pega o + ou -
      const right = this.termo(); // analisa o lado direito

      // Constrói o nó binário, onde o nó esquerdo é a expressão acumulada até agora
      expr = {
        kind: "Binary",
        left: expr,
        operator,
        right,
      };
    }

    return expr;
  }

  // termo = unario { ( "*" | "/" | "%" ) unario }
  private termo(): Expression {
    let expr = this.unario();

    while (
      this.check(TokenType.MULTIPLICACAO) ||
      this.check(TokenType.DIVISAO) ||
      this.check(TokenType.MOD)
    ) {
      const operator = this.advance();
      const right = this.unario();
      expr = {
        kind: "Binary",
        left: expr,
        operator,
        right,
      };
    }

    return expr;
  }

  // unario = [ "!" | "-" ] fator
  // Nota: "!" é OPERADOR_LOGICO com lexema "!", "-" é MENOS
  private unario(): Expression {
    const isNegation =
      this.check(TokenType.OPERADOR_LOGICO) && this.peek().lexeme === "!";
    const isNegative = this.check(TokenType.MENOS);

    if (isNegation || isNegative) {
      const operator = this.advance();
      const right = this.fator();
      return {
        kind: "Unary",
        operator,
        right,
      };
    }

    return this.fator();
  }

  // fator = identificador | numero | caractere | booleano | "(" expressao ")"
  private fator(): Expression {
    if (this.check(TokenType.IDENTIFICADOR)) {
      const token = this.advance();
      return { kind: "Identifier", name: token.lexeme, token };
    }

    if (
      this.check(TokenType.NUMERO) ||
      this.check(TokenType.CARACTERE) ||
      this.check(TokenType.BOOLEANO)
    ) {
      const token = this.advance();
      return { kind: "Literal", value: token.lexeme, token };
    }

    if (this.match(TokenType.ABRE_PARENTESES)) {
      const expr = this.expressao();
      this.consume(TokenType.FECHA_PARENTESES, "')' para fechar a expressão");
      return expr;
    }

    const token = this.peek();
    this.addError(
      `Esperado identificador, valor ou '(', mas encontrado '${this.describeToken(token)}'`,
      token,
    );
    throw new ParseError();
  }

  private consume(type: TokenType, expected: string): Token {
    if (this.check(type)) {
      return this.advance();
    }

    const token = this.peek();
    this.addError(
      `Esperado ${expected}, mas encontrado '${this.describeToken(token)}'`,
      token,
    );
    throw new ParseError();
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private addError(message: string, token: Token) {
    this.errors.push({
      message,
      line: token.line,
      column: token.column,
      length: token.lexeme.length || 1,
    });
  }

  private panicMode() {
    while (!this.isAtEnd()) {
      if (Parser.SYNC_TOKENS.has(this.peek().type)) {
        if (this.check(TokenType.PONTO_VIRGULA)) {
          this.advance();
        }
        return;
      }
      this.advance();
    }
  }

  private describeToken(token: Token): string {
    if (token.type === TokenType.EOF) return "fim do arquivo";
    return token.lexeme;
  }

  public printReport() {
    if (this.errors.length === 0) {
      console.log("[SUCESSO] Análise sintática concluída sem erros.");
      return;
    }

    this.errors.forEach((err) => {
      console.error(
        `[ERRO SINTÁTICO] Linha ${err.line}, Coluna ${err.column}: ${err.message}.`,
      );
    });

    console.warn(
      `[SUCESSO] Análise sintática concluída com ${this.errors.length} erro(s) encontrado(s).`,
    );
  }
}
