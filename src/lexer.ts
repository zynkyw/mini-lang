import { KEYWORDS, Token, TokenType } from './tokens';

export class LexError extends Error {
  constructor(message: string, public line: number) {
    super(`[line ${line}] Lex error: ${message}`);
  }
}

const SIMPLE_TOKENS: Record<string, TokenType> = {
  '+': 'PLUS',
  '-': 'MINUS',
  '*': 'STAR',
  '%': 'PERCENT',
  '(': 'LPAREN',
  ')': 'RPAREN',
  '{': 'LBRACE',
  '}': 'RBRACE',
  '[': 'LBRACKET',
  ']': 'RBRACKET',
  ',': 'COMMA',
  ';': 'SEMICOLON',
};

/**
 * Converts mini-lang source code into a flat array of Tokens.
 * Single pass, hand-rolled (no regex-based tokenizing) so behaviour
 * for edge cases like nested comments or unterminated strings is explicit.
 */
export class Lexer {
  private source: string;
  private tokens: Token[] = [];
  private start = 0;
  private current = 0;
  private line = 1;

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    while (!this.isAtEnd()) {
      this.start = this.current;
      this.scanToken();
    }
    this.tokens.push({ type: 'EOF', lexeme: '', literal: null, line: this.line });
    return this.tokens;
  }

  private scanToken(): void {
    const c = this.advance();

    if (c === ' ' || c === '\r' || c === '\t') return;
    if (c === '\n') {
      this.line++;
      return;
    }
    if (c === '/' && this.match('/')) {
      while (this.peek() !== '\n' && !this.isAtEnd()) this.advance();
      return;
    }
    if (c === '/' && this.match('*')) {
      this.blockComment();
      return;
    }

    if (c in SIMPLE_TOKENS) {
      this.addToken(SIMPLE_TOKENS[c]);
      return;
    }

    switch (c) {
      case '/':
        this.addToken('SLASH');
        return;
      case '!':
        this.addToken(this.match('=') ? 'BANGEQ' : 'BANG');
        return;
      case '=':
        this.addToken(this.match('=') ? 'EQEQ' : 'EQ');
        return;
      case '<':
        this.addToken(this.match('=') ? 'LE' : 'LT');
        return;
      case '>':
        this.addToken(this.match('=') ? 'GE' : 'GT');
        return;
      case '&':
        if (this.match('&')) {
          this.addToken('AND');
          return;
        }
        break;
      case '|':
        if (this.match('|')) {
          this.addToken('OR');
          return;
        }
        break;
      case '"':
        this.string();
        return;
      default:
        break;
    }

    if (this.isDigit(c)) {
      this.number();
      return;
    }
    if (this.isAlpha(c)) {
      this.identifier();
      return;
    }

    throw new LexError(`Unexpected character '${c}'`, this.line);
  }

  private blockComment(): void {
    let depth = 1;
    while (depth > 0 && !this.isAtEnd()) {
      if (this.peek() === '/' && this.peekNext() === '*') {
        this.advance();
        this.advance();
        depth++;
        continue;
      }
      if (this.peek() === '*' && this.peekNext() === '/') {
        this.advance();
        this.advance();
        depth--;
        continue;
      }
      if (this.peek() === '\n') this.line++;
      this.advance();
    }
  }

  private string(): void {
    let value = '';
    while (this.peek() !== '"' && !this.isAtEnd()) {
      const c = this.peek();
      if (c === '\n') this.line++;
      if (c === '\\') {
        this.advance();
        value += this.escapeChar(this.advance());
        continue;
      }
      value += this.advance();
    }
    if (this.isAtEnd()) {
      throw new LexError('Unterminated string', this.line);
    }
    this.advance(); // closing quote
    this.addToken('STRING', value);
  }

  private escapeChar(c: string): string {
    switch (c) {
      case 'n':
        return '\n';
      case 't':
        return '\t';
      case '"':
        return '"';
      case '\\':
        return '\\';
      default:
        return c;
    }
  }

  private number(): void {
    while (this.isDigit(this.peek())) this.advance();
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      this.advance();
      while (this.isDigit(this.peek())) this.advance();
    }
    const text = this.source.slice(this.start, this.current);
    this.addToken('NUMBER', parseFloat(text));
  }

  private identifier(): void {
    while (this.isAlphaNumeric(this.peek())) this.advance();
    const text = this.source.slice(this.start, this.current);
    const type = KEYWORDS[text] ?? 'IDENT';
    this.addToken(type);
  }

  private match(expected: string): boolean {
    if (this.isAtEnd() || this.source[this.current] !== expected) return false;
    this.current++;
    return true;
  }

  private peek(): string {
    return this.isAtEnd() ? '\0' : this.source[this.current];
  }

  private peekNext(): string {
    return this.current + 1 >= this.source.length ? '\0' : this.source[this.current + 1];
  }

  private advance(): string {
    return this.source[this.current++];
  }

  private addToken(type: TokenType, literal: number | string | null = null): void {
    const lexeme = this.source.slice(this.start, this.current);
    this.tokens.push({ type, lexeme, literal, line: this.line });
  }

  private isDigit(c: string): boolean {
    return c >= '0' && c <= '9';
  }

  private isAlpha(c: string): boolean {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_';
  }

  private isAlphaNumeric(c: string): boolean {
    return this.isAlpha(c) || this.isDigit(c);
  }

  private isAtEnd(): boolean {
    return this.current >= this.source.length;
  }
}
