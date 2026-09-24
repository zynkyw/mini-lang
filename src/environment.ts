import { RuntimeValue } from './interpreter-types';

export class RuntimeError extends Error {
  constructor(message: string, public line: number) {
    super(`[line ${line}] Runtime error: ${message}`);
  }
}

/**
 * A single lexical scope. Scopes form a chain via `parent`, which is how
 * closures and block scoping both fall out of the same mechanism.
 */
export class Environment {
  private values = new Map<string, RuntimeValue>();

  constructor(public readonly parent: Environment | null = null) {}

  define(name: string, value: RuntimeValue): void {
    this.values.set(name, value);
  }

  get(name: string, line: number): RuntimeValue {
    if (this.values.has(name)) return this.values.get(name) as RuntimeValue;
    if (this.parent) return this.parent.get(name, line);
    throw new RuntimeError(`Undefined variable '${name}'`, line);
  }

  assign(name: string, value: RuntimeValue, line: number): void {
    if (this.values.has(name)) {
      this.values.set(name, value);
      return;
    }
    if (this.parent) {
      this.parent.assign(name, value, line);
      return;
    }
    throw new RuntimeError(`Cannot assign to undefined variable '${name}'`, line);
  }

  child(): Environment {
    return new Environment(this);
  }
}
