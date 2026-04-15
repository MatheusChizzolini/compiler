import { TokenType, type Token, type SyntaxError } from "../types";

class ParseError extends Error {}

export class Parser {
  private tokens: Token[];
  private current = 0;
  public errors: SyntaxError[] = [];

  // Tokens de sincronização para o Modo Pânico.
  // São pontos "seguros" onde o parser consegue se recuperar
  // após encontrar um erro, pois indicam o início de uma nova estrutura.
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

  parse(): { errors: SyntaxError[] } {
    this.programa();
    return { errors: this.errors };
  }

  // programa = { linha }
  private programa() {
    while (!this.isAtEnd()) {
      this.linha();
    }
  }

  // linha = declaracao | atribuicao | condicional | repeticao
  private linha() {
    try {
      if (this.check(TokenType.TIPO)) {
        this.declaracao();
      } else if (this.check(TokenType.IF)) {
        this.condicional();
      } else if (this.check(TokenType.WHILE)) {
        this.repeticao();
      } else if (this.check(TokenType.IDENTIFICADOR)) {
        this.atribuicao();
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
      } else {
        throw e;
      }
    }
  }

  // declaracao = tipo identificador [ "=" expressao ] ";"
  private declaracao() {
    this.consume(TokenType.TIPO, "tipo (int, decimal, char, bool)");
    this.consume(TokenType.IDENTIFICADOR, "identificador após o tipo");

    if (this.match(TokenType.ATRIBUICAO)) {
      this.expressao();
    }

    this.consume(TokenType.PONTO_VIRGULA, "';' ao final da declaração");
  }

  // atribuicao = identificador "=" expressao ";"
  private atribuicao() {
    this.consume(TokenType.IDENTIFICADOR, "identificador");
    this.consume(TokenType.ATRIBUICAO, "'=' após o identificador");
    this.expressao();
    this.consume(TokenType.PONTO_VIRGULA, "';' ao final da atribuição");
  }

  // condicional = "if" "(" expressao ")" bloco [ "else" bloco ]
  private condicional() {
    this.consume(TokenType.IF, "'if'");
    this.consume(TokenType.ABRE_PARENTESES, "'(' após 'if'");
    this.expressao();
    this.consume(TokenType.FECHA_PARENTESES, "')' após a condição do 'if'");
    this.bloco();

    if (this.check(TokenType.ELSE)) {
      this.advance(); // consome 'else'
      this.bloco();
    }
  }

  // repeticao = "while" "(" expressao ")" bloco
  private repeticao() {
    this.consume(TokenType.WHILE, "'while'");
    this.consume(TokenType.ABRE_PARENTESES, "'(' após 'while'");
    this.expressao();
    this.consume(TokenType.FECHA_PARENTESES, "')' após a condição do 'while'");
    this.bloco();
  }

  // bloco = "{" { linha } "}"
  private bloco() {
    this.consume(TokenType.ABRE_CHAVES, "'{' para início do bloco");

    while (!this.check(TokenType.FECHA_CHAVES) && !this.isAtEnd()) {
      this.linha();
    }

    this.consume(TokenType.FECHA_CHAVES, "'}' para fechar o bloco");
  }

  // expressao = expressao_logica
  private expressao() {
    this.expressaoLogica();
  }

  // expressao_logica = expressao_relacional { operador_logico expressao_relacional }
  private expressaoLogica() {
    this.expressaoRelacional();

    while (this.check(TokenType.OPERADOR_LOGICO)) {
      this.advance();
      this.expressaoRelacional();
    }
  }

  // expressao_relacional = expressao_aditiva { operador_relacional expressao_aditiva }
  private expressaoRelacional() {
    this.expressaoAditiva();

    while (this.check(TokenType.OPERADOR_RELACIONAL)) {
      this.advance();
      this.expressaoAditiva();
    }
  }

  // expressao_aditiva = termo { ( "+" | "-" ) termo }
  private expressaoAditiva() {
    this.termo();

    while (this.check(TokenType.MAIS) || this.check(TokenType.MENOS)) {
      this.advance();
      this.termo();
    }
  }

  // termo = unario { ( "*" | "/" | "%" ) unario }
  private termo() {
    this.unario();

    while (
      this.check(TokenType.MULTIPLICACAO) ||
      this.check(TokenType.DIVISAO) ||
      this.check(TokenType.MOD)
    ) {
      this.advance();
      this.unario();
    }
  }

  // unario = [ "!" | "-" ] fator
  // Nota: "!" é OPERADOR_LOGICO com lexema "!", "-" é MENOS
  private unario() {
    const isNegation =
      this.check(TokenType.OPERADOR_LOGICO) && this.peek().lexeme === "!";
    const isNegative = this.check(TokenType.MENOS);

    if (isNegation || isNegative) {
      this.advance();
    }

    this.fator();
  }

  // fator = identificador | numero | caractere | booleano | "(" expressao ")"
  private fator() {
    if (this.check(TokenType.IDENTIFICADOR)) {
      this.advance();
    } else if (
      this.check(TokenType.NUMERO) ||
      this.check(TokenType.CARACTERE) ||
      this.check(TokenType.BOOLEANO)
    ) {
      this.advance();
    } else if (this.check(TokenType.ABRE_PARENTESES)) {
      this.advance(); // consome '('
      this.expressao();
      this.consume(TokenType.FECHA_PARENTESES, "')' para fechar a expressão");
    } else {
      const token = this.peek();
      this.addError(
        `Esperado identificador, valor ou '(', mas encontrado '${this.describeToken(token)}'`,
        token,
      );
      throw new ParseError();
    }
  }

  /**
   * Consome o próximo token se for do tipo esperado.
   * Caso contrário, registra o erro e lança ParseError para acionar
   * a recuperação no método linha().
   */
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

  /**
   * Consome o token atual se for de um dos tipos fornecidos.
   * Retorna true se consumiu, false caso contrário (sem erro).
   */
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

  /**
   * Modo Pânico: descarta tokens até encontrar um ponto de sincronização.
   * Isso permite que o parser continue e reporte múltiplos erros
   * em uma única passagem, em vez de parar no primeiro.
   */
  private panicMode() {
    while (!this.isAtEnd()) {
      // Ponto de sincronização encontrado — para de descartar
      if (Parser.SYNC_TOKENS.has(this.peek().type)) {
        // Consome o ';' para não entrar em loop na próxima iteração de linha()
        if (this.check(TokenType.PONTO_VIRGULA)) {
          this.advance();
        }
        return;
      }
      this.advance();
    }
  }

  /**
   * Retorna uma descrição legível do token para as mensagens de erro.
   */
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
