/**
 * Karel Programming Language - Step-by-Step Interpreter
 * Virtual machine using JavaScript generator for fine-grained
 * stepping, line highlighting, and animation control.
 */

import { canonicalize } from './lexer.js';

export const InterpreterState = {
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  FINISHED: 'FINISHED',
  ERROR: 'ERROR',
};

export class Interpreter {
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
    this.variables = new Map();
    this.callStack = [];
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
      variableChange: [],
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
    this.variables.clear();
    this.callStack = [];
    this.callDepth = 0;
    this.operationCount = 0;
    this.actionCount = 0;
    this.setState(InterpreterState.IDLE);
  }

  initGenerator() {
    if (!this.program) return null;
    this.callStack = [];
    this.callDepth = 0;
    this.operationCount = 0;
    this.actionCount = 0;
    this.generator = this.runProgramGenerator(this.program);
    return this.generator;
  }

  hasActiveReturn() {
    return this.callStack.length > 0 && this.callStack[this.callStack.length - 1].returned;
  }

  *runProgramGenerator(program) {
    yield* this.runStatements(program.body, program.procedures);
  }

  *runStatements(statements, procedures) {
    for (const stmt of statements) {
      if (this.hasActiveReturn()) return;

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

        case 'Assign':
          yield* this.runAssign(stmt, procedures);
          break;

        case 'Call':
          yield* this.runCall(stmt, procedures);
          break;

        case 'Print':
          yield* this.runPrint(stmt, procedures);
          break;

        case 'Return':
          yield* this.runReturn(stmt, procedures);
          return;

        default:
          throw new Error(`Neznámý typ uzlu AST / Unknown AST node type: ${stmt.type}`);
      }

      if (this.hasActiveReturn()) return;
    }
  }

  formatPythonValue(val, formatSpec = '') {
    if (!formatSpec) {
      if (typeof val === 'number' && !Number.isInteger(val)) {
        // Avoid float noise like 0.30000000000000004 when unformatted
        return String(Number(val.toPrecision(12)));
      }
      return String(val);
    }

    // Parse Python format spec: [[fill]align][sign][0][width][.precision][type]
    const match = formatSpec.match(/^(.?[<>=^])?([+\- ])?(0)?(\d+)?(?:\.(\d+))?([fFeEgGdoxXb%s])?$/);
    if (!match) {
      return String(val);
    }
    const [, alignPart, signPart, zeroPad, widthStr, precStr, typeChar] = match;
    const num = Number(val);
    let result = String(val);

    if (!Number.isNaN(num) && typeChar !== 's') {
      const prec = precStr !== undefined ? parseInt(precStr, 10) : undefined;
      switch (typeChar) {
        case 'f':
        case 'F':
          result = num.toFixed(prec !== undefined ? prec : 6);
          break;
        case 'e':
          result = num.toExponential(prec !== undefined ? prec : 6);
          break;
        case 'E':
          result = num.toExponential(prec !== undefined ? prec : 6).toUpperCase();
          break;
        case 'd':
          result = Math.trunc(num).toString(10);
          break;
        case 'x':
          result = Math.trunc(num).toString(16);
          break;
        case 'X':
          result = Math.trunc(num).toString(16).toUpperCase();
          break;
        case 'b':
          result = Math.trunc(num).toString(2);
          break;
        case 'o':
          result = Math.trunc(num).toString(8);
          break;
        case '%':
          result = (num * 100).toFixed(prec !== undefined ? prec : 2) + '%';
          break;
        default:
          if (prec !== undefined) {
            result = num.toFixed(prec);
          } else if (!Number.isInteger(num)) {
            result = String(Number(num.toPrecision(12)));
          }
          break;
      }
      if (num >= 0 && signPart === '+') {
        result = '+' + result;
      } else if (num >= 0 && signPart === ' ') {
        result = ' ' + result;
      }
    }

    const width = widthStr ? parseInt(widthStr, 10) : 0;
    if (width > result.length) {
      let fill = zeroPad ? '0' : ' ';
      let align = !Number.isNaN(num) ? '>' : '<';
      if (alignPart) {
        if (alignPart.length === 2) {
          fill = alignPart[0];
          align = alignPart[1];
        } else {
          align = alignPart[0];
        }
      }
      const padLen = width - result.length;
      if (align === '<') {
        result = result + fill.repeat(padLen);
      } else if (align === '^') {
        const leftPad = Math.floor(padLen / 2);
        const rightPad = padLen - leftPad;
        result = fill.repeat(leftPad) + result + fill.repeat(rightPad);
      } else {
        result = fill.repeat(padLen) + result;
      }
    }

    return result;
  }

  *runPrint(stmt, procedures) {
    const activeProcedures = procedures || this.program?.procedures;
    const pieces = [];
    for (const argExpr of stmt.args || []) {
      const val = yield* this.evalExpr(argExpr, activeProcedures);
      pieces.push(this.formatPythonValue(val));
    }
    const message = pieces.join(' ');
    this.emit('log', message, stmt.loc);
    yield {
      type: 'PRINT',
      message,
      loc: stmt.loc,
    };
    return message;
  }

  *runReturn(stmt, procedures) {
    const val = stmt.expr ? (yield* this.evalExpr(stmt.expr, procedures)) : 0;
    if (this.callStack.length > 0) {
      const topFrame = this.callStack[this.callStack.length - 1];
      topFrame.returned = true;
      topFrame.returnValue = val;
    }
    yield {
      type: 'RETURN',
      value: val,
      loc: stmt.loc,
    };
  }

  evalBuiltinFunc(norm, args, loc) {
    const lineInfo = loc ? ` (řádek ${loc.line})` : '';
    const requireArgs = (min) => {
      if (args.length < min) {
        throw new Error(
          `Funkce '${norm}' vyžaduje alespoň ${min} argument(y), předáno ${args.length} / Function '${norm}' requires at least ${min} argument(s)${lineInfo}`
        );
      }
    };

    switch (norm) {
      // Karel position & state getters
      case 'KDEX':
      case 'WHEREX':
      case 'GETX':
      case 'POSX':
      case 'KARELX':
      case 'POZICEX':
      case 'SOURADNICEX':
        return this.world.karel.x;

      case 'KDEY':
      case 'WHEREY':
      case 'GETY':
      case 'POSY':
      case 'KARELY':
      case 'POZICEY':
      case 'SOURADNICEY':
        return this.world.karel.y;

      case 'KDESMER':
      case 'SMER':
      case 'WHEREDIR':
      case 'GETDIR':
      case 'KARELDIR':
        return this.world.karel.dir;

      case 'KDEZNACKY':
      case 'POCETZNACEK':
      case 'WHEREBEEPERS':
      case 'GETBEEPERS':
      case 'BEEPERSHERE':
        return this.world.getBeepers(this.world.karel.x, this.world.karel.y);

      // Constants as 0-arg functions
      case 'PI':
        return Math.PI;
      case 'E':
        return Math.E;

      // Trigonometric functions (radians)
      case 'SIN':
        requireArgs(1);
        return Math.sin(args[0]);
      case 'COS':
        requireArgs(1);
        return Math.cos(args[0]);
      case 'TAN':
      case 'TG':
        requireArgs(1);
        return Math.tan(args[0]);
      case 'ASIN':
      case 'ARCSIN':
        requireArgs(1);
        return Math.asin(args[0]);
      case 'ACOS':
      case 'ARCCOS':
        requireArgs(1);
        return Math.acos(args[0]);
      case 'ATAN':
      case 'ARCTAN':
        requireArgs(1);
        return Math.atan(args[0]);
      case 'ATG':
        requireArgs(1);
        return Math.atan(args[0]);
      case 'ATAN2':
      case 'ARCTAN2':
        requireArgs(2);
        return Math.atan2(args[0], args[1]);

      // Trigonometric functions (degrees) & conversions
      case 'SIND':
      case 'SINDEG':
        requireArgs(1);
        return Math.sin((args[0] * Math.PI) / 180);
      case 'COSD':
      case 'COSDEG':
        requireArgs(1);
        return Math.cos((args[0] * Math.PI) / 180);
      case 'TAND':
      case 'TANDEG':
      case 'TGD':
        requireArgs(1);
        return Math.tan((args[0] * Math.PI) / 180);
      case 'RAD':
      case 'TORAD':
      case 'RADIANS':
        requireArgs(1);
        return (args[0] * Math.PI) / 180;
      case 'DEG':
      case 'TODEG':
      case 'DEGREES':
        requireArgs(1);
        return (args[0] * 180) / Math.PI;

      // Rounding & basic math functions
      case 'ROUND':
      case 'ZAOKROUHLI':
        requireArgs(1);
        if (args.length >= 2) {
          const factor = Math.pow(10, args[1]);
          return Math.round(args[0] * factor) / factor;
        }
        return Math.round(args[0]);
      case 'FLOOR':
      case 'PODLAHA':
      case 'CELACAST':
        requireArgs(1);
        return Math.floor(args[0]);
      case 'CEIL':
      case 'CEILING':
      case 'STROP':
        requireArgs(1);
        return Math.ceil(args[0]);
      case 'TRUNC':
      case 'INT':
        requireArgs(1);
        return Math.trunc(args[0]);
      case 'FRAC':
        requireArgs(1);
        return args[0] - Math.trunc(args[0]);
      case 'ABS':
        requireArgs(1);
        return Math.abs(args[0]);
      case 'SQRT':
      case 'ODMOCNINA':
        requireArgs(1);
        if (args[0] < 0) {
          throw new Error(`Odmocnina ze záporného čísla / Square root of negative number${lineInfo}`);
        }
        return Math.sqrt(args[0]);
      case 'CBRT':
        requireArgs(1);
        return Math.cbrt(args[0]);
      case 'POW':
      case 'MOCNINA':
        requireArgs(2);
        return Math.pow(args[0], args[1]);
      case 'EXP':
        requireArgs(1);
        return Math.exp(args[0]);
      case 'LOG':
      case 'LN':
        requireArgs(1);
        return Math.log(args[0]);
      case 'LOG10':
        requireArgs(1);
        return Math.log10(args[0]);
      case 'LOG2':
        requireArgs(1);
        return Math.log2(args[0]);
      case 'SIGN':
      case 'SGN':
      case 'ZNAMENKO':
        requireArgs(1);
        return Math.sign(args[0]);
      case 'MIN':
        requireArgs(2);
        return Math.min(...args);
      case 'MAX':
        requireArgs(2);
        return Math.max(...args);
      case 'CLAMP':
      case 'OMEZ':
        requireArgs(3);
        return Math.min(Math.max(args[0], args[1]), args[2]);
      case 'HYPOT':
      case 'VZDALENOST':
      case 'DIST':
        requireArgs(2);
        return Math.hypot(...args);
      case 'RANDOM':
      case 'RAND':
      case 'NAHODA':
        if (args.length === 0) return Math.random();
        if (args.length === 1) return Math.floor(Math.random() * args[0]);
        return Math.floor(args[0] + Math.random() * (args[1] - args[0] + 1));

      case 'STR':
      case 'TEXT':
        requireArgs(1);
        return this.formatPythonValue(args[0]);

      case 'LEN':
      case 'DELKA':
        requireArgs(1);
        return String(args[0]).length;

      default:
        throw new Error(
          `Neznámá funkce '${norm}' / Unknown function '${norm}'${lineInfo}`
        );
    }
  }

  *evalExpr(node, procedures) {
    if (!node) return 0;
    if (typeof node === 'number' || typeof node === 'string') return node;

    switch (node.type) {
      case 'NumberLiteral':
        return node.value;

      case 'StringLiteral': {
        const activeProcedures = procedures || this.program?.procedures;
        if (!node.parts || node.parts.length === 0) {
          return node.text || '';
        }
        let out = '';
        for (const part of node.parts) {
          if (part.type === 'text') {
            out += part.value;
          } else if (part.type === 'expr') {
            const val = yield* this.evalExpr(part.expr, activeProcedures);
            out += this.formatPythonValue(val, part.formatSpec);
          }
        }
        return out;
      }

      case 'Variable': {
        const key = canonicalize(node.name);
        // 1. Check local scope in top call frame
        if (this.callStack.length > 0) {
          const topFrame = this.callStack[this.callStack.length - 1];
          if (topFrame.locals.has(key)) {
            return topFrame.locals.get(key);
          }
        }
        // 2. Check global variables
        if (this.variables.has(key)) {
          return this.variables.get(key);
        }
        // 3. Built-in 0-argument position getters and constants (kdeX, kdeY, whereX, whereY, PI, E)
        if (
          key === 'KDEX' ||
          key === 'WHEREX' ||
          key === 'GETX' ||
          key === 'POSX' ||
          key === 'KARELX' ||
          key === 'POZICEX' ||
          key === 'SOURADNICEX'
        ) {
          return this.world.karel.x;
        }
        if (
          key === 'KDEY' ||
          key === 'WHEREY' ||
          key === 'GETY' ||
          key === 'POSY' ||
          key === 'KARELY' ||
          key === 'POZICEY' ||
          key === 'SOURADNICEY'
        ) {
          return this.world.karel.y;
        }
        if (
          key === 'KDESMER' ||
          key === 'SMER' ||
          key === 'WHEREDIR' ||
          key === 'GETDIR' ||
          key === 'KARELDIR'
        ) {
          return this.world.karel.dir;
        }
        if (
          key === 'KDEZNACKY' ||
          key === 'POCETZNACEK' ||
          key === 'WHEREBEEPERS' ||
          key === 'GETBEEPERS' ||
          key === 'BEEPERSHERE'
        ) {
          return this.world.getBeepers(this.world.karel.x, this.world.karel.y);
        }
        if (key === 'PI') return Math.PI;
        if (key === 'E') return Math.E;

        // 4. Zero-argument user-defined function called without parentheses
        const activeProcedures = procedures || this.program?.procedures;
        if (activeProcedures && activeProcedures.has(key)) {
          return yield* this.runCall({ name: node.name, args: [], loc: node.loc }, activeProcedures);
        }

        throw new Error(
          `Nedefinovaná proměnná '${node.name}' / Undefined variable '${node.name}' (řádek ${node.loc.line})`
        );
      }

      case 'FuncCall': {
        const norm = canonicalize(node.name);
        const activeProcedures = procedures || this.program?.procedures;
        if (activeProcedures && activeProcedures.has(norm)) {
          return yield* this.runCall(
            { name: node.name, args: node.args || [], loc: node.loc },
            activeProcedures
          );
        }
        if (
          norm === 'NAPIS' ||
          norm === 'VYPIS' ||
          norm === 'TISKNI' ||
          norm === 'PRINT' ||
          norm === 'CONSOLELOG' ||
          norm === 'ECHO'
        ) {
          return yield* this.runPrint({ args: node.args || [], loc: node.loc }, activeProcedures);
        }
        const evalArgs = [];
        for (const argExpr of node.args || []) {
          evalArgs.push(yield* this.evalExpr(argExpr, activeProcedures));
        }
        return this.evalBuiltinFunc(norm, evalArgs, node.loc);
      }

      case 'BinaryOp': {
        const left = yield* this.evalExpr(node.left, procedures);
        const right = yield* this.evalExpr(node.right, procedures);
        switch (node.op) {
          case '+':
            if (typeof left === 'string' || typeof right === 'string') {
              return this.formatPythonValue(left) + this.formatPythonValue(right);
            }
            return left + right;
          case '-': return left - right;
          case '*':
            if (typeof left === 'string' && typeof right === 'number') {
              return left.repeat(Math.max(0, Math.floor(right)));
            }
            if (typeof right === 'string' && typeof left === 'number') {
              return right.repeat(Math.max(0, Math.floor(left)));
            }
            return left * right;
          case '/':
            if (right === 0) throw new Error(`Dělení nulou / Division by zero (řádek ${node.loc.line})`);
            return left / right;
          case '%':
            if (right === 0) throw new Error(`Modulo nulou / Modulo by zero (řádek ${node.loc.line})`);
            return ((left % right) + right) % right;
          case '==': return left === right ? 1 : 0;
          case '!=': return left !== right ? 1 : 0;
          case '<': return left < right ? 1 : 0;
          case '<=': return left <= right ? 1 : 0;
          case '>': return left > right ? 1 : 0;
          case '>=': return left >= right ? 1 : 0;
          default:
            throw new Error(`Neznámý operátor / Unknown operator '${node.op}'`);
        }
      }

      case 'UnaryOp': {
        const val = yield* this.evalExpr(node.operand, procedures);
        if (node.op === '-') return -val;
        if (node.op === '!' || node.op === 'NOT') return val ? 0 : 1;
        return val;
      }

      default:
        throw new Error(`Neznámý typ výrazu / Unknown expression type: ${node.type}`);
    }
  }

  *evalCondition(condition, procedures) {
    if (condition.type === 'ExprCondition') {
      return Boolean(yield* this.evalExpr(condition.expr, procedures));
    }
    return this.world.evalCondition(condition.test, condition.inverted);
  }

  *runAssign(stmt, procedures) {
    const val = yield* this.evalExpr(stmt.expr, procedures);
    const key = canonicalize(stmt.name);
    if (this.callStack.length > 0 && this.callStack[this.callStack.length - 1].locals.has(key)) {
      this.callStack[this.callStack.length - 1].locals.set(key, val);
    } else {
      this.variables.set(key, val);
    }
    this.emit('variableChange', stmt.name, val);
    yield {
      type: 'ASSIGN',
      name: stmt.name,
      value: val,
      loc: stmt.loc,
    };
  }

  *runCommand(stmt, procedures) {
    if (stmt.action === 'RIGHT') {
      const rightProc =
        procedures?.get('VPRAVOBOK') ||
        procedures?.get('VPRAVO') ||
        procedures?.get('TURNRIGHT') ||
        procedures?.get('RIGHT');
      if (rightProc) {
        yield* this.runCall({ name: rightProc.name, args: [], loc: stmt.loc }, procedures);
        return;
      }
    }
    if (stmt.action === 'TURN_AROUND') {
      const aroundProc =
        procedures?.get('CELEMVZAD') ||
        procedures?.get('VZAD') ||
        procedures?.get('TURNAROUND');
      if (aroundProc) {
        yield* this.runCall({ name: aroundProc.name, args: [], loc: stmt.loc }, procedures);
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
    const rawCount = typeof stmt.count === 'number' ? stmt.count : (yield* this.evalExpr(stmt.count, procedures));
    const times = Math.max(0, Math.round(rawCount));
    for (let i = 0; i < times; i++) {
      if (this.hasActiveReturn()) break;
      yield* this.runStatements(stmt.body, procedures);
    }
  }

  *runWhile(stmt, procedures) {
    while (true) {
      if (this.hasActiveReturn()) break;

      this.operationCount++;
      if (this.operationCount > this.maxOperations) {
        throw new Error(
          `Detekován nekonečný cyklus v DOKUD/WHILE / Infinite loop detected in WHILE at line ${stmt.loc.line}`
        );
      }

      // Check condition
      const condVal = yield* this.evalCondition(stmt.condition, procedures);
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
    const condVal = yield* this.evalCondition(stmt.condition, procedures);
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
    const activeProcedures = procedures || this.program?.procedures;
    const proc = activeProcedures?.get(norm);
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

    // Evaluate argument expressions in the caller's scope before pushing the new call frame
    const evaluatedArgs = [];
    for (const argExpr of stmt.args || []) {
      evaluatedArgs.push(yield* this.evalExpr(argExpr, activeProcedures));
    }

    const params = proc.params || [];
    if (evaluatedArgs.length < params.length) {
      throw new Error(
        `Procedura/funkce '${proc.name}' očekává ${params.length} argument(ů), ale bylo předáno ${evaluatedArgs.length} / Procedure '${proc.name}' expects ${params.length} argument(s), got ${evaluatedArgs.length} (řádek ${stmt.loc.line})`
      );
    }

    const frame = {
      name: norm,
      locals: new Map(),
      returned: false,
      returnValue: 0,
    };
    for (let i = 0; i < params.length; i++) {
      frame.locals.set(canonicalize(params[i]), evaluatedArgs[i]);
    }

    this.callDepth++;
    this.callStack.push(frame);
    try {
      yield* this.runStatements(proc.body, activeProcedures);
      if (frame.returned) {
        return frame.returnValue;
      }
      if (frame.locals.has(norm)) {
        return frame.locals.get(norm);
      }
      return 0;
    } finally {
      this.callStack.pop();
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
    this.variables.clear();
    this.callStack = [];
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
