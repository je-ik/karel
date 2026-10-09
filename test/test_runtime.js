import { Examples } from '../js/examples.js';
import { KarelWorld } from '../js/world.js';
import { Lexer } from '../js/lexer.js';
import { Parser } from '../js/parser.js';
import { Interpreter, InterpreterState } from '../js/interpreter.js';

console.log('Testing runtime execution of examples (CS & EN):');

for (const ex of Examples) {
  for (const lang of ['cs', 'en']) {
    const world = new KarelWorld(ex.world.width, ex.world.height);
    world.deserialize(JSON.parse(JSON.stringify(ex.world)));

    const ast = new Parser(new Lexer(ex.code[lang]).tokenize()).parse();
    const interp = new Interpreter(world);
    interp.loadProgram(ast);

    let steps = 0;
    let maxSteps = 10000;
    let error = null;

    interp.on('error', (err) => { error = err; });

    while (steps < maxSteps) {
      steps++;
      const hasMore = interp.step();
      if (!hasMore) break;
    }

    if (error) {
      console.error(`  ✗ [${lang.toUpperCase()}] ${ex.id} failed with error: ${error}`);
      process.exit(1);
    } else if (interp.state === InterpreterState.FINISHED) {
      console.log(`  ✓ [${lang.toUpperCase()}] ${ex.id} completed successfully in ${steps} steps!`);
    } else {
      console.error(`  ✗ [${lang.toUpperCase()}] ${ex.id} did not finish (state: ${interp.state})`);
      process.exit(1);
    }
  }
}

console.log('All 12 simulation runs completed with 100% success!');
