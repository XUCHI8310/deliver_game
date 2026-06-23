/**
 * 关卡编辑器场景
 * Canvas 绘制的可视化关卡编辑器
 * 支持：网格编辑、物品放置/旋转、测试、保存
 */

var GameEngine = require('../../game/physics');
var Renderer = require('../../game/renderer');
var levelManager = require('../../game/levels');
var constants = require('../../game/constants');
var UI = require('../ui');

var CELL = constants.CELL;
var ITEM = constants.ITEM;
var DIR = constants.DIR;
var DIR_NAME = constants.DIR_NAME;

var ITEM_TOOLS = [ITEM.CONVEYOR, ITEM.SPRING, ITEM.SLOPE];

function EditorScene(level) {
  this.sm = null;
  this.screenW = 0;
  this.screenH = 0;
  this.canvas = null;
  this.renderer = null;

  // 关卡数据
  this.levelId = '';
  this.levelName = '新关卡';
  this.gridWidth = 8;
  this.gridHeight = 6;
  this.editGrid = [];
  this.placedItems = {};
  this.startPos = { x: 0, y: 0 };
  this.goalPos = { x: 7, y: 5 };

  // 当前工具
  this.currentTool = 'empty';
  this.currentDir = DIR.RIGHT;

  // 状态
  this.isTesting = false;

  // 布局
  this.canvasArea = { x: 0, y: 0, w: 0, h: 0 };

  // 按钮
  this.toolBtns = [];
  this.dirBtns = [];
  this.actionBtns = [];

  // Toast
  this.toast = UI.createToast();

  // 如果传入了关卡，加载编辑
  if (level) {
    this._loadExistingLevel(level);
  } else {
    this._initEmptyGrid(8, 6);
  }
}

EditorScene.prototype.onEnter = function(sm) {
  this.sm = sm;
  this.screenW = sm.width;
  this.screenH = sm.height;
  this.canvas = sm.canvas;

  var dpr = sm.dpr;
  this.renderer = new Renderer(this.canvas, this.screenW, this.screenH, dpr);

  this._calcLayout();
  this._render();
};

EditorScene.prototype._initEmptyGrid = function(w, h) {
  var grid = [];
  for (var y = 0; y < h; y++) {
    grid.push(new Array(w).fill(CELL.EMPTY));
  }
  this.editGrid = grid;
  this.placedItems = {};
  this.startPos = { x: 0, y: 0 };
  this.goalPos = { x: w - 1, y: h - 1 };
};

EditorScene.prototype._loadExistingLevel = function(level) {
  this.levelId = level.id;
  this.levelName = level.name;
  this.gridWidth = level.width;
  this.gridHeight = level.height;

  this.editGrid = level.grid.map(function(row) {
    return row.map(function(cell) {
      return cell === CELL.WALL ? CELL.WALL : CELL.EMPTY;
    });
  });

  this.startPos = { x: level.start.x, y: level.start.y };
  this.goalPos = { x: level.goal.x, y: level.goal.y };
  this.placedItems = {};
};

EditorScene.prototype._calcLayout = function() {
  var sw = this.screenW;
  var sh = this.screenH;

  var topBarH = 48;
  var bottomBarH = 180;

  // 画布区域
  var cw = sw - 20;
  var ch = sh - topBarH - bottomBarH - 20;
  var aspect = this.gridWidth / this.gridHeight;
  var fitW = ch * aspect;
  var fitH = cw / aspect;

  if (fitW <= cw) {
    this.canvasArea = { x: (sw - fitW) / 2, y: topBarH + 10, w: fitW, h: ch };
  } else {
    this.canvasArea = { x: 10, y: topBarH + 10 + (ch - fitH) / 2, w: cw, h: fitH };
  }

  // 工具按钮 (2行4列)
  var tools = [
    { id: 'empty', label: '橡皮' },
    { id: 'wall', label: '墙壁' },
    { id: 'start', label: '起点' },
    { id: 'goal', label: '终点' },
    { id: ITEM.CONVEYOR, label: '传送带' },
    { id: ITEM.SPRING, label: '弹簧' },
    { id: ITEM.SLOPE, label: '斜坡' }
  ];

  var tbtnW = (sw - 50) / 4;
  var tbtnH = 34;
  var tbtnY = sh - bottomBarH + 8;
  this.toolBtns = [];
  for (var i = 0; i < tools.length; i++) {
    var row = Math.floor(i / 4);
    var col = i % 4;
    this.toolBtns.push(new UI.Button({
      x: 10 + col * (tbtnW + 6), y: tbtnY + row * (tbtnH + 6),
      width: tbtnW, height: tbtnH,
      text: tools[i].label, fontSize: 11,
      bgColor: 'rgba(255,255,255,0.06)',
      activeBgColor: 'rgba(233,30,99,0.25)',
      borderColor: 'rgba(255,255,255,0.1)',
      borderRadius: 6,
      data: { tool: tools[i].id }
    }));
  }

  // 方向按钮
  var dSize = 30;
  var dBaseY = tbtnY + 2 * (tbtnH + 6) + 6;
  var dCX = sw / 2;
  this.dirBtns = [
    new UI.Button({ x: dCX - dSize / 2, y: dBaseY, width: dSize, height: dSize,
      text: '\u2191', fontSize: 14, bgColor: 'rgba(255,255,255,0.08)',
      activeBgColor: 'rgba(233,30,99,0.3)', borderColor: 'rgba(255,255,255,0.12)',
      borderRadius: 4, data: { dir: DIR.UP } }),
    new UI.Button({ x: dCX - dSize - 6, y: dBaseY + dSize + 4, width: dSize, height: dSize,
      text: '\u2190', fontSize: 14, bgColor: 'rgba(255,255,255,0.08)',
      activeBgColor: 'rgba(233,30,99,0.3)', borderColor: 'rgba(255,255,255,0.12)',
      borderRadius: 4, data: { dir: DIR.LEFT } }),
    new UI.Button({ x: dCX + 6, y: dBaseY + dSize + 4, width: dSize, height: dSize,
      text: '\u2192', fontSize: 14, bgColor: 'rgba(255,255,255,0.08)',
      activeBgColor: 'rgba(233,30,99,0.3)', borderColor: 'rgba(255,255,255,0.12)',
      borderRadius: 4, data: { dir: DIR.RIGHT } }),
    new UI.Button({ x: dCX - dSize / 2, y: dBaseY + (dSize + 4) * 2, width: dSize, height: dSize,
      text: '\u2193', fontSize: 14, bgColor: 'rgba(255,255,255,0.08)',
      activeBgColor: 'rgba(233,30,99,0.3)', borderColor: 'rgba(255,255,255,0.12)',
      borderRadius: 4, data: { dir: DIR.DOWN } })
  ];

  // 操作按钮
  var abW = (sw - 60) / 4;
  var abH = 30;
  var abY = sh - abH - 8;
  this.actionBtns = [
    new UI.Button({ x: 10, y: abY, width: abW, height: abH, text: '测试', fontSize: 12,
      bgColor: 'rgba(76,175,80,0.6)', activeBgColor: 'rgba(76,175,80,0.8)',
      textColor: '#fff', borderColor: 'rgba(76,175,80,0.4)', borderRadius: 6, data: { action: 'test' } }),
    new UI.Button({ x: 10 + abW + 6, y: abY, width: abW, height: abH, text: '保存', fontSize: 12,
      bgColor: 'rgba(33,150,243,0.6)', activeBgColor: 'rgba(33,150,243,0.8)',
      textColor: '#fff', borderColor: 'rgba(33,150,243,0.4)', borderRadius: 6, data: { action: 'save' } }),
    new UI.Button({ x: 10 + (abW + 6) * 2, y: abY, width: abW, height: abH, text: '清空', fontSize: 12,
      bgColor: 'rgba(244,67,54,0.2)', activeBgColor: 'rgba(244,67,54,0.4)',
      textColor: '#ef9a9a', borderColor: 'rgba(244,67,54,0.3)', borderRadius: 6, data: { action: 'clear' } }),
    new UI.Button({ x: 10 + (abW + 6) * 3, y: abY, width: abW, height: abH, text: '返回', fontSize: 12,
      bgColor: 'rgba(255,255,255,0.06)', activeBgColor: 'rgba(255,255,255,0.12)',
      textColor: '#aaa', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 6, data: { action: 'back' } })
  ];
};

EditorScene.prototype.onExit = function() {};

// ===== 触摸事件 =====

EditorScene.prototype.onTouchStart = function(e) {
  if (this.isTesting) return;

  var touch = e.touches[0];
  var tx = touch.clientX;
  var ty = touch.clientY;

  // 检查是否在画布区域内
  var ca = this.canvasArea;
  if (tx >= ca.x && tx <= ca.x + ca.w && ty >= ca.y && ty <= ca.y + ca.h) {
    var gridPos = this.renderer.touchToGrid(tx, ty);
    if (gridPos) {
      this._handleGridTap(gridPos.x, gridPos.y);
    }
  }
};

EditorScene.prototype.onTouchMove = function() {};

EditorScene.prototype.onTouchEnd = function(e) {
  var t = e.changedTouches[0];
  var tx = t.clientX, ty = t.clientY;

  // 工具按钮
  for (var i = 0; i < this.toolBtns.length; i++) {
    if (this.toolBtns[i].hitTest(tx, ty)) {
      this.currentTool = this.toolBtns[i].data.tool;
      return;
    }
  }

  // 方向按钮
  for (var j = 0; j < this.dirBtns.length; j++) {
    if (this.dirBtns[j].hitTest(tx, ty)) {
      this.currentDir = this.dirBtns[j].data.dir;
      return;
    }
  }

  // 操作按钮
  for (var k = 0; k < this.actionBtns.length; k++) {
    if (this.actionBtns[k].hitTest(tx, ty)) {
      this._onAction(this.actionBtns[k].data.action);
      return;
    }
  }
};

EditorScene.prototype._handleGridTap = function(gx, gy) {
  if (gx < 0 || gx >= this.gridWidth || gy < 0 || gy >= this.gridHeight) return;

  var tool = this.currentTool;
  var key = gx + ',' + gy;

  switch (tool) {
    case 'empty':
      this.editGrid[gy][gx] = CELL.EMPTY;
      delete this.placedItems[key];
      if (this.startPos.x === gx && this.startPos.y === gy) this.startPos = { x: -1, y: -1 };
      if (this.goalPos.x === gx && this.goalPos.y === gy) this.goalPos = { x: -1, y: -1 };
      break;

    case 'wall':
      if (this._isStartOrGoal(gx, gy)) {
        UI.showToast(this.toast, '不能覆盖起点/终点');
        return;
      }
      this.editGrid[gy][gx] = CELL.WALL;
      delete this.placedItems[key];
      break;

    case 'start':
      if (this.editGrid[gy][gx] === CELL.WALL) {
        UI.showToast(this.toast, '不能放在墙壁上');
        return;
      }
      delete this.placedItems[key];
      this.startPos = { x: gx, y: gy };
      break;

    case 'goal':
      if (this.editGrid[gy][gx] === CELL.WALL) {
        UI.showToast(this.toast, '不能放在墙壁上');
        return;
      }
      delete this.placedItems[key];
      this.goalPos = { x: gx, y: gy };
      break;

    default:
      // 物品
      if (this._isStartOrGoal(gx, gy)) {
        UI.showToast(this.toast, '不能放在起点/终点');
        return;
      }
      if (this.editGrid[gy][gx] === CELL.WALL) {
        UI.showToast(this.toast, '不能放在墙壁上');
        return;
      }
      if (this.placedItems[key]) {
        this.placedItems[key].dir = (this.placedItems[key].dir + 1) % 4;
      } else {
        this.placedItems[key] = { type: tool, dir: this.currentDir };
      }
      break;
  }

  this._render();
};

// ===== 操作 =====

EditorScene.prototype._onAction = function(action) {
  switch (action) {
    case 'test': this._onTest(); break;
    case 'save': this._onSave(); break;
    case 'clear': this._onClear(); break;
    case 'back': this._onBack(); break;
  }
};

EditorScene.prototype._onTest = function() {
  if (!this._validateLevel()) return;
  this.isTesting = true;

  try {
    var levelData = this._buildLevelData();
    var engine = new GameEngine();
    engine.loadLevel(levelData);

    var keys = Object.keys(this.placedItems);
    for (var i = 0; i < keys.length; i++) {
      var item = this.placedItems[keys[i]];
      engine.placedItems[keys[i]] = { type: item.type, dir: item.dir };
    }

    var result = engine.simulate();

    if (result.result === 'success') {
      UI.showToast(this.toast, '测试通过! (' + result.steps + '步)');
    } else {
      UI.showToast(this.toast, '未能到达终点');
    }

    // 绘制测试轨迹
    var pseudoEngine = {
      grid: this.editGrid,
      placedItems: this.placedItems,
      cargo: result.trail.length > 0
        ? result.trail[result.trail.length - 1]
        : this.startPos,
      trail: result.trail,
      state: result.result,
      level: {
        width: this.gridWidth,
        height: this.gridHeight,
        start: this.startPos,
        startDir: this.currentDir,
        goal: this.goalPos
      }
    };

    this.renderer.fitGrid(this.gridWidth, this.gridHeight);
    this.renderer.offsetX = this.canvasArea.x;
    this.renderer.offsetY = this.canvasArea.y;
    this.renderer.render(pseudoEngine);
  } catch (err) {
    console.error('测试失败:', err);
    UI.showToast(this.toast, '测试出错');
  }

  var self = this;
  setTimeout(function() {
    self.isTesting = false;
    self._render();
  }, 2500);
};

EditorScene.prototype._onSave = function() {
  if (!this._validateLevel()) return;

  var levelData = this._buildLevelData();
  levelData.placedItems = {};
  var keys = Object.keys(this.placedItems);
  for (var i = 0; i < keys.length; i++) {
    levelData.placedItems[keys[i]] = {
      type: this.placedItems[keys[i]].type,
      dir: this.placedItems[keys[i]].dir
    };
  }

  var savedId = levelManager.saveCustomLevel(levelData);
  if (savedId) {
    this.levelId = savedId;
    UI.showToast(this.toast, '保存成功');
  } else {
    UI.showToast(this.toast, '保存失败');
  }
};

EditorScene.prototype._onClear = function() {
  this._initEmptyGrid(this.gridWidth, this.gridHeight);
  this._render();
  UI.showToast(this.toast, '已清空');
};

EditorScene.prototype._onBack = function() {
  var MenuScene = require('./menu-scene');
  this.sm.switchTo(new MenuScene());
};

// ===== 内部工具 =====

EditorScene.prototype._buildLevelData = function() {
  var cleanGrid = this.editGrid.map(function(row) {
    return row.map(function(cell) {
      return cell === CELL.WALL ? CELL.WALL : CELL.EMPTY;
    });
  });

  if (this.goalPos.x >= 0 && this.goalPos.y >= 0) {
    cleanGrid[this.goalPos.y][this.goalPos.x] = CELL.GOAL;
  }

  return {
    id: this.levelId || '',
    name: this.levelName,
    width: this.gridWidth,
    height: this.gridHeight,
    grid: cleanGrid,
    start: {
      x: this.startPos.x >= 0 ? this.startPos.x : 0,
      y: this.startPos.y >= 0 ? this.startPos.y : 0
    },
    startDir: this.currentDir,
    goal: {
      x: this.goalPos.x >= 0 ? this.goalPos.x : this.gridWidth - 1,
      y: this.goalPos.y >= 0 ? this.goalPos.y : this.gridHeight - 1
    },
    items: { conveyor: 99, spring: 99, slope: 99 }
  };
};

EditorScene.prototype._validateLevel = function() {
  if (this.startPos.x < 0 || this.startPos.y < 0) {
    UI.showToast(this.toast, '请设置起点');
    return false;
  }
  if (this.goalPos.x < 0 || this.goalPos.y < 0) {
    UI.showToast(this.toast, '请设置终点');
    return false;
  }
  if (this.startPos.x === this.goalPos.x && this.startPos.y === this.goalPos.y) {
    UI.showToast(this.toast, '起点和终点不能重合');
    return false;
  }
  return true;
};

EditorScene.prototype._isStartOrGoal = function(x, y) {
  return (this.startPos.x === x && this.startPos.y === y) ||
         (this.goalPos.x === x && this.goalPos.y === y);
};

EditorScene.prototype._render = function(highlightCell) {
  if (!this.renderer) return;

  this.renderer.fitGrid(this.gridWidth, this.gridHeight);
  this.renderer.offsetX = this.canvasArea.x;
  this.renderer.offsetY = this.canvasArea.y;

  var pseudoEngine = {
    grid: this.editGrid,
    placedItems: this.placedItems,
    cargo: { x: this.startPos.x, y: this.startPos.y },
    trail: [],
    state: 'idle',
    level: {
      width: this.gridWidth,
      height: this.gridHeight,
      start: this.startPos,
      startDir: this.currentDir,
      goal: this.goalPos
    }
  };

  this.renderer.render(pseudoEngine, {
    highlightCell: highlightCell || null
  });
};

// ===== 每帧更新 & 绘制 =====

EditorScene.prototype.update = function() {
  UI.updateToast(this.toast, 16);
};

EditorScene.prototype.render = function(ctx) {
  var sw = this.screenW;
  var sh = this.screenH;

  // 背景
  ctx.fillStyle = '#0f0f23';
  ctx.fillRect(0, 0, sw, sh);

  // 顶部栏
  var topGrad = ctx.createLinearGradient(0, 0, 0, 48);
  topGrad.addColorStop(0, '#1a1a3e');
  topGrad.addColorStop(1, '#16163a');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, sw, 48);

  ctx.fillStyle = '#e0e0ff';
  ctx.font = '600 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('关卡编辑: ' + this.levelName, sw / 2, 28);

  // 当前工具提示
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  var toolLabel = '工具: ' + this.currentTool;
  if (ITEM_TOOLS.indexOf(this.currentTool) >= 0) {
    toolLabel += ' (' + DIR_NAME[this.currentDir] + ')';
  }
  ctx.fillText(toolLabel, 10, 28);

  // 网格尺寸提示
  ctx.textAlign = 'right';
  ctx.fillText(this.gridWidth + 'x' + this.gridHeight, sw - 10, 28);

  // 底部工具栏背景
  var bottomGrad = ctx.createLinearGradient(0, sh - 180, 0, sh);
  bottomGrad.addColorStop(0, '#1a1a3e');
  bottomGrad.addColorStop(1, '#12122e');
  ctx.fillStyle = bottomGrad;
  ctx.fillRect(0, sh - 180, sw, 180);

  ctx.strokeStyle = '#2a2a5e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, sh - 180);
  ctx.lineTo(sw, sh - 180);
  ctx.stroke();

  // 工具按钮
  for (var i = 0; i < this.toolBtns.length; i++) {
    var tbtn = this.toolBtns[i];
    tbtn.bgColor = (this.currentTool === tbtn.data.tool)
      ? 'rgba(233,30,99,0.25)'
      : 'rgba(255,255,255,0.06)';
    tbtn.borderColor = (this.currentTool === tbtn.data.tool)
      ? '#e91e63'
      : 'rgba(255,255,255,0.1)';
    tbtn.draw(ctx);
  }

  // 方向按钮（物品工具选中时显示）
  if (ITEM_TOOLS.indexOf(this.currentTool) >= 0) {
    for (var j = 0; j < this.dirBtns.length; j++) {
      var dbtn = this.dirBtns[j];
      dbtn.bgColor = (this.currentDir === dbtn.data.dir)
        ? 'rgba(233,30,99,0.3)'
        : 'rgba(255,255,255,0.08)';
      dbtn.borderColor = (this.currentDir === dbtn.data.dir)
        ? '#e91e63'
        : 'rgba(255,255,255,0.12)';
      dbtn.draw(ctx);
    }
  }

  // 操作按钮
  for (var k = 0; k < this.actionBtns.length; k++) {
    this.actionBtns[k].draw(ctx);
  }

  // Toast
  UI.drawToast(ctx, this.toast, sw, sh);
};

module.exports = EditorScene;
