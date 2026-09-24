import { Lexer, LexError } from '../src/lexer';

function types(source: string): string[] {
  return new Lexer(source).tokenize().map((t) => t.type);
}

describe('Lexer', () => {
  test('tokenizes numbers, including decimals', () => {
    const tokens = new Lexer('42 3.14').tokenize();
    expect(tokens[0]).toMatchObject({ type: 'NUMBER', literal: 42 });
    expect(tokens[1]).toMatchObject({ type: 'NUMBER', literal: 3.14 });
  });

  test('tokenizes strings with escapes', () => {
    const tokens = new Lexer('"hello\\nworld"').tokenize();
    expect(tokens[0]).toMatchObject({ type: 'STRING', literal: 'hello\nworld' });
  });

  test('throws on unterminated string', () => {
    expect(() => new Lexer('"unterminated').tokenize()).toThrow(LexError);
  });

  test('recognizes keywords vs identifiers', () => {
    expect(types('let x fn y')).toEqual(['LET', 'IDENT', 'FN', 'IDENT', 'EOF']);
  });

  test('recognizes multi-char operators', () => {
    expect(types('== != <= >= && ||')).toEqual([
      'EQEQ',
      'BANGEQ',
      'LE',
      'GE',
      'AND',
      'OR',
      'EOF',
    ]);
  });

  test('skips line and block comments', () => {
    expect(types('1 // comment\n2 /* block */ 3')).toEqual([
      'NUMBER',
      'NUMBER',
      'NUMBER',
      'EOF',
    ]);
  });

  test('supports nested block comments', () => {
    expect(types('1 /* outer /* inner */ still outer */ 2')).toEqual(['NUMBER', 'NUMBER', 'EOF']);
  });

  test('tracks line numbers across newlines', () => {
    const tokens = new Lexer('1\n2\n3').tokenize();
    expect(tokens.map((t) => t.line)).toEqual([1, 2, 3, 3]);
  });

  test('throws on unexpected character', () => {
    expect(() => new Lexer('let x = @').tokenize()).toThrow(LexError);
  });
});
