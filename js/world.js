/**
 * Karel Programming Language - World State Model
 * Manages grid, walls, beepers, Karel position, history, and validations.
 */

export const Direction = {
  NORTH: 'NORTH',
  EAST: 'EAST',
  SOUTH: 'SOUTH',
  WEST: 'WEST',
};

export const TurnLeftMap = {
  [Direction.NORTH]: Direction.WEST,
  [Direction.WEST]: Direction.SOUTH,
  [Direction.SOUTH]: Direction.EAST,
  [Direction.EAST]: Direction.NORTH,
};

export const TurnRightMap = {
  [Direction.NORTH]: Direction.EAST,
  [Direction.EAST]: Direction.SOUTH,
  [Direction.SOUTH]: Direction.WEST,
  [Direction.WEST]: Direction.NORTH,
};

export const TurnAroundMap = {
  [Direction.NORTH]: Direction.SOUTH,
  [Direction.SOUTH]: Direction.NORTH,
  [Direction.EAST]: Direction.WEST,
  [Direction.WEST]: Direction.EAST,
};

export class KarelWorld {
  constructor(width = 10, height = 10) {
    this.width = Math.max(3, Math.min(50, width));
    this.height = Math.max(3, Math.min(50, height));

    // Karel initial state
    this.karel = {
      x: 1,
      y: 1,
      dir: Direction.EAST,
      bag: Infinity, // or integer
    };

    // Walls sets:
    // Vertical wall on east edge of (x, y): "v:x:y"
    // Horizontal wall on north edge of (x, y): "h:x:y"
    this.verticalWalls = new Set();
    this.horizontalWalls = new Set();

    // Beepers: key "x,y" => count
    this.beepers = new Map();

    // Saved initial snapshot for reset
    this.initialSnapshot = null;
    this.saveInitialSnapshot();
  }

  saveInitialSnapshot() {
    this.initialSnapshot = this.serialize();
  }

  restoreInitialSnapshot() {
    if (this.initialSnapshot) {
      this.deserialize(this.initialSnapshot);
    }
  }

  serialize() {
    return {
      width: this.width,
      height: this.height,
      karel: { ...this.karel },
      verticalWalls: Array.from(this.verticalWalls),
      horizontalWalls: Array.from(this.horizontalWalls),
      beepers: Array.from(this.beepers.entries()),
    };
  }

  deserialize(data) {
    this.width = data.width || 10;
    this.height = data.height || 10;
    this.karel = {
      x: data.karel?.x ?? 1,
      y: data.karel?.y ?? 1,
      dir: data.karel?.dir || Direction.EAST,
      bag: data.karel?.bag ?? Infinity,
    };
    this.verticalWalls = new Set(data.verticalWalls || []);
    this.horizontalWalls = new Set(data.horizontalWalls || []);
    this.beepers = new Map(data.beepers || []);
  }

  resize(newWidth, newHeight) {
    const w = Math.max(3, Math.min(50, newWidth));
    const h = Math.max(3, Math.min(50, newHeight));
    this.width = w;
    this.height = h;

    // Constrain Karel inside bounds
    this.karel.x = Math.max(1, Math.min(w, this.karel.x));
    this.karel.y = Math.max(1, Math.min(h, this.karel.y));

    // Prune walls outside bounds
    for (const vKey of Array.from(this.verticalWalls)) {
      const [, x, y] = vKey.split(':').map(Number);
      if (x >= w || y > h) this.verticalWalls.delete(vKey);
    }
    for (const hKey of Array.from(this.horizontalWalls)) {
      const [, x, y] = hKey.split(':').map(Number);
      if (x > w || y >= h) this.horizontalWalls.delete(hKey);
    }

    // Prune beepers outside bounds
    for (const bKey of Array.from(this.beepers.keys())) {
      const [x, y] = bKey.split(',').map(Number);
      if (x > w || y > h) this.beepers.delete(bKey);
    }

    this.saveInitialSnapshot();
  }

  clear() {
    this.verticalWalls.clear();
    this.horizontalWalls.clear();
    this.beepers.clear();
    this.karel = {
      x: 1,
      y: 1,
      dir: Direction.EAST,
      bag: Infinity,
    };
    this.saveInitialSnapshot();
  }

  // --- Wall Management ---

  hasWall(x, y, dir) {
    if (dir === Direction.NORTH) {
      if (y >= this.height) return true;
      return this.horizontalWalls.has(`h:${x}:${y}`);
    }
    if (dir === Direction.SOUTH) {
      if (y <= 1) return true;
      return this.horizontalWalls.has(`h:${x}:${y - 1}`);
    }
    if (dir === Direction.EAST) {
      if (x >= this.width) return true;
      return this.verticalWalls.has(`v:${x}:${y}`);
    }
    if (dir === Direction.WEST) {
      if (x <= 1) return true;
      return this.verticalWalls.has(`v:${x - 1}:${y}`);
    }
    return false;
  }

  toggleVerticalWall(x, y) {
    if (x < 1 || x >= this.width || y < 1 || y > this.height) return;
    const key = `v:${x}:${y}`;
    if (this.verticalWalls.has(key)) {
      this.verticalWalls.delete(key);
    } else {
      this.verticalWalls.add(key);
    }
  }

  toggleHorizontalWall(x, y) {
    if (x < 1 || x > this.width || y < 1 || y >= this.height) return;
    const key = `h:${x}:${y}`;
    if (this.horizontalWalls.has(key)) {
      this.horizontalWalls.delete(key);
    } else {
      this.horizontalWalls.add(key);
    }
  }

  // --- Beeper Management ---

  getBeepers(x, y) {
    return this.beepers.get(`${x},${y}`) || 0;
  }

  setBeepers(x, y, count) {
    const key = `${x},${y}`;
    if (count <= 0) {
      this.beepers.delete(key);
    } else {
      this.beepers.set(key, count);
    }
  }

  addBeeper(x, y, delta = 1) {
    const cur = this.getBeepers(x, y);
    const updated = Math.max(0, cur + delta);
    this.setBeepers(x, y, updated);
  }

  // --- Karel Actions ---

  step() {
    if (this.hasWall(this.karel.x, this.karel.y, this.karel.dir)) {
      throw new Error(
        `Karel narazil do zdi na souřadnicích [${this.karel.x}, ${this.karel.y}] směrem na ${this.karel.dir}! / Karel crashed into a wall!`
      );
    }

    switch (this.karel.dir) {
      case Direction.NORTH:
        this.karel.y++;
        break;
      case Direction.EAST:
        this.karel.x++;
        break;
      case Direction.SOUTH:
        this.karel.y--;
        break;
      case Direction.WEST:
        this.karel.x--;
        break;
    }
  }

  turnLeft() {
    this.karel.dir = TurnLeftMap[this.karel.dir];
  }

  turnRight() {
    this.karel.dir = TurnRightMap[this.karel.dir];
  }

  turnAround() {
    this.karel.dir = TurnAroundMap[this.karel.dir];
  }

  pickBeeper() {
    const count = this.getBeepers(this.karel.x, this.karel.y);
    if (count <= 0) {
      throw new Error(
        `Na pozici [${this.karel.x}, ${this.karel.y}] není žádná značka/čip k sebrání! / No beeper to pick!`
      );
    }
    this.setBeepers(this.karel.x, this.karel.y, count - 1);
    if (this.karel.bag !== Infinity) {
      this.karel.bag++;
    }
  }

  putBeeper() {
    if (this.karel.bag !== Infinity && this.karel.bag <= 0) {
      throw new Error(
        `Karel nemá v kapse žádné značky/čipy! / No beepers in bag!`
      );
    }
    this.addBeeper(this.karel.x, this.karel.y, 1);
    if (this.karel.bag !== Infinity) {
      this.karel.bag--;
    }
  }

  // --- Sensor Conditions ---

  frontIsClear() {
    return !this.hasWall(this.karel.x, this.karel.y, this.karel.dir);
  }

  beepersPresent() {
    return this.getBeepers(this.karel.x, this.karel.y) > 0;
  }

  beepersInBag() {
    return this.karel.bag === Infinity || this.karel.bag > 0;
  }

  facingNorth() {
    return this.karel.dir === Direction.NORTH;
  }

  facingSouth() {
    return this.karel.dir === Direction.SOUTH;
  }

  facingEast() {
    return this.karel.dir === Direction.EAST;
  }

  facingWest() {
    return this.karel.dir === Direction.WEST;
  }

  evalCondition(test, inverted = false) {
    let result = false;
    switch (test) {
      case 'WALL_AHEAD':
        result = !this.frontIsClear();
        break;
      case 'BEEPER':
        result = this.beepersPresent();
        break;
      case 'BEEPER_IN_BAG':
        result = this.beepersInBag();
        break;
      case 'FACING_NORTH':
        result = this.facingNorth();
        break;
      case 'FACING_SOUTH':
        result = this.facingSouth();
        break;
      case 'FACING_EAST':
        result = this.facingEast();
        break;
      case 'FACING_WEST':
        result = this.facingWest();
        break;
      default:
        throw new Error(`Neznámá podmínka / Unknown condition: ${test}`);
    }
    return inverted ? !result : result;
  }
}
