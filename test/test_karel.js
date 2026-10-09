/**
 * Karel Automated Unit & Integration Tests
 */

import { Lexer } from '../js/lexer.js';
import { Parser } from '../js/parser.js';
import { KarelWorld, Direction } from '../js/world.js';
import { Interpreter, InterpreterState } from '../js/interpreter.js';

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

console.log('--- Testing Lexer ---');
{
  const csCode = `
    // Test czech syntax
    PRIKAZ VLEVO_BOK
      OPAKUJ 3 KRAT
        KROK
      KONEC
    KONEC
    KDYZ JE CIP TAK POLOZ JINAK ZVEDNI KONEC
    DOKUD NENI ZED KROK KONEC
  `;
  const lexer = new Lexer(csCode);
  const tokens = lexer.tokenize();
  assert(tokens.length > 10, 'Czech code tokenized');
  assert(tokens[0].type === 'KW_DEFINE', 'First token is KW_DEFINE');

  const enCode = `
    define turnRight
      repeat 4 times
        step
      end
    end
    if beeper put else pick end
    while not wall_ahead step end
  `;
  const enTokens = new Lexer(enCode).tokenize();
  assert(enTokens.length > 10, 'English code tokenized');
}

console.log('--- Testing Parser ---');
{
  const code = `
    PRIKAZ OBRAT
      VLEVO-BOK
      VLEVO-BOK
    KONEC

    OPAKUJ 2 KRAT
      KROK
      POLOZ
    KONEC

    DOKUD NENI ZED
      KDYZ JE CIP
        ZVEDNI
      JINAK
        POLOZ
      KONEC
      KROK
    KONEC
  `;
  const lexer = new Lexer(code);
  const parser = new Parser(lexer.tokenize());
  const ast = parser.parse();

  assert(ast.type === 'Program', 'AST has Program root');
  assert(ast.procedures.has('OBRAT'), 'Procedure OBRAT registered');
  assert(ast.body.length === 2, 'Main body has 2 statements (Repeat and While)');
  assert(ast.body[0].type === 'Repeat', 'First statement is Repeat');
  assert(ast.body[1].type === 'While', 'Second statement is While');
}

console.log('--- Testing World Model ---');
{
  const world = new KarelWorld(5, 5);
  world.karel.x = 1;
  world.karel.y = 1;
  world.karel.dir = Direction.EAST;

  world.step();
  assert(world.karel.x === 2 && world.karel.y === 1, 'Karel stepped East to (2, 1)');

  world.turnLeft();
  assert(world.karel.dir === Direction.NORTH, 'Karel turned left to NORTH');

  world.putBeeper();
  assert(world.getBeepers(2, 1) === 1, 'Beeper placed at (2, 1)');

  world.pickBeeper();
  assert(world.getBeepers(2, 1) === 0, 'Beeper picked up from (2, 1)');

  // Wall test
  world.toggleVerticalWall(2, 1);
  world.turnRight(); // facing EAST again
  assert(world.hasWall(2, 1, Direction.EAST) === true, 'Wall present to the East');
  let crashed = false;
  try {
    world.step();
  } catch (e) {
    crashed = true;
  }
  assert(crashed === true, 'Karel crashed into wall correctly');
}

console.log('--- Testing Interpreter ---');
{
  const world = new KarelWorld(5, 5);
  world.karel.x = 1;
  world.karel.y = 1;
  world.karel.dir = Direction.EAST;

  const code = `
    OPAKUJ 3 KRAT
      KROK
      POLOZ
    KONEC
  `;
  const ast = new Parser(new Lexer(code).tokenize()).parse();
  const interpreter = new Interpreter(world);
  interpreter.loadProgram(ast);

  let steps = 0;
  while (interpreter.step()) {
    steps++;
  }

  assert(world.karel.x === 4, `Karel ended at x=4 (actual: ${world.karel.x})`);
  assert(world.getBeepers(2, 1) === 1, 'Beeper at (2,1)');
  assert(world.getBeepers(3, 1) === 1, 'Beeper at (3,1)');
  assert(world.getBeepers(4, 1) === 1, 'Beeper at (4,1)');
  assert(interpreter.state === InterpreterState.FINISHED, 'Interpreter finished cleanly');
}

console.log('\n--- Test Summary ---');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed > 0) {
  process.exit(1);
}
