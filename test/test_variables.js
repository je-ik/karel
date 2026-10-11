import { Lexer } from '../js/lexer.js';
import { Parser } from '../js/parser.js';
import { KarelWorld } from '../js/world.js';
import { Interpreter } from '../js/interpreter.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('--- Testing Variables & Modulo Parsing & Execution ---');

// 1. User's exact syntax: LET idx idx + 1
{
  const code = `
    LET idx 0
    LET idx idx + 1
    LET idx = idx + 2
    idx = idx + 3
  `;
  const ast = new Parser(new Lexer(code).tokenize()).parse();
  const world = new KarelWorld(5, 5);
  const interp = new Interpreter(world);
  interp.loadProgram(ast);

  while (interp.step()) {}

  assert(interp.variables.get('IDX') === 6, `LET idx idx + 1 parsed and evaluated to 6 (actual: ${interp.variables.get('IDX')})`);
}

// 2. Modulo operator % and MOD keyword
{
  const code = `
    LET a = 10 % 3
    LET b = 14 MOD 5
    LET even = 8 % 2
    LET odd = 9 % 2
  `;
  const ast = new Parser(new Lexer(code).tokenize()).parse();
  const world = new KarelWorld(5, 5);
  const interp = new Interpreter(world);
  interp.loadProgram(ast);

  while (interp.step()) {}

  assert(interp.variables.get('A') === 1, `10 % 3 == 1 (actual: ${interp.variables.get('A')})`);
  assert(interp.variables.get('B') === 4, `14 MOD 5 == 4 (actual: ${interp.variables.get('B')})`);
  assert(interp.variables.get('EVEN') === 0, `8 % 2 == 0 (actual: ${interp.variables.get('EVEN')})`);
  assert(interp.variables.get('ODD') === 1, `9 % 2 == 1 (actual: ${interp.variables.get('ODD')})`);
}

// 3. Repeat loop with variable: OPAKUJ count KRAT
{
  const code = `
    LET steps = 3
    OPAKUJ steps KRAT
      KROK
      POLOZ
    KONEC
  `;
  const ast = new Parser(new Lexer(code).tokenize()).parse();
  const world = new KarelWorld(5, 5);
  const interp = new Interpreter(world);
  interp.loadProgram(ast);

  while (interp.step()) {}

  assert(world.karel.x === 4, `Karel stepped 3 times to x=4 (actual: ${world.karel.x})`);
  assert(world.getBeepers(2, 1) === 1, 'Beeper placed at (2,1)');
  assert(world.getBeepers(4, 1) === 1, 'Beeper placed at (4,1)');
}

// 4. While loop with comparison: DOKUD i < 4
{
  const code = `
    LET i = 0
    DOKUD i < 3
      KROK
      i = i + 1
    KONEC
  `;
  const ast = new Parser(new Lexer(code).tokenize()).parse();
  const world = new KarelWorld(5, 5);
  const interp = new Interpreter(world);
  interp.loadProgram(ast);

  while (interp.step()) {}

  assert(world.karel.x === 4, `While loop stepped 3 times to x=4 (actual: ${world.karel.x})`);
  assert(interp.variables.get('I') === 3, `Variable i reached 3 (actual: ${interp.variables.get('I')})`);
}

// 5. If condition with modulo: KDYZ i % 2 == 0
{
  const code = `
    LET i = 0
    DOKUD i < 4
      KDYZ i % 2 == 0
        POLOZ
      KONEC
      KROK
      i = i + 1
    KONEC
  `;
  const ast = new Parser(new Lexer(code).tokenize()).parse();
  const world = new KarelWorld(6, 6);
  const interp = new Interpreter(world);
  interp.loadProgram(ast);

  while (interp.step()) {}

  // i=0 at (1,1): placed beeper
  // i=1 at (2,1): no beeper
  // i=2 at (3,1): placed beeper
  // i=3 at (4,1): no beeper
  assert(world.getBeepers(1, 1) === 1, 'Beeper at (1,1) for i=0');
  assert(world.getBeepers(2, 1) === 0, 'No beeper at (2,1) for i=1');
  assert(world.getBeepers(3, 1) === 1, 'Beeper at (3,1) for i=2');
  assert(world.getBeepers(4, 1) === 0, 'No beeper at (4,1) for i=3');
}

// 6. Natural language condition: KDYZ JE zbytek 0 and single equals KDYZ zbytek = 0
{
  const code = `
    LET idx 0
    OPAKUJ 4 KRAT
      LET zbytek idx MOD 2
      KDYZ JE zbytek 0
        POLOZ
      KONEC
      KROK
      LET idx idx + 1
    KONEC
  `;
  const ast = new Parser(new Lexer(code).tokenize()).parse();
  const world = new KarelWorld(6, 6);
  const interp = new Interpreter(world);
  interp.loadProgram(ast);

  while (interp.step()) {}

  assert(world.getBeepers(1, 1) === 1, 'KDYZ JE zbytek 0 placed beeper at (1,1)');
  assert(world.getBeepers(2, 1) === 0, 'KDYZ JE zbytek 0 skipped beeper at (2,1)');
  assert(world.getBeepers(3, 1) === 1, 'KDYZ JE zbytek 0 placed beeper at (3,1)');
  assert(world.getBeepers(4, 1) === 0, 'KDYZ JE zbytek 0 skipped beeper at (4,1)');
}

// 7. Single '=' comparison: KDYZ zbytek = 0
{
  const code = `
    LET zbytek 0
    KDYZ zbytek = 0
      POLOZ
    KONEC
  `;
  const ast = new Parser(new Lexer(code).tokenize()).parse();
  const world = new KarelWorld(3, 3);
  const interp = new Interpreter(world);
  interp.loadProgram(ast);
  while (interp.step()) {}
  assert(world.getBeepers(1, 1) === 1, 'Single = in condition KDYZ zbytek = 0 evaluated true');
}

// 8. Typo detection: OPAKUJ 6 KRATf gives clear error
{
  const code = `
    OPAKUJ 6 KRATf
      KROK
    KONEC
  `;
  let caught = false;
  try {
    new Parser(new Lexer(code).tokenize()).parse();
  } catch (err) {
    caught = true;
    assert(err.message.includes('KRATf') && err.message.includes('KRAT'), `Helpful error on KRATf: ${err.message}`);
  }
  assert(caught, 'Parser caught KRATf typo');
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
