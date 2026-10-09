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
