/**
 * Karel Programming Language - Lexer / Tokenizer
 * Supports Czech and English syntax, diacritics, case-insensitivity,
 * comments, and accurate line/column tracking.
 */

export const TokenType = {
  // Commands
  CMD_STEP: 'CMD_STEP',
  CMD_LEFT: 'CMD_LEFT',
  CMD_RIGHT: 'CMD_RIGHT',
  CMD_TURN_AROUND: 'CMD_TURN_AROUND',
  CMD_PUT: 'CMD_PUT',
  CMD_PICK: 'CMD_PICK',

  // Keywords
  KW_REPEAT: 'KW_REPEAT',
  KW_TIMES: 'KW_TIMES',
  KW_WHILE: 'KW_WHILE',
  KW_IF: 'KW_IF',
  KW_THEN: 'KW_THEN',
  KW_ELSE: 'KW_ELSE',
  KW_END: 'KW_END',
  KW_DEFINE: 'KW_DEFINE',
  KW_IS: 'KW_IS',
  KW_NOT: 'KW_NOT',

  // Condition Atoms
  COND_WALL: 'COND_WALL',           // ZED / WALL / FRONT_BLOCKED
  COND_CLEAR: 'COND_CLEAR',         // VOLNO / CLEAR / FRONT_CLEAR
  COND_BEEPER: 'COND_BEEPER',       // CIP / ZNACKA / BEEPER
  COND_BAG: 'COND_BAG',             // MA_CIP / BEEPER_IN_BAG
  COND_NORTH: 'COND_NORTH',         // SEVER / NORTH
  COND_SOUTH: 'COND_SOUTH',         // JIH / SOUTH
  COND_EAST: 'COND_EAST',           // VYCHOD / EAST
  COND_WEST: 'COND_WEST',           // ZAPAD / WEST

  // Literals & Identifiers
  NUMBER: 'NUMBER',
  IDENTIFIER: 'IDENTIFIER',

  // Delimiters (optional in classic Karel, supported for C/Python style)
  LPAREN: 'LPAREN',
  RPAREN: 'RPAREN',
  LBRACE: 'LBRACE',
  RBRACE: 'RBRACE',
  SEMICOLON: 'SEMICOLON',
  COLON: 'COLON',

  EOF: 'EOF',
};

export class Token {
  constructor(type, value, line, col, raw = value) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.col = col;
    this.raw = raw;
  }
}

/**
 * Remove diacritics and convert to uppercase for canonical matching.
 */
export function canonicalize(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[\-_]/g, '');
}

const KEYWORD_MAP = {
  // Commands - Czech & English
  'KROK': TokenType.CMD_STEP,
  'STEP': TokenType.CMD_STEP,
  'MOVE': TokenType.CMD_STEP,

  'VLEVOBOK': TokenType.CMD_LEFT,
  'VLEVO': TokenType.CMD_LEFT,
  'VLEVOVBOK': TokenType.CMD_LEFT,
  'LEFT': TokenType.CMD_LEFT,
  'TURNLEFT': TokenType.CMD_LEFT,

  'VPRAVOBOK': TokenType.CMD_RIGHT,
  'VPRAVO': TokenType.CMD_RIGHT,
  'VPRAVOVBOK': TokenType.CMD_RIGHT,
  'RIGHT': TokenType.CMD_RIGHT,
  'TURNRIGHT': TokenType.CMD_RIGHT,

  'CELEM_VZAD': TokenType.CMD_TURN_AROUND,
  'CELEMVZAD': TokenType.CMD_TURN_AROUND,
  'VZAD': TokenType.CMD_TURN_AROUND,
  'TURNAROUND': TokenType.CMD_TURN_AROUND,

  'POLOZ': TokenType.CMD_PUT,
  'PUT': TokenType.CMD_PUT,
  'PUTBEEPER': TokenType.CMD_PUT,

  'ZVEDNI': TokenType.CMD_PICK,
  'SEBER': TokenType.CMD_PICK,
  'PICK': TokenType.CMD_PICK,
  'PICKBEEPER': TokenType.CMD_PICK,

  // Control Flow
  'OPAKUJ': TokenType.KW_REPEAT,
  'REPEAT': TokenType.KW_REPEAT,

  'KRAT': TokenType.KW_TIMES,
  'TIMES': TokenType.KW_TIMES,

  'DOKUD': TokenType.KW_WHILE,
  'WHILE': TokenType.KW_WHILE,

  'KDYZ': TokenType.KW_IF,
  'IF': TokenType.KW_IF,

  'TAK': TokenType.KW_THEN,
  'PAK': TokenType.KW_THEN,
  'THEN': TokenType.KW_THEN,

  'JINAK': TokenType.KW_ELSE,
  'ELSE': TokenType.KW_ELSE,

  'KONEC': TokenType.KW_END,
  'END': TokenType.KW_END,
  'STOP': TokenType.KW_END,

  'PRIKAZ': TokenType.KW_DEFINE,
  'DEFINE': TokenType.KW_DEFINE,
  'FUNCTION': TokenType.KW_DEFINE,
  'PROCEDURE': TokenType.KW_DEFINE,
  'VOID': TokenType.KW_DEFINE,

  'JE': TokenType.KW_IS,
  'IS': TokenType.KW_IS,

  'NENI': TokenType.KW_NOT,
  'NOT': TokenType.KW_NOT,

  // Conditions
  'ZED': TokenType.COND_WALL,
  'WALL': TokenType.COND_WALL,
  'WALLAHEAD': TokenType.COND_WALL,
  'FRONTISBLOCKED': TokenType.COND_WALL,

  'VOLNO': TokenType.COND_CLEAR,
  'CLEAR': TokenType.COND_CLEAR,
  'FRONTISCLEAR': TokenType.COND_CLEAR,

  'CIP': TokenType.COND_BEEPER,
  'ZNACKA': TokenType.COND_BEEPER,
  'BEEPER': TokenType.COND_BEEPER,
  'BEEPERPRESENT': TokenType.COND_BEEPER,
  'BEEPERSPRESENT': TokenType.COND_BEEPER,

  'MACIP': TokenType.COND_BAG,
  'KAPSA': TokenType.COND_BAG,
  'BEEPERINBAG': TokenType.COND_BAG,
  'BEEPERSINBAG': TokenType.COND_BAG,

  'SEVER': TokenType.COND_NORTH,
  'NORTH': TokenType.COND_NORTH,
  'FACINGNORTH': TokenType.COND_NORTH,

  'JIH': TokenType.COND_SOUTH,
  'SOUTH': TokenType.COND_SOUTH,
  'FACINGSOUTH': TokenType.COND_SOUTH,

  'VYCHOD': TokenType.COND_EAST,
  'EAST': TokenType.COND_EAST,
  'FACINGEAST': TokenType.COND_EAST,

  'ZAPAD': TokenType.COND_WEST,
  'WEST': TokenType.COND_WEST,
  'FACINGWEST': TokenType.COND_WEST,
};

export class Lexer {
  constructor(source) {
    this.source = source || '';
    this.cursor = 0;
    this.line = 1;
    this.col = 1;
  }

  peek() {
    return this.source[this.cursor] || null;
  }

  peekNext() {
    return this.source[this.cursor + 1] || null;
  }

  advance() {
    const ch = this.source[this.cursor];
    this.cursor++;
    if (ch === '\n') {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    return ch;
  }

  tokenize() {
    const tokens = [];
    while (this.cursor < this.source.length) {
      const ch = this.peek();

      // Whitespace
      if (/\s/.test(ch)) {
        this.advance();
        continue;
      }

      // Single line comments: // or #
      if (ch === '#' || (ch === '/' && this.peekNext() === '/')) {
        while (this.cursor < this.source.length && this.peek() !== '\n') {
          this.advance();
        }
        continue;
      }

      // Multi-line comment: /* ... */
      if (ch === '/' && this.peekNext() === '*') {
        this.advance(); // /
        this.advance(); // *
        while (this.cursor < this.source.length) {
          if (this.peek() === '*' && this.peekNext() === '/') {
            this.advance(); // *
            this.advance(); // /
            break;
          }
          this.advance();
        }
        continue;
      }

      const startLine = this.line;
      const startCol = this.col;

      // Numbers (e.g. 5 or 10-krat)
      if (/[0-9]/.test(ch)) {
        let numStr = '';
        while (this.cursor < this.source.length && /[0-9]/.test(this.peek())) {
          numStr += this.advance();
        }
        tokens.push(new Token(TokenType.NUMBER, parseInt(numStr, 10), startLine, startCol, numStr));

        // In Czech Karel, users often write "5-KRAT" or "5KRAT"
        if (this.peek() === '-') {
          this.advance(); // skip dash
        }
        continue;
      }

      // Identifiers / Words (can contain letters, digits, dashes, underscores)
      if (/[a-zA-Z_\u00C0-\u024F]/.test(ch)) {
        let word = '';
        while (
          this.cursor < this.source.length &&
          /[a-zA-Z0-9_\-\u00C0-\u024F]/.test(this.peek())
        ) {
          // If dash is followed by a non-letter/digit, don't consume it
          if (this.peek() === '-') {
            const next = this.peekNext();
            if (!next || !/[a-zA-Z0-9_\u00C0-\u024F]/.test(next)) {
              break;
            }
          }
          word += this.advance();
        }

        const canon = canonicalize(word);
        if (KEYWORD_MAP[canon]) {
          tokens.push(new Token(KEYWORD_MAP[canon], word, startLine, startCol, word));
        } else {
          tokens.push(new Token(TokenType.IDENTIFIER, word, startLine, startCol, word));
        }
        continue;
      }

      // Delimiters and punctuation
      if (ch === '(') {
        this.advance();
        tokens.push(new Token(TokenType.LPAREN, '(', startLine, startCol));
        continue;
      }
      if (ch === ')') {
        this.advance();
        tokens.push(new Token(TokenType.RPAREN, ')', startLine, startCol));
        continue;
      }
      if (ch === '{') {
        this.advance();
        tokens.push(new Token(TokenType.LBRACE, '{', startLine, startCol));
        continue;
      }
      if (ch === '}') {
        this.advance();
        tokens.push(new Token(TokenType.RBRACE, '}', startLine, startCol));
        continue;
      }
      if (ch === ';') {
        this.advance();
        tokens.push(new Token(TokenType.SEMICOLON, ';', startLine, startCol));
        continue;
      }
      if (ch === ':') {
        this.advance();
        tokens.push(new Token(TokenType.COLON, ':', startLine, startCol));
        continue;
      }
      if (ch === '!') {
        this.advance();
        tokens.push(new Token(TokenType.KW_NOT, '!', startLine, startCol));
        continue;
      }

      // Unknown character
      throw new Error(`Neplatný znak / Unexpected character '${ch}' at line ${startLine}, col ${startCol}`);
    }

    tokens.push(new Token(TokenType.EOF, null, this.line, this.col, ''));
    return tokens;
  }
}
