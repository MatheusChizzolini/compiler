import type {
  Assignment,
  BinaryExpression,
  Block,
  Declaration,
  Expression,
  IdentifierExpr,
  IfStatement,
  Literal,
  Program,
  Statement,
  UnaryExpression,
  WhileStatement,
} from "../ast/ast";
import { TokenType, type SemanticError } from "../types";
import { SymbolTable } from "./symbol-table";

type ResolvedType = "int" | "decimal" | "char" | "bool" | "error";

export class SemanticAnalyzer {
  public symbolTable: SymbolTable = new SymbolTable();
  public errors: SemanticError[] = [];

  public analyze(program: Program) {
    this.visitProgram(program);
    this.symbolTable.checkUnusedVariables();
    this.errors.push(...this.symbolTable.errors);
  }

  private visitProgram(program: Program) {
    for (const statement of program.body) {
      this.visitStatement(statement);
    }
  }

  private visitBlock(block: Block) {
    for (const statement of block.body) {
      this.visitStatement(statement);
    }
  }

  private visitStatement(statement: Statement) {
    switch (statement.kind) {
      case "Declaration":
        this.visitDeclaration(statement);
        break;
      case "Assignment":
        this.visitAssignment(statement);
        break;
      case "IfStatement":
        this.visitIfStatement(statement);
        break;
      case "WhileStatement":
        this.visitWhileStatement(statement);
        break;
      case "Block":
        this.visitBlock(statement);
        break;
    }
  }

  private visitDeclaration(declaration: Declaration) {
    const varName = declaration.identifier.lexeme;
    const varType = declaration.typeToken.lexeme as ResolvedType;

    this.symbolTable.insert({
      name: varName,
      type: varType,
      isInitialized: false,
      isUsed: false,
      line: declaration.identifier.line,
      column: declaration.identifier.column,
    });

    if (declaration.initializer) {
      const exprType = this.visitExpression(declaration.initializer);
      if (this.isTypeCompatible(varType, exprType)) {
        const symbol = this.symbolTable.lookup(varName);
        if (symbol) symbol.isInitialized = true;
      } else {
        this.addError(
          `Tipo incompatível: não é possível inicializar '${varType}' com '${exprType}'.`,
          declaration.identifier.line,
          declaration.identifier.column,
          varName.length,
        );
      }
    }
  }

  private visitAssignment(assignment: Assignment) {
    const varName = assignment.identifier.lexeme;
    const symbol = this.symbolTable.lookup(varName);

    if (symbol) {
      const exprType = this.visitExpression(assignment.value);
      if (this.isTypeCompatible(symbol.type as ResolvedType, exprType)) {
        symbol.isInitialized = true;
      } else {
        this.addError(
          `Tipo incompatível na atribuição: variável '${varName}' é do tipo '${symbol.type}', mas recebeu '${exprType}'.`,
          assignment.identifier.line,
          assignment.identifier.column,
          varName.length,
        );
      }
    }
  }

  private visitIfStatement(stmt: IfStatement) {
    const condType = this.visitExpression(stmt.condition);
    if (condType !== "bool" && condType !== "error") {
      this.addError(
        `A condição do 'if' deve ser do tipo 'bool', mas encontrou '${condType}'.`,
        0,
        0,
        0,
      );
    }

    this.visitBlock(stmt.thenBranch);
    if (stmt.elseBranch) {
      this.visitBlock(stmt.elseBranch);
    }
  }

  private visitWhileStatement(stmt: WhileStatement) {
    const condType = this.visitExpression(stmt.condition);
    if (condType !== "bool" && condType !== "error") {
      this.addError(
        `A condição do 'while' deve ser do tipo 'bool', mas encontrou '${condType}'.`,
        0,
        0,
        0,
      );
    }
    this.visitBlock(stmt.body);
  }

  private visitExpression(expr: Expression): ResolvedType {
    switch (expr.kind) {
      case "Literal":
        return this.getLiteralType(expr);
      case "Identifier":
        return this.visitIdentifierExpr(expr);
      case "Binary":
        return this.visitBinaryExpression(expr);
      case "Unary":
        return this.visitUnaryExpression(expr);
      default:
        return "error";
    }
  }

  private visitIdentifierExpr(expr: IdentifierExpr): ResolvedType {
    const varName = expr.name;
    const symbol = this.symbolTable.lookup(varName);

    if (!symbol) return "error";
    symbol.isUsed = true;
    if (!symbol.isInitialized) {
      this.addError(
        `A variável '${varName}' está sendo usada sem ser inicializada.`,
        expr.token.line,
        expr.token.column,
        varName.length,
      );
    }

    return symbol.type as ResolvedType;
  }

  private visitBinaryExpression(expr: BinaryExpression): ResolvedType {
    const leftType = this.visitExpression(expr.left);
    const rightType = this.visitExpression(expr.right);

    if (leftType === "error" || rightType === "error") return "error";

    const op = expr.operator.type;

    if (
      [
        TokenType.MAIS,
        TokenType.MENOS,
        TokenType.MULTIPLICACAO,
        TokenType.DIVISAO,
        TokenType.MOD,
      ].includes(op)
    ) {
      if (leftType === "int" && rightType === "int") return "int";
      if (
        (leftType === "int" || leftType === "decimal") &&
        (rightType === "int" || rightType === "decimal")
      )
        return "decimal";

      this.addError(
        `Operação inválida: não é possível aplicar operador aritmético entre '${leftType}' e '${rightType}'.`,
        expr.operator.line,
        expr.operator.column,
        expr.operator.lexeme.length,
      );
      return "error";
    }

    if (op === TokenType.OPERADOR_RELACIONAL) {
      if (
        (leftType === "int" || leftType === "decimal") &&
        (rightType === "int" || rightType === "decimal")
      )
        return "bool";
      if (leftType === rightType) return "bool";

      this.addError(
        `Operação inválida: não é possível comparar '${leftType}' e '${rightType}'.`,
        expr.operator.line,
        expr.operator.column,
        expr.operator.lexeme.length,
      );
      return "error";
    }

    if (op === TokenType.OPERADOR_LOGICO) {
      if (leftType === "bool" && rightType === "bool") return "bool";
      this.addError(
        `Operação inválida: operador lógico requer operandos do tipo 'bool'.`,
        expr.operator.line,
        expr.operator.column,
        expr.operator.lexeme.length,
      );
      return "error";
    }

    return "error";
  }

  private visitUnaryExpression(expr: UnaryExpression): ResolvedType {
    const rightType = this.visitExpression(expr.right);
    if (rightType === "error") return "error";

    if (
      expr.operator.type === TokenType.OPERADOR_LOGICO &&
      expr.operator.lexeme === "!"
    ) {
      if (rightType === "bool") return "bool";
      this.addError(
        `Operação inválida: operador '!' requer operando do tipo 'bool'.`,
        expr.operator.line,
        expr.operator.column,
        1,
      );
      return "error";
    }

    if (expr.operator.type === TokenType.MENOS) {
      if (rightType === "int" || rightType === "decimal") return rightType;
      this.addError(
        `Operação inválida: operador '-' requer operando numérico.`,
        expr.operator.line,
        expr.operator.column,
        1,
      );
      return "error";
    }

    return "error";
  }

  private getLiteralType(literal: Literal): ResolvedType {
    if (literal.token.type === TokenType.NUMERO) {
      return literal.value.includes(".") ? "decimal" : "int";
    }
    if (literal.token.type === TokenType.CARACTERE) return "char";
    if (literal.token.type === TokenType.BOOLEANO) return "bool";
    return "error";
  }

  private isTypeCompatible(target: ResolvedType, value: ResolvedType): boolean {
    if (target === "error" || value === "error") return true;
    if (target === value) return true;

    if (target === "decimal" && value === "int") return true;

    return false;
  }

  private addError(
    message: string,
    line: number,
    column: number,
    length: number,
  ) {
    this.errors.push({ message, line, column, length });
  }
}
