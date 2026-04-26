import { type Token } from "../types";

export type Statement =
  | Program
  | Block
  | Declaration
  | Assignment
  | IfStatement
  | WhileStatement
  | ErrorStatement;

export type Expression =
  | BinaryExpression
  | UnaryExpression
  | Literal
  | IdentifierExpr;

export interface Program {
  kind: "Program";
  body: Statement[];
}

export interface Block {
  kind: "Block";
  body: Statement[];
}

export interface Declaration {
  kind: "Declaration";
  typeToken: Token;
  identifier: Token;
  initializer: Expression | null;
}

export interface Assignment {
  kind: "Assignment";
  identifier: Token;
  value: Expression;
}

export interface IfStatement {
  kind: "IfStatement";
  condition: Expression;
  thenBranch: Block;
  elseBranch: Block | null;
}

export interface WhileStatement {
  kind: "WhileStatement";
  condition: Expression;
  body: Block;
}

export interface ErrorStatement {
  kind: "Error";
}

export interface BinaryExpression {
  kind: "Binary";
  left: Expression;
  operator: Token;
  right: Expression;
}

export interface UnaryExpression {
  kind: "Unary";
  operator: Token;
  right: Expression;
}

export interface Literal {
  kind: "Literal";
  value: any;
  token: Token;
}

export interface IdentifierExpr {
  kind: "Identifier";
  name: string;
  token: Token;
}
