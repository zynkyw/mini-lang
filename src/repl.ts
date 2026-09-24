#!/usr/bin/env node
import * as readline from 'readline';
import { Lexer, LexError } from './lexer';
import { Parser, ParseError } from './parser';
import { Interpreter } from './interpreter';
import { Environment, RuntimeError } from './environment';

function main(): void {
  const interpreter = new Interpreter();
  const env = new Environment(interpreter.globals);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'mini-lang> ',
  });

  console.log('mini-lang REPL. Type an expression or statement, or .exit to quit.');
  rl.prompt();

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (trimmed === '.exit') {
      rl.close();
      return;
    }
    if (trimmed.length === 0) {
      rl.prompt();
      return;
    }

    // Allow bare expressions without a trailing semicolon in the REPL.
    const source = trimmed.endsWith(';') || trimmed.endsWith('}') ? trimmed : `${trimmed};`;

    try {
      const tokens = new Lexer(source).tokenize();
      const statements = new Parser(tokens).parse();
      const result = interpreter.evalTopLevel(statements, env);
      if (result !== null) {
        console.log(interpreter.stringify(result));
      }
    } catch (err) {
      if (err instanceof LexError || err instanceof ParseError || err instanceof RuntimeError) {
        console.log(err.message);
      } else {
        console.log(`Unexpected error: ${(err as Error).message}`);
      }
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('Goodbye!');
    process.exit(0);
  });
}

main();
