/**
 * 物理引擎 - 处理货物移动逻辑
 * 
 * 核心规则：
 * - 货物从起点出发，朝初始方向移动
 * - 传送带：改变货物移动方向为传送带朝向
 * - 弹簧：反弹货物（反向）
 * - 斜坡：将货物方向旋转90°（偏转）
 * - 墙壁/边界：货物停止，关卡失败
 * - 到达终点：关卡成功
 */

const { DIR, DIR_DELTA, CELL, ITEM, STATE, MAX_SIMULATION_STEPS } = require('./constants');

class GameEngine {
  constructor() {
    this.reset();
  }

  /** 重置引擎状态 */
  reset() {
    this.level = null;
    this.grid = [];
    this.placedItems = {};     // key: "x,y" -> { type, dir }
    this.cargo = null;         // { x, y, dir, moving }
    this.state = STATE.IDLE;
    this.steps = 0;
    this.trail = [];           // 货物经过的路径（用于绘制轨迹）
    this.result = null;        // 'success' | 'fail' | null
    this.onStateChange = null; // 状态变化回调
  }

  /**
   * 加载关卡数据
   * @param {Object} level - 关卡JSON对象
   */
  loadLevel(level) {
    this.level = JSON.parse(JSON.stringify(level)); // 深拷贝
    this.grid = level.grid.map(row => [...row]);
    this.placedItems = {};
    this.cargo = { ...level.start, dir: level.startDir, moving: false };
    this.state = STATE.IDLE;
    this.steps = 0;
    this.trail = [{ x: level.start.x, y: level.start.y }];
    this.result = null;
  }

  /** 获取某个格子类型 */
  getCell(x, y) {
    if (y < 0 || y >= this.grid.length || x < 0 || x >= this.grid[0].length) {
      return CELL.WALL; // 越界视为墙壁
    }
    return this.grid[y][x];
  }

  /** 获取已放置的物品 */
  getItem(x, y) {
    return this.placedItems[`${x},${y}`] || null;
  }

  /** 检查坐标是否在网格内 */
  isInBounds(x, y) {
    return y >= 0 && y < this.grid.length && x >= 0 && x < this.grid[0].length;
  }

  /** 检查某个格子是否可以放置物品 */
  canPlaceItem(x, y) {
    const cell = this.getCell(x, y);
    if (cell !== CELL.EMPTY) return false;
    if (this.placedItems[`${x},${y}`]) return false;
    // 不能放在起点和终点
    if (this.level.start.x === x && this.level.start.y === y) return false;
    if (this.level.goal.x === x && this.level.goal.y === y) return false;
    return true;
  }

  /**
   * 放置物品
   * @param {number} x - 列坐标
   * @param {number} y - 行坐标
   * @param {string} type - 物品类型 (ITEM.CONVEYOR / ITEM.SPRING / ITEM.SLOPE)
   * @param {number} dir - 朝向 (DIR.UP / DIR.RIGHT / DIR.DOWN / DIR.LEFT)
   */
  placeItem(x, y, type, dir) {
    if (!this.canPlaceItem(x, y)) return false;
    this.placedItems[`${x},${y}`] = { type, dir };
    return true;
  }

  /** 移除物品 */
  removeItem(x, y) {
    const key = `${x},${y}`;
    if (this.placedItems[key]) {
      delete this.placedItems[key];
      return true;
    }
    return false;
  }

  /** 旋转物品方向（顺时针90°） */
  rotateItem(x, y) {
    const key = `${x},${y}`;
    const item = this.placedItems[key];
    if (!item) return false;
    item.dir = (item.dir + 1) % 4;
    return true;
  }

  /**
   * 发射货物！开始物理模拟
   * 货物从起点朝 startDir 方向开始移动
   */
  launch() {
    if (this.state !== STATE.IDLE) return;
    this.cargo.moving = true;
    this.state = STATE.RUNNING;
    this.steps = 0;
    this.trail = [{ x: this.cargo.x, y: this.cargo.y }];
    this.result = null;
    this._notify();
  }

  /**
   * 单步模拟（供动画调用）
   * @returns {boolean} true=还在运行, false=已结束
   */
  step() {
    if (this.state !== STATE.RUNNING || !this.cargo.moving) return false;

    const delta = DIR_DELTA[this.cargo.dir];
    const nx = this.cargo.x + delta.dx;
    const ny = this.cargo.y + delta.dy;

    // 1. 检查越界
    if (!this.isInBounds(nx, ny)) {
      this.cargo.moving = false;
      this.state = STATE.FAIL;
      this.result = 'fail';
      this._notify();
      return false;
    }

    // 2. 更新位置
    this.cargo.x = nx;
    this.cargo.y = ny;
    this.steps++;
    this.trail.push({ x: nx, y: ny });

    // 3. 检查到达终点
    const cell = this.getCell(nx, ny);
    if (cell === CELL.GOAL) {
      this.cargo.moving = false;
      this.state = STATE.SUCCESS;
      this.result = 'success';
      this._notify();
      return false;
    }

    // 4. 检查撞墙
    if (cell === CELL.WALL) {
      this.cargo.moving = false;
      this.state = STATE.FAIL;
      this.result = 'fail';
      this._notify();
      return false;
    }

    // 5. 检查物品效果
    const item = this.getItem(nx, ny);
    if (item) {
      this._applyItemEffect(item);
    }

    // 6. 检查最大步数
    if (this.steps >= MAX_SIMULATION_STEPS) {
      this.cargo.moving = false;
      this.state = STATE.FAIL;
      this.result = 'fail';
      this._notify();
      return false;
    }

    return true;
  }

  /**
   * 应用物品效果
   * @param {Object} item - { type, dir }
   */
  _applyItemEffect(item) {
    switch (item.type) {
      case ITEM.CONVEYOR:
        // 传送带：直接改变货物方向
        this.cargo.dir = item.dir;
        break;

      case ITEM.SPRING:
        // 弹簧：反向弹回（180°）
        this.cargo.dir = (this.cargo.dir + 2) % 4;
        break;

      case ITEM.SLOPE:
        // 斜坡：顺时针旋转90°
        this.cargo.dir = (this.cargo.dir + 1) % 4;
        break;
    }
  }

  /**
   * 一次性运行完整模拟（用于预览/测试，不需要动画）
   * @returns {Object} { result, trail, steps }
   */
  simulate() {
    this.cargo.moving = true;
    this.state = STATE.RUNNING;
    this.steps = 0;
    this.trail = [{ x: this.level.start.x, y: this.level.start.y }];

    while (this.step()) { /* run to completion */ }

    return {
      result: this.result,
      trail: [...this.trail],
      steps: this.steps
    };
  }

  /** 停止并重置货物到起点 */
  stopAndReset() {
    this.cargo = {
      ...this.level.start,
      dir: this.level.startDir,
      moving: false
    };
    this.state = STATE.IDLE;
    this.steps = 0;
    this.trail = [{ x: this.level.start.x, y: this.level.start.y }];
    this.result = null;
    this._notify();
  }

  /** 清空所有放置的物品 */
  clearAllItems() {
    this.placedItems = {};
    this.stopAndReset();
  }

  /** 通知状态变化 */
  _notify() {
    if (this.onStateChange) {
      this.onStateChange(this.state, this.result);
    }
  }

  /**
   * 导出当前关卡布局（含已放置的物品）
   * 用于保存玩家解题方案
   */
  exportLayout() {
    return {
      levelId: this.level.id,
      placedItems: { ...this.placedItems },
      result: this.result,
      steps: this.steps
    };
  }
}

module.exports = GameEngine;
