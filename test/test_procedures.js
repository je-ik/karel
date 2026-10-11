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

console.log('--- Testing Custom Procedures (PRIKAZ / DEFINE) ---');

// 1. Basic procedure definition and immediate invocation after KONEC
{
  const code = `
    PRIKAZ SKOK
      KROK
      KROK
    KONEC

    SKOK
  `;
  const ast = new Parser(new Lexer(code).tokenize()).parse();
  assert(ast.procedures.has('SKOK'), 'Procedure SKOK registered in AST');
  assert(ast.body.length === 1, `Body contains 1 statement (actual: ${ast.body.length})`);
  assert(ast.body[0].type === 'Call' && ast.body[0].name === 'SKOK', 'Body statement is Call(SKOK)');

  const world = new KarelWorld(5, 5);
  const interp = new Interpreter(world);
  interp.loadProgram(ast);
  while (interp.step()) {}
  assert(world.karel.x === 3, `Karel stepped twice to x=3 (actual: ${world.karel.x})`);
}

// 2. Multiple procedures calling each other
{
  const code = `
    PRIKAZ JEDNA
      KROK
    KONEC

    PRIKAZ DVA
      JEDNA
      JEDNA
    KONEC

    DVA
  `;
  const ast = new Parser(new Lexer(code).tokenize()).parse();
  assert(ast.procedures.size === 2, `Registered 2 procedures (actual: ${ast.procedures.size})`);
  assert(ast.body.length === 1, `Body contains 1 statement (actual: ${ast.body.length})`);

  const world = new KarelWorld(5, 5);
  const interp = new Interpreter(world);
  interp.loadProgram(ast);
  while (interp.step()) {}
  assert(world.karel.x === 3, `DVA executed JEDNA twice to x=3 (actual: ${world.karel.x})`);
}

// 3. Procedure with Czech diacritics and dashes
{
  const code = `
    PŘÍKAZ KROK-A-POLOŽ
      KROK
      POLOZ
    KONEC

    KROK-A-POLOŽ
    KROK-A-POLOŽ
  `;
  const ast = new Parser(new Lexer(code).tokenize()).parse();
  assert(ast.procedures.has('KROKAPOLOZ'), 'Procedure KROK-A-POLOŽ canonicalized and registered');
  assert(ast.body.length === 2, `Body contains 2 statements (actual: ${ast.body.length})`);

  const world = new KarelWorld(5, 5);
  const interp = new Interpreter(world);
  interp.loadProgram(ast);
  while (interp.step()) {}
  assert(world.karel.x === 3, `Karel moved to x=3 (actual: ${world.karel.x})`);
  assert(world.getBeepers(2, 1) === 1, 'Beeper placed at (2,1)');
  assert(world.getBeepers(3, 1) === 1, 'Beeper placed at (3,1)');
}

// 4. Overriding VPRAVO-BOK via PRIKAZ
{
  const code = `
    PRIKAZ VPRAVO-BOK
      VLEVO-BOK
      VLEVO-BOK
      VLEVO-BOK
    KONEC

    VPRAVO-BOK
  `;
  const ast = new Parser(new Lexer(code).tokenize()).parse();
  const world = new KarelWorld(5, 5);
  const interp = new Interpreter(world);
  interp.loadProgram(ast);
  while (interp.step()) {}
  assert(world.karel.dir === 'SOUTH', `VPRAVO-BOK turned Karel from EAST to SOUTH (actual: ${world.karel.dir})`);
}

// 5. English DEFINE keyword and call with optional parentheses
{
  const code = `
    DEFINE TURN_RIGHT()
      TURN_LEFT()
      TURN_LEFT()
      TURN_LEFT()
    END

    TURN_RIGHT()
  `;
  const ast = new Parser(new Lexer(code).tokenize()).parse();
  const world = new KarelWorld(5, 5);
  const interp = new Interpreter(world);
  interp.loadProgram(ast);
  while (interp.step()) {}
  assert(world.karel.dir === 'SOUTH', `TURN_RIGHT() turned Karel to SOUTH (actual: ${world.karel.dir})`);
}

// 6. Optional name after KONEC on the same line (classic Karel dialect)
{
  const code = `
    PRIKAZ OBRAT
      VLEVO-BOK
      VLEVO-BOK
    KONEC OBRAT

    OBRAT
  `;
  const ast = new Parser(new Lexer(code).tokenize()).parse();
  assert(ast.body.length === 1, `Body contains 1 statement after KONEC OBRAT (actual: ${ast.body.length})`);
  const world = new KarelWorld(5, 5);
  const interp = new Interpreter(world);
  interp.loadProgram(ast);
  while (interp.step()) {}
  assert(world.karel.dir === 'WEST', `OBRAT turned Karel to WEST (actual: ${world.karel.dir})`);
}

// 7. Recursive procedure (e.g. walk until wall and place beepers)
{
  const code = `
    PRIKAZ JDI-AZ-NA-KONEC
      KDYZ NENI ZED
        POLOZ
        KROK
        JDI-AZ-NA-KONEC
      JINAK
        POLOZ
      KONEC
    KONEC

    JDI-AZ-NA-KONEC
  `;
  const ast = new Parser(new Lexer(code).tokenize()).parse();
  const world = new KarelWorld(4, 4);
  const interp = new Interpreter(world);
  interp.loadProgram(ast);
  while (interp.step()) {}
  assert(world.karel.x === 4, `Recursive procedure walked to wall at x=4 (actual: ${world.karel.x})`);
  assert(world.getBeepers(1, 1) === 1, 'Beeper at (1,1)');
  assert(world.getBeepers(2, 1) === 1, 'Beeper at (2,1)');
  assert(world.getBeepers(3, 1) === 1, 'Beeper at (3,1)');
  assert(world.getBeepers(4, 1) === 1, 'Beeper at (4,1)');
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
