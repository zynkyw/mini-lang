import { Lexer } from '../src/lexer';
import { Parser } from '../src/parser';
import { Interpreter } from '../src/interpreter';
import { RuntimeError } from '../src/environment';

function runAndCapture(source: string): string[] {
  const output: string[] = [];
  const tokens = new Lexer(source).tokenize();
  const statements = new Parser(tokens).parse();
  const interpreter = new Interpreter({ output: (line) => output.push(line) });
  interpreter.run(statements);
  return output;
}

describe('Interpreter', () => {
  test('evaluates arithmetic with correct precedence', () => {
    expect(runAndCapture('print 1 + 2 * 3;')).toEqual(['7']);
    expect(runAndCapture('print (1 + 2) * 3;')).toEqual(['9']);
    expect(runAndCapture('print 10 % 3;')).toEqual(['1']);
  });

  test('string concatenation coerces non-strings', () => {
    expect(runAndCapture('print "n=" + 5;')).toEqual(['n=5']);
  });

  test('variables and reassignment', () => {
    expect(runAndCapture('let x = 1; x = x + 41; print x;')).toEqual(['42']);
  });

  test('if/else branches correctly', () => {
    expect(runAndCapture('if (1 < 2) { print "yes"; } else { print "no"; }')).toEqual(['yes']);
    expect(runAndCapture('if (1 > 2) { print "yes"; } else { print "no"; }')).toEqual(['no']);
  });

  test('while loop with break/continue', () => {
    const out = runAndCapture(`
      let i = 0;
      while (i < 10) {
        i = i + 1;
        if (i % 2 == 0) { continue; }
        if (i > 7) { break; }
        print str(i);
      }
    `);
    expect(out).toEqual(['1', '3', '5', '7']);
  });

  test('recursive functions (factorial)', () => {
    const out = runAndCapture(`
      fn fact(n) {
        if (n <= 1) { return 1; }
        return n * fact(n - 1);
      }
      print str(fact(6));
    `);
    expect(out).toEqual(['720']);
  });

  test('closures capture their defining environment', () => {
    const out = runAndCapture(`
      fn make_counter() {
        let count = 0;
        fn increment() {
          count = count + 1;
          return count;
        }
        return increment;
      }
      let c1 = make_counter();
      let c2 = make_counter();
      print str(c1());
      print str(c1());
      print str(c2());
    `);
    expect(out).toEqual(['1', '2', '1']);
  });

  test('arrays support literals, indexing, and equality', () => {
    expect(runAndCapture('print [1, 2, 3][1];')).toEqual(['2']);
    expect(runAndCapture('print [1, 2] == [1, 2];')).toEqual(['true']);
    expect(runAndCapture('print len([1,2,3]);')).toEqual(['3']);
  });

  test('higher-order functions: passing closures as values', () => {
    const out = runAndCapture(`
      fn apply_twice(f, x) { return f(f(x)); }
      fn double(x) { return x * 2; }
      print str(apply_twice(double, 5));
    `);
    expect(out).toEqual(['20']);
  });

  test('logical operators short-circuit', () => {
    const out = runAndCapture(`
      fn boom() { print "should not run"; return true; }
      print false && boom();
      print true || boom();
    `);
    expect(out).toEqual(['false', 'true']);
  });

  test('throws RuntimeError for undefined variables', () => {
    expect(() => runAndCapture('print undefinedVar;')).toThrow(RuntimeError);
  });

  test('throws RuntimeError for division by zero', () => {
    expect(() => runAndCapture('print 1 / 0;')).toThrow(RuntimeError);
  });

  test('throws RuntimeError for out-of-bounds array access', () => {
    expect(() => runAndCapture('print [1,2,3][10];')).toThrow(RuntimeError);
  });

  test('throws RuntimeError when calling a non-function', () => {
    expect(() => runAndCapture('let x = 5; x();')).toThrow(RuntimeError);
  });
});
