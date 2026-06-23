/**
 * 游戏主场景
 * Canvas 绘制的游戏界面：顶部信息栏 + 游戏画布 + 底部工具栏 + 结果弹窗
 */

var GameEngine = require('../../game/physics');
var Renderer = require('../../game/renderer');
var levelManager = require('../../game/levels');
var storage = require('../../utils/storage');
var constants = require('../../game/constants');
var UI = require('../ui');

var ITEM = constants.ITEM;
var ITEM_NAME = constants.ITEM_NAME;
var DIR = constants.DIR;
var STATE = constants.STATE;
var ANIMATION_SPEED = constants.ANIMATION_SPEED;

function GameScene(level) {
  this.level = level;
  this.levelId = level.id;
  this.sm = null;
  this.screenW = 0;
  this.screenH = 0;

  // 游戏引擎
  this.engine = new GameEngine();
  this.engine.loadLevel(level);
  this.engine.onStateChange = this._onEngineStateChange.bind(this);

  // 物品管理
  this._initialItems = JSON.parse(JSON.stringify(level.items || {}));
  this._usedCounts = {};
  var keys = Object.keys(this._initialItems);
  for (var k = 0; k < keys.length; k++) { this._usedCounts[keys[k]] = 0; }

  // 状态
  this.selectedItem = null;
  this.selectedDir = DIR.RIGHT;
  this.showResult = false;
  this.result = '';
  this.steps = 0;

  // 渲染器
  this.renderer = null;
  this.canvas = null;
  this._animTimer = null;

  // UI 布局（onEnter 中计算）
  this.infoBarH = 44;
  this.toolbarH = 150;
  this.canvasTop = 0;
  this.canvasH = 0;
  this.itemBtns = [];
  this.dirBtns = [];
  this.actionBtns = [];
  this.backBtn = null;

  // Toast
  this.toast = UI.createToast();
}

GameScene.prototype.onEnter = function(sm) {
  this.sm = sm;
  this.screenW = sm.width;
  this.screenH = sm.height;

  this._calcLayout();

  // 初始化游戏渲染器（使用屏幕中间区域）
  this.canvas = sm.canvas;
  var dpr = sm.dpr;
  var ctx = sm.ctx;

  this.renderer = new Renderer(this.canvas, this.screenW, this.canvasH, dpr);
  // 调整 offset 使其居中在 canvas 区域内
  this.renderer.fitGrid(this.level.width, this.level.height);
  this.renderer.offsetY += this.canvasTop;

  this._render();
};

GameScene.prototype._calcLayout = function() {
  var sw = this.screenW;
  var sh = this.screenH;

  this.infoBarH = 44;
  this.toolbarH = 150;
  this.canvasTop = this.infoBarH;
  this.canvasH = sh - this.infoBarH - this.toolbarH;

  // 物品按钮
  var types = [ITEM.CONVEYOR, ITEM.SPRING, ITEM.SLOPE];
  var btnW = (sw - 60) / 3;
  var btnH = 42;
  var btnY = sh - this.toolbarH + 10;
  this.itemBtns = [];
  for (var i = 0; i < types.length; i++) {
    var remaining = this._getRemaining(types[i]);
    this.itemBtns.push(new UI.Button({
      x: 15 + i * (btnW + 8), y: btnY,
      width: btnW, height: btnH,
      text: ITEM_NAME[types[i]] + ' x' + remaining,
      fontSize: 12,
      bgColor: 'rgba(255,255,255,0.06)',
      activeBgColor: 'rgba(233,30,99,0.25)',
      borderColor: 'rgba(255,255,255,0.1)',
      borderRadius: 8,
      data: { type: types[i] }
    }));
  }

  // 方向按钮
  var dirSize = 34;
  var dirBaseY = btnY + btnH + 8;
  var dirCX = sw / 2;
  this.dirBtns = [
    new UI.Button({ x: dirCX - dirSize / 2, y: dirBaseY - 2, width: dirSize, height: dirSize,
      text: '\u2191', fontSize: 16, bgColor: 'rgba(255,255,255,0.08)',
      activeBgColor: 'rgba(233,30,99,0.3)', borderColor: 'rgba(255,255,255,0.12)',
      borderRadius: 6, data: { dir: DIR.UP } }),
    new UI.Button({ x: dirCX - dirSize - 8, y: dirBaseY + dirSize + 2, width: dirSize, height: dirSize,
      text: '\u2190', fontSize: 16, bgColor: 'rgba(255,255,255,0.08)',
      activeBgColor: 'rgba(233,30,99,0.3)', borderColor: 'rgba(255,255,255,0.12)',
      borderRadius: 6, data: { dir: DIR.LEFT } }),
    new UI.Button({ x: dirCX + 8, y: dirBaseY + dirSize + 2, width: dirSize, height: dirSize,
      text: '\u2192', fontSize: 16, bgColor: 'rgba(255,255,255,0.08)',
      activeBgColor: 'rgba(233,30,99,0.3)', borderColor: 'rgba(255,255,255,0.12)',
      borderRadius: 6, data: { dir: DIR.RIGHT } }),
    new UI.Button({ x: dirCX - dirSize / 2, y: dirBaseY + dirSize * 2 + 6, width: dirSize, height: dirSize,
      text: '\u2193', fontSize: 16, bgColor: 'rgba(255,255,255,0.08)',
      activeBgColor: 'rgba(233,30,99,0.3)', borderColor: 'rgba(255,255,255,0.12)',
      borderRadius: 6, data: { dir: DIR.DOWN } })
  ];

  // 操作按钮
  var actW = (sw - 70) / 4;
  var actH = 34;
  var actY = sh - actH - 10;
  this.actionBtns = [
    new UI.Button({ x: 10, y: actY, width: actW, height: actH, text: '发射', fontSize: 13,
      bgColor: 'rgba(76,175,80,0.8)', activeBgColor: 'rgba(76,175,80,1)',
      textColor: '#fff', borderColor: 'rgba(76,175,80,0.6)', borderRadius: 8, data: { action: 'launch' } }),
    new UI.Button({ x: 10 + actW + 8, y: actY, width: actW, height: actH, text: '重置', fontSize: 13,
      bgColor: 'rgba(255,152,0,0.2)', activeBgColor: 'rgba(255,152,0,0.4)',
      textColor: '#ffb74d', borderColor: 'rgba(255,152,0,0.3)', borderRadius: 8, data: { action: 'reset' } }),
    new UI.Button({ x: 10 + (actW + 8) * 2, y: actY, width: actW, height: actH, text: '清空', fontSize: 13,
      bgColor: 'rgba(244,67,54,0.2)', activeBgColor: 'rgba(244,67,54,0.4)',
      textColor: '#ef9a9a', borderColor: 'rgba(244,67,54,0.3)', borderRadius: 8, data: { action: 'clear' } }),
    new UI.Button({ x: 10 + (actW + 8) * 3, y: actY, width: actW, height: actH, text: '返回', fontSize: 13,
      bgColor: 'rgba(255,255,255,0.06)', activeBgColor: 'rgba(255,255,255,0.12)',
      textColor: '#aaa', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, data: { action: 'back' } })
  ];

  this.backBtn = new UI.Button({
    x: 10, y: 8, width: 50, height: 28,
    text: '\u2190', fontSize: 16,
    bgColor: 'rgba(255,255,255,0.06)', activeBgColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.1)', borderRadius: 6
  });
};

GameScene.prototype.onExit = function() {
  this._clearAnimTimer();
};

// ===== 触摸事件 =====

GameScene.prototype.onTouchStart = function(e) {
  if (this._isRunning()) return;
  if (this.showResult) return;
  if (!this.renderer) return;

  var touch = e.touches[0];
  var tx = touch.clientX;
  var ty = touch.clientY;

  // 只在游戏画布区域内处理放置/旋转
  if (ty < this.canvasTop || ty > this.canvasTop + this.canvasH) return;

  var gridPos = this.renderer.touchToGrid(tx, ty);
  if (!gridPos) return;

  var gx = gridPos.x, gy = gridPos.y;

  // 已有物品 → 旋转
  var existing = this.engine.getItem(gx, gy);
  if (existing) {
    this.engine.rotateItem(gx, gy);
    this._render();
    return;
  }

  // 放置选中物品
  if (!this.selectedItem) return;
  var remaining = this._getRemaining(this.selectedItem);
  if (remaining <= 0) return;

  if (this.engine.placeItem(gx, gy, this.selectedItem, this.selectedDir)) {
    this._usedCounts[this.selectedItem] = (this._usedCounts[this.selectedItem] || 0) + 1;
    this._updateItemBtns();
    this._render();
  }
};

GameScene.prototype.onTouchMove = function() {};

GameScene.prototype.onTouchEnd = function(e) {
  var t = e.changedTouches[0];
  var tx = t.clientX, ty = t.clientY;

  // 结果弹窗按钮
  if (this.showResult) {
    this._handleResultTouch(tx, ty);
    return;
  }

  // 返回按钮
  if (this.backBtn.hitTest(tx, ty)) {
    this._onBack();
    return;
  }

  // 物品按钮
  for (var i = 0; i < this.itemBtns.length; i++) {
    if (this.itemBtns[i].hitTest(tx, ty)) {
      this._onSelectItem(this.itemBtns[i].data.type);
      return;
    }
  }

  // 方向按钮
  if (this.selectedItem) {
    for (var j = 0; j < this.dirBtns.length; j++) {
      if (this.dirBtns[j].hitTest(tx, ty)) {
        this.selectedDir = this.dirBtns[j].data.dir;
        return;
      }
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

// ===== 交互逻辑 =====

GameScene.prototype._onSelectItem = function(type) {
  if (this._isRunning()) return;
  if (this.selectedItem === type) {
    this.selectedItem = null;
  } else {
    this.selectedItem = type;
    this.selectedDir = DIR.RIGHT;
  }
};

GameScene.prototype._onAction = function(action) {
  switch (action) {
    case 'launch': this._onLaunch(); break;
    case 'reset': this._onReset(); break;
    case 'clear': this._onClear(); break;
    case 'back': this._onBack(); break;
  }
};

GameScene.prototype._onLaunch = function() {
  if (this._isRunning() || this.showResult) return;
  this.selectedItem = null;
  this._clearAnimTimer();

  this.engine.launch();
  this._render();

  var self = this;
  this._animTimer = setInterval(function() {
    self.engine.step();
    self.steps = self.engine.steps;
    self._render();
    if (self.engine.state !== STATE.RUNNING) {
      self._clearAnimTimer();
    }
  }, ANIMATION_SPEED);
};

GameScene.prototype._onReset = function() {
  if (this.showResult) return;
  this._clearAnimTimer();
  this.engine.stopAndReset();
  this.steps = 0;
  this.selectedItem = null;
  this._render();
};

GameScene.prototype._onClear = function() {
  if (this.showResult) return;
  this._clearAnimTimer();
  this.engine.clearAllItems();
  var keys = Object.keys(this._usedCounts);
  for (var i = 0; i < keys.length; i++) { this._usedCounts[keys[i]] = 0; }
  this._updateItemBtns();
  this.steps = 0;
  this.selectedItem = null;
  this._render();
};

GameScene.prototype._onBack = function() {
  this._clearAnimTimer();
  var MenuScene = require('./menu-scene');
  this.sm.switchTo(new MenuScene());
};

GameScene.prototype._onNextLevel = function() {
  this.showResult = false;
  this._clearAnimTimer();

  var allLevels = levelManager.getAllLevels();
  var curIdx = -1;
  for (var i = 0; i < allLevels.length; i++) {
    if (allLevels[i].id === this.levelId) { curIdx = i; break; }
  }

  if (curIdx < 0 || curIdx >= allLevels.length - 1) {
    UI.showToast(this.toast, '已是最后一关');
    return;
  }
  this._loadLevel(allLevels[curIdx + 1]);
};

GameScene.prototype._onRetry = function() {
  this.showResult = false;
  this._clearAnimTimer();

  this.engine = new GameEngine();
  this.engine.loadLevel(this.level);
  this.engine.onStateChange = this._onEngineStateChange.bind(this);

  var keys = Object.keys(this._usedCounts);
  for (var i = 0; i < keys.length; i++) { this._usedCounts[keys[i]] = 0; }

  this._updateItemBtns();
  this.steps = 0;
  this.selectedItem = null;
  this.selectedDir = DIR.RIGHT;
  this._render();
};

// ===== 结果弹窗 =====

GameScene.prototype._onEngineStateChange = function(state, result) {
  if (state === STATE.SUCCESS || state === STATE.FAIL) {
    this._showResult(result);
  }
};

GameScene.prototype._showResult = function(result) {
  this.showResult = true;
  this.result = result;

  if (result === 'success') {
    var stars = this._calcStars();
    storage.updateLevelProgress(this.levelId, stars);

    var allLevels = levelManager.getAllLevels();
    for (var i = 0; i < allLevels.length; i++) {
      if (allLevels[i].id === this.levelId) {
        storage.unlockNextLevel(i + 1);
        break;
      }
    }
  }
};

GameScene.prototype._calcStars = function() {
  var totalAvailable = 0;
  var vals = Object.values(this._initialItems);
  for (var i = 0; i < vals.length; i++) totalAvailable += vals[i];

  var totalUsed = 0;
  var uvals = Object.values(this._usedCounts);
  for (var j = 0; j < uvals.length; j++) totalUsed += uvals[j];

  if (totalAvailable === 0) return 3;
  var ratio = totalUsed / totalAvailable;
  if (ratio <= 0.5) return 3;
  if (ratio <= 0.8) return 2;
  return 1;
};

GameScene.prototype._handleResultTouch = function(x, y) {
  var sw = this.screenW;
  var sh = this.screenH;
  var cardW = sw * 0.8;
  var cardH = 280;
  var cardX = (sw - cardW) / 2;
  var cardY = (sh - cardH) / 2;

  var btnW = cardW - 60;
  var btnH = 38;
  var btnX = cardX + 30;
  var btnBaseY = cardY + cardH - 160;

  var idx = 0;
  if (this.result === 'success') {
    if (x >= btnX && x <= btnX + btnW && y >= btnBaseY && y <= btnBaseY + btnH) {
      this._onNextLevel();
      return;
    }
    idx = 1;
  }

  var retryY = btnBaseY + (idx + 1) * (btnH + 10);
  if (x >= btnX && x <= btnX + btnW && y >= retryY && y <= retryY + btnH) {
    this._onRetry();
    return;
  }

  var backY = retryY + btnH + 10;
  if (x >= btnX && x <= btnX + btnW && y >= backY && y <= backY + btnH) {
    this._onBack();
    return;
  }
};

// ===== 内部工具 =====

GameScene.prototype._loadLevel = function(level) {
  this.levelId = level.id;
  this.level = level;

  this.engine = new GameEngine();
  this.engine.loadLevel(level);
  this.engine.onStateChange = this._onEngineStateChange.bind(this);

  this._initialItems = JSON.parse(JSON.stringify(level.items || {}));
  this._usedCounts = {};
  var keys = Object.keys(this._initialItems);
  for (var i = 0; i < keys.length; i++) { this._usedCounts[keys[i]] = 0; }

  this._updateItemBtns();
  this.steps = 0;
  this.showResult = false;
  this.result = '';
  this.selectedItem = null;
  this.selectedDir = DIR.RIGHT;

  if (this.renderer) {
    this.renderer.fitGrid(level.width, level.height);
    this.renderer.offsetY += this.canvasTop;
    this._render();
  }
};

GameScene.prototype._updateItemBtns = function() {
  for (var i = 0; i < this.itemBtns.length; i++) {
    var type = this.itemBtns[i].data.type;
    var remaining = this._getRemaining(type);
    this.itemBtns[i].text = ITEM_NAME[type] + ' x' + remaining;
    this.itemBtns[i].disabled = remaining <= 0;
  }
};

GameScene.prototype._getRemaining = function(type) {
  var total = this._initialItems[type] || 0;
  var used = this._usedCounts[type] || 0;
  return Math.max(0, total - used);
};

GameScene.prototype._render = function() {
  if (!this.renderer || !this.engine || !this.engine.level) return;
  this.renderer.render(this.engine, {});
};

GameScene.prototype._isRunning = function() {
  return this.engine && this.engine.state === STATE.RUNNING;
};

GameScene.prototype._clearAnimTimer = function() {
  if (this._animTimer) {
    clearInterval(this._animTimer);
    this._animTimer = null;
  }
};

// ===== 每帧更新 & 绘制 =====

GameScene.prototype.update = function() {
  UI.updateToast(this.toast, 16);
};

GameScene.prototype.render = function(ctx) {
  var sw = this.screenW;
  var sh = this.screenH;

  // 全屏背景
  ctx.fillStyle = '#0f0f23';
  ctx.fillRect(0, 0, sw, sh);

  // 顶部信息栏
  var grad = ctx.createLinearGradient(0, 0, 0, this.infoBarH);
  grad.addColorStop(0, '#1a1a3e');
  grad.addColorStop(1, '#16163a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, sw, this.infoBarH);

  ctx.strokeStyle = '#2a2a5e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, this.infoBarH);
  ctx.lineTo(sw, this.infoBarH);
  ctx.stroke();

  this.backBtn.draw(ctx);

  ctx.fillStyle = '#e0e0ff';
  ctx.font = '600 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(this.level.name || '未知关卡', sw / 2, 28);

  ctx.fillStyle = '#8888cc';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('步数: ' + this.steps, sw - 15, 28);

  // 游戏画布区域（已由 renderer 绘制，这里只画工具栏）

  // 底部工具栏背景
  var tbGrad = ctx.createLinearGradient(0, sh - this.toolbarH, 0, sh);
  tbGrad.addColorStop(0, '#1a1a3e');
  tbGrad.addColorStop(1, '#12122e');
  ctx.fillStyle = tbGrad;
  ctx.fillRect(0, sh - this.toolbarH, sw, this.toolbarH);

  ctx.strokeStyle = '#2a2a5e';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, sh - this.toolbarH);
  ctx.lineTo(sw, sh - this.toolbarH);
  ctx.stroke();

  // 物品按钮
  for (var i = 0; i < this.itemBtns.length; i++) {
    var btn = this.itemBtns[i];
    btn.bgColor = (this.selectedItem === btn.data.type)
      ? 'rgba(233,30,99,0.25)'
      : 'rgba(255,255,255,0.06)';
    btn.borderColor = (this.selectedItem === btn.data.type)
      ? '#e91e63'
      : 'rgba(255,255,255,0.1)';
    btn.draw(ctx);
  }

  // 方向选择器
  if (this.selectedItem) {
    for (var j = 0; j < this.dirBtns.length; j++) {
      var dbtn = this.dirBtns[j];
      dbtn.bgColor = (this.selectedDir === dbtn.data.dir)
        ? 'rgba(233,30,99,0.3)'
        : 'rgba(255,255,255,0.08)';
      dbtn.borderColor = (this.selectedDir === dbtn.data.dir)
        ? '#e91e63'
        : 'rgba(255,255,255,0.12)';
      dbtn.draw(ctx);
    }
  }

  // 操作按钮
  for (var k = 0; k < this.actionBtns.length; k++) {
    this.actionBtns[k].draw(ctx);
  }

  // 结果弹窗
  if (this.showResult) {
    this._drawResultOverlay(ctx);
  }

  // Toast
  UI.drawToast(ctx, this.toast, sw, sh);
};

GameScene.prototype._drawResultOverlay = function(ctx) {
  var sw = this.screenW;
  var sh = this.screenH;

  // 半透明遮罩
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, sw, sh);

  // 弹窗卡片
  var cardW = sw * 0.8;
  var cardH = 280;
  var cardX = (sw - cardW) / 2;
  var cardY = (sh - cardH) / 2;

  var isSuccess = this.result === 'success';
  var cardBg = isSuccess ? '#1b3a2a' : '#3a1b1b';
  var cardBorder = isSuccess ? 'rgba(76,175,80,0.4)' : 'rgba(244,67,54,0.4)';

  UI.fillRoundRect(ctx, cardX, cardY, cardW, cardH, 16, cardBg, cardBorder, 1);

  // 标题
  ctx.fillStyle = isSuccess ? '#81c784' : '#ef9a9a';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(isSuccess ? '恭喜过关!' : '差一点!', sw / 2, cardY + 45);

  // 星星（成功时）
  if (isSuccess) {
    var stars = this._calcStars();
    ctx.font = '26px sans-serif';
    for (var s = 0; s < 3; s++) {
      ctx.fillStyle = stars > s ? '#ffd54f' : 'rgba(255,255,255,0.15)';
      ctx.fillText('\u2605', sw / 2 - 30 + s * 30, cardY + 85);
    }
  }

  // 按钮
  var btnW = cardW - 60;
  var btnH = 38;
  var btnX = cardX + 30;
  var btnY = cardY + cardH - 160;
  var gap = btnH + 10;

  if (isSuccess) {
    UI.fillRoundRect(ctx, btnX, btnY, btnW, btnH, 8,
      'rgba(76,175,80,0.8)', 'rgba(76,175,80,0.6)', 1);
    ctx.fillStyle = '#fff';
    ctx.font = '500 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('下一关', sw / 2, btnY + btnH / 2 + 1);
    btnY += gap;
  }

  UI.fillRoundRect(ctx, btnX, btnY, btnW, btnH, 8,
    'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.1)', 1);
  ctx.fillStyle = '#ccc';
  ctx.font = '500 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('重试', sw / 2, btnY + btnH / 2 + 1);
  btnY += gap;

  UI.fillRoundRect(ctx, btnX, btnY, btnW, btnH, 8,
    'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.1)', 1);
  ctx.fillStyle = '#ccc';
  ctx.fillText('返回', sw / 2, btnY + btnH / 2 + 1);
};

module.exports = GameScene;
