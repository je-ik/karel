import assert from 'node:assert/strict';
import { Lexer } from '../js/lexer.js';
import { Parser } from '../js/parser.js';
import { KarelWorld } from '../js/world.js';
import { Interpreter, InterpreterState } from '../js/interpreter.js';
import { KarelRenderer } from '../js/renderer.js';

function runKarelProgram(code, world = new KarelWorld(20, 20)) {
  const lexer = new Lexer(code);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();

  const interpreter = new Interpreter(world);
  let runtimeError = null;
  interpreter.on('error', (err) => {
    runtimeError = err;
  });

  interpreter.loadProgram(ast);
  while (interpreter.step()) {
    // step until completion
  }

  if (runtimeError || interpreter.state === InterpreterState.ERROR) {
    throw new Error(runtimeError || 'Interpreter finished in ERROR state');
  }

  return { world, interpreter, ast };
}

console.log('Running tests for 20x20 grid, manual placement hitTest, procedure args, functions, kdeX/kdeY, and math functions...\n');

// Test (a): 20x20 grid expansion & layout calculation
{
  const world = new KarelWorld(10, 10);
  world.resize(20, 20);
  assert.equal(world.width, 20);
  assert.equal(world.height, 20);

  // Move Karel to (20, 20)
  const { world: w2 } = runKarelProgram(`
    OPAKUJ 19 KRAT
      KROK
    KONEC
    VLEVO-BOK
    OPAKUJ 19 KRAT
      KROK
    KONEC
    POLOZ
  `, world);
  assert.equal(w2.karel.x, 20);
  assert.equal(w2.karel.y, 20);
  assert.equal(w2.getBeepers(20, 20), 1);
  console.log('✅ Test (a): 20x20 grid expansion and navigation passed');
}

// Test (b): Manual placement hitTest for Karel, beepers, and walls
{
  const world = new KarelWorld(20, 20);
  // Create a lightweight mock canvas for KarelRenderer layout & hitTest
  const mockCanvas = {
    width: 600,
    height: 600,
    getContext: () => ({}),
  };
  // Bypass constructor DOM observers by instantiating prototype or mocking metrics
  const renderer = Object.create(KarelRenderer.prototype);
  renderer.world = world;
  renderer.canvas = mockCanvas;
  renderer.metrics = {
    marginLeft: 38,
    marginBottom: 34,
    marginTop: 20,
    marginRight: 20,
    cellSize: 40,
    gridWidth: 0,
    gridHeight: 0,
    offsetX: 0,
    offsetY: 0,
  };
  renderer.computeLayout();

  // Check every cell center in 20x20 grid maps to the exact cell (x, y)
  for (let x = 1; x <= 20; x++) {
    for (let y = 1; y <= 20; y++) {
      const { px, py } = renderer.worldToPixel(x, y);
      // In default (null), karel, and beeper modes, clicking cell center must hit CELL (x, y)
      const hitDefault = renderer.hitTest(px, py);
      assert.deepEqual(hitDefault, { type: 'CELL', x, y }, `Center hit failed at (${x}, ${y})`);

      const hitKarel = renderer.hitTest(px, py, 'karel');
      assert.deepEqual(hitKarel, { type: 'CELL', x, y });

      // Even clicking near the cell edge in 'karel' or 'beeper' mode must still select the cell, not a wall!
      const nearEdgePx = px - renderer.metrics.cellSize * 0.45;
      const nearEdgePy = py + renderer.metrics.cellSize * 0.45;
      assert.deepEqual(renderer.hitTest(nearEdgePx, nearEdgePy, 'karel'), { type: 'CELL', x, y });
      assert.deepEqual(renderer.hitTest(nearEdgePx, nearEdgePy, 'beeper'), { type: 'CELL', x, y });
    }
  }

  // Check vertical wall between (5, 7) and (6, 7)
  const cell5Center = renderer.worldToPixel(5, 7);
  const eastBoundaryPx = cell5Center.px + renderer.metrics.cellSize * 0.5;
  const wallVHit = renderer.hitTest(eastBoundaryPx - 1, cell5Center.py, 'wall');
  assert.deepEqual(wallVHit, { type: 'WALL_V', x: 5, y: 7 });
  const wallVHitFromRight = renderer.hitTest(eastBoundaryPx + 1, cell5Center.py, 'wall');
  assert.deepEqual(wallVHitFromRight, { type: 'WALL_V', x: 5, y: 7 });

  // Check horizontal wall between (5, 7) and (5, 8)
  const northBoundaryPy = cell5Center.py - renderer.metrics.cellSize * 0.5;
  const wallHHit = renderer.hitTest(cell5Center.px, northBoundaryPy + 1, 'wall');
  assert.deepEqual(wallHHit, { type: 'WALL_H', x: 5, y: 7 });
  const wallHHitFromAbove = renderer.hitTest(cell5Center.px, northBoundaryPy - 1, 'wall');
  assert.deepEqual(wallHHitFromAbove, { type: 'WALL_H', x: 5, y: 7 });

  console.log('✅ Test (b): Manual placement hitTest for Karel, beepers, and walls passed');
}

// Test (c): Arguments in defined commands (procedures) - both parenthesized and space-separated
{
  const { world } = runKarelProgram(`
    PRIKAZ JDI-A-POLOZ(kroky, pocetZnacek)
      OPAKUJ kroky KRAT
        KROK
      KONEC
      OPAKUJ pocetZnacek KRAT
        POLOZ
      KONEC
    KONEC

    PRIKAZ POSUN n
      OPAKUJ n KRAT
        KROK
      KONEC
    KONEC

    JDI-A-POLOZ(4, 3)
    VLEVO-BOK
    POSUN 2 + 3
    POLOZ
  `);
  assert.equal(world.karel.x, 5);
  assert.equal(world.karel.y, 6);
  assert.equal(world.getBeepers(5, 1), 3);
  assert.equal(world.getBeepers(5, 6), 1);
  console.log('✅ Test (c): Procedures with arguments (parenthesized & space-separated) passed');
}

// Test (d): Functions with arguments and return values (including recursion)
{
  const { world, interpreter } = runKarelProgram(`
    FUNKCE SOUCET(a, b)
      VRAT a + b
    KONEC

    FUNCTION FAKTORIAL(n)
      IF n <= 1
        RETURN 1
      END
      RETURN n * FAKTORIAL(n - 1)
    END

    LET s = SOUCET(3, 4)
    LET f = FAKTORIAL(4)
    OPAKUJ s KRAT
      KROK
    KONEC
  `);
  assert.equal(interpreter.variables.get('S'), 7);
  assert.equal(interpreter.variables.get('F'), 24);
  assert.equal(world.karel.x, 8);
  assert.equal(world.karel.y, 1);
  console.log('✅ Test (d): Functions with arguments, return values, and recursion passed');
}

// Test (e): kdeX and kdeY (and English counterparts whereX, whereY)
{
  const { world, interpreter } = runKarelProgram(`
    OPAKUJ 4 KRAT
      KROK
    KONEC
    VLEVO-BOK
    OPAKUJ 6 KRAT
      KROK
    KONEC

    LET cx = kdeX
    LET cy = kdeY
    LET ex = whereX()
    LET ey = whereY()

    // Move back to X=1 using kdeX in WHILE loop
    VLEVO-BOK
    DOKUD kdeX > 1
      KROK
    KONEC
  `);
  assert.equal(interpreter.variables.get('CX'), 5);
  assert.equal(interpreter.variables.get('CY'), 7);
  assert.equal(interpreter.variables.get('EX'), 5);
  assert.equal(interpreter.variables.get('EY'), 7);
  assert.equal(world.karel.x, 1);
  assert.equal(world.karel.y, 7);
  console.log('✅ Test (e): kdeX / kdeY and whereX / whereY position getters passed');
}

// Test (f): sin, cos, round, floor, ceil, abs, sqrt, pow, min, max, hypot
{
  const { interpreter } = runKarelProgram(`
    LET rSin = round(sin(PI / 2) * 100)
    LET rCos = round(cos(0) * 100)
    LET rSind = round(sind(30) * 100)
    LET rCosd = round(cosd(60) * 100)
    LET rFloor = floor(3.9)
    LET rCeil = ceil(3.1)
    LET rRound = round(3.6)
    LET rAbs = abs(-42)
    LET rSqrt = sqrt(81)
    LET rPow = pow(2, 5)
    LET rMin = min(10, 3, 7)
    LET rMax = max(10, 3, 7)
    LET rHypot = hypot(3, 4)
  `);
  assert.equal(interpreter.variables.get('RSIN'), 100);
  assert.equal(interpreter.variables.get('RCOS'), 100);
  assert.equal(interpreter.variables.get('RSIND'), 50);
  assert.equal(interpreter.variables.get('RCOSD'), 50);
  assert.equal(interpreter.variables.get('RFLOOR'), 3);
  assert.equal(interpreter.variables.get('RCEIL'), 4);
  assert.equal(interpreter.variables.get('RROUND'), 4);
  assert.equal(interpreter.variables.get('RABS'), 42);
  assert.equal(interpreter.variables.get('RSQRT'), 9);
  assert.equal(interpreter.variables.get('RPOW'), 32);
  assert.equal(interpreter.variables.get('RMIN'), 3);
  assert.equal(interpreter.variables.get('RMAX'), 10);
  assert.equal(interpreter.variables.get('RHYPOT'), 5);
  console.log('✅ Test (f): Math functions (sin, cos, sind, cosd, round, floor, ceil, abs, sqrt, pow, min, max, hypot) passed');
}

console.log('\n🎉 All 6 feature test suites passed!');
