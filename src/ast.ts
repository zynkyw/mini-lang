// ---- Expressions ----

export type Expr =
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | NullLiteral
  | ArrayLiteral
  | Identifier
  | Unary
  | Binary
  | Logical
  | Assign
  | Call
  | Index
  | FunctionExpr;

export interface NumberLiteral {
  kind: 'NumberLiteral';
  value: number;
}

export interface StringLiteral {
  kind: 'StringLiteral';
  value: string;
}

export interface BooleanLiteral {
  kind: 'BooleanLiteral';
  value: boolean;
}

export interface NullLiteral {
  kind: 'NullLiteral';
}

export interface ArrayLiteral {
  kind: 'ArrayLiteral';
  elements: Expr[];
}

export interface Identifier {
  kind: 'Identifier';
  name: string;
  line: number;
}

export interface Unary {
  kind: 'Unary';
  operator: '-' | '!';
  right: Expr;
  line: number;
}

export interface Binary {
  kind: 'Binary';
  operator: string;
  left: Expr;
  right: Expr;
  line: number;
}

export interface Logical {
  kind: 'Logical';
  operator: '&&' | '||';
  left: Expr;
  right: Expr;
}

export interface Assign {
  kind: 'Assign';
  name: string;
  value: Expr;
  line: number;
}

export interface Call {
  kind: 'Call';
  callee: Expr;
  args: Expr[];
  line: number;
}

export interface Index {
  kind: 'Index';
  object: Expr;
  index: Expr;
  line: number;
}

export interface FunctionExpr {
  kind: 'FunctionExpr';
  name: string | null;
  params: string[];
  body: Stmt[];
}

// ---- Statements ----

export type Stmt =
  | LetStmt
  | ExprStmt
  | PrintStmt
  | BlockStmt
  | IfStmt
  | WhileStmt
  | ReturnStmt
  | BreakStmt
  | ContinueStmt;

export interface LetStmt {
  kind: 'LetStmt';
  name: string;
  initializer: Expr;
}

export interface ExprStmt {
  kind: 'ExprStmt';
  expression: Expr;
}

export interface PrintStmt {
  kind: 'PrintStmt';
  expression: Expr;
}

export interface BlockStmt {
  kind: 'BlockStmt';
  statements: Stmt[];
}

export interface IfStmt {
  kind: 'IfStmt';
  condition: Expr;
  thenBranch: Stmt;
  elseBranch: Stmt | null;
}

export interface WhileStmt {
  kind: 'WhileStmt';
  condition: Expr;
  body: Stmt;
}

export interface ReturnStmt {
  kind: 'ReturnStmt';
  value: Expr | null;
  line: number;
}

export interface BreakStmt {
  kind: 'BreakStmt';
}

export interface ContinueStmt {
  kind: 'ContinueStmt';
}
