import type { SemanticError, SymbolInfo } from "../types";

export class SymbolTable {
  private table: Map<string, SymbolInfo> = new Map();
  public errors: SemanticError[] = [];

  public insert(symbol: SymbolInfo): void {
    if (!this.table.has(symbol.name)) {
      this.table.set(symbol.name, symbol);
    } else {
      this.errors.push({
        message: `Variável '${symbol.name}' já declarada`,
        line: symbol.line,
        column: symbol.column,
        length: symbol.name.length,
      });
    }
  }

  public lookup(name: string): SymbolInfo | undefined {
    const symbol = this.table.get(name);
    if (!symbol) {
      this.errors.push({
        message: `Variável '${name}' não declarada`,
        line: -1,
        column: -1,
        length: name.length,
      });
    }

    return symbol;
  }

  public checkUnusedVariables(): void {
    for (const [name, symbol] of this.table.entries()) {
      if (!symbol.isUsed) {
        this.errors.push({
          message: `Variável '${name}' declarada mas nunca usada`,
          line: symbol.line,
          column: symbol.column,
          length: name.length,
        });
      }
    }
  }
}
