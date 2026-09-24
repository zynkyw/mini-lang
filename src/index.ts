import { Lexer, LexError } from './lexer';
import { Parser, ParseError } from './parser';
import { Interpreter, InterpreterOptions } from './interpreter';
import { RuntimeError } from './environment';

export { Lexer, LexError } from './lexer';
export { Parser, ParseError } from './parser';
export { Interpreter, InterpreterOptions } from './interpreter';
export { Environment, RuntimeError } from './environment';
export * from './ast';
export * from './tokens';
export * from './interpreter-types';

/**
 * Runs a mini-lang source string end-to-end (lex -> parse -> interpret).
 * Returns `true` on success, `false` if a lex/parse/runtime error occurred
 * (the error is printed to stderr).
 */
export function run(source: string, options?: InterpreterOptions): boolean {
  try {
    const tokens = new Lexer(source).tokenize();
    const statements = new Parser(tokens).parse();
    const interpreter = new Interpreter(options);
    interpreter.run(statements);
    return true;
  } catch (err) {
    if (err instanceof LexError || err instanceof ParseError || err instanceof RuntimeError) {
      console.error(err.message);
      return false;
    }
    throw err;
  }
}
