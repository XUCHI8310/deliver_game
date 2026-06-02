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

  /** 绘制单个物品（分发到各具体绘制方法） */
  _drawItem(type, dir, px, py, cs) {
    switch (type) {
      case ITEM.CONVEYOR:
        this._drawConveyor(dir, px, py, cs);
        break;
      case ITEM.SPRING:
        this._drawSpring(dir, px, py, cs);
        break;
      case ITEM.SLOPE:
        this._drawSlope(dir, px, py, cs);
        break;
    }
  }

  /**
   * 传送带 - 漫画坦克履带风格
   * 粗黑描边 + 赛璐璐上色 + 大圆轮 + 蓝色方向箭头
   */
  _drawConveyor(dir, px, py, cs) {
    const ctx = this.ctx;
    const inset = cs * 0.06;
    const x0 = px + inset;
    const y0 = py + inset;
    const w = cs - inset * 2;
    const h = cs - inset * 2;
    const wheelR = cs * 0.12;

    // 履带底色（深灰金属）
    ctx.fillStyle = THEME.conveyor;
    this._roundRect(x0, y0, w, h, cs * 0.1);
    ctx.fill();

    // 履带链节纹理
    const linkCount = 5;
    const linkW = w / linkCount;
    ctx.strokeStyle = '#4a4a5a';
    ctx.lineWidth = 1;
    for (let i = 1; i < linkCount; i++) {
      const lx = x0 + linkW * i;
      ctx.beginPath();
      ctx.moveTo(lx, y0 + h * 0.15);
      ctx.lineTo(lx, y0 + h * 0.85);
      ctx.stroke();
    }

    // 上下履带条纹（齿纹）
    ctx.fillStyle = '#4a4a5a';
    const teethCount = 8;
    const teethW = w / teethCount;
    for (let i = 0; i < teethCount; i++) {
      // 上排齿
      ctx.fillRect(x0 + i * teethW + teethW * 0.2, y0, teethW * 0.6, h * 0.08);
      // 下排齿
      ctx.fillRect(x0 + i * teethW + teethW * 0.2, y0 + h * 0.92, teethW * 0.6, h * 0.08);
    }

    // 左右驱动轮
    ctx.fillStyle = THEME.conveyorWheel;
    ctx.strokeStyle = '#2a2a3a';
    ctx.lineWidth = 1.5;
    // 左轮
    ctx.beginPath();
    ctx.arc(x0 + wheelR + 2, y0 + h / 2, wheelR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 右轮
    ctx.beginPath();
    ctx.arc(x0 + w - wheelR - 2, y0 + h / 2, wheelR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 轮轴十字
    ctx.strokeStyle = '#5a5a6a';
    ctx.lineWidth = 1;
    [x0 + wheelR + 2, x0 + w - wheelR - 2].forEach(wx => {
      const wy = y0 + h / 2;
      const cr = wheelR * 0.5;
      ctx.beginPath();
      ctx.moveTo(wx - cr, wy);
      ctx.lineTo(wx + cr, wy);
      ctx.moveTo(wx, wy - cr);
      ctx.lineTo(wx, wy + cr);
      ctx.stroke();
    });

    // 方向箭头（蓝色）
    ctx.save();
    ctx.translate(px + cs / 2, py + cs / 2);
    ctx.rotate(dir * Math.PI / 2);
    ctx.fillStyle = THEME.conveyorArrow;
    ctx.strokeStyle = THEME.conveyorArrow;
    ctx.lineWidth = cs * 0.06;
    const arrowLen = cs * 0.2;
    ctx.beginPath();
    ctx.moveTo(-arrowLen, 0);
    ctx.lineTo(arrowLen, 0);
    ctx.stroke();
    // 箭头尖
    ctx.beginPath();
    ctx.moveTo(arrowLen, 0);
    ctx.lineTo(arrowLen - cs * 0.08, -cs * 0.06);
    ctx.lineTo(arrowLen - cs * 0.08, cs * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 粗黑描边
    ctx.strokeStyle = '#222';
    ctx.lineWidth = cs * 0.04;
    this._roundRect(x0, y0, w, h, cs * 0.1);
    ctx.stroke();
  }

  /**
   * 弹簧 - 铁青色漫画弹簧（直上直下弹射）
   * 粗黑描边 + 铁青色线圈 + 底座
   */
  _drawSpring(dir, px, py, cs) {
    const ctx = this.ctx;
    const inset = cs * 0.08;
    const cx = px + cs / 2;
    const top = py + inset;
    const bottom = py + cs - inset;
    const springH = bottom - top;
    const coilCount = 5;
    const coilW = cs * 0.32;

    // 底座（深铁青色方块）
    const baseH = cs * 0.12;
    ctx.fillStyle = THEME.springDark;
    ctx.fillRect(px + cs * 0.2, bottom - baseH, cs * 0.6, baseH);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = cs * 0.03;
    ctx.strokeRect(px + cs * 0.2, bottom - baseH, cs * 0.6, baseH);

    // 弹簧线圈（铁青色锯齿形，模拟螺旋弹簧侧面）
    const coilTop = top + cs * 0.08;
    const coilBottom = bottom - baseH - cs * 0.02;
    const coilH = coilBottom - coilTop;
    const step = coilH / coilCount;

    // 弹簧主体 - 粗描边锯齿线
    ctx.strokeStyle = THEME.spring;
    ctx.lineWidth = cs * 0.07;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, coilTop);
    for (let i = 0; i < coilCount; i++) {
      const y1 = coilTop + step * i + step * 0.25;
      const y2 = coilTop + step * i + step * 0.75;
      ctx.lineTo(cx + coilW, y1);
      ctx.lineTo(cx - coilW, y2);
    }
    ctx.lineTo(cx, coilBottom);
    ctx.stroke();

    // 弹簧高光（浅铁青色，偏右偏移）
    ctx.strokeStyle = THEME.springLight;
    ctx.lineWidth = cs * 0.03;
    ctx.beginPath();
    ctx.moveTo(cx + 1, coilTop);
    for (let i = 0; i < coilCount; i++) {
      const y1 = coilTop + step * i + step * 0.25;
      const y2 = coilTop + step * i + step * 0.75;
      ctx.lineTo(cx + coilW + 1, y1);
      ctx.lineTo(cx - coilW + 1, y2);
    }
    ctx.lineTo(cx + 1, coilBottom);
    ctx.stroke();

    // 顶部弹板（铁青色矩形）
    const plateH = cs * 0.08;
    ctx.fillStyle = THEME.spring;
    ctx.fillRect(cx - coilW - cs * 0.02, coilTop - plateH, coilW * 2 + cs * 0.04, plateH);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = cs * 0.03;
    ctx.strokeRect(cx - coilW - cs * 0.02, coilTop - plateH, coilW * 2 + cs * 0.04, plateH);

    // 弹射方向箭头（垂直朝上）
    ctx.fillStyle = THEME.springLight;
    ctx.strokeStyle = THEME.springLight;
    ctx.lineWidth = cs * 0.04;
    const arrowBase = coilTop - plateH - cs * 0.02;
    const arrowTip = arrowBase - cs * 0.12;
    ctx.beginPath();
    ctx.moveTo(cx, arrowBase);
    ctx.lineTo(cx, arrowTip);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, arrowTip);
    ctx.lineTo(cx - cs * 0.05, arrowTip + cs * 0.06);
    ctx.lineTo(cx + cs * 0.05, arrowTip + cs * 0.06);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * 斜坡 - 木质等腰直角三角形（侧视图）
   * 木纹纹理 + 钉头 + 自然橡木色
   */
  _drawSlope(dir, px, py, cs) {
    const ctx = this.ctx;
    const inset = cs * 0.06;
    const x0 = px + inset;
    const y0 = py + inset;
    const w = cs - inset * 2;
    const h = cs - inset * 2;

    // 根据方向确定三角形顶点
    // 默认（dir=1,右）: 左下-右下-右上 等腰直角三角形
    let p1, p2, p3; // 三个顶点
    switch (dir) {
      case 0: // 上 - 底边在下，尖端朝上
        p1 = { x: x0, y: y0 + h };
        p2 = { x: x0 + w, y: y0 + h };
        p3 = { x: x0 + w, y: y0 };
        break;
      case 1: // 右 - 底边在左，尖端朝右上
        p1 = { x: x0, y: y0 + h };
        p2 = { x: x0 + w, y: y0 + h };
        p3 = { x: x0 + w, y: y0 };
        break;
      case 2: // 下 - 底边在上，尖端朝右下
        p1 = { x: x0, y: y0 };
        p2 = { x: x0 + w, y: y0 };
        p3 = { x: x0 + w, y: y0 + h };
        break;
      case 3: // 左 - 底边在右，尖端朝左下
        p1 = { x: x0, y: y0 };
        p2 = { x: x0, y: y0 + h };
        p3 = { x: x0 + w, y: y0 + h };
        break;
    }

    // 木质底色（浅橡木色）
    ctx.fillStyle = THEME.slopeLight;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.fill();

    // 木纹线条（斜向平行线，模拟木纹）
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.clip();

    ctx.strokeStyle = THEME.slopeGrain;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.5;
    const grainSpacing = cs * 0.12;
    const grainCount = Math.ceil((w + h) / grainSpacing);
    for (let i = 0; i < grainCount; i++) {
      const offset = i * grainSpacing;
      ctx.beginPath();
      ctx.moveTo(x0 + offset, y0);
      ctx.lineTo(x0 + offset - h * 0.3, y0 + h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // 木纹节疤（小椭圆）
    ctx.fillStyle = THEME.slopeDark;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.ellipse(
      x0 + w * 0.6, y0 + h * 0.6,
      cs * 0.04, cs * 0.025,
      0.5, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore();

    // 木质边框（深木色描边）
    ctx.strokeStyle = THEME.slope;
    ctx.lineWidth = cs * 0.04;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.closePath();
    ctx.stroke();

    // 钉头（四个角附近的小圆点）
    ctx.fillStyle = '#888';
    const nailR = cs * 0.025;
    const nailInset = cs * 0.1;
    const nailPositions = [
      { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
      { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 },
    ];
    nailPositions.forEach(np => {
      ctx.beginPath();
      ctx.arc(np.x, np.y, nailR, 0, Math.PI * 2);
      ctx.fill();
      // 钉头高光
      ctx.fillStyle = '#aaa';
      ctx.beginPath();
      ctx.arc(np.x - nailR * 0.3, np.y - nailR * 0.3, nailR * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#888';
    });
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

  /** 绘制货物 - 写实纸箱侧视图 */
  drawCargo(cargo, state) {
    if (!cargo) return;
    const ctx = this.ctx;
    const cs = this.cellSize;
    const cx = this.offsetX + cargo.x * cs + cs / 2;
    const cy = this.offsetY + cargo.y * cs + cs / 2;
    const size = cs * 0.65;
    const half = size / 2;
    const x0 = cx - half;
    const y0 = cy - half;

    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x0 + 3, y0 + 3, size, size);

    // 状态色影响
    let boxColor = THEME.cargo;
    if (state === STATE.SUCCESS) boxColor = THEME.success;
    if (state === STATE.FAIL) boxColor = THEME.fail;

    // 纸箱底色
    ctx.fillStyle = boxColor;
    ctx.fillRect(x0, y0, size, size);

    // 瓦楞纹（水平细线）
    if (state !== STATE.SUCCESS && state !== STATE.FAIL) {
      ctx.strokeStyle = THEME.cargoDetail;
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.4;
      const lineCount = 6;
      for (let i = 1; i < lineCount; i++) {
        const ly = y0 + (size / lineCount) * i;
        ctx.beginPath();
        ctx.moveTo(x0 + 2, ly);
        ctx.lineTo(x0 + size - 2, ly);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // 封箱胶带（垂直中间条）
    if (state !== STATE.SUCCESS && state !== STATE.FAIL) {
      ctx.fillStyle = THEME.cargoTape;
      ctx.globalAlpha = 0.7;
      const tapeW = size * 0.15;
      ctx.fillRect(cx - tapeW / 2, y0, tapeW, size);
      ctx.globalAlpha = 1;

      // 胶带高光
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.2;
      ctx.fillRect(cx - tapeW / 2 + 1, y0, tapeW * 0.3, size);
      ctx.globalAlpha = 1;
    }

    // 纸箱边框
    ctx.strokeStyle = THEME.cargoStroke;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x0, y0, size, size);

    // 易碎标记（小玻璃杯图标，右下角）
    if (state !== STATE.SUCCESS && state !== STATE.FAIL) {
      const iconSize = size * 0.2;
      const ix = x0 + size - iconSize - 3;
      const iy = y0 + size - iconSize - 2;
      ctx.strokeStyle = THEME.cargoStroke;
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.5;
      // 杯子轮廓
      ctx.beginPath();
      ctx.moveTo(ix + iconSize * 0.2, iy);
      ctx.lineTo(ix + iconSize * 0.8, iy);
      ctx.lineTo(ix + iconSize * 0.7, iy + iconSize * 0.8);
      ctx.lineTo(ix + iconSize * 0.3, iy + iconSize * 0.8);
      ctx.closePath();
      ctx.stroke();
      // 裂纹
      ctx.beginPath();
      ctx.moveTo(ix + iconSize * 0.5, iy + iconSize * 0.15);
      ctx.lineTo(ix + iconSize * 0.4, iy + iconSize * 0.45);
      ctx.lineTo(ix + iconSize * 0.55, iy + iconSize * 0.55);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
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
