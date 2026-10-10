/**
 * Karel Programming Language - Parser
 * Recursive descent parser generating an AST.
 */

import { TokenType, canonicalize } from './lexer.js';
import {
  ProgramNode,
  ProcedureDefNode,
  CallNode,
  CommandNode,
  RepeatNode,
  WhileNode,
  IfNode,
  ConditionNode,
  AssignNode,
  BinaryOpNode,
  UnaryOpNode,
  NumberLiteralNode,
  VariableNode,
  ExprConditionNode
} from './ast.js';

export class Parser {
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

    // Variable assignment: LET <name> [=] <expr>
    if (this.match(TokenType.KW_LET)) {
      const nameToken = this.consume(
        TokenType.IDENTIFIER,
        "Očekáván název proměnné za LET / Expected variable name after LET"
      );
      // Optional '='
      this.match(TokenType.ASSIGN);
      const expr = this.parseExpression();
      return new AssignNode(nameToken.value, expr, loc);
    }

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

    // User defined procedure call or direct assignment <id> = <expr>
    if (this.check(TokenType.IDENTIFIER)) {
      const nextToken = this.tokens[this.pos + 1];
      if (nextToken && nextToken.type === TokenType.ASSIGN) {
        const idToken = this.advance();
        this.advance(); // consume '='
        const expr = this.parseExpression();
        return new AssignNode(idToken.value, expr, loc);
      }
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
    let countExpr;
    if (this.match(TokenType.LPAREN)) {
      countExpr = this.parseExpression();
      this.consume(TokenType.RPAREN, "Očekávána ')' za výrazem / Expected ')'");
    } else {
      countExpr = this.parseExpression();
    }

    // Optional KRAT / TIMES
    this.match(TokenType.KW_TIMES);

    // Optional brace or colon
    const hasBrace = this.match(TokenType.LBRACE);
    this.skipPunctuation();

    const body = this.parseStatementBlock(hasBrace ? 'BRACE' : 'END');
    return new RepeatNode(countExpr, body, loc);
  }

  parseExpression() {
    return this.parseComparison();
  }

  parseComparison() {
    let expr = this.parseAddition();
    while (
      this.check(TokenType.EQ) ||
      this.check(TokenType.NEQ) ||
      this.check(TokenType.LT) ||
      this.check(TokenType.LTE) ||
      this.check(TokenType.GT) ||
      this.check(TokenType.GTE)
    ) {
      const opToken = this.advance();
      const right = this.parseAddition();
      expr = new BinaryOpNode(opToken.value, expr, right, {
        line: opToken.line,
        col: opToken.col,
      });
    }
    return expr;
  }

  parseAddition() {
    let expr = this.parseMultiplication();
    while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS)) {
      const opToken = this.advance();
      const right = this.parseMultiplication();
      expr = new BinaryOpNode(opToken.value, expr, right, {
        line: opToken.line,
        col: opToken.col,
      });
    }
    return expr;
  }

  parseMultiplication() {
    let expr = this.parseUnary();
    while (
      this.check(TokenType.STAR) ||
      this.check(TokenType.SLASH) ||
      this.check(TokenType.PERCENT)
    ) {
      const opToken = this.advance();
      const op = opToken.value === '%' || canonicalize(opToken.value) === 'MOD' ? '%' : opToken.value;
      const right = this.parseUnary();
      expr = new BinaryOpNode(op, expr, right, {
        line: opToken.line,
        col: opToken.col,
      });
    }
    return expr;
  }

  parseUnary() {
    if (this.check(TokenType.MINUS) || this.check(TokenType.KW_NOT)) {
      const opToken = this.advance();
      const operand = this.parseUnary();
      return new UnaryOpNode(opToken.value, operand, {
        line: opToken.line,
        col: opToken.col,
      });
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    const token = this.peek();
    const loc = { line: token.line, col: token.col };

    if (this.match(TokenType.NUMBER)) {
      return new NumberLiteralNode(token.value, loc);
    }

    if (this.match(TokenType.IDENTIFIER)) {
      return new VariableNode(token.value, loc);
    }

    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpression();
      this.consume(TokenType.RPAREN, "Očekávána ')' za výrazem / Expected ')' after expression");
      return expr;
    }

    throw new Error(
      `Očekáváno číslo nebo proměnná / Expected number or variable, but found '${token.raw || token.type}' na řádku ${token.line}, sloupci ${token.col}`
    );
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

    // Check if condition is a numeric or comparison expression (e.g. x < 5 or idx % 2 == 0)
    if (
      this.check(TokenType.IDENTIFIER) ||
      this.check(TokenType.NUMBER) ||
      (this.check(TokenType.LPAREN) &&
        (this.tokens[this.pos + 1]?.type === TokenType.IDENTIFIER ||
          this.tokens[this.pos + 1]?.type === TokenType.NUMBER))
    ) {
      const expr = this.parseExpression();
      return new ExprConditionNode(expr, loc);
    }

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
