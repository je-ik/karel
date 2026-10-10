/**
 * Karel Programming Language - AST Node Definitions
 */

export class ASTNode {
  constructor(type, loc = { line: 1, col: 1 }) {
    this.type = type;
    this.loc = loc;
  }
}

export class ProgramNode extends ASTNode {
  constructor(body = [], procedures = new Map(), loc) {
    super('Program', loc);
    this.body = body; // Array of statement nodes
    this.procedures = procedures; // Map of name -> ProcedureDefNode
  }
}

export class ProcedureDefNode extends ASTNode {
  constructor(name, body = [], loc) {
    super('ProcedureDef', loc);
    this.name = name;
    this.body = body;
  }
}

export class CallNode extends ASTNode {
  constructor(name, loc) {
    super('Call', loc);
    this.name = name;
  }
}

export class CommandNode extends ASTNode {
  /**
   * Primitive commands:
   * 'STEP', 'LEFT', 'RIGHT', 'TURN_AROUND', 'PUT', 'PICK'
   */
  constructor(action, loc) {
    super('Command', loc);
    this.action = action;
  }
}

export class RepeatNode extends ASTNode {
  constructor(count, body = [], loc) {
    super('Repeat', loc);
    this.count = count;
    this.body = body;
  }
}

export class WhileNode extends ASTNode {
  constructor(condition, body = [], loc) {
    super('While', loc);
    this.condition = condition;
    this.body = body;
  }
}

export class IfNode extends ASTNode {
  constructor(condition, thenBody = [], elseBody = [], loc) {
    super('If', loc);
    this.condition = condition;
    this.thenBody = thenBody;
    this.elseBody = elseBody;
  }
}

export class ConditionNode extends ASTNode {
  /**
   * Conditions:
   * 'WALL_AHEAD', 'BEEPER', 'BEEPER_IN_BAG',
   * 'FACING_NORTH', 'FACING_SOUTH', 'FACING_EAST', 'FACING_WEST'
   * inverted: boolean (e.g., NENI ZED / NOT WALL_AHEAD)
   */
  constructor(test, inverted = false, loc) {
    super('Condition', loc);
    this.test = test;
    this.inverted = inverted;
  }
}

export class AssignNode extends ASTNode {
  constructor(name, expr, loc) {
    super('Assign', loc);
    this.name = name;
    this.expr = expr;
  }
}

export class BinaryOpNode extends ASTNode {
  constructor(op, left, right, loc) {
    super('BinaryOp', loc);
    this.op = op; // '+', '-', '*', '/', '%', '==', '!=', '<', '<=', '>', '>='
    this.left = left;
    this.right = right;
  }
}

export class UnaryOpNode extends ASTNode {
  constructor(op, operand, loc) {
    super('UnaryOp', loc);
    this.op = op; // '-', '!'
    this.operand = operand;
  }
}

export class NumberLiteralNode extends ASTNode {
  constructor(value, loc) {
    super('NumberLiteral', loc);
    this.value = value;
  }
}

export class VariableNode extends ASTNode {
  constructor(name, loc) {
    super('Variable', loc);
    this.name = name;
  }
}

export class ExprConditionNode extends ASTNode {
  constructor(expr, loc) {
    super('ExprCondition', loc);
    this.expr = expr;
  }
}
