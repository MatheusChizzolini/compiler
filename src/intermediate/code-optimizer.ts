export interface OptimizationLog {
  rule: string;
  before: string;
  after: string | null;
}

export interface OptimizedCodeResult {
  instructions: string[];
  optimizations: OptimizationLog[];
}

interface AssignmentInstruction {
  target: string;
  value: string;
}

type KnownValues = {
  constants: Map<string, string>;
  copies: Map<string, string>;
};

const ARITHMETIC_OPERATORS = new Set(["+", "-", "*", "/", "%"]);
const RELATIONAL_OPERATORS = new Set(["==", "!=", ">", ">=", "<", "<="]);
const LOGICAL_OPERATORS = new Set(["&", "|"]);
const TYPES = new Set(["int", "decimal", "char", "bool"]);

export class IntermediateCodeOptimizer {
  private optimizations: OptimizationLog[] = [];

  public optimize(instructions: string[]): OptimizedCodeResult {
    this.optimizations = [];

    let optimized = [...instructions];
    let changed = true;
    let passCount = 0;

    while (changed && passCount < 5) {
      const beforePass = optimized.join("\n");

      optimized = this.propagateKnownValues(optimized);
      optimized = this.simplifyInstructions(optimized);
      optimized = this.eliminateCommonSubexpressions(optimized);
      optimized = this.removeUnreachableCode(optimized);
      optimized = this.eliminateDeadTemporaryAssignments(optimized);

      changed = beforePass !== optimized.join("\n");
      passCount += 1;
    }

    return {
      instructions: optimized,
      optimizations: this.optimizations,
    };
  }

  private propagateKnownValues(instructions: string[]): string[] {
    const knownValues: KnownValues = {
      constants: new Map(),
      copies: new Map(),
    };

    return instructions.map((instruction) => {
      if (this.isControlFlowBoundary(instruction)) {
        this.clearKnownValues(knownValues);
        return instruction;
      }

      const assignment = this.parseAssignment(instruction);
      if (assignment) {
        const replacement = this.replaceKnownValues(assignment.value, knownValues);
        const updatedInstruction = `${assignment.target} := ${replacement.value}`;

        if (updatedInstruction !== instruction) {
          this.addOptimization(replacement.rule, instruction, updatedInstruction);
        }

        this.updateKnownValues(assignment.target, replacement.value, knownValues);
        return updatedInstruction;
      }

      const conditionalJump = this.parseConditionalJump(instruction);
      if (conditionalJump) {
        const replacement = this.replaceKnownValues(
          conditionalJump.condition,
          knownValues,
        );
        const updatedInstruction = `if ${replacement.value} goto ${conditionalJump.label}`;

        if (updatedInstruction !== instruction) {
          this.addOptimization(replacement.rule, instruction, updatedInstruction);
        }

        this.clearKnownValues(knownValues);
        return updatedInstruction;
      }

      if (this.isUnconditionalJump(instruction)) {
        this.clearKnownValues(knownValues);
      }

      return instruction;
    });
  }

  private simplifyInstructions(instructions: string[]): string[] {
    const optimized: string[] = [];

    for (const instruction of instructions) {
      const assignment = this.parseAssignment(instruction);
      if (assignment) {
        const simplified = this.simplifyAssignment(assignment);

        if (simplified.instruction !== instruction) {
          this.addOptimization(simplified.rule, instruction, simplified.instruction);
        }

        optimized.push(simplified.instruction);
        continue;
      }

      optimized.push(instruction);
    }

    return optimized;
  }

  private eliminateCommonSubexpressions(instructions: string[]): string[] {
    const availableExpressions = new Map<string, string>();
    const optimized: string[] = [];

    for (const instruction of instructions) {
      if (this.isControlFlowBoundary(instruction)) {
        availableExpressions.clear();
        optimized.push(instruction);
        continue;
      }

      const assignment = this.parseAssignment(instruction);
      if (!assignment) {
        if (
          this.parseConditionalJump(instruction) ||
          this.isUnconditionalJump(instruction)
        ) {
          availableExpressions.clear();
        }

        optimized.push(instruction);
        continue;
      }

      this.invalidateExpressionsForTarget(
        assignment.target,
        availableExpressions,
      );

      const expressionKey = this.getExpressionKey(assignment.value);
      if (!expressionKey) {
        optimized.push(instruction);
        continue;
      }

      const previousResult = availableExpressions.get(expressionKey);
      if (previousResult) {
        const updatedInstruction = `${assignment.target} := ${previousResult}`;
        this.addOptimization(
          "Eliminacao de subexpressoes comuns",
          instruction,
          updatedInstruction,
        );
        optimized.push(updatedInstruction);
      } else {
        availableExpressions.set(expressionKey, assignment.target);
        optimized.push(instruction);
      }
    }

    return optimized;
  }

  private removeUnreachableCode(instructions: string[]): string[] {
    const optimized: string[] = [];
    let unreachable = false;

    for (const instruction of instructions) {
      if (this.isLabel(instruction)) {
        unreachable = false;
        optimized.push(instruction);
        continue;
      }

      if (unreachable) {
        this.addOptimization("Eliminação de código inacessível", instruction, null);
        continue;
      }

      optimized.push(instruction);

      if (this.isUnconditionalJump(instruction)) {
        unreachable = true;
      }
    }

    return optimized;
  }

  private eliminateDeadTemporaryAssignments(instructions: string[]): string[] {
    const liveTemporaries = new Set<string>();
    const optimized: string[] = [];

    for (let index = instructions.length - 1; index >= 0; index -= 1) {
      const instruction = instructions[index];
      const assignment = this.parseAssignment(instruction);

      if (assignment) {
        if (
          this.isTemporary(assignment.target) &&
          !liveTemporaries.has(assignment.target)
        ) {
          this.addOptimization(
            "Eliminação de temporários mortos",
            instruction,
            null,
          );
          continue;
        }

        liveTemporaries.delete(assignment.target);
        this.collectTemporaries(assignment.value).forEach((temporary) =>
          liveTemporaries.add(temporary),
        );
        optimized.unshift(instruction);
        continue;
      }

      const conditionalJump = this.parseConditionalJump(instruction);
      if (conditionalJump) {
        this.collectTemporaries(conditionalJump.condition).forEach((temporary) =>
          liveTemporaries.add(temporary),
        );
      }

      optimized.unshift(instruction);
    }

    return optimized;
  }

  private simplifyAssignment(
    assignment: AssignmentInstruction,
  ): { instruction: string; rule: string } {
    if (assignment.target === assignment.value) {
      return {
        instruction: `${assignment.target} := ${assignment.value}`,
        rule: "Sem alteração",
      };
    }

    const unary = this.parseUnaryExpression(assignment.value);
    if (unary) {
      const folded = this.evaluateUnary(unary.operator, unary.operand);
      if (folded !== null) {
        return {
          instruction: `${assignment.target} := ${folded}`,
          rule: "Dobramento de constantes",
        };
      }
    }

    const cast = this.parseCastExpression(assignment.value);
    if (cast) {
      const folded = this.evaluateCast(cast.targetType, cast.value);
      if (folded !== null) {
        return {
          instruction: `${assignment.target} := ${folded}`,
          rule: "Dobramento de constantes",
        };
      }
    }

    const binary = this.parseBinaryExpression(assignment.value);
    if (binary) {
      const folded = this.evaluateBinary(
        binary.left,
        binary.operator,
        binary.right,
      );

      if (folded !== null) {
        return {
          instruction: `${assignment.target} := ${folded}`,
          rule: "Dobramento de constantes",
        };
      }

      const simplified = this.simplifyAlgebraicExpression(
        binary.left,
        binary.operator,
        binary.right,
      );

      if (simplified !== null) {
        return {
          instruction: `${assignment.target} := ${simplified}`,
          rule: "Simplificação algébrica",
        };
      }
    }

    return {
      instruction: `${assignment.target} := ${assignment.value}`,
      rule: "Sem alteração",
    };
  }

  private simplifyAlgebraicExpression(
    left: string,
    operator: string,
    right: string,
  ): string | null {
    if (operator === "+" && this.isZero(right)) return left;
    if (operator === "+" && this.isZero(left)) return right;
    if (operator === "-" && this.isZero(right)) return left;
    if (operator === "*" && this.isOne(right)) return left;
    if (operator === "*" && this.isOne(left)) return right;
    if (operator === "*" && (this.isZero(left) || this.isZero(right))) return "0";
    if (operator === "/" && this.isOne(right)) return left;
    if (operator === "%" && this.isOne(right)) return "0";
    if (operator === "&" && right === "true") return left;
    if (operator === "&" && left === "true") return right;
    if (operator === "&" && (left === "false" || right === "false")) return "false";
    if (operator === "|" && right === "false") return left;
    if (operator === "|" && left === "false") return right;
    if (operator === "|" && (left === "true" || right === "true")) return "true";

    return null;
  }

  private replaceKnownValues(
    expression: string,
    knownValues: KnownValues,
  ): { value: string; rule: string } {
    let usedConstant = false;
    let usedCopy = false;

    const value = expression
      .split(/\s+/)
      .map((token) => {
        if (!this.canReplaceToken(token)) return token;

        const constant = knownValues.constants.get(token);
        if (constant) {
          usedConstant = true;
          return constant;
        }

        const copy = this.resolveCopy(token, knownValues.copies);
        if (copy !== token) {
          usedCopy = true;
          return copy;
        }

        return token;
      })
      .join(" ");

    return {
      value,
      rule:
        usedConstant || !usedCopy
          ? "Propagação de constantes"
          : "Propagação de cópias",
    };
  }

  private updateKnownValues(
    target: string,
    value: string,
    knownValues: KnownValues,
  ): void {
    this.invalidateTarget(target, knownValues);

    if (this.isLiteral(value)) {
      knownValues.constants.set(target, value);
      return;
    }

    if (this.isIdentifier(value)) {
      knownValues.copies.set(target, this.resolveCopy(value, knownValues.copies));
    }
  }

  private invalidateTarget(target: string, knownValues: KnownValues): void {
    knownValues.constants.delete(target);
    knownValues.copies.delete(target);

    for (const [copyTarget, copyValue] of knownValues.copies) {
      if (this.resolveCopy(copyValue, knownValues.copies) === target) {
        knownValues.copies.delete(copyTarget);
      }
    }
  }

  private clearKnownValues(knownValues: KnownValues): void {
    knownValues.constants.clear();
    knownValues.copies.clear();
  }

  private evaluateUnary(operator: string, operand: string): string | null {
    if (operator === "!" && operand === "true") return "false";
    if (operator === "!" && operand === "false") return "true";
    if (operator === "-" && this.isNumericLiteral(operand)) {
      return this.formatNumber(-Number(operand));
    }

    return null;
  }

  private evaluateCast(targetType: string, value: string): string | null {
    if (!this.isLiteral(value)) return null;

    if (targetType === "decimal" && this.isNumericLiteral(value)) {
      return this.formatNumber(Number(value));
    }

    if (targetType === "int" && this.isNumericLiteral(value)) {
      return this.formatNumber(Math.trunc(Number(value)));
    }

    return null;
  }

  private evaluateBinary(
    left: string,
    operator: string,
    right: string,
  ): string | null {
    if (ARITHMETIC_OPERATORS.has(operator)) {
      if (!this.isNumericLiteral(left) || !this.isNumericLiteral(right)) {
        return null;
      }

      const leftNumber = Number(left);
      const rightNumber = Number(right);

      if ((operator === "/" || operator === "%") && rightNumber === 0) {
        return null;
      }

      switch (operator) {
        case "+":
          return this.formatNumber(leftNumber + rightNumber);
        case "-":
          return this.formatNumber(leftNumber - rightNumber);
        case "*":
          return this.formatNumber(leftNumber * rightNumber);
        case "/":
          return this.formatNumber(leftNumber / rightNumber);
        case "%":
          return this.formatNumber(leftNumber % rightNumber);
      }
    }

    if (RELATIONAL_OPERATORS.has(operator)) {
      if (this.isNumericLiteral(left) && this.isNumericLiteral(right)) {
        return this.evaluateRelation(Number(left), operator, Number(right));
      }

      if (this.isLiteral(left) && this.isLiteral(right)) {
        return this.evaluateRelation(left, operator, right);
      }
    }

    if (LOGICAL_OPERATORS.has(operator)) {
      if (!this.isBooleanLiteral(left) || !this.isBooleanLiteral(right)) {
        return null;
      }

      if (operator === "&") {
        return left === "true" && right === "true" ? "true" : "false";
      }

      if (operator === "|") {
        return left === "true" || right === "true" ? "true" : "false";
      }
    }

    return null;
  }

  private evaluateRelation(
    left: string | number,
    operator: string,
    right: string | number,
  ): string | null {
    switch (operator) {
      case "==":
        return left === right ? "true" : "false";
      case "!=":
        return left !== right ? "true" : "false";
      case ">":
        return left > right ? "true" : "false";
      case ">=":
        return left >= right ? "true" : "false";
      case "<":
        return left < right ? "true" : "false";
      case "<=":
        return left <= right ? "true" : "false";
      default:
        return null;
    }
  }

  private parseAssignment(instruction: string): AssignmentInstruction | null {
    const match = instruction.match(/^([A-Za-z_]\w*)\s*:=\s*(.+)$/);
    if (!match) return null;

    return {
      target: match[1],
      value: match[2],
    };
  }

  private parseBinaryExpression(
    expression: string,
  ): { left: string; operator: string; right: string } | null {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 3) return null;

    const [left, operator, right] = parts;
    if (
      !ARITHMETIC_OPERATORS.has(operator) &&
      !RELATIONAL_OPERATORS.has(operator) &&
      !LOGICAL_OPERATORS.has(operator)
    ) {
      return null;
    }

    return { left, operator, right };
  }

  private parseUnaryExpression(
    expression: string,
  ): { operator: string; operand: string } | null {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 2) return null;

    const [operator, operand] = parts;
    if (operator !== "!" && operator !== "-") return null;

    return { operator, operand };
  }

  private parseCastExpression(
    expression: string,
  ): { targetType: string; value: string } | null {
    const match = expression.match(/^\((int|decimal|char|bool)\)\s+(.+)$/);
    if (!match) return null;

    return {
      targetType: match[1],
      value: match[2],
    };
  }

  private parseConditionalJump(
    instruction: string,
  ): { condition: string; label: string } | null {
    const match = instruction.match(/^if\s+(.+)\s+goto\s+([A-Za-z_]\w*)$/);
    if (!match) return null;

    return {
      condition: match[1],
      label: match[2],
    };
  }

  private parseUnconditionalJump(instruction: string): string | null {
    const match = instruction.match(/^goto\s+([A-Za-z_]\w*)$/);
    return match ? match[1] : null;
  }

  private parseLabel(instruction: string): string | null {
    const match = instruction.match(/^([A-Za-z_]\w*):$/);
    return match ? match[1] : null;
  }

  private getExpressionKey(expression: string): string | null {
    const binary = this.parseBinaryExpression(expression);
    if (binary) {
      const operands = this.getExpressionOperands(
        binary.left,
        binary.operator,
        binary.right,
      );
      return `${binary.operator}:${operands.left}:${operands.right}`;
    }

    const unary = this.parseUnaryExpression(expression);
    if (unary) {
      return `${unary.operator}:${unary.operand}`;
    }

    const cast = this.parseCastExpression(expression);
    if (cast) {
      return `cast:${cast.targetType}:${cast.value}`;
    }

    return null;
  }

  private getExpressionOperands(
    left: string,
    operator: string,
    right: string,
  ): { left: string; right: string } {
    if (["+", "*", "&", "|", "==", "!="].includes(operator) && left > right) {
      return { left: right, right: left };
    }

    return { left, right };
  }

  private invalidateExpressionsForTarget(
    target: string,
    availableExpressions: Map<string, string>,
  ): void {
    for (const [expression, result] of availableExpressions) {
      const expressionParts = expression.split(":");
      if (result === target || expressionParts.includes(target)) {
        availableExpressions.delete(expression);
      }
    }
  }

  private collectTemporaries(expression: string): string[] {
    return expression
      .split(/\s+/)
      .filter((token) => this.isTemporary(token));
  }

  private resolveCopy(name: string, copies: Map<string, string>): string {
    const visited = new Set<string>();
    let current = name;

    while (copies.has(current) && !visited.has(current)) {
      visited.add(current);
      current = copies.get(current) ?? current;
    }

    return current;
  }

  private canReplaceToken(token: string): boolean {
    return this.isIdentifier(token) && !this.isBooleanLiteral(token) && !TYPES.has(token);
  }

  private isControlFlowBoundary(instruction: string): boolean {
    return this.isLabel(instruction);
  }

  private isLabel(instruction: string): boolean {
    return this.parseLabel(instruction) !== null;
  }

  private isUnconditionalJump(instruction: string): boolean {
    return this.parseUnconditionalJump(instruction) !== null;
  }

  private isTemporary(value: string): boolean {
    return /^t\d+$/.test(value);
  }

  private isIdentifier(value: string): boolean {
    return /^[A-Za-z_]\w*$/.test(value);
  }

  private isLiteral(value: string): boolean {
    return (
      this.isNumericLiteral(value) ||
      this.isBooleanLiteral(value) ||
      /^'[^']'$/.test(value)
    );
  }

  private isNumericLiteral(value: string): boolean {
    return /^-?\d+(\.\d+)?$/.test(value);
  }

  private isBooleanLiteral(value: string): boolean {
    return value === "true" || value === "false";
  }

  private isZero(value: string): boolean {
    return this.isNumericLiteral(value) && Number(value) === 0;
  }

  private isOne(value: string): boolean {
    return this.isNumericLiteral(value) && Number(value) === 1;
  }

  private formatNumber(value: number): string {
    return Number.isInteger(value) ? String(value) : String(value);
  }

  private addOptimization(
    rule: string,
    before: string,
    after: string | null,
  ): void {
    this.optimizations.push({ rule, before, after });
  }
}
