import { Lexer } from '../src/lexer';
import { Parser, ParseError } from '../src/parser';
import * as A from '../src/ast';

function parse(source: string): A.Stmt[] {
  const tokens = new Lexer(source).tokenize();
  return new Parser(tokens).parse();
}

describe('Parser', () => {
  test('parses a let statement', () => {
    const [stmt] = parse('let x = 1 + 2;');
    expect(stmt.kind).toBe('LetStmt');
    const let_ = stmt as A.LetStmt;
    expect(let_.name).toBe('x');
    expect(let_.initializer).toMatchObject({ kind: 'Binary', operator: '+' });
  });

  test('respects arithmetic precedence', () => {
    const [stmt] = parse('let x = 1 + 2 * 3;');
    const init = (stmt as A.LetStmt).initializer as A.Binary;
    expect(init.operator).toBe('+');
    expect(init.right).toMatchObject({ kind: 'Binary', operator: '*' });
  });

  test('parses if/else', () => {
    const [stmt] = parse('if (true) { print 1; } else { print 2; }');
    expect(stmt.kind).toBe('IfStmt');
    const ifStmt = stmt as A.IfStmt;
    expect(ifStmt.thenBranch.kind).toBe('BlockStmt');
    expect(ifStmt.elseBranch?.kind).toBe('BlockStmt');
  });

  test('parses while loops', () => {
    const [stmt] = parse('while (x < 10) { x = x + 1; }');
    expect(stmt.kind).toBe('WhileStmt');
  });

  test('desugars fn declarations into let + function expression', () => {
    const [stmt] = parse('fn add(a, b) { return a + b; }');
    expect(stmt.kind).toBe('LetStmt');
    const let_ = stmt as A.LetStmt;
    expect(let_.name).toBe('add');
    expect(let_.initializer.kind).toBe('FunctionExpr');
    const fn = let_.initializer as A.FunctionExpr;
    expect(fn.params).toEqual(['a', 'b']);
  });

  test('parses function calls and nested calls', () => {
    const [stmt] = parse('f(g(1, 2), 3);');
    const call = (stmt as A.ExprStmt).expression as A.Call;
    expect(call.kind).toBe('Call');
    expect(call.args).toHaveLength(2);
    expect(call.args[0]).toMatchObject({ kind: 'Call' });
  });

  test('parses array literals and indexing', () => {
    const [stmt] = parse('let x = [1, 2, 3][0];');
    const init = (stmt as A.LetStmt).initializer as A.Index;
    expect(init.kind).toBe('Index');
    expect(init.object).toMatchObject({ kind: 'ArrayLiteral' });
  });

  test('parses assignment as right-associative', () => {
    const [stmt] = parse('a = b = 3;');
    const assign = (stmt as A.ExprStmt).expression as A.Assign;
    expect(assign.kind).toBe('Assign');
    expect(assign.name).toBe('a');
    expect(assign.value).toMatchObject({ kind: 'Assign', name: 'b' });
  });

  test('rejects invalid assignment targets', () => {
    expect(() => parse('1 = 2;')).toThrow(ParseError);
  });

  test('throws with a useful message on missing semicolon', () => {
    expect(() => parse('let x = 1')).toThrow(ParseError);
  });
});
