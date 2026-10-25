/**
 * Karel Programming Language - Parser
 * Recursive descent parser generating an AST.
 */

import { TokenType, canonicalize } from './lexer.js';
import {
  ProgramNode,
  ProcedureDefNode,
  CallNode,
  ReturnNode,
  FuncCallNode,
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

const UNARY_MATH_FUNCS = new Set([
  'SIN', 'COS', 'TAN', 'TG', 'ASIN', 'ACOS', 'ATAN', 'ATG',
  'SIND', 'COSD', 'TAND', 'SINDEG', 'COSDEG', 'TANDEG',
  'RAD', 'TORAD', 'RADIANS', 'DEG', 'TODEG', 'DEGREES',
  'ROUND', 'ZAOKROUHLI', 'FLOOR', 'PODLAHA', 'CELACAST',
  'CEIL', 'CEILING', 'STROP', 'TRUNC', 'INT', 'FRAC',
  'ABS', 'SQRT', 'ODMOCNINA', 'CBRT', 'EXP', 'LOG', 'LN', 'LOG10', 'LOG2',
  'SIGN', 'SGN', 'ZNAMENKO',
]);

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
   * Parse procedure or function definition:
   * PRIKAZ <NAME>[(a, b) | a b] ... KONEC
   * FUNKCE <NAME>(a, b) ... VRAT <expr> ... KONEC
   * or DEFINE <NAME>(a, b) { ... }
   */
  parseProcedure() {
    const defToken = this.advance(); // consume KW_DEFINE
    const token = this.peek();
    let name;
    if (token.type === TokenType.IDENTIFIER || token.type.startsWith('CMD_')) {
      name = this.advance().value;
    } else {
      throw new Error(
        `Očekáván název příkazu nebo funkce / Expected procedure or function name (řádek ${token.line}, sloupec ${token.col})`
      );
    }
    const loc = { line: defToken.line, col: defToken.col };
    const params = [];

    // Optional parameters: either (a, b) or space-separated on the same header line
    if (this.match(TokenType.LPAREN)) {
      while (!this.isAtEnd() && !this.check(TokenType.RPAREN)) {
        const paramToken = this.consume(
          TokenType.IDENTIFIER,
          'Očekáván název parametru / Expected parameter name'
        );
        params.push(paramToken.value);
        this.match(TokenType.COMMA);
      }
      this.consume(TokenType.RPAREN, "Očekávána ')' za parametry / Expected ')'");
    } else {
      while (
        !this.isAtEnd() &&
        this.peek().line === defToken.line &&
        this.check(TokenType.IDENTIFIER)
      ) {
        params.push(this.advance().value);
        this.match(TokenType.COMMA);
      }
    }

    // Optional colon or '{'
    const hasBrace = this.match(TokenType.LBRACE);
    this.skipPunctuation();

    const body = this.parseStatementBlock(hasBrace ? 'BRACE' : 'END');

    return new ProcedureDefNode(name, body, loc, params);
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
        const endToken = this.advance(); // consume END/KONEC
        // Optional name after END in some classic Karel dialects: KONEC <NAME> (must be on the same line)
        if (!this.isAtEnd() && this.peek().line === endToken.line && this.check(TokenType.IDENTIFIER)) {
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

    // Return statement: VRAT [<expr>] / RETURN [<expr>]
    if (this.match(TokenType.KW_RETURN)) {
      this.match(TokenType.ASSIGN);
      let expr = null;
      if (
        !this.isAtEnd() &&
        this.peek().line === loc.line &&
        !this.check(TokenType.SEMICOLON) &&
        !this.check(TokenType.RBRACE) &&
        !this.check(TokenType.KW_END) &&
        !this.check(TokenType.KW_ELSE)
      ) {
        expr = this.parseExpression();
        if (
          expr.type === 'Variable' &&
          !this.isAtEnd() &&
          this.peek().line === loc.line &&
          !this.check(TokenType.SEMICOLON) &&
          !this.check(TokenType.RBRACE) &&
          !this.check(TokenType.KW_END) &&
          !this.check(TokenType.KW_ELSE)
        ) {
          const args = this.parseRemainingLineArgs(loc.line);
          expr = new FuncCallNode(expr.name, args, expr.loc);
        }
      } else {
        expr = new NumberLiteralNode(0, loc);
      }
      return new ReturnNode(expr, loc);
    }

    // Variable assignment: LET <name> [=] <expr>
    if (this.match(TokenType.KW_LET)) {
      const nameToken = this.consume(
        TokenType.IDENTIFIER,
        "Očekáván název proměnné za LET / Expected variable name after LET"
      );
      // Optional '='
      this.match(TokenType.ASSIGN);
      let expr = this.parseExpression();
      if (
        expr.type === 'Variable' &&
        !this.isAtEnd() &&
        this.peek().line === loc.line &&
        !this.check(TokenType.SEMICOLON) &&
        !this.check(TokenType.RBRACE) &&
        !this.check(TokenType.KW_END) &&
        !this.check(TokenType.KW_ELSE)
      ) {
        const args = this.parseRemainingLineArgs(loc.line);
        expr = new FuncCallNode(expr.name, args, expr.loc);
      }
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
        let expr = this.parseExpression();
        if (
          expr.type === 'Variable' &&
          !this.isAtEnd() &&
          this.peek().line === loc.line &&
          !this.check(TokenType.SEMICOLON) &&
          !this.check(TokenType.RBRACE) &&
          !this.check(TokenType.KW_END) &&
          !this.check(TokenType.KW_ELSE)
        ) {
          const args = this.parseRemainingLineArgs(loc.line);
          expr = new FuncCallNode(expr.name, args, expr.loc);
        }
        return new AssignNode(idToken.value, expr, loc);
      }
      const idToken = this.advance();
      const args = this.parseCallArgs(idToken.line);
      return new CallNode(idToken.value, loc, args);
    }

    // If unexpected token:
    throw new Error(
      `Neočekávaný příkaz '${token.raw || token.type}' na řádku ${token.line}, sloupci ${token.col}`
    );
  }

  parseCallArgs(line) {
    const args = [];
    if (this.match(TokenType.LPAREN)) {
      while (!this.isAtEnd() && !this.check(TokenType.RPAREN)) {
        args.push(this.parseExpression());
        this.match(TokenType.COMMA);
      }
      this.consume(TokenType.RPAREN, "Očekávána ')' za argumenty / Expected ')' after arguments");
      return args;
    }
    return this.parseRemainingLineArgs(line);
  }

  parseRemainingLineArgs(line) {
    const args = [];
    while (
      !this.isAtEnd() &&
      this.peek().line === line &&
      !this.check(TokenType.SEMICOLON) &&
      !this.check(TokenType.RBRACE) &&
      !this.check(TokenType.KW_END) &&
      !this.check(TokenType.KW_ELSE) &&
      !this.check(TokenType.KW_THEN) &&
      !this.check(TokenType.KW_TIMES)
    ) {
      args.push(this.parseExpression());
      this.match(TokenType.COMMA);
    }
    return args;
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

    // Check for typo in KRAT / TIMES (e.g. KRATf)
    if (!this.isAtEnd()) {
      const next = this.peek();
      if (
        next.line === loc.line &&
        next.type !== TokenType.LBRACE &&
        next.type !== TokenType.COLON &&
        next.type !== TokenType.SEMICOLON
      ) {
        if (next.type === TokenType.KW_TIMES) {
          this.advance();
        } else if (
          next.type === TokenType.IDENTIFIER &&
          (canonicalize(next.value).startsWith('KRAT') ||
            canonicalize(next.value).startsWith('TIME'))
        ) {
          throw new Error(
            `Neplatné slovo '${next.raw}' na řádku ${next.line}, sloupci ${next.col}. Měli jste na mysli 'KRAT'? / Invalid word '${next.raw}' on line ${next.line}. Did you mean 'KRAT'?`
          );
        }
      }
    }

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
      this.check(TokenType.ASSIGN) ||
      this.check(TokenType.NEQ) ||
      this.check(TokenType.LT) ||
      this.check(TokenType.LTE) ||
      this.check(TokenType.GT) ||
      this.check(TokenType.GTE)
    ) {
      const opToken = this.advance();
      const op = opToken.type === TokenType.ASSIGN ? '==' : opToken.value;
      const right = this.parseAddition();
      expr = new BinaryOpNode(op, expr, right, {
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
      if (this.match(TokenType.LPAREN)) {
        const args = [];
        while (!this.isAtEnd() && !this.check(TokenType.RPAREN)) {
          args.push(this.parseExpression());
          this.match(TokenType.COMMA);
        }
        this.consume(
          TokenType.RPAREN,
          "Očekávána ')' za argumenty funkce / Expected ')' after function arguments"
        );
        return new FuncCallNode(token.value, args, loc);
      }

      const canon = canonicalize(token.value);
      if (
        UNARY_MATH_FUNCS.has(canon) &&
        !this.isAtEnd() &&
        this.peek().line === token.line &&
        (this.check(TokenType.NUMBER) ||
          this.check(TokenType.IDENTIFIER) ||
          this.check(TokenType.LPAREN))
      ) {
        const arg = this.parseUnary();
        return new FuncCallNode(token.value, [arg], loc);
      }

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

    const SENSOR_TOKENS = new Set([
      TokenType.COND_WALL,
      TokenType.COND_CLEAR,
      TokenType.COND_BEEPER,
      TokenType.COND_BAG,
      TokenType.COND_NORTH,
      TokenType.COND_SOUTH,
      TokenType.COND_EAST,
      TokenType.COND_WEST,
    ]);

    const nextToken = this.peek();
    if (
      nextToken &&
      !SENSOR_TOKENS.has(nextToken.type) &&
      (nextToken.type === TokenType.IDENTIFIER ||
        nextToken.type === TokenType.NUMBER ||
        nextToken.type === TokenType.LPAREN)
    ) {
      // Natural language variable comparison following JE / NENI
      // Examples: "JE zbytek 0", "NENI zbytek 0", "JE zbytek == 0", "JE zbytek = 0"
      let left = this.parseExpression();

      if (
        !(left instanceof BinaryOpNode) &&
        !this.isAtEnd() &&
        this.peek().line === loc.line &&
        (this.peek().type === TokenType.IDENTIFIER ||
          this.peek().type === TokenType.NUMBER ||
          this.peek().type === TokenType.LPAREN)
      ) {
        const right = this.parseExpression();
        left = new BinaryOpNode(inverted ? '!=' : '==', left, right, loc);
      } else if (inverted) {
        if (left instanceof BinaryOpNode) {
          const invMap = { '==': '!=', '!=': '==', '<': '>=', '<=': '>', '>': '<=', '>=': '<' };
          if (invMap[left.op]) {
            left.op = invMap[left.op];
          } else {
            left = new UnaryOpNode('!', left, loc);
          }
        } else {
          left = new BinaryOpNode('==', left, new NumberLiteralNode(0, loc), loc);
        }
      }

      return new ExprConditionNode(left, loc);
    }

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
