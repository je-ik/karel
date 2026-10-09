import { Examples } from '../js/examples.js';
import { Lexer } from '../js/lexer.js';
import { Parser } from '../js/parser.js';

console.log('Testing parsing of all built-in examples in both Czech and English:');

for (const ex of Examples) {
  // Test CS
  const csTokens = new Lexer(ex.code.cs).tokenize();
  const csAst = new Parser(csTokens).parse();
  console.log(`  ✓ [CS] ${ex.id}: parsed ${csAst.body.length} statements, ${csAst.procedures.size} procedures`);

  // Test EN
  const enTokens = new Lexer(ex.code.en).tokenize();
  const enAst = new Parser(enTokens).parse();
  console.log(`  ✓ [EN] ${ex.id}: parsed ${enAst.body.length} statements, ${enAst.procedures.size} procedures`);
}

console.log('All example programs parsed successfully!');
