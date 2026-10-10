/**
 * Karel the Robot - Standalone Web Bundle (Pure Vanilla JavaScript)
 * Zero external dependencies. Works on file:/// and http:// protocols.
 */
(function () {
  'use strict';

/* --- File: ast.js --- */
/**
 * Karel Programming Language - AST Node Definitions
 */

class ASTNode {
  constructor(type, loc = { line: 1, col: 1 }) {
    this.type = type;
    this.loc = loc;
  }
}

class ProgramNode extends ASTNode {
  constructor(body = [], procedures = new Map(), loc) {
    super('Program', loc);
    this.body = body; // Array of statement nodes
    this.procedures = procedures; // Map of name -> ProcedureDefNode
  }
}

class ProcedureDefNode extends ASTNode {
  constructor(name, body = [], loc) {
    super('ProcedureDef', loc);
    this.name = name;
    this.body = body;
  }
}

class CallNode extends ASTNode {
  constructor(name, loc) {
    super('Call', loc);
    this.name = name;
  }
}

class CommandNode extends ASTNode {
  /**
   * Primitive commands:
   * 'STEP', 'LEFT', 'RIGHT', 'TURN_AROUND', 'PUT', 'PICK'
   */
  constructor(action, loc) {
    super('Command', loc);
    this.action = action;
  }
}

class RepeatNode extends ASTNode {
  constructor(count, body = [], loc) {
    super('Repeat', loc);
    this.count = count;
    this.body = body;
  }
}

class WhileNode extends ASTNode {
  constructor(condition, body = [], loc) {
    super('While', loc);
    this.condition = condition;
    this.body = body;
  }
}

class IfNode extends ASTNode {
  constructor(condition, thenBody = [], elseBody = [], loc) {
    super('If', loc);
    this.condition = condition;
    this.thenBody = thenBody;
    this.elseBody = elseBody;
  }
}

class ConditionNode extends ASTNode {
  /**
   * Conditions:
   * 'WALL_AHEAD', 'BEEPER', 'BEEPER_IN_BAG',
   * 'FACING_NORTH', 'FACING_SOUTH', 'FACING_EAST', 'FACING_WEST'
   * inverted: boolean (e.g., NENI ZED / NOT WALL_AHEAD)
   */
  constructor(test, inverted = false, loc) {
    super('Condition', loc);
    this.test = test;
    this.inverted = inverted;
  }
}


/* --- File: lexer.js --- */
/**
 * Karel Programming Language - Lexer / Tokenizer
 * Supports Czech and English syntax, diacritics, case-insensitivity,
 * comments, and accurate line/column tracking.
 */

const TokenType = {
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

class Token {
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
function canonicalize(str) {
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

class Lexer {
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


/* --- File: world.js --- */
/**
 * Karel Programming Language - World State Model
 * Manages grid, walls, beepers, Karel position, history, and validations.
 */

const Direction = {
  NORTH: 'NORTH',
  EAST: 'EAST',
  SOUTH: 'SOUTH',
  WEST: 'WEST',
};

const TurnLeftMap = {
  [Direction.NORTH]: Direction.WEST,
  [Direction.WEST]: Direction.SOUTH,
  [Direction.SOUTH]: Direction.EAST,
  [Direction.EAST]: Direction.NORTH,
};

const TurnRightMap = {
  [Direction.NORTH]: Direction.EAST,
  [Direction.EAST]: Direction.SOUTH,
  [Direction.SOUTH]: Direction.WEST,
  [Direction.WEST]: Direction.NORTH,
};

const TurnAroundMap = {
  [Direction.NORTH]: Direction.SOUTH,
  [Direction.SOUTH]: Direction.NORTH,
  [Direction.EAST]: Direction.WEST,
  [Direction.WEST]: Direction.EAST,
};

class KarelWorld {
  constructor(width = 10, height = 10) {
    this.width = Math.max(3, Math.min(50, width));
    this.height = Math.max(3, Math.min(50, height));

    // Karel initial state
    this.karel = {
      x: 1,
      y: 1,
      dir: Direction.EAST,
      bag: Infinity, // or integer
    };

    // Walls sets:
    // Vertical wall on east edge of (x, y): "v:x:y"
    // Horizontal wall on north edge of (x, y): "h:x:y"
    this.verticalWalls = new Set();
    this.horizontalWalls = new Set();

    // Beepers: key "x,y" => count
    this.beepers = new Map();

    // Saved initial snapshot for reset
    this.initialSnapshot = null;
    this.saveInitialSnapshot();
  }

  saveInitialSnapshot() {
    this.initialSnapshot = this.serialize();
  }

  restoreInitialSnapshot() {
    if (this.initialSnapshot) {
      this.deserialize(this.initialSnapshot);
    }
  }

  serialize() {
    return {
      width: this.width,
      height: this.height,
      karel: { ...this.karel },
      verticalWalls: Array.from(this.verticalWalls),
      horizontalWalls: Array.from(this.horizontalWalls),
      beepers: Array.from(this.beepers.entries()),
    };
  }

  deserialize(data) {
    this.width = data.width || 10;
    this.height = data.height || 10;
    this.karel = {
      x: data.karel?.x ?? 1,
      y: data.karel?.y ?? 1,
      dir: data.karel?.dir || Direction.EAST,
      bag: data.karel?.bag ?? Infinity,
    };
    this.verticalWalls = new Set(data.verticalWalls || []);
    this.horizontalWalls = new Set(data.horizontalWalls || []);
    this.beepers = new Map(data.beepers || []);
  }

  resize(newWidth, newHeight) {
    const w = Math.max(3, Math.min(50, newWidth));
    const h = Math.max(3, Math.min(50, newHeight));
    this.width = w;
    this.height = h;

    // Constrain Karel inside bounds
    this.karel.x = Math.max(1, Math.min(w, this.karel.x));
    this.karel.y = Math.max(1, Math.min(h, this.karel.y));

    // Prune walls outside bounds
    for (const vKey of Array.from(this.verticalWalls)) {
      const [, x, y] = vKey.split(':').map(Number);
      if (x >= w || y > h) this.verticalWalls.delete(vKey);
    }
    for (const hKey of Array.from(this.horizontalWalls)) {
      const [, x, y] = hKey.split(':').map(Number);
      if (x > w || y >= h) this.horizontalWalls.delete(hKey);
    }

    // Prune beepers outside bounds
    for (const bKey of Array.from(this.beepers.keys())) {
      const [x, y] = bKey.split(',').map(Number);
      if (x > w || y > h) this.beepers.delete(bKey);
    }

    this.saveInitialSnapshot();
  }

  clear() {
    this.verticalWalls.clear();
    this.horizontalWalls.clear();
    this.beepers.clear();
    this.karel = {
      x: 1,
      y: 1,
      dir: Direction.EAST,
      bag: Infinity,
    };
    this.saveInitialSnapshot();
  }

  // --- Wall Management ---

  hasWall(x, y, dir) {
    if (dir === Direction.NORTH) {
      if (y >= this.height) return true;
      return this.horizontalWalls.has(`h:${x}:${y}`);
    }
    if (dir === Direction.SOUTH) {
      if (y <= 1) return true;
      return this.horizontalWalls.has(`h:${x}:${y - 1}`);
    }
    if (dir === Direction.EAST) {
      if (x >= this.width) return true;
      return this.verticalWalls.has(`v:${x}:${y}`);
    }
    if (dir === Direction.WEST) {
      if (x <= 1) return true;
      return this.verticalWalls.has(`v:${x - 1}:${y}`);
    }
    return false;
  }

  toggleVerticalWall(x, y) {
    if (x < 1 || x >= this.width || y < 1 || y > this.height) return;
    const key = `v:${x}:${y}`;
    if (this.verticalWalls.has(key)) {
      this.verticalWalls.delete(key);
    } else {
      this.verticalWalls.add(key);
    }
  }

  toggleHorizontalWall(x, y) {
    if (x < 1 || x > this.width || y < 1 || y >= this.height) return;
    const key = `h:${x}:${y}`;
    if (this.horizontalWalls.has(key)) {
      this.horizontalWalls.delete(key);
    } else {
      this.horizontalWalls.add(key);
    }
  }

  // --- Beeper Management ---

  getBeepers(x, y) {
    return this.beepers.get(`${x},${y}`) || 0;
  }

  setBeepers(x, y, count) {
    const key = `${x},${y}`;
    if (count <= 0) {
      this.beepers.delete(key);
    } else {
      this.beepers.set(key, count);
    }
  }

  addBeeper(x, y, delta = 1) {
    const cur = this.getBeepers(x, y);
    const updated = Math.max(0, cur + delta);
    this.setBeepers(x, y, updated);
  }

  // --- Karel Actions ---

  step() {
    if (this.hasWall(this.karel.x, this.karel.y, this.karel.dir)) {
      throw new Error(
        `Karel narazil do zdi na souřadnicích [${this.karel.x}, ${this.karel.y}] směrem na ${this.karel.dir}! / Karel crashed into a wall!`
      );
    }

    switch (this.karel.dir) {
      case Direction.NORTH:
        this.karel.y++;
        break;
      case Direction.EAST:
        this.karel.x++;
        break;
      case Direction.SOUTH:
        this.karel.y--;
        break;
      case Direction.WEST:
        this.karel.x--;
        break;
    }
  }

  turnLeft() {
    this.karel.dir = TurnLeftMap[this.karel.dir];
  }

  turnRight() {
    this.karel.dir = TurnRightMap[this.karel.dir];
  }

  turnAround() {
    this.karel.dir = TurnAroundMap[this.karel.dir];
  }

  pickBeeper() {
    const count = this.getBeepers(this.karel.x, this.karel.y);
    if (count <= 0) {
      throw new Error(
        `Na pozici [${this.karel.x}, ${this.karel.y}] není žádná značka/čip k sebrání! / No beeper to pick!`
      );
    }
    this.setBeepers(this.karel.x, this.karel.y, count - 1);
    if (this.karel.bag !== Infinity) {
      this.karel.bag++;
    }
  }

  putBeeper() {
    if (this.karel.bag !== Infinity && this.karel.bag <= 0) {
      throw new Error(
        `Karel nemá v kapse žádné značky/čipy! / No beepers in bag!`
      );
    }
    this.addBeeper(this.karel.x, this.karel.y, 1);
    if (this.karel.bag !== Infinity) {
      this.karel.bag--;
    }
  }

  // --- Sensor Conditions ---

  frontIsClear() {
    return !this.hasWall(this.karel.x, this.karel.y, this.karel.dir);
  }

  beepersPresent() {
    return this.getBeepers(this.karel.x, this.karel.y) > 0;
  }

  beepersInBag() {
    return this.karel.bag === Infinity || this.karel.bag > 0;
  }

  facingNorth() {
    return this.karel.dir === Direction.NORTH;
  }

  facingSouth() {
    return this.karel.dir === Direction.SOUTH;
  }

  facingEast() {
    return this.karel.dir === Direction.EAST;
  }

  facingWest() {
    return this.karel.dir === Direction.WEST;
  }

  evalCondition(test, inverted = false) {
    let result = false;
    switch (test) {
      case 'WALL_AHEAD':
        result = !this.frontIsClear();
        break;
      case 'BEEPER':
        result = this.beepersPresent();
        break;
      case 'BEEPER_IN_BAG':
        result = this.beepersInBag();
        break;
      case 'FACING_NORTH':
        result = this.facingNorth();
        break;
      case 'FACING_SOUTH':
        result = this.facingSouth();
        break;
      case 'FACING_EAST':
        result = this.facingEast();
        break;
      case 'FACING_WEST':
        result = this.facingWest();
        break;
      default:
        throw new Error(`Neznámá podmínka / Unknown condition: ${test}`);
    }
    return inverted ? !result : result;
  }
}


/* --- File: parser.js --- */
/**
 * Karel Programming Language - Parser
 * Recursive descent parser generating an AST.
 */



class Parser {
  constructor(tokens) {
    this.tokens = tokens || [];
    this.pos = 0;
  }

  peek() {
    return this.tokens[this.pos] || { type: TokenType.EOF, line: 0, col: 0 };
  }

  peekType() {
    return this.peek().type;
  }

  isAtEnd() {
    return this.peekType() === TokenType.EOF;
  }

  advance() {
    if (!this.isAtEnd()) {
      this.pos++;
    }
    return this.tokens[this.pos - 1];
  }

  match(...types) {
    for (const t of types) {
      if (this.check(t)) {
        return this.advance();
      }
    }
    return null;
  }

  check(type) {
    if (this.isAtEnd()) return false;
    return this.peekType() === type;
  }

  consume(type, errorMsg) {
    if (this.check(type)) {
      return this.advance();
    }
    const token = this.peek();
    throw new Error(`${errorMsg} (řádek ${token.line}, sloupec ${token.col})`);
  }

  // Skip optional punctuation like ';' or ':'
  skipPunctuation() {
    while (this.check(TokenType.SEMICOLON) || this.check(TokenType.COLON)) {
      this.advance();
    }
  }

  /**
   * Parse complete program:
   * Consists of procedure definitions and main execution statements.
   */
  parse() {
    const procedures = new Map();
    const body = [];
    const loc = { line: this.peek().line, col: this.peek().col };

    while (!this.isAtEnd()) {
      this.skipPunctuation();
      if (this.isAtEnd()) break;

      if (this.check(TokenType.KW_DEFINE)) {
        const proc = this.parseProcedure();
        const normName = canonicalize(proc.name);
        if (procedures.has(normName)) {
          throw new Error(
            `Příkaz '${proc.name}' je již definován / Procedure '${proc.name}' is already defined (řádek ${proc.loc.line})`
          );
        }
        procedures.set(normName, proc);
      } else {
        const stmt = this.parseStatement();
        if (stmt) {
          body.push(stmt);
        }
      }
    }

    return new ProgramNode(body, procedures, loc);
  }

  /**
   * Parse procedure definition:
   * PRIKAZ <NAME> ... KONEC
   * or DEFINE <NAME>() { ... }
   */
  parseProcedure() {
    const defToken = this.advance(); // consume KW_DEFINE
    const token = this.peek();
    let name;
    if (token.type === TokenType.IDENTIFIER || token.type.startsWith('CMD_')) {
      name = this.advance().value;
    } else {
      throw new Error(
        `Očekáván název příkazu / Expected procedure name (řádek ${token.line}, sloupec ${token.col})`
      );
    }
    const loc = { line: defToken.line, col: defToken.col };

    // Optional ()
    if (this.match(TokenType.LPAREN)) {
      this.consume(TokenType.RPAREN, "Očekávána ')' za parametry / Expected ')'");
    }

    // Optional colon or '{'
    const hasBrace = this.match(TokenType.LBRACE);
    this.skipPunctuation();

    const body = this.parseStatementBlock(hasBrace ? 'BRACE' : 'END');

    return new ProcedureDefNode(name, body, loc);
  }

  /**
   * Parse block of statements until matching END or '}'
   * If stopMode is 'END', stops at KW_END.
   * If stopMode is 'BRACE', stops at RBRACE.
   * If stopMode is 'ELSE_OR_END', stops at KW_ELSE or KW_END or RBRACE.
   */
  parseStatementBlock(stopMode = 'END') {
    const statements = [];

    while (!this.isAtEnd()) {
      this.skipPunctuation();
      if (this.isAtEnd()) break;

      if (stopMode === 'BRACE' && this.check(TokenType.RBRACE)) {
        this.advance(); // consume '}'
        return statements;
      }

      if ((stopMode === 'END' || stopMode === 'ELSE_OR_END') && this.check(TokenType.KW_END)) {
        this.advance(); // consume END/KONEC
        // Optional name after END in some classic Karel dialects: KONEC <NAME>
        if (this.check(TokenType.IDENTIFIER)) {
          this.advance();
        }
        return statements;
      }

      if (stopMode === 'ELSE_OR_END' && this.check(TokenType.KW_ELSE)) {
        return statements; // Handled by parseIf
      }

      const stmt = this.parseStatement();
      if (stmt) {
        statements.push(stmt);
      }
    }

    if (stopMode === 'BRACE') {
      throw new Error(`Chybí uzavírací složená závorka '}' / Missing '}' at line ${this.peek().line}`);
    }
    if (stopMode === 'END' || stopMode === 'ELSE_OR_END') {
      throw new Error(`Chybí ukončení bloku 'KONEC' / Missing 'END' at line ${this.peek().line}`);
    }

    return statements;
  }

  parseStatement() {
    this.skipPunctuation();
    if (this.isAtEnd()) return null;

    const token = this.peek();
    const loc = { line: token.line, col: token.col };

    // Repeat loop
    if (this.match(TokenType.KW_REPEAT)) {
      return this.parseRepeat(loc);
    }

    // While loop
    if (this.match(TokenType.KW_WHILE)) {
      return this.parseWhile(loc);
    }

    // If condition
    if (this.match(TokenType.KW_IF)) {
      return this.parseIf(loc);
    }

    // Primitive commands
    if (this.check(TokenType.CMD_STEP)) {
      this.advance();
      this.consumeOptionalParens();
      return new CommandNode('STEP', loc);
    }
    if (this.check(TokenType.CMD_LEFT)) {
      this.advance();
      this.consumeOptionalParens();
      return new CommandNode('LEFT', loc);
    }
    if (this.check(TokenType.CMD_RIGHT)) {
      this.advance();
      this.consumeOptionalParens();
      return new CommandNode('RIGHT', loc);
    }
    if (this.check(TokenType.CMD_TURN_AROUND)) {
      this.advance();
      this.consumeOptionalParens();
      return new CommandNode('TURN_AROUND', loc);
    }
    if (this.check(TokenType.CMD_PUT)) {
      this.advance();
      this.consumeOptionalParens();
      return new CommandNode('PUT', loc);
    }
    if (this.check(TokenType.CMD_PICK)) {
      this.advance();
      this.consumeOptionalParens();
      return new CommandNode('PICK', loc);
    }

    // User defined procedure call
    if (this.check(TokenType.IDENTIFIER)) {
      const idToken = this.advance();
      this.consumeOptionalParens();
      return new CallNode(idToken.value, loc);
    }

    // If unexpected token:
    throw new Error(
      `Neočekávaný příkaz '${token.raw || token.type}' na řádku ${token.line}, sloupci ${token.col}`
    );
  }

  consumeOptionalParens() {
    if (this.match(TokenType.LPAREN)) {
      this.consume(TokenType.RPAREN, "Očekávána ')' / Expected ')'");
    }
  }

  /**
   * OPAKUJ <n> [KRAT] ... KONEC
   * or REPEAT <n> [TIMES] ... END
   * or REPEAT (n) { ... }
   */
  parseRepeat(loc) {
    let count;
    if (this.match(TokenType.LPAREN)) {
      const numToken = this.consume(TokenType.NUMBER, "Očekáváno číslo počtu opakování / Expected number");
      this.consume(TokenType.RPAREN, "Očekávána ')' za číslem / Expected ')'");
      count = numToken.value;
    } else {
      const numToken = this.consume(
        TokenType.NUMBER,
        "Očekáváno číslo počtu opakování za OPAKUJ / Expected repeat count number"
      );
      count = numToken.value;
    }

    // Optional KRAT / TIMES
    this.match(TokenType.KW_TIMES);

    // Optional brace or colon
    const hasBrace = this.match(TokenType.LBRACE);
    this.skipPunctuation();

    const body = this.parseStatementBlock(hasBrace ? 'BRACE' : 'END');
    return new RepeatNode(count, body, loc);
  }

  /**
   * DOKUD [JE/NENI] <podminka> ... KONEC
   * or WHILE [NOT] <condition> ... END
   * or WHILE (condition) { ... }
   */
  parseWhile(loc) {
    let hasParen = this.match(TokenType.LPAREN);
    const condition = this.parseCondition();
    if (hasParen) {
      this.consume(TokenType.RPAREN, "Očekávána ')' za podmínkou / Expected ')'");
    }

    const hasBrace = this.match(TokenType.LBRACE);
    this.skipPunctuation();

    const body = this.parseStatementBlock(hasBrace ? 'BRACE' : 'END');
    return new WhileNode(condition, body, loc);
  }

  /**
   * KDYZ [JE/NENI] <podminka> [TAK] ... [JINAK ...] KONEC
   * or IF [NOT] <condition> ... [ELSE ...] END
   */
  parseIf(loc) {
    let hasParen = this.match(TokenType.LPAREN);
    const condition = this.parseCondition();
    if (hasParen) {
      this.consume(TokenType.RPAREN, "Očekávána ')' za podmínkou / Expected ')'");
    }

    // Optional TAK / THEN
    this.match(TokenType.KW_THEN);

    const hasBrace = this.match(TokenType.LBRACE);
    this.skipPunctuation();

    const thenBody = this.parseStatementBlock(hasBrace ? 'BRACE' : 'ELSE_OR_END');
    let elseBody = [];

    if (!hasBrace && this.check(TokenType.KW_ELSE)) {
      this.advance(); // consume JINAK/ELSE
      this.skipPunctuation();
      elseBody = this.parseStatementBlock('END');
    } else if (hasBrace && this.match(TokenType.KW_ELSE)) {
      const hasElseBrace = this.consume(TokenType.LBRACE, "Očekávána '{' za ELSE / Expected '{' after ELSE");
      elseBody = this.parseStatementBlock('BRACE');
    }

    return new IfNode(condition, thenBody, elseBody, loc);
  }

  /**
   * Parse condition:
   * [JE / IS] [NENI / NOT / !] <atom>
   * atoms: ZED, VOLNO, CIP, KAPSA / MA_CIP, SEVER, JIH, VYCHOD, ZAPAD
   */
  parseCondition() {
    const loc = { line: this.peek().line, col: this.peek().col };
    let inverted = false;

    // Optional 'JE' / 'IS'
    this.match(TokenType.KW_IS);

    // Check negation: 'NENI' or 'NOT' or '!'
    if (this.match(TokenType.KW_NOT)) {
      inverted = true;
    }

    // Optional 'JE' again (some write 'NENI' without 'JE', or 'NENI ZED')
    this.match(TokenType.KW_IS);

    const condToken = this.advance();
    let test;

    switch (condToken.type) {
      case TokenType.COND_WALL:
        test = 'WALL_AHEAD';
        break;
      case TokenType.COND_CLEAR:
        // VOLNO is NOT WALL_AHEAD
        test = 'WALL_AHEAD';
        inverted = !inverted;
        break;
      case TokenType.COND_BEEPER:
        test = 'BEEPER';
        break;
      case TokenType.COND_BAG:
        test = 'BEEPER_IN_BAG';
        break;
      case TokenType.COND_NORTH:
        test = 'FACING_NORTH';
        break;
      case TokenType.COND_SOUTH:
        test = 'FACING_SOUTH';
        break;
      case TokenType.COND_EAST:
        test = 'FACING_EAST';
        break;
      case TokenType.COND_WEST:
        test = 'FACING_WEST';
        break;
      default:
        throw new Error(
          `Neplatná podmínka '${condToken.raw || condToken.type}' na řádku ${condToken.line}, sloupci ${condToken.col}. Platné podmínky: ZEĎ, VOLNO, ČIP, KAPSA, SEVER, JIH, VÝCHOD, ZÁPAD.`
        );
    }

    // Optional () on condition function
    if (this.match(TokenType.LPAREN)) {
      this.consume(TokenType.RPAREN, "Očekávána ')' za podmínkou / Expected ')'");
    }

    return new ConditionNode(test, inverted, loc);
  }
}


/* --- File: audio.js --- */
/**
 * Karel Programming Language - Retro Sound Effects
 * Web Audio API synthesized 8-bit audio effects. Zero external asset dependencies.
 */

class KarelAudio {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('karel_sound_muted') === 'true';
  }

  ensureContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('karel_sound_muted', this.muted);
    return this.muted;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    localStorage.setItem('karel_sound_muted', this.muted);
  }

  isMuted() {
    return this.muted;
  }

  playStep() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.05);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.05);
  }

  playTurn() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.setValueAtTime(360, t + 0.03);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.07);
  }

  playPut() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.1);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  playPick() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.exponentialRampToValueAtTime(760, t + 0.12);

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  playCrash() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.18;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  playVictory() {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.16);
    });
  }
}


/* --- File: renderer.js --- */
/**
 * Karel Programming Language - Canvas 2D World Renderer
 * High-DPI canvas rendering with smooth animations, grid coordinates,
 * walls, beepers, and stylized robot character.
 */


class KarelRenderer {
  constructor(canvas, world) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;

    // Visual theme
    this.colors = {
      bg: '#181b20',
      gridLines: '#282f3a',
      gridDots: '#3b4554',
      axisText: '#7e8b9b',
      borderWall: '#4f5d73',
      wall: '#f59e0b',           // Warm amber for prominent walls
      wallShadow: '#78350f',
      beeperBg: '#06b6d4',       // Vibrant cyan diamond
      beeperText: '#0f172a',
      beeperMultiBg: '#ec4899',  // Magenta/pink badge for multi-beepers
      robotBody: '#3b82f6',      // Blue robot body
      robotAccent: '#60a5fa',
      robotEye: '#22c55e',       // Glowing green eye visor
      robotAntenna: '#ef4444',
      robotTread: '#1e293b',
      selection: 'rgba(59, 130, 246, 0.25)',
    };

    // Animation state
    this.anim = {
      curX: world.karel.x,
      curY: world.karel.y,
      curAngle: this.dirToAngle(world.karel.dir),
      targetX: world.karel.x,
      targetY: world.karel.y,
      targetAngle: this.dirToAngle(world.karel.dir),
      isAnimating: false,
    };

    // Layout metrics (computed during render)
    this.metrics = {
      marginLeft: 32,
      marginBottom: 30,
      marginRight: 16,
      marginTop: 16,
      cellSize: 40,
      gridWidth: 400,
      gridHeight: 400,
    };

    this.rafId = null;
    this.lastFrameTime = performance.now();

    // Bind resize
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.canvas.parentElement || this.canvas);

    this.startAnimLoop();
  }

  dirToAngle(dir) {
    switch (dir) {
      case Direction.EAST:
        return 0;
      case Direction.SOUTH:
        return Math.PI / 2;
      case Direction.WEST:
        return Math.PI;
      case Direction.NORTH:
        return -Math.PI / 2;
      default:
        return 0;
    }
  }

  handleResize() {
    const parent = this.canvas.parentElement;
    const width = parent ? parent.clientWidth : this.canvas.clientWidth;
    const height = parent ? parent.clientHeight : this.canvas.clientHeight;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(300, Math.floor(width * dpr));
    this.canvas.height = Math.max(300, Math.floor(height * dpr));

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.render();
  }

  syncRobotImmediate() {
    this.anim.curX = this.world.karel.x;
    this.anim.curY = this.world.karel.y;
    this.anim.targetX = this.world.karel.x;
    this.anim.targetY = this.world.karel.y;
    this.anim.curAngle = this.dirToAngle(this.world.karel.dir);
    this.anim.targetAngle = this.anim.curAngle;
    this.render();
  }

  animateToKarel() {
    this.anim.targetX = this.world.karel.x;
    this.anim.targetY = this.world.karel.y;

    const targetA = this.dirToAngle(this.world.karel.dir);
    let diff = (targetA - this.anim.curAngle) % (2 * Math.PI);
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;
    this.anim.targetAngle = this.anim.curAngle + diff;
    this.anim.isAnimating = true;
  }

  startAnimLoop() {
    const loop = (time) => {
      const dt = (time - this.lastFrameTime) / 1000;
      this.lastFrameTime = time;

      if (this.anim.isAnimating) {
        const speed = 14; // interpolation factor
        const dx = this.anim.targetX - this.anim.curX;
        const dy = this.anim.targetY - this.anim.curY;
        const da = this.anim.targetAngle - this.anim.curAngle;

        this.anim.curX += dx * Math.min(1, dt * speed);
        this.anim.curY += dy * Math.min(1, dt * speed);
        this.anim.curAngle += da * Math.min(1, dt * speed);

        if (Math.abs(dx) < 0.005 && Math.abs(dy) < 0.005 && Math.abs(da) < 0.005) {
          this.anim.curX = this.anim.targetX;
          this.anim.curY = this.anim.targetY;
          this.anim.curAngle = this.anim.targetAngle;
          this.anim.isAnimating = false;
        }
        this.render();
      }

      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
  }

  computeLayout() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    const availW = w - (this.metrics.marginLeft + this.metrics.marginRight);
    const availH = h - (this.metrics.marginTop + this.metrics.marginBottom);

    const sizeW = Math.floor(availW / this.world.width);
    const sizeH = Math.floor(availH / this.world.height);
    this.metrics.cellSize = Math.max(16, Math.min(64, Math.min(sizeW, sizeH)));

    this.metrics.gridWidth = this.metrics.cellSize * this.world.width;
    this.metrics.gridHeight = this.metrics.cellSize * this.world.height;

    // Center grid in available area
    this.metrics.offsetX = Math.floor(
      this.metrics.marginLeft + (availW - this.metrics.gridWidth) / 2
    );
    this.metrics.offsetY = Math.floor(
      this.metrics.marginTop + (availH - this.metrics.gridHeight) / 2
    );
  }

  // Convert world coordinates (x: 1..W, y: 1..H) to canvas center pixel
  worldToPixel(wx, wy) {
    const { offsetX, offsetY, cellSize, gridHeight } = this.metrics;
    const px = offsetX + (wx - 0.5) * cellSize;
    // Y is inverted (1 is at bottom)
    const py = offsetY + gridHeight - (wy - 0.5) * cellSize;
    return { px, py };
  }

  // Convert canvas pixel to world coordinates
  pixelToWorld(px, py) {
    const { offsetX, offsetY, cellSize, gridHeight } = this.metrics;
    const wx = (px - offsetX) / cellSize + 0.5;
    const wy = (offsetY + gridHeight - py) / cellSize + 0.5;
    return { wx, wy };
  }

  render() {
    const dpr = window.devicePixelRatio || 1;
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(dpr, dpr);

    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    // Clear background
    ctx.fillStyle = this.colors.bg;
    ctx.fillRect(0, 0, w, h);

    this.computeLayout();

    // Draw Grid & Axes
    this.drawGridAndAxes();

    // Draw Beepers
    this.drawBeepers();

    // Draw Walls
    this.drawWalls();

    // Draw Karel Robot
    this.drawRobot();

    ctx.restore();
  }

  drawGridAndAxes() {
    const ctx = this.ctx;
    const { offsetX, offsetY, cellSize, gridWidth, gridHeight } = this.metrics;
    const { width, height } = this.world;

    ctx.save();

    // Axis Labels font
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.colors.axisText;

    // Horizontal X-axis labels (bottom)
    for (let x = 1; x <= width; x++) {
      const px = offsetX + (x - 0.5) * cellSize;
      const py = offsetY + gridHeight + 16;
      ctx.fillText(String(x), px, py);
    }

    // Vertical Y-axis labels (left)
    ctx.textAlign = 'right';
    for (let y = 1; y <= height; y++) {
      const px = offsetX - 10;
      const py = offsetY + gridHeight - (y - 0.5) * cellSize;
      ctx.fillText(String(y), px, py);
    }

    // Grid inner lines
    ctx.strokeStyle = this.colors.gridLines;
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let x = 0; x <= width; x++) {
      const px = offsetX + x * cellSize;
      ctx.moveTo(px, offsetY);
      ctx.lineTo(px, offsetY + gridHeight);
    }
    for (let y = 0; y <= height; y++) {
      const py = offsetY + y * cellSize;
      ctx.moveTo(offsetX, py);
      ctx.lineTo(offsetX + gridWidth, py);
    }
    ctx.stroke();

    // Corner intersection dots
    ctx.fillStyle = this.colors.gridDots;
    const dotRadius = Math.max(1.5, cellSize * 0.05);
    for (let x = 1; x <= width; x++) {
      for (let y = 1; y <= height; y++) {
        const { px, py } = this.worldToPixel(x, y);
        ctx.beginPath();
        ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Outer boundary walls
    ctx.strokeStyle = this.colors.borderWall;
    ctx.lineWidth = 4;
    ctx.strokeRect(offsetX, offsetY, gridWidth, gridHeight);

    ctx.restore();
  }

  drawWalls() {
    const ctx = this.ctx;
    const { offsetX, offsetY, cellSize, gridHeight } = this.metrics;

    ctx.save();
    ctx.lineCap = 'round';

    // Vertical Walls
    for (const vKey of this.world.verticalWalls) {
      const [, x, y] = vKey.split(':').map(Number);
      const px = offsetX + x * cellSize;
      const pyTop = offsetY + gridHeight - y * cellSize;
      const pyBottom = pyTop + cellSize;

      // Shadow
      ctx.strokeStyle = this.colors.wallShadow;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(px + 1, pyTop);
      ctx.lineTo(px + 1, pyBottom);
      ctx.stroke();

      // Main wall
      ctx.strokeStyle = this.colors.wall;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(px, pyTop);
      ctx.lineTo(px, pyBottom);
      ctx.stroke();
    }

    // Horizontal Walls
    for (const hKey of this.world.horizontalWalls) {
      const [, x, y] = hKey.split(':').map(Number);
      const pxLeft = offsetX + (x - 1) * cellSize;
      const pxRight = pxLeft + cellSize;
      const py = offsetY + gridHeight - y * cellSize;

      // Shadow
      ctx.strokeStyle = this.colors.wallShadow;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(pxLeft, py + 1);
      ctx.lineTo(pxRight, py + 1);
      ctx.stroke();

      // Main wall
      ctx.strokeStyle = this.colors.wall;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(pxLeft, py);
      ctx.lineTo(pxRight, py);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawBeepers() {
    const ctx = this.ctx;
    const { cellSize } = this.metrics;
    const radius = Math.max(6, cellSize * 0.28);

    ctx.save();
    for (const [key, count] of this.world.beepers.entries()) {
      if (count <= 0) continue;
      const [x, y] = key.split(',').map(Number);
      const { px, py } = this.worldToPixel(x, y);

      // Diamond beeper shape
      const isMulti = count > 1;
      ctx.fillStyle = isMulti ? this.colors.beeperMultiBg : this.colors.beeperBg;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(px, py - radius);
      ctx.lineTo(px + radius, py);
      ctx.lineTo(px, py + radius);
      ctx.lineTo(px - radius, py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // If count > 1, draw text
      if (count > 1) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(10, Math.floor(radius * 0.95))}px ui-monospace, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(count), px, py);
      }
    }
    ctx.restore();
  }

  drawRobot() {
    const ctx = this.ctx;
    const { cellSize } = this.metrics;
    const { px, py } = this.worldToPixel(this.anim.curX, this.anim.curY);
    const angle = this.anim.curAngle;

    const rSize = cellSize * 0.82; // Prominent robot size
    const half = rSize / 2;

    ctx.save();
    ctx.translate(px, py);

    // 1. Soft glowing aura on ground beneath Karel
    const auraGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, cellSize * 0.52);
    auraGrad.addColorStop(0, 'rgba(14, 165, 233, 0.45)');
    auraGrad.addColorStop(0.6, 'rgba(59, 130, 246, 0.2)');
    auraGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, 0, cellSize * 0.52, 0, Math.PI * 2);
    ctx.fill();

    // Rotate context to Karel's facing direction
    ctx.rotate(angle);

    // 2. Direction Indicator Arrow ahead of the robot
    const arrowX = half + cellSize * 0.08;
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(arrowX + 7, 0);
    ctx.lineTo(arrowX, -5);
    ctx.lineTo(arrowX + 2, 0);
    ctx.lineTo(arrowX, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Track Treads (top & bottom)
    const treadH = rSize * 0.22;
    const treadW = rSize * 0.84;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, -treadW / 2, -half, treadW, treadH, 3, true, true);
    this.roundRect(ctx, -treadW / 2, half - treadH, treadW, treadH, 3, true, true);

    // Tread cleats/teeth
    ctx.fillStyle = '#64748b';
    const numCleats = 4;
    const cleatW = 3;
    for (let i = 0; i < numCleats; i++) {
      const cx = -treadW / 2 + 5 + i * (treadW - 10) / (numCleats - 1);
      ctx.fillRect(cx - cleatW / 2, -half + 1, cleatW, treadH - 2);
      ctx.fillRect(cx - cleatW / 2, half - treadH + 1, cleatW, treadH - 2);
    }

    // 4. Main Robot Body (metallic cyber chassis)
    const bodyW = rSize * 0.68;
    const bodyH = rSize * 0.62;
    const bodyGrad = ctx.createLinearGradient(-bodyW / 2, -bodyH / 2, bodyW / 2, bodyH / 2);
    bodyGrad.addColorStop(0, '#38bdf8');
    bodyGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 2;
    this.roundRect(ctx, -bodyW / 2, -bodyH / 2, bodyW, bodyH, 5, true, true);

    // 5. Visor / Eyes (Front face facing positive X)
    const visorW = bodyW * 0.38;
    const visorH = bodyH * 0.74;
    const visorX = bodyW / 2 - visorW - 1;
    const visorY = -visorH / 2;
    ctx.fillStyle = '#090d16';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    this.roundRect(ctx, visorX, visorY, visorW, visorH, 4, true, true);

    // Glowing LED eyes
    const eyeR = Math.max(2.2, visorH * 0.17);
    const eyeGrad = ctx.createRadialGradient(
      visorX + visorW * 0.55, visorY + visorH * 0.3, 0.5,
      visorX + visorW * 0.55, visorY + visorH * 0.3, eyeR * 1.5
    );
    eyeGrad.addColorStop(0, '#86efac');
    eyeGrad.addColorStop(1, '#10b981');

    ctx.fillStyle = eyeGrad;
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(visorX + visorW * 0.55, visorY + visorH * 0.3, eyeR, 0, Math.PI * 2);
    ctx.arc(visorX + visorW * 0.55, visorY + visorH * 0.7, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // reset shadow

    // 6. Chest Plate / "K" emblem
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(-bodyW / 2 + 3, -bodyH * 0.3, bodyW * 0.36, bodyH * 0.6);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(9, Math.floor(bodyH * 0.42))}px ui-monospace, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('K', -bodyW / 2 + 3 + (bodyW * 0.36) / 2, 0);

    // 7. Antenna on back with glowing red beacon
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-bodyW / 2, 0);
    ctx.lineTo(-bodyW / 2 - rSize * 0.18, 0);
    ctx.stroke();

    const bulbX = -bodyW / 2 - rSize * 0.18;
    const bulbR = Math.max(2.5, rSize * 0.09);

    // Antenna beacon glow
    const bulbGrad = ctx.createRadialGradient(bulbX, 0, 1, bulbX, 0, bulbR * 1.8);
    bulbGrad.addColorStop(0, '#fca5a5');
    bulbGrad.addColorStop(0.5, '#ef4444');
    bulbGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = bulbGrad;
    ctx.beginPath();
    ctx.arc(bulbX, 0, bulbR * 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(bulbX, 0, bulbR, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  /**
   * Hit test for canvas clicks:
   * Returns:
   * - { type: 'WALL_V', x, y } if clicked near vertical wall boundary
   * - { type: 'WALL_H', x, y } if clicked near horizontal wall boundary
   * - { type: 'CELL', x, y } if clicked in cell center
   * - null if clicked outside grid
   */
  hitTest(pixelX, pixelY) {
    const { offsetX, offsetY, cellSize, gridWidth, gridHeight } = this.metrics;
    if (
      pixelX < offsetX ||
      pixelX > offsetX + gridWidth ||
      pixelY < offsetY ||
      pixelY > offsetY + gridHeight
    ) {
      return null;
    }

    const { wx, wy } = this.pixelToWorld(pixelX, pixelY);
    const cellX = Math.floor(wx);
    const cellY = Math.floor(wy);

    const relX = wx - cellX; // 0..1 inside cell
    const relY = wy - cellY; // 0..1 inside cell

    const edgeThreshold = 0.22; // within 22% of cell edge

    // Vertical wall test (East edge of cellX or West edge)
    if (relX > 1 - edgeThreshold && cellX < this.world.width) {
      return { type: 'WALL_V', x: cellX, y: cellY };
    }
    if (relX < edgeThreshold && cellX > 1) {
      return { type: 'WALL_V', x: cellX - 1, y: cellY };
    }

    // Horizontal wall test (North edge of cellY or South edge)
    if (relY > 1 - edgeThreshold && cellY < this.world.height) {
      return { type: 'WALL_H', x: cellX, y: cellY };
    }
    if (relY < edgeThreshold && cellY > 1) {
      return { type: 'WALL_H', x: cellX, y: cellY - 1 };
    }

    // Inside cell
    return { type: 'CELL', x: cellX, y: cellY };
  }
}


/* --- File: interpreter.js --- */
/**
 * Karel Programming Language - Step-by-Step Interpreter
 * Virtual machine using JavaScript generator for fine-grained
 * stepping, line highlighting, and animation control.
 */


const InterpreterState = {
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  FINISHED: 'FINISHED',
  ERROR: 'ERROR',
};

class Interpreter {
  constructor(world) {
    this.world = world;
    this.program = null;
    this.generator = null;
    this.state = InterpreterState.IDLE;
    this.speed = 200; // ms per step
    this.timerId = null;

    // Safety thresholds
    this.maxCallDepth = 500;
    this.maxOperations = 100000;
    this.callDepth = 0;
    this.operationCount = 0;
    this.actionCount = 0;

    // Event listeners
    this.listeners = {
      stateChange: [],
      highlightLine: [],
      action: [],
      error: [],
      log: [],
      finish: [],
    };
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  emit(event, ...args) {
    if (this.listeners[event]) {
      for (const cb of this.listeners[event]) {
        try {
          cb(...args);
        } catch (err) {
          console.error(`Error in listener for ${event}:`, err);
        }
      }
    }
  }

  setState(newState) {
    this.state = newState;
    this.emit('stateChange', newState);
  }

  setSpeed(ms) {
    this.speed = Math.max(0, ms);
  }

  loadProgram(programNode) {
    this.stop();
    this.program = programNode;
    this.generator = null;
    this.callDepth = 0;
    this.operationCount = 0;
    this.actionCount = 0;
    this.setState(InterpreterState.IDLE);
  }

  initGenerator() {
    if (!this.program) return null;
    this.callDepth = 0;
    this.operationCount = 0;
    this.actionCount = 0;
    this.generator = this.runProgramGenerator(this.program);
    return this.generator;
  }

  *runProgramGenerator(program) {
    yield* this.runStatements(program.body, program.procedures);
  }

  *runStatements(statements, procedures) {
    for (const stmt of statements) {
      this.operationCount++;
      if (this.operationCount > this.maxOperations) {
        throw new Error(
          `Detekován možný nekonečný cyklus (překročen limit ${this.maxOperations} operací) / Possible infinite loop detected`
        );
      }

      yield { type: 'HIGHLIGHT', loc: stmt.loc, node: stmt };

      switch (stmt.type) {
        case 'Command':
          yield* this.runCommand(stmt, procedures);
          break;

        case 'Repeat':
          yield* this.runRepeat(stmt, procedures);
          break;

        case 'While':
          yield* this.runWhile(stmt, procedures);
          break;

        case 'If':
          yield* this.runIf(stmt, procedures);
          break;

        case 'Call':
          yield* this.runCall(stmt, procedures);
          break;

        default:
          throw new Error(`Neznámý typ uzlu AST / Unknown AST node type: ${stmt.type}`);
      }
    }
  }

  *runCommand(stmt, procedures) {
    if (stmt.action === 'RIGHT') {
      const rightProc =
        procedures?.get('VPRAVOBOK') ||
        procedures?.get('VPRAVO') ||
        procedures?.get('TURNRIGHT') ||
        procedures?.get('RIGHT');
      if (rightProc) {
        yield* this.runCall({ name: rightProc.name, loc: stmt.loc }, procedures);
        return;
      }
    }
    if (stmt.action === 'TURN_AROUND') {
      const aroundProc =
        procedures?.get('CELEMVZAD') ||
        procedures?.get('VZAD') ||
        procedures?.get('TURNAROUND');
      if (aroundProc) {
        yield* this.runCall({ name: aroundProc.name, loc: stmt.loc }, procedures);
        return;
      }
    }

    this.actionCount++;
    switch (stmt.action) {
      case 'STEP':
        this.world.step();
        break;
      case 'LEFT':
        this.world.turnLeft();
        break;
      case 'RIGHT':
        this.world.turnRight();
        break;
      case 'TURN_AROUND':
        this.world.turnAround();
        break;
      case 'PUT':
        this.world.putBeeper();
        break;
      case 'PICK':
        this.world.pickBeeper();
        break;
      default:
        throw new Error(`Neznámý příkaz / Unknown command: ${stmt.action}`);
    }

    yield {
      type: 'ACTION',
      action: stmt.action,
      loc: stmt.loc,
      karel: { ...this.world.karel },
    };
  }

  *runRepeat(stmt, procedures) {
    const times = stmt.count;
    for (let i = 0; i < times; i++) {
      yield* this.runStatements(stmt.body, procedures);
    }
  }

  *runWhile(stmt, procedures) {
    while (true) {
      this.operationCount++;
      if (this.operationCount > this.maxOperations) {
        throw new Error(
          `Detekován nekonečný cyklus v DOKUD/WHILE / Infinite loop detected in WHILE at line ${stmt.loc.line}`
        );
      }

      // Check condition
      const condVal = this.world.evalCondition(stmt.condition.test, stmt.condition.inverted);
      yield {
        type: 'CONDITION_EVAL',
        result: condVal,
        loc: stmt.condition.loc,
      };

      if (!condVal) break;

      yield* this.runStatements(stmt.body, procedures);
    }
  }

  *runIf(stmt, procedures) {
    const condVal = this.world.evalCondition(stmt.condition.test, stmt.condition.inverted);
    yield {
      type: 'CONDITION_EVAL',
      result: condVal,
      loc: stmt.condition.loc,
    };

    if (condVal) {
      yield* this.runStatements(stmt.thenBody, procedures);
    } else if (stmt.elseBody && stmt.elseBody.length > 0) {
      yield* this.runStatements(stmt.elseBody, procedures);
    }
  }

  *runCall(stmt, procedures) {
    const norm = canonicalize(stmt.name);
    const proc = procedures.get(norm);
    if (!proc) {
      throw new Error(
        `Neznámý příkaz nebo procedura '${stmt.name}' / Unknown procedure '${stmt.name}' (řádek ${stmt.loc.line})`
      );
    }

    if (this.callDepth >= this.maxCallDepth) {
      throw new Error(
        `Překročena maximální hloubka volání (${this.maxCallDepth}) / Stack overflow in procedure '${stmt.name}'`
      );
    }

    this.callDepth++;
    try {
      yield* this.runStatements(proc.body, procedures);
    } finally {
      this.callDepth--;
    }
  }

  /**
   * Execute single step of the program.
   * Returns true if program can continue, false if finished or errored.
   */
  step() {
    if (!this.program) return false;

    if (!this.generator) {
      this.initGenerator();
    }

    try {
      // Advance generator until next ACTION or END
      let next = this.generator.next();
      while (!next.done) {
        const event = next.value;

        if (event.type === 'HIGHLIGHT') {
          this.emit('highlightLine', event.loc.line, event.loc.col);
        } else if (event.type === 'ACTION') {
          this.emit('action', event.action, event.karel, event.loc);
          return true; // Pauses after physical Karel action
        }

        next = this.generator.next();
      }

      // Generator completed successfully
      this.stopTimer();
      this.setState(InterpreterState.FINISHED);
      this.emit('highlightLine', null);
      this.emit('finish', {
        actionCount: this.actionCount,
        operationCount: this.operationCount,
      });
      return false;
    } catch (err) {
      this.stopTimer();
      this.setState(InterpreterState.ERROR);
      this.emit('error', err.message);
      return false;
    }
  }

  /**
   * Continuous execution with timer or requestAnimationFrame.
   */
  run() {
    if (this.state === InterpreterState.RUNNING) return;

    if (!this.generator || this.state === InterpreterState.FINISHED || this.state === InterpreterState.ERROR) {
      this.initGenerator();
    }

    this.setState(InterpreterState.RUNNING);
    this.scheduleNextTick();
  }

  scheduleNextTick() {
    if (this.state !== InterpreterState.RUNNING) return;

    if (this.speed === 0) {
      // Turbo mode - execute chunk of steps
      const startTime = performance.now();
      while (performance.now() - startTime < 16) { // 16ms frame budget
        const hasMore = this.step();
        if (!hasMore || this.state !== InterpreterState.RUNNING) {
          return;
        }
      }
      this.timerId = requestAnimationFrame(() => this.scheduleNextTick());
    } else {
      this.timerId = setTimeout(() => {
        const hasMore = this.step();
        if (hasMore && this.state === InterpreterState.RUNNING) {
          this.scheduleNextTick();
        }
      }, this.speed);
    }
  }

  pause() {
    if (this.state === InterpreterState.RUNNING) {
      this.stopTimer();
      this.setState(InterpreterState.PAUSED);
    }
  }

  stop() {
    this.stopTimer();
    this.generator = null;
    this.emit('highlightLine', null);
    this.setState(InterpreterState.IDLE);
  }

  stopTimer() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      cancelAnimationFrame(this.timerId);
      this.timerId = null;
    }
  }
}


/* --- File: examples.js --- */
/**
 * Karel Programming Language - Built-in Examples Library
 * Complete with code and initial world states in both Czech and English.
 */

const Examples = [
  {
    id: 'first_steps',
    title: { cs: '1. První kroky', en: '1. First Steps' },
    desc: {
      cs: 'Základní pohyby, pokládání a zvedání značek.',
      en: 'Basic movements, placing and picking beepers.',
    },
    world: {
      width: 8,
      height: 8,
      karel: { x: 1, y: 1, dir: 'EAST', bag: Infinity },
      verticalWalls: [],
      horizontalWalls: [],
      beepers: [],
    },
    code: {
      cs: `// ==========================================
// VÍTEJTE V JAZYCE ROBOT KAREL!
// ------------------------------------------
// Tento program ukazuje základní strukturu kódu:
// 1. Karel provádí příkazy popořadě shora dolů.
// 2. Položí 3 značky v řadě, otočí se a položí další.
//
// Stiskněte tlačítko [▶ Spustit] nebo [⏭ Krok].
// ==========================================

KROK          // Popojít o jedno pole vpřed
POLOZ         // Položit značku z kapsy
KROK
POLOZ
KROK
POLOZ

VLEVO-BOK     // Otočit se o 90 stupňů doleva (na Sever)
KROK
POLOZ
`,
      en: `// ==========================================
// WELCOME TO KAREL THE ROBOT!
// ------------------------------------------
// This program demonstrates basic code structure:
// 1. Karel executes commands in sequence top to bottom.
// 2. Places 3 beepers in a row, turns North, and puts one more.
//
// Click [▶ Run] or [⏭ Step] to execute.
// ==========================================

STEP          // Move forward one corner
PUT           // Put a beeper from the bag
STEP
PUT
STEP
PUT

TURN_LEFT     // Turn 90 degrees counter-clockwise (North)
STEP
PUT
`,
    },
  },

  {
    id: 'code_structure_tutorial',
    title: { cs: '2. Jak strukturovat program (Vzor)', en: '2. Code Structure Tutorial' },
    desc: {
      cs: 'Kompletní ukázka struktury: vlastní příkazy, cyklus OPAKUJ, cyklus DOKUD a podmínka KDYŽ.',
      en: 'Complete structural demonstration: custom procedures, REPEAT loops, WHILE loops, and IF conditions.',
    },
    world: {
      width: 10,
      height: 8,
      karel: { x: 1, y: 1, dir: 'EAST', bag: Infinity },
      verticalWalls: [],
      horizontalWalls: [],
      beepers: [
        ['3,1', 1],
        ['5,1', 2],
      ],
    },
    code: {
      cs: `// ==========================================
// PŘÍRUČKA STRUKTURY KÓDU V ROBOTU KARLOVI
// ==========================================

// 1. DEFINICE VLASTNÍHO PŘÍKAZU (PROCEDURY)
// Každá definice začíná slovem PRIKAZ a končí KONEC.
PRIKAZ OBRAT-SE
  VLEVO-BOK
  VLEVO-BOK
KONEC

PRIKAZ VPRAVO-BOK
  OPAKUJ 3 KRAT
    VLEVO-BOK
  KONEC
KONEC

// 2. HLAVNÍ TĚLO PROGRAMU
// Příkazy se vykonávají shora dolů.

// Cyklus s pevným počtem opakování (OPAKUJ n KRAT ... KONEC):
OPAKUJ 2 KRAT
  KROK
  POLOZ
KONEC

// Podmíněný cyklus (DOKUD ... KONEC):
// Běží tak dlouho, dokud podmínka platí.
DOKUD NENI ZED
  // Podmínka s větvením (KDYZ ... JINAK ... KONEC):
  KDYZ JE CIP
    ZVEDNI       // Pokud je pod Karlem značka, zvedni ji
  JINAK
    POLOZ        // Jinak polož novou značku
  KONEC
  KROK
KONEC

// Použití našeho nového vlastního příkazu:
OBRAT-SE
`,
      en: `// ==========================================
// CODE STRUCTURE TUTORIAL IN KAREL
// ==========================================

// 1. DEFINING A CUSTOM PROCEDURE
// Every procedure begins with DEFINE and finishes with END.
DEFINE TURN_AROUND
  TURN_LEFT
  TURN_LEFT
END

DEFINE TURN_RIGHT
  REPEAT 3 TIMES
    TURN_LEFT
  END
END

// 2. MAIN PROGRAM BODY
// Commands are executed sequentially from top to bottom.

// Repeat loop (REPEAT n TIMES ... END):
REPEAT 2 TIMES
  STEP
  PUT
END

// Conditional loop (WHILE ... END):
// Runs as long as the condition evaluates to true.
WHILE FRONT_IS_CLEAR
  // Branching conditional (IF ... ELSE ... END):
  IF BEEPER
    PICK         // If beeper is present, pick it up
  ELSE
    PUT          // Otherwise place a new beeper
  END
  STEP
END

// Invoking our custom defined procedure:
TURN_AROUND
`,
    },
  },

  {
    id: 'square_patrol',
    title: { cs: '3. Obchůzka čtverce (Procedury & Cykly)', en: '3. Square Patrol (Procedures & Loops)' },
    desc: {
      cs: 'Definice vlastního příkazu VPRAVO-BOK a cyklus OPAKUJ.',
      en: 'Defining a custom TURN_RIGHT command and REPEAT loop.',
    },
    world: {
      width: 8,
      height: 8,
      karel: { x: 2, y: 2, dir: 'EAST', bag: Infinity },
      verticalWalls: [],
      horizontalWalls: [],
      beepers: [],
    },
    code: {
      cs: `// Vlastní příkaz pro otočení vpravo
PRIKAZ VPRAVO-BOK
  OPAKUJ 3 KRAT
    VLEVO-BOK
  KONEC
KONEC

// Obejdi čtverec a v každém rohu polož značku
OPAKUJ 4 KRAT
  OPAKUJ 3 KRAT
    KROK
  KONEC
  POLOZ
  VLEVO-BOK
KONEC
`,
      en: `// Define procedure to turn right
DEFINE TURN_RIGHT
  REPEAT 3 TIMES
    TURN_LEFT
  END
END

// Patrol a square and place a beeper at each corner
REPEAT 4 TIMES
  REPEAT 3 TIMES
    STEP
  END
  PUT
  TURN_LEFT
END
`,
    },
  },

  {
    id: 'harvest_row',
    title: { cs: '4. Sklizeň řádku (Podmínky a DOKUD)', en: '4. Harvest Row (While & Conditions)' },
    desc: {
      cs: 'Karel projde řadu až ke zdi a posbírá všechny značky, které najde.',
      en: 'Karel walks to the wall and collects all beepers in its path.',
    },
    world: {
      width: 10,
      height: 6,
      karel: { x: 1, y: 3, dir: 'EAST', bag: 0 },
      verticalWalls: [],
      horizontalWalls: [],
      beepers: [
        ['2,3', 1],
        ['4,3', 3],
        ['5,3', 1],
        ['7,3', 2],
        ['9,3', 1],
      ],
    },
    code: {
      cs: `// Posbírej všechny značky na aktuálním políčku
PRIKAZ SEBER-VSE
  DOKUD JE CIP
    ZVEDNI
  KONEC
KONEC

// Projdi celou ulici až ke zdi
SEBER-VSE
DOKUD NENI ZED
  KROK
  SEBER-VSE
KONEC
`,
      en: `// Collect all beepers at the current corner
DEFINE PICK_ALL
  WHILE BEEPER
    PICK
  END
END

// Walk the entire street to the wall and collect
PICK_ALL
WHILE FRONT_IS_CLEAR
  STEP
  PICK_ALL
END
`,
    },
  },

  {
    id: 'maze_runner',
    title: { cs: '5. Únik z bludiště (Pravidlo pravé ruky)', en: '5. Maze Runner (Right-Hand Rule)' },
    desc: {
      cs: 'Algoritmus sledování pravé zdi k nalezení cíle označeného značkou.',
      en: 'Right-hand wall following algorithm to reach the target beeper.',
    },
    world: {
      width: 9,
      height: 9,
      karel: { x: 1, y: 1, dir: 'NORTH', bag: 0 },
      verticalWalls: [
        'v:1:2', 'v:1:3', 'v:1:4', 'v:1:5', 'v:1:6', 'v:1:7',
        'v:2:2', 'v:2:4', 'v:2:7',
        'v:3:1', 'v:3:3', 'v:3:5', 'v:3:6',
        'v:4:2', 'v:4:4', 'v:4:7', 'v:4:8',
        'v:5:3', 'v:5:5', 'v:5:6',
        'v:6:1', 'v:6:2', 'v:6:4', 'v:6:7',
        'v:7:3', 'v:7:5', 'v:7:6', 'v:7:8',
      ],
      horizontalWalls: [
        'h:2:1', 'h:4:1', 'h:7:1', 'h:8:1',
        'h:1:2', 'h:3:2', 'h:5:2', 'h:7:2',
        'h:2:3', 'h:4:3', 'h:6:3', 'h:8:3',
        'h:3:4', 'h:5:4', 'h:7:4',
        'h:2:5', 'h:4:5', 'h:6:5', 'h:8:5',
        'h:1:6', 'h:3:6', 'h:5:6',
        'h:2:7', 'h:4:7', 'h:6:7', 'h:8:7',
      ],
      beepers: [
        ['5,5', 5], // Goal in the maze center!
      ],
    },
    code: {
      cs: `// Algoritmus sledování pravé ruky
PRIKAZ VPRAVO-BOK
  OPAKUJ 3 KRAT
    VLEVO-BOK
  KONEC
KONEC

// Hledej cíl (dokud nenarazíš na značku)
DOKUD NENI CIP
  VPRAVO-BOK
  KDYZ NENI ZED
    KROK
  JINAK
    VLEVO-BOK
    KDYZ NENI ZED
      KROK
    JINAK
      VLEVO-BOK
      KDYZ NENI ZED
        KROK
      JINAK
        VLEVO-BOK
      KONEC
    KONEC
  KONEC
KONEC
`,
      en: `// Right-hand rule maze solver
DEFINE TURN_RIGHT
  REPEAT 3 TIMES
    TURN_LEFT
  END
END

// Search until Karel reaches the beeper
WHILE NOT BEEPER
  TURN_RIGHT
  IF FRONT_IS_CLEAR
    STEP
  ELSE
    TURN_LEFT
    IF FRONT_IS_CLEAR
      STEP
    ELSE
      TURN_LEFT
      IF FRONT_IS_CLEAR
        STEP
      ELSE
        TURN_LEFT
      END
    END
  END
END
`,
    },
  },

  {
    id: 'pyramid_stairs',
    title: { cs: '6. Stavba schodiště (Pyramida)', en: '6. Staircase Builder (Pyramid)' },
    desc: {
      cs: 'Karel postaví stupňovité schodiště ze značek.',
      en: 'Karel constructs a step pyramid using beepers.',
    },
    world: {
      width: 9,
      height: 7,
      karel: { x: 1, y: 1, dir: 'EAST', bag: Infinity },
      verticalWalls: [],
      horizontalWalls: [],
      beepers: [],
    },
    code: {
      cs: `PRIKAZ VPRAVO-BOK
  OPAKUJ 3 KRAT
    VLEVO-BOK
  KONEC
KONEC

PRIKAZ JEDEN-SCHOD
  POLOZ
  VLEVO-BOK
  KROK
  VPRAVO-BOK
  KROK
KONEC

// Postav 5 schodů nahoru
OPAKUJ 5 KRAT
  JEDEN-SCHOD
KONEC
POLOZ
`,
      en: `DEFINE TURN_RIGHT
  REPEAT 3 TIMES
    TURN_LEFT
  END
END

DEFINE ONE_STEP
  PUT
  TURN_LEFT
  STEP
  TURN_RIGHT
  STEP
END

// Build 5 steps upward
REPEAT 5 TIMES
  ONE_STEP
END
PUT
`,
    },
  },

  {
    id: 'letter_k',
    title: { cs: '7. Nápis písmene "K"', en: '7. Draw Letter "K"' },
    desc: {
      cs: 'Karel vykreslí své začáteční písmeno K ze značek.',
      en: 'Karel draws its initial letter "K" using beepers.',
    },
    world: {
      width: 9,
      height: 9,
      karel: { x: 2, y: 2, dir: 'NORTH', bag: Infinity },
      verticalWalls: [],
      horizontalWalls: [],
      beepers: [],
    },
    code: {
      cs: `PRIKAZ VPRAVO-BOK
  OPAKUJ 3 KRAT
    VLEVO-BOK
  KONEC
KONEC

PRIKAZ CELEM-VZAD
  VLEVO-BOK
  VLEVO-BOK
KONEC

// 1. Svislá čára písmene K (5 značek)
OPAKUJ 4 KRAT
  POLOZ
  KROK
KONEC
POLOZ

// 2. Návrat do středu (3. pozice)
CELEM-VZAD
KROK
KROK
VLEVO-BOK

// 3. Horní šikmé rameno
KROK
VLEVO-BOK
KROK
POLOZ
VPRAVO-BOK
KROK
VLEVO-BOK
KROK
POLOZ

// 4. Dolní rameno
CELEM-VZAD
KROK
VPRAVO-BOK
KROK
KROK
VPRAVO-BOK
KROK
POLOZ
VLEVO-BOK
KROK
VPRAVO-BOK
KROK
POLOZ
`,
      en: `DEFINE TURN_RIGHT
  REPEAT 3 TIMES
    TURN_LEFT
  END
END

DEFINE TURN_AROUND
  TURN_LEFT
  TURN_LEFT
END

// 1. Vertical backbone of letter K
REPEAT 4 TIMES
  PUT
  STEP
END
PUT

// 2. Return to center
TURN_AROUND
STEP
STEP
TURN_LEFT

// 3. Upper diagonal
STEP
TURN_LEFT
STEP
PUT
TURN_RIGHT
STEP
TURN_LEFT
STEP
PUT

// 4. Lower diagonal
TURN_AROUND
STEP
TURN_RIGHT
STEP
STEP
TURN_RIGHT
STEP
PUT
TURN_LEFT
STEP
TURN_RIGHT
STEP
PUT
`,
    },
  },
];


/* --- File: app.js --- */
/**
 * Karel the Robot - Main Application Controller
 * Wires the Code Editor, Interpreter, World, Renderer, Audio, and UI.
 */








class KarelApp {
  constructor() {
    this.lang = localStorage.getItem('karel_lang') || 'cs';
    this.currentTool = 'beeper'; // 'beeper', 'wall', 'karel'

    // Core components
    this.world = new KarelWorld(10, 10);
    this.canvas = document.getElementById('karel-canvas');
    this.renderer = new KarelRenderer(this.canvas, this.world);
    this.interpreter = new Interpreter(this.world);
    this.audio = new KarelAudio();

    // DOM Elements
    this.dom = {
      langSelect: document.getElementById('lang-select'),
      soundBtn: document.getElementById('sound-btn'),
      helpBtn: document.getElementById('help-btn'),
      modal: document.getElementById('cheatsheet-modal'),
      modalCloseBtn: document.getElementById('modal-close-btn'),

      exampleSelect: document.getElementById('example-select'),
      newCodeBtn: document.getElementById('new-code-btn'),
      codeEditor: document.getElementById('code-editor'),
      lineNumbers: document.getElementById('line-numbers'),
      activeLineMarker: document.getElementById('active-line-marker'),

      runBtn: document.getElementById('run-btn'),
      pauseBtn: document.getElementById('pause-btn'),
      stepBtn: document.getElementById('step-btn'),
      stopBtn: document.getElementById('stop-btn'),
      speedSlider: document.getElementById('speed-slider'),

      toolBeeper: document.getElementById('tool-beeper'),
      toolWall: document.getElementById('tool-wall'),
      toolKarel: document.getElementById('tool-karel'),
      worldW: document.getElementById('world-w'),
      worldH: document.getElementById('world-h'),
      resizeBtn: document.getElementById('resize-btn'),
      mazeBtn: document.getElementById('maze-btn'),
      clearWorldBtn: document.getElementById('clear-world-btn'),

      hudPos: document.getElementById('hud-pos'),
      hudDir: document.getElementById('hud-dir'),
      hudBag: document.getElementById('hud-bag'),
      hudCellBeepers: document.getElementById('hud-cell-beepers'),
      statusBadge: document.getElementById('status-badge'),

      consoleOutput: document.getElementById('console-output'),
      clearConsoleBtn: document.getElementById('clear-console-btn'),

      // Left pane tabs and views
      tabEditor: document.getElementById('tab-editor'),
      tabGuide: document.getElementById('tab-guide'),
      editorView: document.getElementById('editor-view'),
      guideView: document.getElementById('guide-view'),

      // Manual buttons
      mStep: document.getElementById('m-step'),
      mLeft: document.getElementById('m-left'),
      mRight: document.getElementById('m-right'),
      mAround: document.getElementById('m-around'),
      mPut: document.getElementById('m-put'),
      mPick: document.getElementById('m-pick'),
    };

    this.initTranslations();
    this.initEvents();
    this.initExamples();
    this.updateHUD();
    this.updateAudioButton();
    this.applyLanguage();

    // Load first example by default
    if (Examples.length > 0) {
      this.loadExample(Examples[0]);
    }
  }

  initTranslations() {
    this.i18n = {
      cs: {
        cheatsheet: 'Příkazy',
        exampleLabel: 'Příklad:',
        selectExample: 'Vyberte úlohu...',
        newBtn: 'Nový',
        runBtn: 'Spustit',
        pauseBtn: 'Pauza',
        stepBtn: 'Krok',
        resetBtn: 'Reset',
        manualTitle: 'Ruční řízení:',
        toolBeeper: 'Značka',
        toolWall: 'Zeď',
        toolKarel: 'Karel',
        gridSize: 'Mřížka:',
        resizeBtn: 'OK',
        mazeBtn: '🎲 Bludiště',
        clearBtn: 'Vyčistit',
        consoleTitle: 'Konzole & Hlášení:',
        statusIdle: 'PŘIPRAVEN',
        statusRunning: 'BĚŽÍ',
        statusPaused: 'POZASTAVEN',
        statusFinished: 'DOKONČENO',
        statusError: 'CHYBA',
        editorPlaceholder: '// Zde napište program pro Karla...',
        dirNorth: 'SEVER',
        dirEast: 'VÝCHOD',
        dirSouth: 'JIH',
        dirWest: 'ZÁPAD',
        tabEditor: 'Editor',
        tabGuide: 'Příručka & Struktura kódu',
        insertTitle: 'Vložit vzor:',
        insertSample: 'Vložit do editoru',
        guideIntroTitle: '1. Jak funguje Robot Karel',
        guideIntroP1: 'Karel je robot, který žije ve čtvercovém světě ulic a tříd. Vykonává příkazy přesně tak, jak jste je napsali shora dolů.',
        guideIntroP2: 'Základní příkazy: KROK (pohyb o 1 pole), VLEVO-BOK (otočení o 90° vlevo), POLOZ (položení značky z kapsy) a ZVEDNI (sebrání značky do kapsy).',
        guideStructTitle: '2. Struktura programu (Pravidla syntaxe)',
        guideStructP1: 'Každý příkaz se píše na samostatný řádek. Řádky začínající // jsou komentáře, které Karel ignoruje.',
        guideStructP2: 'Všechny složené konstrukce (cyklus OPAKUJ, cyklus DOKUD, podmínka KDYZ a procedura PRIKAZ) musí vždy končit slovem KONEC.',
        guideRepeatTitle: '3. Cyklus s pevným počtem opakování (OPAKUJ)',
        guideRepeatP1: 'Pokud chcete sekvenci příkazů zopakovat několikrát (např. 4×):',
        guideWhileTitle: '4. Podmíněný cyklus (DOKUD)',
        guideWhileP1: 'Opakuje příkazy tak dlouho, dokud platí daná podmínka (např. dokud před Karlem není zeď):',
        guideIfTitle: '5. Podmínky a rozhodování (KDYŽ / JINAK)',
        guideIfP1: 'Umožňuje Karlovi rozhodnout se na základě toho, co vidí pod sebou nebo před sebou:',
        guideProcTitle: '6. Vlastní příkazy (Procedury)',
        guideProcP1: 'Naučte Karla nový povel! Definice začíná slovem PRIKAZ <nazev> a končí KONEC:',
        guideSensorsTitle: '7. Dostupné podmínky a senzory',
      },
      en: {
        cheatsheet: 'Cheatsheet',
        exampleLabel: 'Example:',
        selectExample: 'Select challenge...',
        newBtn: 'New',
        runBtn: 'Run',
        pauseBtn: 'Pause',
        stepBtn: 'Step',
        resetBtn: 'Reset',
        manualTitle: 'Manual Pad:',
        toolBeeper: 'Beeper',
        toolWall: 'Wall',
        toolKarel: 'Karel',
        gridSize: 'Grid:',
        resizeBtn: 'OK',
        mazeBtn: '🎲 Maze',
        clearBtn: 'Clear',
        consoleTitle: 'Console & Logs:',
        statusIdle: 'READY',
        statusRunning: 'RUNNING',
        statusPaused: 'PAUSED',
        statusFinished: 'FINISHED',
        statusError: 'ERROR',
        editorPlaceholder: '// Write Karel code here...',
        dirNorth: 'NORTH',
        dirEast: 'EAST',
        dirSouth: 'SOUTH',
        dirWest: 'WEST',
        tabEditor: 'Editor',
        tabGuide: 'Guide & Code Structure',
        insertTitle: 'Insert Template:',
        insertSample: 'Insert into editor',
        guideIntroTitle: '1. How Karel the Robot Works',
        guideIntroP1: 'Karel is a robot living in a grid world of streets and avenues. Karel executes commands sequentially from top to bottom.',
        guideIntroP2: 'Primitive commands: STEP (move forward 1 corner), TURN_LEFT (rotate 90° counter-clockwise), PUT (place a beeper from bag), and PICK (pick up a beeper into bag).',
        guideStructTitle: '2. Program Structure (Syntax Rules)',
        guideStructP1: 'Commands are written on separate lines. Lines beginning with // are comments that Karel ignores.',
        guideStructP2: 'All compound statements (REPEAT, WHILE, IF, and DEFINE) must always end with the keyword END.',
        guideRepeatTitle: '3. Fixed Repeat Loop (REPEAT)',
        guideRepeatP1: 'When you want to repeat a sequence of commands a specific number of times (e.g. 4 times):',
        guideWhileTitle: '4. Conditional Loop (WHILE)',
        guideWhileP1: 'Repeats commands as long as the condition evaluates to true (e.g. while front is clear):',
        guideIfTitle: '5. Branching & Conditions (IF / ELSE)',
        guideIfP1: 'Allows Karel to make decisions based on what is in front or beneath:',
        guideProcTitle: '6. Custom Procedures (DEFINE)',
        guideProcP1: 'Teach Karel a new command! Begins with DEFINE <name> and ends with END:',
        guideSensorsTitle: '7. Available Conditions & Sensors',
      },
    };
  }

  switchTab(tab) {
    if (tab === 'editor') {
      this.dom.tabEditor.classList.add('active');
      this.dom.tabGuide.classList.remove('active');
      this.dom.editorView.style.display = 'flex';
      this.dom.guideView.classList.remove('active');
    } else {
      this.dom.tabGuide.classList.add('active');
      this.dom.tabEditor.classList.remove('active');
      this.dom.editorView.style.display = 'none';
      this.dom.guideView.classList.add('active');
    }
  }

  insertSnippet(key) {
    const isCs = this.lang === 'cs';
    let snippet = '';
    switch (key) {
      case 'step': snippet = isCs ? 'KROK\n' : 'STEP\n'; break;
      case 'left': snippet = isCs ? 'VLEVO-BOK\n' : 'TURN_LEFT\n'; break;
      case 'right': snippet = isCs ? 'VPRAVO-BOK\n' : 'TURN_RIGHT\n'; break;
      case 'put': snippet = isCs ? 'POLOZ\n' : 'PUT\n'; break;
      case 'pick': snippet = isCs ? 'ZVEDNI\n' : 'PICK\n'; break;
      case 'repeat':
        snippet = isCs
          ? 'OPAKUJ 4 KRAT\n  KROK\nKONEC\n'
          : 'REPEAT 4 TIMES\n  STEP\nEND\n';
        break;
      case 'while':
        snippet = isCs
          ? 'DOKUD NENI ZED\n  KROK\nKONEC\n'
          : 'WHILE FRONT_IS_CLEAR\n  STEP\nEND\n';
        break;
      case 'if':
        snippet = isCs
          ? 'KDYZ JE CIP\n  ZVEDNI\nJINAK\n  POLOZ\nKONEC\n'
          : 'IF BEEPER\n  PICK\nELSE\n  PUT\nEND\n';
        break;
      case 'proc':
        snippet = isCs
          ? 'PRIKAZ MOJE-PROCEDURA\n  KROK\nKONEC\n'
          : 'DEFINE MY_PROCEDURE\n  STEP\nEND\n';
        break;
    }

    this.switchTab('editor');
    const editor = this.dom.codeEditor;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const val = editor.value;
    editor.value = val.substring(0, start) + snippet + val.substring(end);
    editor.selectionStart = editor.selectionEnd = start + snippet.length;
    editor.focus();
    this.updateLineNumbers();
  }

  insertGuideSample(key) {
    const isCs = this.lang === 'cs';
    let sample = '';
    switch (key) {
      case 'repeat':
        sample = isCs
          ? '// Obejdi čtverec a v každém rohu polož značku:\nOPAKUJ 4 KRAT\n  KROK\n  POLOZ\n  VLEVO-BOK\nKONEC\n'
          : '// Patrol square and place a beeper at each corner:\nREPEAT 4 TIMES\n  STEP\n  PUT\n  TURN_LEFT\nEND\n';
        break;
      case 'while':
        sample = isCs
          ? '// Jdi dopředu až ke zdi:\nDOKUD NENI ZED\n  KROK\nKONEC\n'
          : '// Walk forward until the wall:\nWHILE FRONT_IS_CLEAR\n  STEP\nEND\n';
        break;
      case 'if':
        sample = isCs
          ? '// Pokud je pod Karlem značka, seber ji, jinak polož novou:\nKDYZ JE CIP\n  ZVEDNI\nJINAK\n  POLOZ\nKONEC\n'
          : '// If beeper is present, pick it up, otherwise put one:\nIF BEEPER\n  PICK\nELSE\n  PUT\nEND\n';
        break;
      case 'proc':
        sample = isCs
          ? 'PRIKAZ VPRAVO-BOK\n  OPAKUJ 3 KRAT\n    VLEVO-BOK\n  KONEC\nKONEC\n\n// Použití:\nKROK\nVPRAVO-BOK\nKROK\n'
          : 'DEFINE TURN_RIGHT\n  REPEAT 3 TIMES\n    TURN_LEFT\n  END\nEND\n\n// Usage:\nSTEP\nTURN_RIGHT\nSTEP\n';
        break;
    }

    this.switchTab('editor');
    this.dom.codeEditor.value = sample;
    this.updateLineNumbers();
    this.log('Vložen vzorový kód do editoru / Inserted sample into editor', 'info');
  }

  applyLanguage() {
    const t = this.i18n[this.lang];
    this.dom.langSelect.value = this.lang;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) {
        el.textContent = t[key];
      }
    });

    this.dom.codeEditor.placeholder = t.editorPlaceholder;

    // Update manual buttons text
    if (this.lang === 'cs') {
      this.dom.mStep.textContent = 'KROK';
      this.dom.mLeft.textContent = 'VLEVO';
      this.dom.mRight.textContent = 'VPRAVO';
      this.dom.mAround.textContent = 'VZAD';
      this.dom.mPut.textContent = 'POLOŽ';
      this.dom.mPick.textContent = 'ZVEDNI';
    } else {
      this.dom.mStep.textContent = 'STEP';
      this.dom.mLeft.textContent = 'LEFT';
      this.dom.mRight.textContent = 'RIGHT';
      this.dom.mAround.textContent = 'AROUND';
      this.dom.mPut.textContent = 'PUT';
      this.dom.mPick.textContent = 'PICK';
    }

    // Update snippet button labels
    document.querySelectorAll('.btn-snippet').forEach((btn) => {
      const ins = btn.getAttribute('data-insert');
      if (this.lang === 'cs') {
        const labels = {
          step: '+ KROK', left: '+ VLEVO', right: '+ VPRAVO',
          put: '+ POLOŽ', pick: '+ ZVEDNI', repeat: '+ OPAKUJ',
          while: '+ DOKUD', if: '+ KDYŽ', proc: '+ PŘÍKAZ'
        };
        if (labels[ins]) btn.textContent = labels[ins];
      } else {
        const labels = {
          step: '+ STEP', left: '+ LEFT', right: '+ RIGHT',
          put: '+ PUT', pick: '+ PICK', repeat: '+ REPEAT',
          while: '+ WHILE', if: '+ IF', proc: '+ DEFINE'
        };
        if (labels[ins]) btn.textContent = labels[ins];
      }
    });

    // Refresh example names in dropdown
    const selectedId = this.dom.exampleSelect.value;
    this.initExamples();
    this.dom.exampleSelect.value = selectedId;

    this.updateHUD();
  }

  initExamples() {
    const select = this.dom.exampleSelect;
    select.innerHTML = `<option value="" disabled ${!select.value ? 'selected' : ''}>${this.i18n[this.lang].selectExample}</option>`;

    Examples.forEach((ex) => {
      const opt = document.createElement('option');
      opt.value = ex.id;
      opt.textContent = ex.title[this.lang] || ex.title.cs;
      select.appendChild(opt);
    });
  }

  loadExample(ex) {
    if (!ex) return;
    this.interpreter.stop();

    // Load world
    this.world.deserialize(JSON.parse(JSON.stringify(ex.world)));
    this.world.saveInitialSnapshot();
    this.dom.worldW.value = this.world.width;
    this.dom.worldH.value = this.world.height;
    this.dom.exampleSelect.value = ex.id;

    // Load code
    this.dom.codeEditor.value = ex.code[this.lang] || ex.code.cs;
    this.updateLineNumbers();

    // Render & Sync
    this.renderer.syncRobotImmediate();
    this.updateHUD();
    this.log(`Načten příklad: ${ex.title[this.lang]} / Loaded example`, 'info');
  }

  initEvents() {
    // Tabs switching
    this.dom.tabEditor.addEventListener('click', () => this.switchTab('editor'));
    this.dom.tabGuide.addEventListener('click', () => this.switchTab('guide'));

    // Snippet buttons insertion
    document.querySelectorAll('.btn-snippet').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ins = btn.getAttribute('data-insert');
        if (ins) this.insertSnippet(ins);
      });
    });

    // Sample buttons in guide
    document.querySelectorAll('.btn-insert-sample').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sample = btn.getAttribute('data-sample');
        if (sample) this.insertGuideSample(sample);
      });
    });

    // Language change
    this.dom.langSelect.addEventListener('change', (e) => {
      this.lang = e.target.value;
      localStorage.setItem('karel_lang', this.lang);
      this.applyLanguage();

      // If current code matches previous example, update it to new language code
      const currentEx = Examples.find((ex) => ex.id === this.dom.exampleSelect.value);
      if (currentEx) {
        this.dom.codeEditor.value = currentEx.code[this.lang];
        this.updateLineNumbers();
      }
    });

    // Sound toggle
    this.dom.soundBtn.addEventListener('click', () => {
      this.audio.toggleMute();
      this.updateAudioButton();
    });

    // Help modal
    this.dom.helpBtn.addEventListener('click', () => {
      this.dom.modal.classList.add('open');
    });
    this.dom.modalCloseBtn.addEventListener('click', () => {
      this.dom.modal.classList.remove('open');
    });
    this.dom.modal.addEventListener('click', (e) => {
      if (e.target === this.dom.modal) {
        this.dom.modal.classList.remove('open');
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.dom.modal.classList.contains('open')) {
        this.dom.modal.classList.remove('open');
      }
      // F5 to run, F10 to step
      if (e.key === 'F5') {
        e.preventDefault();
        this.handleRun();
      }
      if (e.key === 'F10') {
        e.preventDefault();
        this.handleStep();
      }
    });

    // Editor events
    this.dom.codeEditor.addEventListener('input', () => this.updateLineNumbers());
    this.dom.codeEditor.addEventListener('scroll', () => {
      this.dom.lineNumbers.scrollTop = this.dom.codeEditor.scrollTop;
    });

    // Tab key in editor
    this.dom.codeEditor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.dom.codeEditor.selectionStart;
        const end = this.dom.codeEditor.selectionEnd;
        this.dom.codeEditor.value =
          this.dom.codeEditor.value.substring(0, start) +
          '  ' +
          this.dom.codeEditor.value.substring(end);
        this.dom.codeEditor.selectionStart = this.dom.codeEditor.selectionEnd = start + 2;
        this.updateLineNumbers();
      }
    });

    // Example selection
    this.dom.exampleSelect.addEventListener('change', (e) => {
      const ex = Examples.find((item) => item.id === e.target.value);
      if (ex) this.loadExample(ex);
    });

    // New code button
    this.dom.newCodeBtn.addEventListener('click', () => {
      this.dom.exampleSelect.value = '';
      this.dom.codeEditor.value = '';
      this.updateLineNumbers();
      this.interpreter.stop();
      this.hideActiveLine();
      this.log('Editor byl vyčištěn / Editor cleared', 'info');
    });

    // Execution buttons
    this.dom.runBtn.addEventListener('click', () => this.handleRun());
    this.dom.pauseBtn.addEventListener('click', () => this.interpreter.pause());
    this.dom.stepBtn.addEventListener('click', () => this.handleStep());
    this.dom.stopBtn.addEventListener('click', () => this.handleStop());

    // Speed slider
    this.dom.speedSlider.addEventListener('input', (e) => {
      // Invert slider: 0 is slow (600ms), 600 is fastest (0ms)
      const val = parseInt(e.target.value, 10);
      const ms = 600 - val;
      this.interpreter.setSpeed(ms);
    });
    // Set initial speed
    this.interpreter.setSpeed(600 - parseInt(this.dom.speedSlider.value, 10));

    // Manual Pad Buttons
    this.dom.mStep.addEventListener('click', () => this.handleManualAction('STEP'));
    this.dom.mLeft.addEventListener('click', () => this.handleManualAction('LEFT'));
    this.dom.mRight.addEventListener('click', () => this.handleManualAction('RIGHT'));
    this.dom.mAround.addEventListener('click', () => this.handleManualAction('TURN_AROUND'));
    this.dom.mPut.addEventListener('click', () => this.handleManualAction('PUT'));
    this.dom.mPick.addEventListener('click', () => this.handleManualAction('PICK'));

    // World tool switching
    const tools = [
      { btn: this.dom.toolBeeper, mode: 'beeper' },
      { btn: this.dom.toolWall, mode: 'wall' },
      { btn: this.dom.toolKarel, mode: 'karel' },
    ];
    tools.forEach(({ btn, mode }) => {
      btn.addEventListener('click', () => {
        tools.forEach((t) => t.btn.classList.remove('btn-active'));
        btn.classList.add('btn-active');
        this.currentTool = mode;
      });
    });

    // World resize
    this.dom.resizeBtn.addEventListener('click', () => {
      const w = parseInt(this.dom.worldW.value, 10);
      const h = parseInt(this.dom.worldH.value, 10);
      this.world.resize(w, h);
      this.renderer.syncRobotImmediate();
      this.updateHUD();
      this.log(`Rozměry světa změněny na ${this.world.width} × ${this.world.height}`, 'info');
    });

    // Clear world
    this.dom.clearWorldBtn.addEventListener('click', () => {
      this.interpreter.stop();
      this.world.clear();
      this.renderer.syncRobotImmediate();
      this.updateHUD();
      this.log('Svět byl vyčištěn / World cleared', 'info');
    });

    // Random maze generator
    this.dom.mazeBtn.addEventListener('click', () => {
      this.interpreter.stop();
      this.generateMaze();
      this.renderer.syncRobotImmediate();
      this.updateHUD();
      this.log('Vygenerováno náhodné bludiště / Generated random maze', 'info');
    });

    // Clear console
    this.dom.clearConsoleBtn.addEventListener('click', () => {
      this.dom.consoleOutput.innerHTML = '';
    });

    // Canvas click interaction for world editing
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.handleCanvasClick(e, true);
    });

    // Interpreter Event Listeners
    this.interpreter.on('stateChange', (state) => this.handleStateChange(state));
    this.interpreter.on('highlightLine', (line) => this.highlightLine(line));
    this.interpreter.on('action', (action, karel) => this.handleInterpreterAction(action, karel));
    this.interpreter.on('error', (err) => this.handleInterpreterError(err));
    this.interpreter.on('finish', (stats) => this.handleInterpreterFinish(stats));
  }

  updateAudioButton() {
    this.dom.soundBtn.textContent = this.audio.isMuted() ? '🔇' : '🔊';
  }

  updateLineNumbers() {
    const text = this.dom.codeEditor.value;
    const lines = text.split('\n').length;
    let numbers = '';
    for (let i = 1; i <= lines; i++) {
      numbers += i + '\n';
    }
    this.dom.lineNumbers.textContent = numbers;
  }

  highlightLine(line) {
    if (!line) {
      this.hideActiveLine();
      return;
    }
    const marker = this.dom.activeLineMarker;
    const lineHeight = 21.6; // matching 13.5px * 1.6
    const top = 12 + (line - 1) * lineHeight - this.dom.codeEditor.scrollTop;
    marker.style.top = `${top}px`;
    marker.style.display = 'block';

    // Scroll line into view if out of editor bounds
    const editor = this.dom.codeEditor;
    const lineTop = (line - 1) * lineHeight;
    if (lineTop < editor.scrollTop || lineTop > editor.scrollTop + editor.clientHeight - 40) {
      editor.scrollTop = Math.max(0, lineTop - editor.clientHeight / 2);
    }
  }

  hideActiveLine() {
    this.dom.activeLineMarker.style.display = 'none';
  }

  handleStateChange(state) {
    const badge = this.dom.statusBadge;
    badge.className = 'status-badge';

    const t = this.i18n[this.lang];

    switch (state) {
      case InterpreterState.IDLE:
        badge.classList.add('status-idle');
        badge.textContent = t.statusIdle;
        this.dom.runBtn.disabled = false;
        this.dom.pauseBtn.disabled = true;
        this.dom.stepBtn.disabled = false;
        break;

      case InterpreterState.RUNNING:
        badge.classList.add('status-running');
        badge.textContent = t.statusRunning;
        this.dom.runBtn.disabled = true;
        this.dom.pauseBtn.disabled = false;
        this.dom.stepBtn.disabled = true;
        break;

      case InterpreterState.PAUSED:
        badge.classList.add('status-paused');
        badge.textContent = t.statusPaused;
        this.dom.runBtn.disabled = false;
        this.dom.pauseBtn.disabled = true;
        this.dom.stepBtn.disabled = false;
        break;

      case InterpreterState.FINISHED:
        badge.classList.add('status-finished');
        badge.textContent = t.statusFinished;
        this.dom.runBtn.disabled = false;
        this.dom.pauseBtn.disabled = true;
        this.dom.stepBtn.disabled = false;
        break;

      case InterpreterState.ERROR:
        badge.classList.add('status-error');
        badge.textContent = t.statusError;
        this.dom.runBtn.disabled = false;
        this.dom.pauseBtn.disabled = true;
        this.dom.stepBtn.disabled = false;
        break;
    }
  }

  compile() {
    const code = this.dom.codeEditor.value;
    if (!code.trim()) {
      throw new Error('Program je prázdný / Program is empty');
    }
    const lexer = new Lexer(code);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    return parser.parse();
  }

  handleRun() {
    if (this.interpreter.state === InterpreterState.PAUSED) {
      this.interpreter.run();
      return;
    }

    try {
      const ast = this.compile();
      this.interpreter.loadProgram(ast);
      this.log('Spouštím program... / Running program...', 'info');
      this.interpreter.run();
    } catch (err) {
      this.log(`Chyba syntaxe: ${err.message}`, 'error');
      this.audio.playCrash();
    }
  }

  handleStep() {
    if (
      this.interpreter.state === InterpreterState.IDLE ||
      this.interpreter.state === InterpreterState.FINISHED ||
      this.interpreter.state === InterpreterState.ERROR
    ) {
      try {
        const ast = this.compile();
        this.interpreter.loadProgram(ast);
      } catch (err) {
        this.log(`Chyba syntaxe: ${err.message}`, 'error');
        this.audio.playCrash();
        return;
      }
    }
    this.interpreter.step();
  }

  handleStop() {
    this.interpreter.stop();
    this.world.restoreInitialSnapshot();
    this.renderer.syncRobotImmediate();
    this.updateHUD();
    this.hideActiveLine();
    this.log('Program zastaven a svět resetován / Program stopped & reset', 'info');
  }

  handleInterpreterAction(action, karel) {
    this.renderer.animateToKarel();
    this.updateHUD();

    switch (action) {
      case 'STEP':
        this.audio.playStep();
        break;
      case 'LEFT':
      case 'RIGHT':
      case 'TURN_AROUND':
        this.audio.playTurn();
        break;
      case 'PUT':
        this.audio.playPut();
        break;
      case 'PICK':
        this.audio.playPick();
        break;
    }
  }

  handleInterpreterError(errorMsg) {
    this.audio.playCrash();
    this.log(`Chyba běhu: ${errorMsg}`, 'error');
  }

  handleInterpreterFinish(stats) {
    this.audio.playVictory();
    this.log(
      `Program úspěšně dokončen! (${stats.actionCount} akcí, ${stats.operationCount} operací)`,
      'success'
    );
  }

  handleManualAction(action) {
    if (this.interpreter.state === InterpreterState.RUNNING) {
      this.interpreter.pause();
    }

    try {
      switch (action) {
        case 'STEP':
          this.world.step();
          this.audio.playStep();
          this.log('Ručně: KROK / STEP', 'info');
          break;
        case 'LEFT':
          this.world.turnLeft();
          this.audio.playTurn();
          this.log('Ručně: VLEVO-BOK / TURN_LEFT', 'info');
          break;
        case 'RIGHT':
          this.world.turnRight();
          this.audio.playTurn();
          this.log('Ručně: VPRAVO-BOK / TURN_RIGHT', 'info');
          break;
        case 'TURN_AROUND':
          this.world.turnAround();
          this.audio.playTurn();
          this.log('Ručně: CELEM-VZAD / TURN_AROUND', 'info');
          break;
        case 'PUT':
          this.world.putBeeper();
          this.audio.playPut();
          this.log('Ručně: POLOŽ / PUT', 'info');
          break;
        case 'PICK':
          this.world.pickBeeper();
          this.audio.playPick();
          this.log('Ručně: ZVEDNI / PICK', 'info');
          break;
      }
      this.renderer.animateToKarel();
      this.updateHUD();
    } catch (err) {
      this.audio.playCrash();
      this.log(`Chyba: ${err.message}`, 'error');
    }
  }

  handleCanvasClick(e, isRightClick = false) {
    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const hit = this.renderer.hitTest(px, py);
    if (!hit) return;

    if (this.currentTool === 'beeper') {
      if (hit.type === 'CELL') {
        const delta = isRightClick || e.shiftKey ? -1 : 1;
        this.world.addBeeper(hit.x, hit.y, delta);
        if (delta > 0) this.audio.playPut();
        else this.audio.playPick();
        this.renderer.render();
        this.updateHUD();
      }
    } else if (this.currentTool === 'wall') {
      if (hit.type === 'WALL_V') {
        this.world.toggleVerticalWall(hit.x, hit.y);
        this.audio.playStep();
        this.renderer.render();
      } else if (hit.type === 'WALL_H') {
        this.world.toggleHorizontalWall(hit.x, hit.y);
        this.audio.playStep();
        this.renderer.render();
      }
    } else if (this.currentTool === 'karel') {
      if (hit.type === 'CELL') {
        if (this.world.karel.x === hit.x && this.world.karel.y === hit.y) {
          // Rotate Karel on same cell click
          this.world.turnRight();
          this.audio.playTurn();
        } else {
          // Move Karel to new cell
          this.world.karel.x = hit.x;
          this.world.karel.y = hit.y;
          this.audio.playStep();
        }
        this.renderer.syncRobotImmediate();
        this.updateHUD();
      }
    }

    // Save as new initial world configuration
    this.world.saveInitialSnapshot();
  }

  generateMaze() {
    this.world.clear();
    const w = this.world.width;
    const h = this.world.height;

    // Place all walls initially
    for (let x = 1; x < w; x++) {
      for (let y = 1; y <= h; y++) {
        this.world.toggleVerticalWall(x, y);
      }
    }
    for (let x = 1; x <= w; x++) {
      for (let y = 1; y < h; y++) {
        this.world.toggleHorizontalWall(x, y);
      }
    }

    // Randomized Kruskal / DFS maze generation
    const visited = new Set();
    const stack = [];

    const cellKey = (x, y) => `${x},${y}`;
    const startX = 1;
    const startY = 1;
    visited.add(cellKey(startX, startY));
    stack.push({ x: startX, y: startY });

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = [];

      const dirs = [
        { dx: 0, dy: 1, dir: Direction.NORTH },
        { dx: 1, dy: 0, dir: Direction.EAST },
        { dx: 0, dy: -1, dir: Direction.SOUTH },
        { dx: -1, dy: 0, dir: Direction.WEST },
      ];

      for (const d of dirs) {
        const nx = current.x + d.dx;
        const ny = current.y + d.dy;
        if (nx >= 1 && nx <= w && ny >= 1 && ny <= h && !visited.has(cellKey(nx, ny))) {
          neighbors.push({ x: nx, y: ny, dir: d.dir });
        }
      }

      if (neighbors.length > 0) {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        // Knock down wall between current and next
        if (next.dir === Direction.NORTH) {
          this.world.horizontalWalls.delete(`h:${current.x}:${current.y}`);
        } else if (next.dir === Direction.SOUTH) {
          this.world.horizontalWalls.delete(`h:${current.x}:${current.y - 1}`);
        } else if (next.dir === Direction.EAST) {
          this.world.verticalWalls.delete(`v:${current.x}:${current.y}`);
        } else if (next.dir === Direction.WEST) {
          this.world.verticalWalls.delete(`v:${current.x - 1}:${current.y}`);
        }

        visited.add(cellKey(next.x, next.y));
        stack.push(next);
      } else {
        stack.pop();
      }
    }

    // Place a goal beeper at opposite corner
    this.world.setBeepers(w, h, 1);
    this.world.karel.x = 1;
    this.world.karel.y = 1;
    this.world.karel.dir = Direction.EAST;
    this.world.saveInitialSnapshot();
  }

  updateHUD() {
    const k = this.world.karel;
    this.dom.hudPos.textContent = `[${k.x}, ${k.y}]`;

    const t = this.i18n[this.lang];
    const dirMap = {
      [Direction.NORTH]: t.dirNorth,
      [Direction.EAST]: t.dirEast,
      [Direction.SOUTH]: t.dirSouth,
      [Direction.WEST]: t.dirWest,
    };
    this.dom.hudDir.textContent = dirMap[k.dir] || k.dir;

    this.dom.hudBag.textContent = k.bag === Infinity ? '∞' : String(k.bag);
    this.dom.hudCellBeepers.textContent = String(this.world.getBeepers(k.x, k.y));
  }

  log(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;

    const time = new Date().toLocaleTimeString();
    entry.textContent = `[${time}] ${message}`;

    this.dom.consoleOutput.appendChild(entry);
    this.dom.consoleOutput.scrollTop = this.dom.consoleOutput.scrollHeight;
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.karelApp = new KarelApp();
});


})();
