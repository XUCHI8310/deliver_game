/**
 * 关卡选择场景
 * Canvas 绘制的关卡列表 + 星级评价 + 编辑入口
 */

var UI = require('../ui');
var levelManager = require('../../game/levels');
var storage = require('../../utils/storage');

function MenuScene() {
  this.levels = [];
  this.progress = null;
  this.scrollY = 0;
  this.levelButtons = [];
  this.editorBtn = null;
  this.sm = null;
  this.screenW = 0;
  this.screenH = 0;
  this.toast = UI.createToast();
  this._touchStartY = 0;
}

MenuScene.prototype.onEnter = function(sm) {
  this.sm = sm;
  this.screenW = sm.width;
  this.screenH = sm.height;
  this.loadData();
  this.layoutButtons();
};

MenuScene.prototype.onExit = function() {};

MenuScene.prototype.loadData = function() {
  this.levels = levelManager.getAllLevels();
  this.progress = storage.getProgress();
};

MenuScene.prototype.layoutButtons = function() {
  var sw = this.screenW;
  var cols = 3;
  var cardW = (sw - 60) / cols;
  var cardH = 110;
  var startY = 130;

  this.levelButtons = [];
  for (var i = 0; i < this.levels.length; i++) {
    var row = Math.floor(i / cols);
    var col = i % cols;
    var x = 20 + col * (cardW + 10);
    var y = startY + row * (cardH + 12);

    var maxUnlocked = this.progress.maxUnlockedLevel || 1;
    var starsMap = this.progress.stars || {};
    var level = this.levels[i];

    this.levelButtons.push({
      x: x, y: y, width: cardW, height: cardH,
      level: level,
      index: i,
      locked: i >= maxUnlocked,
      stars: starsMap[level.id] || 0
    });
  }

  this.editorBtn = new UI.Button({
    x: sw - 130, y: this.screenH - 65,
    width: 110, height: 42,
    text: '关卡编辑', fontSize: 14,
    bgColor: 'rgba(102,126,234,0.8)',
    activeBgColor: 'rgba(102,126,234,1)',
    borderColor: 'rgba(102,126,234,0.6)',
    borderRadius: 21
  });
};

MenuScene.prototype.onTouchStart = function(e) {
  this._touchStartY = e.touches[0].clientY;
};

MenuScene.prototype.onTouchMove = function(e) {
  var dy = e.touches[0].clientY - this._touchStartY;
  this.scrollY += dy;
  this._touchStartY = e.touches[0].clientY;
  if (this.scrollY > 0) this.scrollY = 0;
};

MenuScene.prototype.onTouchEnd = function(e) {
  var t = e.changedTouches[0];
  var x = t.clientX;
  var y = t.clientY;

  // 编辑按钮
  if (this.editorBtn.hitTest(x, y)) {
    var EditorScene = require('./editor-scene');
    this.sm.switchTo(new EditorScene());
    return;
  }

  // 关卡卡片
  for (var i = 0; i < this.levelButtons.length; i++) {
    var btn = this.levelButtons[i];
    if (x >= btn.x && x <= btn.x + btn.width &&
        (y - this.scrollY) >= btn.y && (y - this.scrollY) <= btn.y + btn.height) {
      if (btn.locked) {
        UI.showToast(this.toast, '关卡未解锁');
      } else {
        var GameScene = require('./game-scene');
        this.sm.switchTo(new GameScene(btn.level));
      }
      return;
    }
  }
};

MenuScene.prototype.update = function() {
  UI.updateToast(this.toast, 16);
};

MenuScene.prototype.render = function(ctx) {
  var sw = this.screenW;
  var sh = this.screenH;

  // 背景
  ctx.fillStyle = '#0f0f23';
  ctx.fillRect(0, 0, sw, sh);

  // 标题
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('快递到家', sw / 2, 55);

  // 副标题
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '14px sans-serif';
  ctx.fillText('2D 闯关益智', sw / 2, 82);

  // 分隔线
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, 100);
  ctx.lineTo(sw - 20, 100);
  ctx.stroke();

  // 关卡卡片
  ctx.save();
  ctx.translate(0, this.scrollY);

  for (var i = 0; i < this.levelButtons.length; i++) {
    this._drawLevelCard(ctx, this.levelButtons[i]);
  }

  ctx.restore();

  // 编辑按钮
  this.editorBtn.draw(ctx);

  // 提示
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('上下滑动浏览关卡', sw / 2, sh - 18);

  // Toast
  UI.drawToast(ctx, this.toast, sw, sh);
};

MenuScene.prototype._drawLevelCard = function(ctx, btn) {
  var x = btn.x, y = btn.y, w = btn.width, h = btn.height;

  // 卡片背景
  var bg = btn.locked
    ? 'rgba(30,30,58,0.4)'
    : 'rgba(30,30,58,0.8)';
  var border = btn.locked
    ? 'rgba(255,255,255,0.04)'
    : 'rgba(255,255,255,0.08)';
  UI.fillRoundRect(ctx, x, y, w, h, 12, bg, border, 1);

  var cx = x + w / 2;

  // 编号圆圈
  var numR = 18;
  var numY = y + 30;
  var numGrad = btn.locked
    ? 'rgba(58,58,90,0.6)'
    : 'rgba(102,126,234,0.8)';
  ctx.beginPath();
  ctx.arc(cx, numY, numR, 0, Math.PI * 2);
  ctx.fillStyle = numGrad;
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('' + (btn.index + 1), cx, numY);

  // 关卡名
  ctx.fillStyle = btn.locked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.85)';
  ctx.font = '12px sans-serif';
  ctx.textBaseline = 'middle';
  var name = btn.level.name || ('关卡 ' + (btn.index + 1));
  if (ctx.measureText(name).width > w - 16) {
    while (ctx.measureText(name + '..').width > w - 16 && name.length > 1) {
      name = name.slice(0, -1);
    }
    name += '..';
  }
  ctx.fillText(name, cx, y + 60);

  // 星星
  var starY = y + 82;
  ctx.font = '14px sans-serif';
  for (var s = 0; s < 3; s++) {
    ctx.fillStyle = (btn.stars > s) ? '#ffc107' : 'rgba(255,255,255,0.15)';
    ctx.fillText('\u2605', cx - 16 + s * 16, starY);
  }

  // 锁
  if (btn.locked) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('\uD83D\uDD12', x + w - 8, y + 18);
    ctx.textAlign = 'center';
  }
};

module.exports = MenuScene;
