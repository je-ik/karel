/**
 * Karel Programming Language - Canvas 2D World Renderer
 * High-DPI canvas rendering with smooth animations, grid coordinates,
 * walls, beepers, and stylized robot character.
 */

import { Direction } from './world.js';

export class KarelRenderer {
  constructor(canvas, world) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;

    // Visual theme
    this.colors = {
      bg: '#181b20',
      gridLines: '#282f3a',
      gridDots: '#3b4554',
      axisText: '#7e8b9b',
      borderWall: '#4f5d73',
      wall: '#f59e0b',           // Warm amber for prominent walls
      wallShadow: '#78350f',
      beeperBg: '#06b6d4',       // Vibrant cyan diamond
      beeperText: '#0f172a',
      beeperMultiBg: '#ec4899',  // Magenta/pink badge for multi-beepers
      robotBody: '#3b82f6',      // Blue robot body
      robotAccent: '#60a5fa',
      robotEye: '#22c55e',       // Glowing green eye visor
      robotAntenna: '#ef4444',
      robotTread: '#1e293b',
      selection: 'rgba(59, 130, 246, 0.25)',
    };

    // Animation state
    this.anim = {
      curX: world.karel.x,
      curY: world.karel.y,
      curAngle: this.dirToAngle(world.karel.dir),
      targetX: world.karel.x,
      targetY: world.karel.y,
      targetAngle: this.dirToAngle(world.karel.dir),
      isAnimating: false,
    };

    // Layout metrics (computed during render)
    this.metrics = {
      marginLeft: 32,
      marginBottom: 30,
      marginRight: 16,
      marginTop: 16,
      cellSize: 40,
      gridWidth: 400,
      gridHeight: 400,
    };

    this.rafId = null;
    this.lastFrameTime = performance.now();

    // Bind resize
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.canvas.parentElement || this.canvas);

    this.startAnimLoop();
  }

  dirToAngle(dir) {
    switch (dir) {
      case Direction.EAST:
        return 0;
      case Direction.SOUTH:
        return Math.PI / 2;
      case Direction.WEST:
        return Math.PI;
      case Direction.NORTH:
        return -Math.PI / 2;
      default:
        return 0;
    }
  }

  handleResize() {
    const parent = this.canvas.parentElement;
    const width = parent ? parent.clientWidth : this.canvas.clientWidth;
    const height = parent ? parent.clientHeight : this.canvas.clientHeight;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(300, Math.floor(width * dpr));
    this.canvas.height = Math.max(300, Math.floor(height * dpr));

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.render();
  }

  syncRobotImmediate() {
    this.anim.curX = this.world.karel.x;
    this.anim.curY = this.world.karel.y;
    this.anim.targetX = this.world.karel.x;
    this.anim.targetY = this.world.karel.y;
    this.anim.curAngle = this.dirToAngle(this.world.karel.dir);
    this.anim.targetAngle = this.anim.curAngle;
    this.render();
  }

  animateToKarel() {
    this.anim.targetX = this.world.karel.x;
    this.anim.targetY = this.world.karel.y;

    const targetA = this.dirToAngle(this.world.karel.dir);
    let diff = (targetA - this.anim.curAngle) % (2 * Math.PI);
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;
    this.anim.targetAngle = this.anim.curAngle + diff;
    this.anim.isAnimating = true;
  }

  startAnimLoop() {
    const loop = (time) => {
      const dt = (time - this.lastFrameTime) / 1000;
      this.lastFrameTime = time;

      if (this.anim.isAnimating) {
        const speed = 14; // interpolation factor
        const dx = this.anim.targetX - this.anim.curX;
        const dy = this.anim.targetY - this.anim.curY;
        const da = this.anim.targetAngle - this.anim.curAngle;

        this.anim.curX += dx * Math.min(1, dt * speed);
        this.anim.curY += dy * Math.min(1, dt * speed);
        this.anim.curAngle += da * Math.min(1, dt * speed);

        if (Math.abs(dx) < 0.005 && Math.abs(dy) < 0.005 && Math.abs(da) < 0.005) {
          this.anim.curX = this.anim.targetX;
          this.anim.curY = this.anim.targetY;
          this.anim.curAngle = this.anim.targetAngle;
          this.anim.isAnimating = false;
        }
        this.render();
      }

      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
  }

  computeLayout() {
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    const availW = w - (this.metrics.marginLeft + this.metrics.marginRight);
    const availH = h - (this.metrics.marginTop + this.metrics.marginBottom);

    const sizeW = Math.floor(availW / this.world.width);
    const sizeH = Math.floor(availH / this.world.height);
    this.metrics.cellSize = Math.max(10, Math.min(64, Math.min(sizeW, sizeH)));

    this.metrics.gridWidth = this.metrics.cellSize * this.world.width;
    this.metrics.gridHeight = this.metrics.cellSize * this.world.height;

    // Center grid in available area
    this.metrics.offsetX = Math.floor(
      this.metrics.marginLeft + (availW - this.metrics.gridWidth) / 2
    );
    this.metrics.offsetY = Math.floor(
      this.metrics.marginTop + (availH - this.metrics.gridHeight) / 2
    );
  }

  // Convert world coordinates (x: 1..W, y: 1..H) to canvas center pixel
  worldToPixel(wx, wy) {
    const { offsetX, offsetY, cellSize, gridHeight } = this.metrics;
    const px = offsetX + (wx - 0.5) * cellSize;
    // Y is inverted (1 is at bottom)
    const py = offsetY + gridHeight - (wy - 0.5) * cellSize;
    return { px, py };
  }

  // Convert canvas pixel to continuous 1-indexed cell coordinates (cell x spans [x, x+1), center at x+0.5)
  pixelToWorld(px, py) {
    const { offsetX, offsetY, cellSize, gridHeight } = this.metrics;
    const wx = (px - offsetX) / cellSize + 1;
    const wy = (offsetY + gridHeight - py) / cellSize + 1;
    return { wx, wy };
  }

  render() {
    const dpr = window.devicePixelRatio || 1;
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(dpr, dpr);

    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    // Clear background
    ctx.fillStyle = this.colors.bg;
    ctx.fillRect(0, 0, w, h);

    this.computeLayout();

    // Draw Grid & Axes
    this.drawGridAndAxes();

    // Draw Beepers
    this.drawBeepers();

    // Draw Walls
    this.drawWalls();

    // Draw Karel Robot
    this.drawRobot();

    ctx.restore();
  }

  drawGridAndAxes() {
    const ctx = this.ctx;
    const { offsetX, offsetY, cellSize, gridWidth, gridHeight } = this.metrics;
    const { width, height } = this.world;

    ctx.save();

    // Axis Labels font
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.colors.axisText;

    // Horizontal X-axis labels (bottom)
    for (let x = 1; x <= width; x++) {
      const px = offsetX + (x - 0.5) * cellSize;
      const py = offsetY + gridHeight + 16;
      ctx.fillText(String(x), px, py);
    }

    // Vertical Y-axis labels (left)
    ctx.textAlign = 'right';
    for (let y = 1; y <= height; y++) {
      const px = offsetX - 10;
      const py = offsetY + gridHeight - (y - 0.5) * cellSize;
      ctx.fillText(String(y), px, py);
    }

    // Grid inner lines
    ctx.strokeStyle = this.colors.gridLines;
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let x = 0; x <= width; x++) {
      const px = offsetX + x * cellSize;
      ctx.moveTo(px, offsetY);
      ctx.lineTo(px, offsetY + gridHeight);
    }
    for (let y = 0; y <= height; y++) {
      const py = offsetY + y * cellSize;
      ctx.moveTo(offsetX, py);
      ctx.lineTo(offsetX + gridWidth, py);
    }
    ctx.stroke();

    // Corner intersection dots
    ctx.fillStyle = this.colors.gridDots;
    const dotRadius = Math.max(1.5, cellSize * 0.05);
    for (let x = 1; x <= width; x++) {
      for (let y = 1; y <= height; y++) {
        const { px, py } = this.worldToPixel(x, y);
        ctx.beginPath();
        ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Outer boundary walls
    ctx.strokeStyle = this.colors.borderWall;
    ctx.lineWidth = 4;
    ctx.strokeRect(offsetX, offsetY, gridWidth, gridHeight);

    ctx.restore();
  }

  drawWalls() {
    const ctx = this.ctx;
    const { offsetX, offsetY, cellSize, gridHeight } = this.metrics;

    ctx.save();
    ctx.lineCap = 'round';

    // Vertical Walls
    for (const vKey of this.world.verticalWalls) {
      const [, x, y] = vKey.split(':').map(Number);
      const px = offsetX + x * cellSize;
      const pyTop = offsetY + gridHeight - y * cellSize;
      const pyBottom = pyTop + cellSize;

      // Shadow
      ctx.strokeStyle = this.colors.wallShadow;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(px + 1, pyTop);
      ctx.lineTo(px + 1, pyBottom);
      ctx.stroke();

      // Main wall
      ctx.strokeStyle = this.colors.wall;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(px, pyTop);
      ctx.lineTo(px, pyBottom);
      ctx.stroke();
    }

    // Horizontal Walls
    for (const hKey of this.world.horizontalWalls) {
      const [, x, y] = hKey.split(':').map(Number);
      const pxLeft = offsetX + (x - 1) * cellSize;
      const pxRight = pxLeft + cellSize;
      const py = offsetY + gridHeight - y * cellSize;

      // Shadow
      ctx.strokeStyle = this.colors.wallShadow;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(pxLeft, py + 1);
      ctx.lineTo(pxRight, py + 1);
      ctx.stroke();

      // Main wall
      ctx.strokeStyle = this.colors.wall;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(pxLeft, py);
      ctx.lineTo(pxRight, py);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawBeepers() {
    const ctx = this.ctx;
    const { cellSize } = this.metrics;
    const radius = Math.max(6, cellSize * 0.28);

    ctx.save();
    for (const [key, count] of this.world.beepers.entries()) {
      if (count <= 0) continue;
      const [x, y] = key.split(',').map(Number);
      const { px, py } = this.worldToPixel(x, y);

      // Diamond beeper shape
      const isMulti = count > 1;
      ctx.fillStyle = isMulti ? this.colors.beeperMultiBg : this.colors.beeperBg;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.moveTo(px, py - radius);
      ctx.lineTo(px + radius, py);
      ctx.lineTo(px, py + radius);
      ctx.lineTo(px - radius, py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // If count > 1, draw text
      if (count > 1) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(10, Math.floor(radius * 0.95))}px ui-monospace, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(count), px, py);
      }
    }
    ctx.restore();
  }

  drawRobot() {
    const ctx = this.ctx;
    const { cellSize } = this.metrics;
    const { px, py } = this.worldToPixel(this.anim.curX, this.anim.curY);
    const angle = this.anim.curAngle;

    const rSize = cellSize * 0.82; // Prominent robot size
    const half = rSize / 2;

    ctx.save();
    ctx.translate(px, py);

    // 1. Soft glowing aura on ground beneath Karel
    const auraGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, cellSize * 0.52);
    auraGrad.addColorStop(0, 'rgba(14, 165, 233, 0.45)');
    auraGrad.addColorStop(0.6, 'rgba(59, 130, 246, 0.2)');
    auraGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, 0, cellSize * 0.52, 0, Math.PI * 2);
    ctx.fill();

    // Rotate context to Karel's facing direction
    ctx.rotate(angle);

    // 2. Direction Indicator Arrow ahead of the robot
    const arrowX = half + cellSize * 0.08;
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(arrowX + 7, 0);
    ctx.lineTo(arrowX, -5);
    ctx.lineTo(arrowX + 2, 0);
    ctx.lineTo(arrowX, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Track Treads (top & bottom)
    const treadH = rSize * 0.22;
    const treadW = rSize * 0.84;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, -treadW / 2, -half, treadW, treadH, 3, true, true);
    this.roundRect(ctx, -treadW / 2, half - treadH, treadW, treadH, 3, true, true);

    // Tread cleats/teeth
    ctx.fillStyle = '#64748b';
    const numCleats = 4;
    const cleatW = 3;
    for (let i = 0; i < numCleats; i++) {
      const cx = -treadW / 2 + 5 + i * (treadW - 10) / (numCleats - 1);
      ctx.fillRect(cx - cleatW / 2, -half + 1, cleatW, treadH - 2);
      ctx.fillRect(cx - cleatW / 2, half - treadH + 1, cleatW, treadH - 2);
    }

    // 4. Main Robot Body (metallic cyber chassis)
    const bodyW = rSize * 0.68;
    const bodyH = rSize * 0.62;
    const bodyGrad = ctx.createLinearGradient(-bodyW / 2, -bodyH / 2, bodyW / 2, bodyH / 2);
    bodyGrad.addColorStop(0, '#38bdf8');
    bodyGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 2;
    this.roundRect(ctx, -bodyW / 2, -bodyH / 2, bodyW, bodyH, 5, true, true);

    // 5. Visor / Eyes (Front face facing positive X)
    const visorW = bodyW * 0.38;
    const visorH = bodyH * 0.74;
    const visorX = bodyW / 2 - visorW - 1;
    const visorY = -visorH / 2;
    ctx.fillStyle = '#090d16';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    this.roundRect(ctx, visorX, visorY, visorW, visorH, 4, true, true);

    // Glowing LED eyes
    const eyeR = Math.max(2.2, visorH * 0.17);
    const eyeGrad = ctx.createRadialGradient(
      visorX + visorW * 0.55, visorY + visorH * 0.3, 0.5,
      visorX + visorW * 0.55, visorY + visorH * 0.3, eyeR * 1.5
    );
    eyeGrad.addColorStop(0, '#86efac');
    eyeGrad.addColorStop(1, '#10b981');

    ctx.fillStyle = eyeGrad;
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(visorX + visorW * 0.55, visorY + visorH * 0.3, eyeR, 0, Math.PI * 2);
    ctx.arc(visorX + visorW * 0.55, visorY + visorH * 0.7, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0; // reset shadow

    // 6. Chest Plate / "K" emblem
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(-bodyW / 2 + 3, -bodyH * 0.3, bodyW * 0.36, bodyH * 0.6);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.max(9, Math.floor(bodyH * 0.42))}px ui-monospace, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('K', -bodyW / 2 + 3 + (bodyW * 0.36) / 2, 0);

    // 7. Antenna on back with glowing red beacon
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-bodyW / 2, 0);
    ctx.lineTo(-bodyW / 2 - rSize * 0.18, 0);
    ctx.stroke();

    const bulbX = -bodyW / 2 - rSize * 0.18;
    const bulbR = Math.max(2.5, rSize * 0.09);

    // Antenna beacon glow
    const bulbGrad = ctx.createRadialGradient(bulbX, 0, 1, bulbX, 0, bulbR * 1.8);
    bulbGrad.addColorStop(0, '#fca5a5');
    bulbGrad.addColorStop(0.5, '#ef4444');
    bulbGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = bulbGrad;
    ctx.beginPath();
    ctx.arc(bulbX, 0, bulbR * 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(bulbX, 0, bulbR, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  /**
   * Hit test for canvas clicks:
   * Returns:
   * - { type: 'WALL_V', x, y } if clicked near vertical wall boundary
   * - { type: 'WALL_H', x, y } if clicked near horizontal wall boundary
   * - { type: 'CELL', x, y } if clicked in cell center
   * - null if clicked outside grid
   */
  hitTest(pixelX, pixelY, toolMode = null) {
    const { offsetX, offsetY, cellSize, gridWidth, gridHeight } = this.metrics;
    if (
      pixelX < offsetX ||
      pixelX > offsetX + gridWidth ||
      pixelY < offsetY ||
      pixelY > offsetY + gridHeight
    ) {
      return null;
    }

    const gx = (pixelX - offsetX) / cellSize; // 0 .. width
    const gy = (offsetY + gridHeight - pixelY) / cellSize; // 0 .. height

    const cellX = Math.min(this.world.width, Math.max(1, Math.floor(gx) + 1));
    const cellY = Math.min(this.world.height, Math.max(1, Math.floor(gy) + 1));

    // When placing Karel or beepers, any click inside a cell targets that cell
    if (toolMode === 'karel' || toolMode === 'beeper') {
      return { type: 'CELL', x: cellX, y: cellY };
    }

    const relX = gx - (cellX - 1); // 0..1 inside cell (0 = West edge, 0.5 = center, 1 = East edge)
    const relY = gy - (cellY - 1); // 0..1 inside cell (0 = South edge, 0.5 = center, 1 = North edge)

    const edgeThreshold = toolMode === 'wall' ? 0.35 : 0.22;
    const candidates = [];

    // Vertical wall test (East edge of cellX or West edge of cellX)
    if (relX > 1 - edgeThreshold && cellX < this.world.width) {
      candidates.push({ dist: 1 - relX, hit: { type: 'WALL_V', x: cellX, y: cellY } });
    }
    if (relX < edgeThreshold && cellX > 1) {
      candidates.push({ dist: relX, hit: { type: 'WALL_V', x: cellX - 1, y: cellY } });
    }

    // Horizontal wall test (North edge of cellY or South edge of cellY)
    if (relY > 1 - edgeThreshold && cellY < this.world.height) {
      candidates.push({ dist: 1 - relY, hit: { type: 'WALL_H', x: cellX, y: cellY } });
    }
    if (relY < edgeThreshold && cellY > 1) {
      candidates.push({ dist: relY, hit: { type: 'WALL_H', x: cellX, y: cellY - 1 } });
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.dist - b.dist);
      return candidates[0].hit;
    }

    // Inside cell
    return { type: 'CELL', x: cellX, y: cellY };
  }
}
