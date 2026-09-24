#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import { run } from './index';

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: mini-lang <file.lang>');
    console.log('       mini-lang repl        (start the interactive REPL)');
    process.exit(1);
  }

  if (args[0] === 'repl') {
    require('./repl');
    return;
  }

  const filePath = path.resolve(process.cwd(), args[0]);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const source = fs.readFileSync(filePath, 'utf-8');
  const success = run(source);
  process.exit(success ? 0 : 1);
}

main();
