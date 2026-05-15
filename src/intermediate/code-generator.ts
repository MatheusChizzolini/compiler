import { TokenType } from "../types";
import type {
  Assignment,
  BinaryExpression,
  Block,
  CastExpression,
  Declaration,
  Expression,
  IfStatement,
  Program,
  Statement,
  UnaryExpression,
  WhileStatement,
} from "../ast/ast";

export interface IntermediateCodeResult {
  instructions: string[];
}

export class IntermediateCodeGenerator {
  private instructions: string[] = [];
  private temporaryCount = 0;
  private labelCount = 0;

  public generate(program: Program): IntermediateCodeResult {
    this.instructions = [];
    this.temporaryCount = 0;
    this.labelCount = 0;

    this.visitProgram(program);

    return {
      instructions: this.instructions,
    };
  }

  private visitProgram(program: Program): void {
    for (const statement of program.body) {
      this.visitStatement(statement);
    }
  }

  private visitBlock(block: Block): void {
    for (const statement of block.body) {
      this.visitStatement(statement);
    }
  }

  private visitStatement(statement: Statement): void {
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
      case "Program":
        this.visitProgram(statement);
        break;
      case "Error":
        break;
    }
  }

  private visitDeclaration(declaration: Declaration): void {
    if (!declaration.initializer) return;

    const value = this.generateExpression(declaration.initializer);
    this.emit(`${declaration.identifier.lexeme} := ${value}`);
  }

  private visitAssignment(assignment: Assignment): void {
    const value = this.generateExpression(assignment.value);
    this.emit(`${assignment.identifier.lexeme} := ${value}`);
  }

  private visitIfStatement(statement: IfStatement): void {
    const thenLabel = this.newLabel();
    const endLabel = this.newLabel();
    const elseLabel = statement.elseBranch ? this.newLabel() : endLabel;

    this.emitConditionalJump(statement.condition, thenLabel, elseLabel);
    this.emitLabel(thenLabel);
    this.visitBlock(statement.thenBranch);

    if (statement.elseBranch) {
      this.emit(`goto ${endLabel}`);
      this.emitLabel(elseLabel);
      this.visitBlock(statement.elseBranch);
    }

    this.emitLabel(endLabel);
  }

  private visitWhileStatement(statement: WhileStatement): void {
    const startLabel = this.newLabel();
    const bodyLabel = this.newLabel();
    const endLabel = this.newLabel();

    this.emitLabel(startLabel);
    this.emitConditionalJump(statement.condition, bodyLabel, endLabel);
    this.emitLabel(bodyLabel);
    this.visitBlock(statement.body);
    this.emit(`goto ${startLabel}`);
    this.emitLabel(endLabel);
  }

  private generateExpression(expression: Expression): string {
    switch (expression.kind) {
      case "Literal":
        return expression.token.lexeme;
      case "Identifier":
        return expression.name;
      case "Binary":
        return this.generateBinaryExpression(expression);
      case "Unary":
        return this.generateUnaryExpression(expression);
      case "Cast":
        return this.generateCastExpression(expression);
    }
  }

  private generateBinaryExpression(expression: BinaryExpression): string {
    const left = this.generateExpression(expression.left);
    const right = this.generateExpression(expression.right);
    const temporary = this.newTemporary();

    this.emit(`${temporary} := ${left} ${expression.operator.lexeme} ${right}`);
    return temporary;
  }

  private generateUnaryExpression(expression: UnaryExpression): string {
    const right = this.generateExpression(expression.right);
    const temporary = this.newTemporary();

    this.emit(`${temporary} := ${expression.operator.lexeme} ${right}`);
    return temporary;
  }

  private generateCastExpression(expression: CastExpression): string {
    const value = this.generateExpression(expression.expression);
    const temporary = this.newTemporary();

    this.emit(`${temporary} := (${expression.targetType.lexeme}) ${value}`);
    return temporary;
  }

  private emitConditionalJump(
    expression: Expression,
    trueLabel: string,
    falseLabel: string,
  ): void {
    if (
      expression.kind === "Binary" &&
      expression.operator.type === TokenType.OPERADOR_LOGICO
    ) {
      this.emitLogicalConditionalJump(expression, trueLabel, falseLabel);
      return;
    }

    if (
      expression.kind === "Unary" &&
      expression.operator.type === TokenType.OPERADOR_LOGICO &&
      expression.operator.lexeme === "!"
    ) {
      this.emitConditionalJump(expression.right, falseLabel, trueLabel);
      return;
    }

    if (
      expression.kind === "Binary" &&
      expression.operator.type === TokenType.OPERADOR_RELACIONAL
    ) {
      const left = this.generateExpression(expression.left);
      const right = this.generateExpression(expression.right);
      this.emit(
        `if ${left} ${expression.operator.lexeme} ${right} goto ${trueLabel}`,
      );
      this.emit(`goto ${falseLabel}`);
      return;
    }

    const condition = this.generateExpression(expression);
    this.emit(`if ${condition} == true goto ${trueLabel}`);
    this.emit(`goto ${falseLabel}`);
  }

  private emitLogicalConditionalJump(
    expression: BinaryExpression,
    trueLabel: string,
    falseLabel: string,
  ): void {
    if (expression.operator.lexeme === "&") {
      const nextLabel = this.newLabel();
      this.emitConditionalJump(expression.left, nextLabel, falseLabel);
      this.emitLabel(nextLabel);
      this.emitConditionalJump(expression.right, trueLabel, falseLabel);
      return;
    }

    if (expression.operator.lexeme === "|") {
      const nextLabel = this.newLabel();
      this.emitConditionalJump(expression.left, trueLabel, nextLabel);
      this.emitLabel(nextLabel);
      this.emitConditionalJump(expression.right, trueLabel, falseLabel);
      return;
    }

    const condition = this.generateExpression(expression);
    this.emit(`if ${condition} == true goto ${trueLabel}`);
    this.emit(`goto ${falseLabel}`);
  }

  private emit(instruction: string): void {
    this.instructions.push(instruction);
  }

  private emitLabel(label: string): void {
    this.instructions.push(`${label}:`);
  }

  private newTemporary(): string {
    this.temporaryCount += 1;
    return `t${this.temporaryCount}`;
  }

  private newLabel(): string {
    this.labelCount += 1;
    return `L${this.labelCount}`;
  }
}
