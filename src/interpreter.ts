import * as A from './ast';
import { Environment, RuntimeError } from './environment';
import {
  ClosureValue,
  RuntimeValue,
  isCallable,
  isClosure,
  isNativeFunction,
} from './interpreter-types';

/** Internal signal thrown by `return` and caught at the function-call boundary. */
class ReturnSignal {
  constructor(public value: RuntimeValue) {}
}
/** Internal signals for loop control flow. */
class BreakSignal {}
class ContinueSignal {}

export interface InterpreterOptions {
  /** Where `print` statements write to. Defaults to console.log. */
  output?: (text: string) => void;
}

export class Interpreter {
  readonly globals = new Environment();
  private output: (text: string) => void;

  constructor(options: InterpreterOptions = {}) {
    this.output = options.output ?? ((text: string) => console.log(text));
    this.defineBuiltins();
  }

  run(statements: A.Stmt[]): void {
    for (const stmt of statements) {
      this.execute(stmt, this.globals);
    }
  }

  /** Evaluate a single expression against a fresh top-level scope. Used by the REPL. */
  evalTopLevel(statements: A.Stmt[], env: Environment): RuntimeValue {
    let last: RuntimeValue = null;
    for (const stmt of statements) {
      if (stmt.kind === 'ExprStmt') {
        last = this.evaluate(stmt.expression, env);
      } else {
        this.execute(stmt, env);
        last = null;
      }
    }
    return last;
  }

  private defineBuiltins(): void {
    this.globals.define('len', {
      type: 'native',
      name: 'len',
      arity: 1,
      call: (args) => {
        const v = args[0];
        if (typeof v === 'string' || Array.isArray(v)) return v.length;
        throw new RuntimeError('len() expects a string or array', 0);
      },
    });
    this.globals.define('str', {
      type: 'native',
      name: 'str',
      arity: 1,
      call: (args) => this.stringify(args[0]),
    });
    this.globals.define('num', {
      type: 'native',
      name: 'num',
      arity: 1,
      call: (args) => {
        const n = Number(args[0]);
        if (Number.isNaN(n)) throw new RuntimeError(`Cannot convert '${this.stringify(args[0])}' to a number`, 0);
        return n;
      },
    });
    this.globals.define('push', {
      type: 'native',
      name: 'push',
      arity: 2,
      call: (args) => {
        const [arr, item] = args;
        if (!Array.isArray(arr)) throw new RuntimeError('push() expects an array as its first argument', 0);
        return [...arr, item];
      },
    });
    this.globals.define('range', {
      type: 'native',
      name: 'range',
      arity: 2,
      call: (args) => {
        const [start, end] = args;
        if (typeof start !== 'number' || typeof end !== 'number') {
          throw new RuntimeError('range() expects two numbers', 0);
        }
        const result: RuntimeValue[] = [];
        for (let i = start; i < end; i++) result.push(i);
        return result;
      },
    });
  }

  // ---- statement execution ----

  private execute(stmt: A.Stmt, env: Environment): void {
    switch (stmt.kind) {
      case 'LetStmt': {
        const value = this.evaluate(stmt.initializer, env);
        if (isClosure(value) && value.name === null) {
          // Give anonymous function-expressions bound via `let` a name for nicer errors/printing.
          (value as ClosureValue).name = stmt.name;
        }
        env.define(stmt.name, value);
        return;
      }
      case 'ExprStmt':
        this.evaluate(stmt.expression, env);
        return;
      case 'PrintStmt':
        this.output(this.stringify(this.evaluate(stmt.expression, env)));
        return;
      case 'BlockStmt': {
        const blockEnv = env.child();
        for (const s of stmt.statements) this.execute(s, blockEnv);
        return;
      }
      case 'IfStmt':
        if (this.isTruthy(this.evaluate(stmt.condition, env))) {
          this.execute(stmt.thenBranch, env);
        } else if (stmt.elseBranch) {
          this.execute(stmt.elseBranch, env);
        }
        return;
      case 'WhileStmt':
        while (this.isTruthy(this.evaluate(stmt.condition, env))) {
          try {
            this.execute(stmt.body, env);
          } catch (signal) {
            if (signal instanceof BreakSignal) break;
            if (signal instanceof ContinueSignal) continue;
            throw signal;
          }
        }
        return;
      case 'ReturnStmt':
        throw new ReturnSignal(stmt.value ? this.evaluate(stmt.value, env) : null);
      case 'BreakStmt':
        throw new BreakSignal();
      case 'ContinueStmt':
        throw new ContinueSignal();
    }
  }

  // ---- expression evaluation ----

  private evaluate(expr: A.Expr, env: Environment): RuntimeValue {
    switch (expr.kind) {
      case 'NumberLiteral':
        return expr.value;
      case 'StringLiteral':
        return expr.value;
      case 'BooleanLiteral':
        return expr.value;
      case 'NullLiteral':
        return null;
      case 'ArrayLiteral':
        return expr.elements.map((e) => this.evaluate(e, env));
      case 'Identifier':
        return env.get(expr.name, expr.line);
      case 'Assign': {
        const value = this.evaluate(expr.value, env);
        env.assign(expr.name, value, expr.line);
        return value;
      }
      case 'Unary':
        return this.evalUnary(expr, env);
      case 'Binary':
        return this.evalBinary(expr, env);
      case 'Logical':
        return this.evalLogical(expr, env);
      case 'Call':
        return this.evalCall(expr, env);
      case 'Index':
        return this.evalIndex(expr, env);
      case 'FunctionExpr':
        return {
          type: 'closure',
          name: expr.name,
          params: expr.params,
          body: expr.body,
          closure: env,
        };
    }
  }

  private evalUnary(expr: A.Unary, env: Environment): RuntimeValue {
    const right = this.evaluate(expr.right, env);
    if (expr.operator === '-') {
      this.checkNumber(right, expr.line, 'Operand of unary -');
      return -(right as number);
    }
    // '!'
    return !this.isTruthy(right);
  }

  private evalLogical(expr: A.Logical, env: Environment): RuntimeValue {
    const left = this.evaluate(expr.left, env);
    if (expr.operator === '||') {
      if (this.isTruthy(left)) return left;
      return this.evaluate(expr.right, env);
    }
    // '&&'
    if (!this.isTruthy(left)) return left;
    return this.evaluate(expr.right, env);
  }

  private evalBinary(expr: A.Binary, env: Environment): RuntimeValue {
    const left = this.evaluate(expr.left, env);
    const right = this.evaluate(expr.right, env);
    const { operator, line } = expr;

    switch (operator) {
      case '+':
        if (typeof left === 'number' && typeof right === 'number') return left + right;
        if (typeof left === 'string' || typeof right === 'string') {
          return this.stringify(left) + this.stringify(right);
        }
        if (Array.isArray(left) && Array.isArray(right)) return [...left, ...right];
        throw new RuntimeError(`Cannot add ${this.typeName(left)} and ${this.typeName(right)}`, line);
      case '-':
        this.checkNumbers(left, right, line, '-');
        return (left as number) - (right as number);
      case '*':
        this.checkNumbers(left, right, line, '*');
        return (left as number) * (right as number);
      case '/':
        this.checkNumbers(left, right, line, '/');
        if ((right as number) === 0) throw new RuntimeError('Division by zero', line);
        return (left as number) / (right as number);
      case '%':
        this.checkNumbers(left, right, line, '%');
        return (left as number) % (right as number);
      case '==':
        return this.isEqual(left, right);
      case '!=':
        return !this.isEqual(left, right);
      case '<':
      case '<=':
      case '>':
      case '>=': {
        this.checkComparable(left, right, line);
        const l = left as number | string;
        const r = right as number | string;
        if (operator === '<') return l < r;
        if (operator === '<=') return l <= r;
        if (operator === '>') return l > r;
        return l >= r;
      }
      default:
        throw new RuntimeError(`Unknown operator '${operator}'`, line);
    }
  }

  private evalCall(expr: A.Call, env: Environment): RuntimeValue {
    const callee = this.evaluate(expr.callee, env);
    const args = expr.args.map((a) => this.evaluate(a, env));

    if (!isCallable(callee)) {
      throw new RuntimeError(`'${this.stringify(callee)}' is not callable`, expr.line);
    }

    if (isNativeFunction(callee)) {
      if (args.length !== callee.arity) {
        throw new RuntimeError(
          `Expected ${callee.arity} argument(s) for '${callee.name}' but got ${args.length}`,
          expr.line,
        );
      }
      return callee.call(args);
    }

    // closure
    if (args.length !== callee.params.length) {
      throw new RuntimeError(
        `Expected ${callee.params.length} argument(s) for '${callee.name ?? 'anonymous fn'}' but got ${args.length}`,
        expr.line,
      );
    }
    const callEnv = callee.closure.child();
    callee.params.forEach((param, i) => callEnv.define(param, args[i]));

    try {
      for (const stmt of callee.body) {
        this.execute(stmt, callEnv);
      }
    } catch (signal) {
      if (signal instanceof ReturnSignal) return signal.value;
      throw signal;
    }
    return null;
  }

  private evalIndex(expr: A.Index, env: Environment): RuntimeValue {
    const object = this.evaluate(expr.object, env);
    const index = this.evaluate(expr.index, env);
    if (!Array.isArray(object) && typeof object !== 'string') {
      throw new RuntimeError(`Cannot index into ${this.typeName(object)}`, expr.line);
    }
    if (typeof index !== 'number' || !Number.isInteger(index)) {
      throw new RuntimeError('Array/string index must be an integer', expr.line);
    }
    if (index < 0 || index >= object.length) {
      throw new RuntimeError(`Index ${index} out of bounds (length ${object.length})`, expr.line);
    }
    return object[index] as RuntimeValue;
  }

  // ---- helpers ----

  private isTruthy(value: RuntimeValue): boolean {
    if (value === null) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }

  private isEqual(a: RuntimeValue, b: RuntimeValue): boolean {
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((v, i) => this.isEqual(v, b[i]));
    }
    return a === b;
  }

  private checkNumber(value: RuntimeValue, line: number, what: string): void {
    if (typeof value !== 'number') throw new RuntimeError(`${what} must be a number`, line);
  }

  private checkNumbers(a: RuntimeValue, b: RuntimeValue, line: number, op: string): void {
    if (typeof a !== 'number' || typeof b !== 'number') {
      throw new RuntimeError(`Operands of '${op}' must be numbers`, line);
    }
  }

  private checkComparable(a: RuntimeValue, b: RuntimeValue, line: number): void {
    const okNumbers = typeof a === 'number' && typeof b === 'number';
    const okStrings = typeof a === 'string' && typeof b === 'string';
    if (!okNumbers && !okStrings) {
      throw new RuntimeError('Comparison operands must both be numbers or both be strings', line);
    }
  }

  private typeName(value: RuntimeValue): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (isCallable(value)) return 'function';
    return typeof value;
  }

  stringify(value: RuntimeValue): string {
    if (value === null) return 'null';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return `[${value.map((v) => this.stringify(v)).join(', ')}]`;
    if (isClosure(value)) return `<fn ${value.name ?? 'anonymous'}>`;
    if (isNativeFunction(value)) return `<native fn ${value.name}>`;
    return String(value);
  }
}
