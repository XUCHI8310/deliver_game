/**
 * 游戏常量定义
 * 定义方向、格子类型、物品类型、颜色主题等
 */

// ===== 方向常量 =====
const DIR = {
  UP: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3
};

// 方向对应的坐标偏移 (dx, dy)
// 注意: y轴向下为正
const DIR_DELTA = {
  [DIR.UP]:    { dx:  0, dy: -1 },
  [DIR.RIGHT]: { dx:  1, dy:  0 },
  [DIR.DOWN]:  { dx:  0, dy:  1 },
  [DIR.LEFT]:  { dx: -1, dy:  0 }
};

// 方向名称
const DIR_NAME = {
  [DIR.UP]:    '上',
  [DIR.RIGHT]: '右',
  [DIR.DOWN]:  '下',
  [DIR.LEFT]:  '左'
};

// ===== 格子类型 =====
const CELL = {
  EMPTY: 'empty',
  WALL:  'wall',
  START: 'start',
  GOAL:  'goal'
};

// ===== 可放置物品类型 =====
const ITEM = {
  CONVEYOR: 'conveyor',  // 传送带 - 改变货物方向
  SPRING:   'spring',    // 弹簧 - 反弹货物
  SLOPE:    'slope'       // 斜坡 - 货物滑向垂直方向
};

// 物品名称（中文）
const ITEM_NAME = {
  [ITEM.CONVEYOR]: '传送带',
  [ITEM.SPRING]:   '弹簧',
  [ITEM.SLOPE]:    '斜坡'
};

// 物品图标（绘制用）
const ITEM_ICON = {
  [ITEM.CONVEYOR]: '⇥',
  [ITEM.SPRING]:   '⌇',
  [ITEM.SLOPE]:    '╱'
};

// ===== 游戏状态 =====
const STATE = {
  IDLE:     'idle',       // 等待操作
  PLACING:  'placing',    // 放置物品中
  RUNNING:  'running',    // 模拟运行中
  SUCCESS:  'success',    // 过关
  FAIL:     'fail'        // 失败
};

// ===== 模拟参数 =====
const MAX_SIMULATION_STEPS = 200;
const ANIMATION_SPEED = 120; // ms per step

// ===== 颜色主题 =====
const THEME = {
  bg:           '#0f0f23',
  gridBg:       '#f5f5f0',
  gridLine:     '#ddd',
  wall:         '#4a4a6a',
  wallStroke:   '#3a3a5a',
  start:        '#4caf50',
  startStroke:  '#388e3c',
  goal:         '#f44336',
  goalStroke:   '#d32f2f',
  cargo:        '#ffc107',
  cargoStroke:  '#ff9800',
  cargoTrail:   'rgba(255,193,7,0.3)',
  conveyor:     '#2196f3',
  conveyorBg:   'rgba(33,150,243,0.15)',
  spring:       '#ff5722',
  springBg:     'rgba(255,87,34,0.15)',
  slope:        '#9c27b0',
  slopeBg:      'rgba(156,39,176,0.15)',
  textPrimary:  '#333',
  textSecondary:'#888',
  highlight:    '#e91e63',
  cellHover:    'rgba(255,255,255,0.3)',
  success:      '#4caf50',
  fail:         '#f44336'
};

module.exports = {
  DIR, DIR_DELTA, DIR_NAME,
  CELL, ITEM, ITEM_NAME, ITEM_ICON,
  STATE, MAX_SIMULATION_STEPS, ANIMATION_SPEED,
  THEME
};
