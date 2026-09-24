# mini-lang

A small interpreted programming language, built from scratch in TypeScript:
hand-written **lexer**, recursive-descent **parser**, an **AST**, a
tree-walking **interpreter**, and an interactive **REPL**. No parser
generators, no external runtime dependencies — just ~1,500 lines of
readable TypeScript you can step through with a debugger.

```
let x = "world";
print "Hello, " + x + "!";
```

## Features

- Variables (`let`), assignment, and block scoping
- Numbers, strings, booleans, `null`, and arrays
- Arithmetic (`+ - * / %`), comparison, equality, and logical (`&& || !`)
  operators, with short-circuit evaluation
- `if` / `else`, `while`, `break`, `continue`
- First-class functions and **closures** (`fn`), including recursion and
  higher-order functions
- Array literals, indexing (`arr[0]`), and a handful of built-ins:
  `print`, `len`, `str`, `num`, `push`, `range`
- Line/block comments (`//` and `/* ... */`, block comments nest)
- Clear, line-numbered error messages for lex, parse, and runtime errors
- A REPL and a file runner, plus a small public API for embedding the
  interpreter in other TypeScript/JavaScript projects

## Project layout

```
mini-lang/
├── src/
│   ├── tokens.ts              token types + keyword table
│   ├── lexer.ts                source text -> tokens
│   ├── ast.ts                  AST node definitions
│   ├── parser.ts                tokens -> AST (recursive descent)
│   ├── environment.ts           lexical scopes (variable storage)
│   ├── interpreter-types.ts     shared runtime value types
│   ├── interpreter.ts           AST -> program behaviour (tree-walking)
│   ├── repl.ts                  interactive REPL
│   ├── cli.ts                   `mini-lang <file>` runner
│   └── index.ts                 public API (`run`, plus all the classes)
├── tests/                      Jest unit tests for each stage of the pipeline
├── examples/                   sample .lang programs
├── package.json
└── tsconfig.json
```

## Getting started

```bash
npm install
npm run build      # compiles src/ -> dist/
npm test           # runs the Jest test suite
```

Run one of the example programs:

```bash
npx ts-node src/cli.ts examples/fib.lang
npx ts-node src/cli.ts examples/fizzbuzz.lang
```

Or start the REPL:

```bash
npm run repl
```

```
mini-lang> let x = 21;
mini-lang> x * 2
42
```

After `npm run build`, you can also run the compiled CLI directly:

```bash
node dist/cli.js examples/hello.lang
```

## Language tour

```
// variables
let name = "Ada";
let age = 30;

// arithmetic & strings
print "next year " + name + " will be " + str(age + 1);

// control flow
if (age >= 18) {
  print "adult";
} else {
  print "minor";
}

let i = 0;
while (i < 3) {
  print i;
  i = i + 1;
}

// functions & recursion
fn fib(n) {
  if (n < 2) { return n; }
  return fib(n - 1) + fib(n - 2);
}
print fib(10);

// closures
fn make_counter() {
  let count = 0;
  fn increment() {
    count = count + 1;
    return count;
  }
  return increment;
}
let counter = make_counter();
print counter(); // 1
print counter(); // 2

// arrays
let nums = [1, 2, 3];
print nums[0];
print len(nums);
print push(nums, 4); // [1, 2, 3, 4]
```

See `examples/` for more (`hello.lang`, `fib.lang`, `fizzbuzz.lang`).

## Using it as a library

```ts
import { run } from './src/index';

run(`
  let x = 2 + 2;
  print x;
`);
```

Or drive the pipeline stage by stage for more control (e.g. to capture
output instead of printing to the console):

```ts
import { Lexer } from './src/lexer';
import { Parser } from './src/parser';
import { Interpreter } from './src/interpreter';

const tokens = new Lexer(source).tokenize();
const ast = new Parser(tokens).parse();
const interpreter = new Interpreter({ output: (line) => myLog.push(line) });
interpreter.run(ast);
```

## Known limitations / ideas for extension

This project favors a clear, readable implementation over completeness.
Contributions or forks are welcome — some natural next steps:

- Index assignment (`arr[0] = 5`) and object/map literals
- `for` loops and `else if` sugar
- Static/lexical error checks before execution (e.g. resolving variables
  ahead of time, à la Crafting Interpreters' `Resolver`)
- A bytecode VM instead of tree-walking, for performance
- String methods and more built-ins (`split`, `join`, `map`, `filter`)

## Pushing this to GitHub

```bash
cd mini-lang
git init
git add .
git commit -m "Initial commit: mini-lang interpreter"
git branch -M main
git remote add origin https://github.com/<your-username>/mini-lang.git
git push -u origin main
```

## License

MIT
