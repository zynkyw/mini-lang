export type TokenType =
  // literals
  | 'NUMBER'
  | 'STRING'
  | 'IDENT'
  // keywords
  | 'LET'
  | 'FN'
  | 'IF'
  | 'ELSE'
  | 'WHILE'
  | 'RETURN'
  | 'TRUE'
  | 'FALSE'
  | 'NULL'
  | 'PRINT'
  | 'BREAK'
  | 'CONTINUE'
  // single/multi char symbols
  | 'PLUS'
  | 'MINUS'
  | 'STAR'
  | 'SLASH'
  | 'PERCENT'
  | 'EQ'
  | 'EQEQ'
  | 'BANG'
  | 'BANGEQ'
  | 'LT'
  | 'LE'
  | 'GT'
  | 'GE'
  | 'AND'
  | 'OR'
  | 'LPAREN'
  | 'RPAREN'
  | 'LBRACE'
  | 'RBRACE'
  | 'LBRACKET'
  | 'RBRACKET'
  | 'COMMA'
  | 'SEMICOLON'
  | 'EOF';

export interface Token {
  type: TokenType;
  lexeme: string;
  literal: number | string | null;
  line: number;
}

export const KEYWORDS: Record<string, TokenType> = {
  let: 'LET',
  fn: 'FN',
  if: 'IF',
  else: 'ELSE',
  while: 'WHILE',
  return: 'RETURN',
  true: 'TRUE',
  false: 'FALSE',
  null: 'NULL',
  print: 'PRINT',
  break: 'BREAK',
  continue: 'CONTINUE',
};
