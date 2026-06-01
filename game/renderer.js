/**
 * Canvas 渲染器
 * 
 * 负责将游戏状态绘制到 Canvas 上
 * 包括: 网格、墙壁、起点终点、货物、物品、轨迹、动画效果
 */

const { DIR, DIR_DELTA, CELL, ITEM, STATE, THEME } = require('./constants');

class Renderer {
  /**
   * @param {Object} canvas - wx Canvas 2D context
   * @param {number} canvasWidth - Canvas CSS宽度
   * @param {number} canvasHeight - Canvas CSS高度
   * @param {number} dpr - 设备像素比
   */
  constructor(canvas, canvasWidth, canvasHeight, dpr) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = dpr;
    this.canvasW = canvasWidth;
    this.canvasH = canvasHeight;

    // 网格相关（由 fitGrid 计算）
    this.cellSize = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.gridW = 0;
    this.gridH = 0;
  }

  /**
   * 根据关卡尺寸计算网格布局
   */
  fitGrid(cols, rows) {
    const padding = 16;
    const maxW = this.canvasW - padding * 2;
    const maxH = this.canvasH - padding * 2;

    this.cellSize = Math.floor(Math.min(maxW / cols, maxH / rows));
    this.gridW = this.cellSize * cols;
    this.gridH = this.cellSize * rows;
    this.offsetX = Math.floor((this.canvasW - this.gridW) / 2);
    this.offsetY = Math.floor((this.canvasH - this.gridH) / 2);
  }

  /** 清空画布 */
  clear() {
    const ctx = this.ctx;
    ctx.fillStyle = THEME.bg;
    ctx.fillRect(0, 0, this.canvasW, this.canvasH);
  }

  /**
   * 主渲染方法 - 绘制完整游戏画面
   * @param {GameEngine} engine - 游戏引擎实例
   * @param {Object} options - 额外渲染选项
   */
  render(engine, options = {}) {
    this.clear();
    this.drawGrid(engine.level.width, engine.level.height);
    this.drawCells(engine);
    this.drawPlacedItems(engine);
    this.drawTrail(engine.trail);
    this.drawCargo(engine.cargo, engine.state);

    // 编辑器模式：高亮选中格子
    if (options.highlightCell) {
      this.drawCellHighlight(options.highlightCell.x, options.highlightCell.y);
    }
  }

  /**
   * 仅渲染静态关卡（用于关卡列表预览）
   */
  renderLevelPreview(level) {
    this.clear();
    const ctx = this.ctx;
    const cs = this.cellSize;

    this.drawGrid(level.width, level.height);

    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const cell = level.grid[y][x];
        const px = this.offsetX + x * cs;
        const py = this.offsetY + y * cs;
        this._drawCell(cell, px, py, cs);
      }
    }

    // 起点
    this._drawStart(level.start.x, level.start.y, level.startDir);
    // 终点
    this._drawGoal(level.goal.x, level.goal.y);
  }

  /** 绘制网格背景 */
  drawGrid(cols, rows) {
    const ctx = this.ctx;
    const cs = this.cellSize;

    // 网格底色
    ctx.fillStyle = THEME.gridBg;
    ctx.fillRect(this.offsetX, this.offsetY, this.gridW, this.gridH);

    // 网格线
    ctx.strokeStyle = THEME.gridLine;
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= cols; x++) {
      const px = this.offsetX + x * cs;
      ctx.beginPath();
      ctx.moveTo(px, this.offsetY);
      ctx.lineTo(px, this.offsetY + this.gridH);
      ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
      const py = this.offsetY + y * cs;
      ctx.beginPath();
      ctx.moveTo(this.offsetX, py);
      ctx.lineTo(this.offsetX + this.gridW, py);
      ctx.stroke();
    }
  }

  /** 绘制所有格子内容 */
  drawCells(engine) {
    const cs = this.cellSize;
    for (let y = 0; y < engine.grid.length; y++) {
      for (let x = 0; x < engine.grid[y].length; x++) {
        const cell = engine.grid[y][x];
        const px = this.offsetX + x * cs;
        const py = this.offsetY + y * cs;
        this._drawCell(cell, px, py, cs);
      }
    }

    // 绘制起点和终点标记
    this._drawStart(engine.level.start.x, engine.level.start.y, engine.level.startDir);
    this._drawGoal(engine.level.goal.x, engine.level.goal.y);
  }

  /** 绘制单个格子 */
  _drawCell(type, px, py, cs) {
    const ctx = this.ctx;
    const inset = 1;

    switch (type) {
      case CELL.WALL:
        ctx.fillStyle = THEME.wall;
        ctx.fillRect(px + inset, py + inset, cs - inset * 2, cs - inset * 2);
        // 砖纹
        ctx.strokeStyle = THEME.wallStroke;
        ctx.lineWidth = 0.5;
        const half = cs / 2;
        ctx.beginPath();
        ctx.moveTo(px + inset, py + half);
        ctx.lineTo(px + cs - inset, py + half);
        ctx.moveTo(px + half, py + inset);
        ctx.lineTo(px + half, py + half);
        ctx.moveTo(px + inset, py + half);
        ctx.lineTo(px + inset, py + cs - inset);
        ctx.stroke();
        break;

      case CELL.START:
      case CELL.GOAL:
        // 由 _drawStart / _drawGoal 单独绘制
        break;

      default:
        // empty - 不额外绘制
        break;
    }
  }

  /** 绘制起点 */
  _drawStart(x, y, dir) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const cx = this.offsetX + x * cs + cs / 2;
    const cy = this.offsetY + y * cs + cs / 2;
    const r = cs * 0.35;

    // 绿色圆
    ctx.fillStyle = THEME.start;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = THEME.startStroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 方向箭头
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${cs * 0.35}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const arrows = ['↑', '→', '↓', '←'];
    ctx.fillText(arrows[dir], cx, cy);
  }

  /** 绘制终点 */
  _drawGoal(x, y) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const cx = this.offsetX + x * cs + cs / 2;
    const cy = this.offsetY + y * cs + cs / 2;
    const r = cs * 0.35;

    // 红色菱形
    ctx.fillStyle = THEME.goal;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = THEME.goalStroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 星星
    ctx.fillStyle = '#fff';
    ctx.font = `${cs * 0.3}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', cx, cy);
  }

  /** 绘制已放置的物品 */
  drawPlacedItems(engine) {
    const cs = this.cellSize;
    Object.keys(engine.placedItems).forEach(key => {
      const [x, y] = key.split(',').map(Number);
      const item = engine.placedItems[key];
      const px = this.offsetX + x * cs;
      const py = this.offsetY + y * cs;
      this._drawItem(item.type, item.dir, px, py, cs);
    });
  }

  /** 绘制单个物品 */
  _drawItem(type, dir, px, py, cs) {
    const ctx = this.ctx;
    const inset = 3;
    const cx = px + cs / 2;
    const cy = py + cs / 2;

    // 物品底色
    let bg, stroke;
    switch (type) {
      case ITEM.CONVEYOR:
        bg = THEME.conveyorBg;
        stroke = THEME.conveyor;
        break;
      case ITEM.SPRING:
        bg = THEME.springBg;
        stroke = THEME.spring;
        break;
      case ITEM.SLOPE:
        bg = THEME.slopeBg;
        stroke = THEME.slope;
        break;
    }

    // 圆角矩形底色
    ctx.fillStyle = bg;
    this._roundRect(px + inset, py + inset, cs - inset * 2, cs - inset * 2, 4);
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 方向指示
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(dir * Math.PI / 2);

    ctx.fillStyle = stroke;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;

    const half = cs * 0.25;

    switch (type) {
      case ITEM.CONVEYOR:
        // 箭头
        ctx.beginPath();
        ctx.moveTo(-half, 0);
        ctx.lineTo(half, 0);
        ctx.lineTo(half * 0.5, -half * 0.5);
        ctx.moveTo(half, 0);
        ctx.lineTo(half * 0.5, half * 0.5);
        ctx.stroke();
        break;

      case ITEM.SPRING:
        // 弹簧锯齿
        ctx.beginPath();
        ctx.moveTo(-half, half * 0.5);
        for (let i = 0; i < 4; i++) {
          const sx = -half + (half * 2 / 4) * i;
          ctx.lineTo(sx + half / 4, i % 2 === 0 ? -half * 0.5 : half * 0.5);
        }
        ctx.lineTo(half, half * 0.5);
        ctx.stroke();
        // 反弹箭头
        ctx.beginPath();
        ctx.moveTo(0, -half);
        ctx.lineTo(-half * 0.3, -half * 0.6);
        ctx.moveTo(0, -half);
        ctx.lineTo(half * 0.3, -half * 0.6);
        ctx.stroke();
        break;

      case ITEM.SLOPE:
        // 斜坡三角
        ctx.beginPath();
        ctx.moveTo(-half, half);
        ctx.lineTo(half, -half);
        ctx.lineTo(half, half);
        ctx.closePath();
        ctx.fillStyle = stroke;
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.stroke();
        break;
    }

    ctx.restore();
  }

  /** 绘制货物移动轨迹 */
  drawTrail(trail) {
    if (!trail || trail.length < 2) return;
    const ctx = this.ctx;
    const cs = this.cellSize;

    ctx.strokeStyle = THEME.cargoTrail;
    ctx.lineWidth = cs * 0.15;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(
      this.offsetX + trail[0].x * cs + cs / 2,
      this.offsetY + trail[0].y * cs + cs / 2
    );
    for (let i = 1; i < trail.length; i++) {
      ctx.lineTo(
        this.offsetX + trail[i].x * cs + cs / 2,
        this.offsetY + trail[i].y * cs + cs / 2
      );
    }
    ctx.stroke();
  }

  /** 绘制货物 */
  drawCargo(cargo, state) {
    if (!cargo) return;
    const ctx = this.ctx;
    const cs = this.cellSize;
    const cx = this.offsetX + cargo.x * cs + cs / 2;
    const cy = this.offsetY + cargo.y * cs + cs / 2;
    const size = cs * 0.6;
    const half = size / 2;

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(cx - half + 2, cy - half + 2, size, size);

    // 货物方块
    ctx.fillStyle = state === STATE.SUCCESS ? THEME.success :
                    state === STATE.FAIL ? THEME.fail : THEME.cargo;
    ctx.fillRect(cx - half, cy - half, size, size);

    // 边框
    ctx.strokeStyle = THEME.cargoStroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - half, cy - half, size, size);

    // 十字标记（包裹）
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - half + 3);
    ctx.lineTo(cx, cy + half - 3);
    ctx.moveTo(cx - half + 3, cy);
    ctx.lineTo(cx + half - 3, cy);
    ctx.stroke();
  }

  /** 绘制格子高亮（编辑器用） */
  drawCellHighlight(x, y) {
    const ctx = this.ctx;
    const cs = this.cellSize;
    const px = this.offsetX + x * cs;
    const py = this.offsetY + y * cs;

    ctx.strokeStyle = THEME.highlight;
    ctx.lineWidth = 3;
    ctx.strokeRect(px + 1, py + 1, cs - 2, cs - 2);
  }

  /** 圆角矩形辅助 */
  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  /**
   * 将触摸坐标转换为网格坐标
   * @param {number} touchX - 触摸x (CSS px)
   * @param {number} touchY - 触摸y (CSS px)
   * @returns {{x, y}|null}
   */
  touchToGrid(touchX, touchY) {
    const gx = Math.floor((touchX - this.offsetX) / this.cellSize);
    const gy = Math.floor((touchY - this.offsetY) / this.cellSize);
    if (gx < 0 || gy < 0) return null;
    return { x: gx, y: gy };
  }
}

module.exports = Renderer;
