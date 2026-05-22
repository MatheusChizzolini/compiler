export interface SimpSimCodeResult {
  instructions: string[];
}

interface AssignmentInstruction {
  target: string;
  value: string;
}

interface BinaryExpression {
  left: string;
  operator: string;
  right: string;
}

interface ConditionalJump {
  condition: string;
  label: string;
}

const BINARY_OPERATORS = new Set([
  "+",
  "-",
  "*",
  "/",
  "%",
  "==",
  "!=",
  ">",
  ">=",
  "<",
  "<=",
  "&",
  "|",
]);

const RESERVED_WORDS = new Set([
  "true",
  "false",
  "int",
  "decimal",
  "char",
  "bool",
]);

export class SimpSimGenerator {
  private instructions: string[] = [];
  private dataLabels: Set<string> = new Set();
  private generatedLabelCount = 0;

  public generate(intermediateInstructions: string[]): SimpSimCodeResult {
    this.instructions = [];
    this.dataLabels = this.collectDataLabels(intermediateInstructions);
    this.generatedLabelCount = 0;

    this.emit("load R0, 0");
    this.emit("");

    for (const instruction of intermediateInstructions) {
      this.translateInstruction(instruction);
    }

    this.emit("halt");
    this.emit("");

    if (this.dataLabels.size === 0) {
      this.emit("; Nenhuma variavel ou temporario alocado");
    } else {
      for (const label of this.dataLabels) {
        this.emit(`${label}: db 0`);
      }
    }

    return {
      instructions: this.instructions,
    };
  }

  private translateInstruction(instruction: string): void {
    const label = this.parseLabel(instruction);
    if (label) {
      this.emit(`${label}:`);
      return;
    }

    const jump = this.parseUnconditionalJump(instruction);
    if (jump) {
      this.emit(`jmp ${jump}`);
      return;
    }

    const conditionalJump = this.parseConditionalJump(instruction);
    if (conditionalJump) {
      this.emitConditionalJump(conditionalJump);
      return;
    }

    const assignment = this.parseAssignment(instruction);
    if (assignment) {
      this.emitAssignment(assignment);
      return;
    }

    this.emit(`; Instrucao intermediaria nao reconhecida: ${instruction}`);
  }

  private emitAssignment(assignment: AssignmentInstruction): void {
    const cast = this.parseCastExpression(assignment.value);
    if (cast) {
      this.loadOperand(cast.value, "R1");
      this.storeTarget(assignment.target, "R1");
      return;
    }

    const unary = this.parseUnaryExpression(assignment.value);
    if (unary) {
      if (unary.operator === "-") {
        this.emitSubtractionToRegister("R3", "0", unary.operand);
        this.storeTarget(assignment.target, "R3");
        return;
      }

      this.emitLogicalNotToTarget(assignment.target, unary.operand);
      return;
    }

    const binary = this.parseBinaryExpression(assignment.value);
    if (binary) {
      this.emitBinaryAssignment(assignment.target, binary);
      return;
    }

    this.loadOperand(assignment.value, "R1");
    this.storeTarget(assignment.target, "R1");
  }

  private emitBinaryAssignment(
    target: string,
    expression: BinaryExpression,
  ): void {
    switch (expression.operator) {
      case "+":
        this.loadOperand(expression.left, "R1");
        this.loadOperand(expression.right, "R2");
        this.emit("addi R3, R1, R2");
        this.storeTarget(target, "R3");
        return;
      case "-":
        this.emitSubtractionToRegister("R3", expression.left, expression.right);
        this.storeTarget(target, "R3");
        return;
      case "*":
        this.emitMultiplication(target, expression.left, expression.right);
        return;
      case "/":
        this.emitDivision(
          target,
          expression.left,
          expression.right,
          "quotient",
        );
        return;
      case "%":
        this.emitDivision(
          target,
          expression.left,
          expression.right,
          "remainder",
        );
        return;
      case "&":
        this.loadOperand(expression.left, "R1");
        this.loadOperand(expression.right, "R2");
        this.emit("and R3, R1, R2");
        this.storeTarget(target, "R3");
        return;
      case "|":
        this.loadOperand(expression.left, "R1");
        this.loadOperand(expression.right, "R2");
        this.emit("or R3, R1, R2");
        this.storeTarget(target, "R3");
        return;
      default:
        this.emitComparisonToTarget(target, expression);
    }
  }

  private emitLogicalNotToTarget(target: string, operand: string): void {
    const trueLabel = this.newGeneratedLabel("not_true");
    const endLabel = this.newGeneratedLabel("not_end");

    this.loadOperand(operand, "R1");
    this.emit(`jmpEQ R1=R0, ${trueLabel}`);
    this.emit("load R2, 0");
    this.storeTarget(target, "R2");
    this.emit(`jmp ${endLabel}`);
    this.emit(`${trueLabel}:`);
    this.emit("load R2, 1");
    this.storeTarget(target, "R2");
    this.emit(`${endLabel}:`);
  }

  private emitMultiplication(
    target: string,
    left: string,
    right: string,
  ): void {
    const loopLabel = this.newGeneratedLabel("mul_loop");
    const endLabel = this.newGeneratedLabel("mul_end");

    this.emit("; multiplicacao por somas sucessivas");
    this.loadOperand(left, "R1");
    this.loadOperand(right, "R2");
    this.emit("load R3, 0");
    this.emit("load R4, 1");
    this.emit(`${loopLabel}:`);
    this.emit(`jmpLE R2<=R0, ${endLabel}`);
    this.emit("addi R3, R3, R1");
    this.emitDecrementRegister("R2");
    this.emit(`jmp ${loopLabel}`);
    this.emit(`${endLabel}:`);
    this.storeTarget(target, "R3");
  }

  private emitDivision(
    target: string,
    left: string,
    right: string,
    result: "quotient" | "remainder",
  ): void {
    const loopLabel = this.newGeneratedLabel("div_loop");
    const bodyLabel = this.newGeneratedLabel("div_body");
    const endLabel = this.newGeneratedLabel("div_end");

    this.emit("; divisao inteira por subtracoes sucessivas");
    this.loadOperand(left, "R1");
    this.loadOperand(right, "R2");
    this.emit("load R3, 0");
    this.emit("load R4, 1");
    this.emit(`jmpLE R2<=R0, ${endLabel}`);
    this.emit(`${loopLabel}:`);
    this.emitSubtractionToRegisterFromRegisters("R5", "R2", "R1");
    this.emit(`jmpLE R5<=R0, ${bodyLabel}`);
    this.emit(`jmp ${endLabel}`);
    this.emit(`${bodyLabel}:`);
    this.emitSubtractionToRegisterFromRegisters("R1", "R1", "R2");
    this.emit("addi R3, R3, R4");
    this.emit(`jmp ${loopLabel}`);
    this.emit(`${endLabel}:`);

    this.storeTarget(target, result === "quotient" ? "R3" : "R1");
  }

  private emitComparisonToTarget(
    target: string,
    expression: BinaryExpression,
  ): void {
    const trueLabel = this.newGeneratedLabel("cmp_true");
    const endLabel = this.newGeneratedLabel("cmp_end");

    this.emitComparisonJump(
      expression.left,
      expression.operator,
      expression.right,
      trueLabel,
    );
    this.emit("load R6, 0");
    this.storeTarget(target, "R6");
    this.emit(`jmp ${endLabel}`);
    this.emit(`${trueLabel}:`);
    this.emit("load R6, 1");
    this.storeTarget(target, "R6");
    this.emit(`${endLabel}:`);
  }

  private emitConditionalJump(conditionalJump: ConditionalJump): void {
    if (conditionalJump.condition === "true") {
      this.emit(`jmp ${conditionalJump.label}`);
      return;
    }

    if (conditionalJump.condition === "false") {
      return;
    }

    const binary = this.parseBinaryExpression(conditionalJump.condition);
    if (binary && this.isRelationalOperator(binary.operator)) {
      this.emitComparisonJump(
        binary.left,
        binary.operator,
        binary.right,
        conditionalJump.label,
      );
      return;
    }

    this.loadOperand(conditionalJump.condition, "R1");
    const skipLabel = this.newGeneratedLabel("cond_false");
    this.emit(`jmpEQ R1=R0, ${skipLabel}`);
    this.emit(`jmp ${conditionalJump.label}`);
    this.emit(`${skipLabel}:`);
  }

  private emitComparisonJump(
    left: string,
    operator: string,
    right: string,
    targetLabel: string,
  ): void {
    switch (operator) {
      case "==":
        this.emitSubtractionToRegister("R3", left, right);
        this.emit(`jmpEQ R3=R0, ${targetLabel}`);
        return;
      case "!=": {
        const skipLabel = this.newGeneratedLabel("cmp_eq");
        this.emitSubtractionToRegister("R3", left, right);
        this.emit(`jmpEQ R3=R0, ${skipLabel}`);
        this.emit(`jmp ${targetLabel}`);
        this.emit(`${skipLabel}:`);
        return;
      }
      case "<=":
        this.emitSubtractionToRegister("R3", left, right);
        this.emit(`jmpLE R3<=R0, ${targetLabel}`);
        return;
      case ">=":
        this.emitSubtractionToRegister("R3", right, left);
        this.emit(`jmpLE R3<=R0, ${targetLabel}`);
        return;
      case "<": {
        const skipLabel = this.newGeneratedLabel("cmp_eq");
        this.emitSubtractionToRegister("R3", left, right);
        this.emit(`jmpEQ R3=R0, ${skipLabel}`);
        this.emit(`jmpLE R3<=R0, ${targetLabel}`);
        this.emit(`${skipLabel}:`);
        return;
      }
      case ">": {
        const skipLabel = this.newGeneratedLabel("cmp_eq");
        this.emitSubtractionToRegister("R3", right, left);
        this.emit(`jmpEQ R3=R0, ${skipLabel}`);
        this.emit(`jmpLE R3<=R0, ${targetLabel}`);
        this.emit(`${skipLabel}:`);
        return;
      }
      default:
        this.emit(`; Comparador nao suportado: ${operator}`);
    }
  }

  private emitSubtractionToRegister(
    targetRegister: string,
    left: string,
    right: string,
  ): void {
    this.loadOperand(left, "R1");
    this.loadOperand(right, "R2");
    this.emitSubtractionToRegisterFromRegisters(targetRegister, "R1", "R2");
  }

  private emitSubtractionToRegisterFromRegisters(
    targetRegister: string,
    leftRegister: string,
    rightRegister: string,
  ): void {
    this.emit("load R7, -1");
    this.emit(`xor R6, ${rightRegister}, R7`);
    this.emit("load R7, 1");
    this.emit("addi R6, R6, R7");
    this.emit(`addi ${targetRegister}, ${leftRegister}, R6`);
  }

  private emitDecrementRegister(register: string): void {
    this.emit("load R7, -1");
    this.emit(`xor R6, R4, R7`);
    this.emit("load R7, 1");
    this.emit("addi R6, R6, R7");
    this.emit(`addi ${register}, ${register}, R6`);
  }

  private loadOperand(operand: string, register: string): void {
    const normalized = this.normalizeOperand(operand);

    if (this.isImmediate(normalized)) {
      this.emit(`load ${register}, ${normalized}`);
      return;
    }

    this.emit(`load ${register}, [${normalized}]`);
  }

  private storeTarget(target: string, register: string): void {
    this.emit(`store ${register}, [${target}]`);
  }

  private collectDataLabels(instructions: string[]): Set<string> {
    const labels = new Set<string>();

    for (const instruction of instructions) {
      const assignment = this.parseAssignment(instruction);
      if (assignment) {
        labels.add(assignment.target);
        this.extractIdentifiers(assignment.value).forEach((identifier) =>
          labels.add(identifier),
        );
        continue;
      }

      const conditionalJump = this.parseConditionalJump(instruction);
      if (conditionalJump) {
        this.extractIdentifiers(conditionalJump.condition).forEach(
          (identifier) => labels.add(identifier),
        );
      }
    }

    return labels;
  }

  private extractIdentifiers(expression: string): string[] {
    return expression
      .replace(/\((int|decimal|char|bool)\)/g, " ")
      .split(/\s+/)
      .filter(
        (token) => this.isIdentifier(token) && !RESERVED_WORDS.has(token),
      );
  }

  private parseAssignment(instruction: string): AssignmentInstruction | null {
    const match = instruction.match(/^([A-Za-z_]\w*)\s*:=\s*(.+)$/);
    if (!match) return null;

    return {
      target: match[1],
      value: match[2],
    };
  }

  private parseBinaryExpression(expression: string): BinaryExpression | null {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 3) return null;

    const [left, operator, right] = parts;
    if (!BINARY_OPERATORS.has(operator)) return null;

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

  private parseConditionalJump(instruction: string): ConditionalJump | null {
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

  private normalizeOperand(operand: string): string {
    if (operand === "true") return "1";
    if (operand === "false") return "0";

    const charMatch = operand.match(/^'([^'])'$/);
    if (charMatch) {
      return String(charMatch[1].charCodeAt(0));
    }

    return operand;
  }

  private isRelationalOperator(operator: string): boolean {
    return ["==", "!=", ">", ">=", "<", "<="].includes(operator);
  }

  private isImmediate(operand: string): boolean {
    return /^-?\d+(\.\d+)?$/.test(operand);
  }

  private isIdentifier(value: string): boolean {
    return /^[A-Za-z_]\w*$/.test(value);
  }

  private newGeneratedLabel(prefix: string): string {
    this.generatedLabelCount += 1;
    return `__${prefix}_${this.generatedLabelCount}`;
  }

  private emit(instruction: string): void {
    this.instructions.push(instruction);
  }
}
