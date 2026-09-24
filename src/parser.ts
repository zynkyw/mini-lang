import { Token, TokenType } from './tokens';
import * as A from './ast';

export class ParseError extends Error {
  constructor(message: string, public line: number) {
    super(`[line ${line}] Parse error: ${message}`);
  }
}

/**
 * Classic recursive-descent / precedence-climbing parser.
 * Grammar (informal, lowest to highest precedence):
 *
 *   program      -> statement* EOF
 *   statement    -> letStmt | fnDecl | printStmt | ifStmt | whileStmt
 *                  | returnStmt | breakStmt | continueStmt | block | exprStmt
 *   assignment   -> IDENT "=" assignment | logic_or
 *   logic_or     -> logic_and ( "||" logic_and )*
 *   logic_and    -> equality ( "&&" equality )*
 *   equality     -> comparison ( ("==" | "!=") comparison )*
 *   comparison   -> term ( ("<" | ">" | "<=" | ">=") term )*
 *   term         -> factor ( ("+" | "-") factor )*
 *   factor       -> unary ( ("*" | "/" | "%") unary )*
 *   unary        -> ("!" | "-") unary | call
 *   call         -> primary ( "(" args? ")" | "[" expr "]" )*
 *   primary      -> NUMBER | STRING | "true" | "false" | "null" | IDENT
 *                  | "(" expr ")" | "[" args? "]" | "fn" "(" params? ")" block
 */
export class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): A.Stmt[] {
    const statements: A.Stmt[] = [];
    while (!this.isAtEnd()) {
      statements.push(this.statement());
    }
    return statements;
  }

  // ---- statements ----

  private statement(): A.Stmt {
    if (this.check('FN') && this.checkNext('IDENT')) return this.fnDeclStatement();
    if (this.match('LET')) return this.letStatement();
    if (this.match('PRINT')) return this.printStatement();
    if (this.match('IF')) return this.ifStatement();
    if (this.match('WHILE')) return this.whileStatement();
    if (this.match('RETURN')) return this.returnStatement();
    if (this.match('BREAK')) {
      this.consume('SEMICOLON', "Expected ';' after 'break'");
      return { kind: 'BreakStmt' };
    }
    if (this.match('CONTINUE')) {
      this.consume('SEMICOLON', "Expected ';' after 'continue'");
      return { kind: 'ContinueStmt' };
    }
    if (this.match('LBRACE')) return this.block();
    return this.exprStatement();
  }

  /** `fn name(params) { body }` desugars to `let name = fn(params) { body };` */
  private fnDeclStatement(): A.Stmt {
    this.consume('FN', "Expected 'fn'");
    const name = this.consume('IDENT', 'Expected function name').lexeme;
    const fnExpr = this.functionBody(name);
    return { kind: 'LetStmt', name, initializer: fnExpr };
  }

  private letStatement(): A.Stmt {
    const name = this.consume('IDENT', 'Expected variable name').lexeme;
    this.consume('EQ', "Expected '=' after variable name");
    const initializer = this.expression();
    this.consume('SEMICOLON', "Expected ';' after variable declaration");
    return { kind: 'LetStmt', name, initializer };
  }

  private printStatement(): A.Stmt {
    const expression = this.expression();
    this.consume('SEMICOLON', "Expected ';' after value");
    return { kind: 'PrintStmt', expression };
  }

  private ifStatement(): A.Stmt {
    this.consume('LPAREN', "Expected '(' after 'if'");
    const condition = this.expression();
    this.consume('RPAREN', "Expected ')' after if condition");
    const thenBranch = this.statement();
    let elseBranch: A.Stmt | null = null;
    if (this.match('ELSE')) {
      elseBranch = this.statement();
    }
    return { kind: 'IfStmt', condition, thenBranch, elseBranch };
  }

  private whileStatement(): A.Stmt {
    this.consume('LPAREN', "Expected '(' after 'while'");
    const condition = this.expression();
    this.consume('RPAREN', "Expected ')' after while condition");
    const body = this.statement();
    return { kind: 'WhileStmt', condition, body };
  }

  private returnStatement(): A.Stmt {
    const line = this.previous().line;
    let value: A.Expr | null = null;
    if (!this.check('SEMICOLON')) {
      value = this.expression();
    }
    this.consume('SEMICOLON', "Expected ';' after return value");
    return { kind: 'ReturnStmt', value, line };
  }

  private block(): A.BlockStmt {
    const statements: A.Stmt[] = [];
    while (!this.check('RBRACE') && !this.isAtEnd()) {
      statements.push(this.statement());
    }
    this.consume('RBRACE', "Expected '}' after block");
    return { kind: 'BlockStmt', statements };
  }

  private exprStatement(): A.Stmt {
    const expression = this.expression();
    this.consume('SEMICOLON', "Expected ';' after expression");
    return { kind: 'ExprStmt', expression };
  }

  // ---- expressions ----

  private expression(): A.Expr {
    return this.assignment();
  }

  private assignment(): A.Expr {
    const expr = this.logicOr();
    if (this.match('EQ')) {
      const equalsLine = this.previous().line;
      const value = this.assignment();
      if (expr.kind === 'Identifier') {
        return { kind: 'Assign', name: expr.name, value, line: equalsLine };
      }
      throw new ParseError('Invalid assignment target', equalsLine);
    }
    return expr;
  }

  private logicOr(): A.Expr {
    let expr = this.logicAnd();
    while (this.match('OR')) {
      const right = this.logicAnd();
      expr = { kind: 'Logical', operator: '||', left: expr, right };
    }
    return expr;
  }

  private logicAnd(): A.Expr {
    let expr = this.equality();
    while (this.match('AND')) {
      const right = this.equality();
      expr = { kind: 'Logical', operator: '&&', left: expr, right };
    }
    return expr;
  }

  private equality(): A.Expr {
    let expr = this.comparison();
    while (this.match('EQEQ', 'BANGEQ')) {
      const operator = this.previous();
      const right = this.comparison();
      expr = { kind: 'Binary', operator: operator.lexeme, left: expr, right, line: operator.line };
    }
    return expr;
  }

  private comparison(): A.Expr {
    let expr = this.term();
    while (this.match('LT', 'LE', 'GT', 'GE')) {
      const operator = this.previous();
      const right = this.term();
      expr = { kind: 'Binary', operator: operator.lexeme, left: expr, right, line: operator.line };
    }
    return expr;
  }

  private term(): A.Expr {
    let expr = this.factor();
    while (this.match('PLUS', 'MINUS')) {
      const operator = this.previous();
      const right = this.factor();
      expr = { kind: 'Binary', operator: operator.lexeme, left: expr, right, line: operator.line };
    }
    return expr;
  }

  private factor(): A.Expr {
    let expr = this.unary();
    while (this.match('STAR', 'SLASH', 'PERCENT')) {
      const operator = this.previous();
      const right = this.unary();
      expr = { kind: 'Binary', operator: operator.lexeme, left: expr, right, line: operator.line };
    }
    return expr;
  }

  private unary(): A.Expr {
    if (this.match('BANG', 'MINUS')) {
      const operator = this.previous();
      const right = this.unary();
      return { kind: 'Unary', operator: operator.lexeme as '-' | '!', right, line: operator.line };
    }
    return this.call();
  }

  private call(): A.Expr {
    let expr = this.primary();
    for (;;) {
      if (this.match('LPAREN')) {
        expr = this.finishCall(expr);
      } else if (this.match('LBRACKET')) {
        const line = this.previous().line;
        const index = this.expression();
        this.consume('RBRACKET', "Expected ']' after index");
        expr = { kind: 'Index', object: expr, index, line };
      } else {
        break;
      }
    }
    return expr;
  }

  private finishCall(callee: A.Expr): A.Expr {
    const args: A.Expr[] = [];
    const line = this.previous().line;
    if (!this.check('RPAREN')) {
      do {
        args.push(this.expression());
      } while (this.match('COMMA'));
    }
    this.consume('RPAREN', "Expected ')' after arguments");
    return { kind: 'Call', callee, args, line };
  }

  private primary(): A.Expr {
    if (this.match('NUMBER')) return { kind: 'NumberLiteral', value: this.previous().literal as number };
    if (this.match('STRING')) return { kind: 'StringLiteral', value: this.previous().literal as string };
    if (this.match('TRUE')) return { kind: 'BooleanLiteral', value: true };
    if (this.match('FALSE')) return { kind: 'BooleanLiteral', value: false };
    if (this.match('NULL')) return { kind: 'NullLiteral' };
    if (this.match('IDENT')) {
      const tok = this.previous();
      return { kind: 'Identifier', name: tok.lexeme, line: tok.line };
    }
    if (this.match('LPAREN')) {
      const expr = this.expression();
      this.consume('RPAREN', "Expected ')' after expression");
      return expr;
    }
    if (this.match('LBRACKET')) {
      const elements: A.Expr[] = [];
      if (!this.check('RBRACKET')) {
        do {
          elements.push(this.expression());
        } while (this.match('COMMA'));
      }
      this.consume('RBRACKET', "Expected ']' after array elements");
      return { kind: 'ArrayLiteral', elements };
    }
    if (this.match('FN')) {
      return this.functionBody(null);
    }

    throw new ParseError(`Unexpected token '${this.peek().lexeme}'`, this.peek().line);
  }

  private functionBody(name: string | null): A.FunctionExpr {
    this.consume('LPAREN', "Expected '(' after 'fn'");
    const params: string[] = [];
    if (!this.check('RPAREN')) {
      do {
        params.push(this.consume('IDENT', 'Expected parameter name').lexeme);
      } while (this.match('COMMA'));
    }
    this.consume('RPAREN', "Expected ')' after parameters");
    this.consume('LBRACE', "Expected '{' before function body");
    const body = this.block().statements;
    return { kind: 'FunctionExpr', name, params, body };
  }

  // ---- token helpers ----

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new ParseError(message, this.peek().line);
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private checkNext(type: TokenType): boolean {
    if (this.current + 1 >= this.tokens.length) return false;
    return this.tokens[this.current + 1].type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }
}
