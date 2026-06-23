/**
 * Canvas UI 工具库
 * 提供按钮、圆角矩形、文字换行、Toast 通知等通用绘制组件
 */

// ===== 基础绘制工具 =====

/** 绘制圆角矩形路径 */
function roundRect(ctx, x, y, w, h, r) {
  if (typeof r === 'number') r = { tl: r, tr: r, br: r, bl: r };
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.arcTo(x + w, y, x + w, y + r.tr, r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.arcTo(x + w, y + h, x + w - r.br, y + h, r.br);
  ctx.lineTo(x + r.bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - r.bl, r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.arcTo(x, y, x + r.tl, y, r.tl);
  ctx.closePath();
}

/** 绘制带填充和描边的圆角矩形 */
function fillRoundRect(ctx, x, y, w, h, r, fillColor, strokeColor, lineWidth) {
  roundRect(ctx, x, y, w, h, r);
  if (fillColor) { ctx.fillStyle = fillColor; ctx.fill(); }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth || 1;
    ctx.stroke();
  }
}

/** 文字换行绘制 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const lines = [];
  let currentLine = '';
  for (let i = 0; i < text.length; i++) {
    const testLine = currentLine + text[i];
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = text[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  lines.forEach(function(line, idx) {
    ctx.fillText(line, x, y + idx * lineHeight);
  });
  return lines.length;
}

// ===== Button 组件 =====

class Button {
  constructor(opts) {
    this.x = opts.x || 0;
    this.y = opts.y || 0;
    this.width = opts.width || 100;
    this.height = opts.height || 40;
    this.text = opts.text || '';
    this.fontSize = opts.fontSize || 14;
    this.bgColor = opts.bgColor || 'rgba(255,255,255,0.1)';
    this.textColor = opts.textColor || '#fff';
    this.borderColor = opts.borderColor || 'rgba(255,255,255,0.2)';
    this.activeBgColor = opts.activeBgColor || 'rgba(255,255,255,0.2)';
    this.borderRadius = opts.borderRadius || 8;
    this.disabled = opts.disabled || false;
    this.pressed = false;
    this.data = opts.data || {};
  }

  hitTest(x, y) {
    if (this.disabled) return false;
    return x >= this.x && x <= this.x + this.width &&
           y >= this.y && y <= this.y + this.height;
  }

  draw(ctx) {
    const bg = this.pressed ? this.activeBgColor : this.bgColor;
    const alpha = this.disabled ? 0.4 : 1;
    ctx.save();
    ctx.globalAlpha = alpha;
    fillRoundRect(ctx, this.x, this.y, this.width, this.height,
                  this.borderRadius, bg, this.borderColor, 1);
    ctx.fillStyle = this.textColor;
    ctx.font = '500 ' + this.fontSize + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var displayText = this.text;
    while (ctx.measureText(displayText).width > this.width - 12 && displayText.length > 1) {
      displayText = displayText.slice(0, -1);
    }
    ctx.fillText(displayText, this.x + this.width / 2, this.y + this.height / 2);
    ctx.restore();
  }
}

// ===== Toast 通知 =====

function createToast() {
  return { text: '', timer: 0 };
}

function showToast(toast, text, duration) {
  toast.text = text;
  toast.timer = duration || 1500;
}

function updateToast(toast, dt) {
  if (toast.timer > 0) {
    toast.timer -= dt;
    if (toast.timer < 0) toast.timer = 0;
  }
}

function drawToast(ctx, toast, screenW, screenH) {
  if (toast.timer <= 0 || !toast.text) return;
  var alpha = Math.min(1, toast.timer / 400);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = '14px sans-serif';
  var tw = ctx.measureText(toast.text).width;
  var pw = tw + 32;
  var ph = 36;
  var px = (screenW - pw) / 2;
  var py = screenH * 0.35;
  fillRoundRect(ctx, px, py, pw, ph, 18, 'rgba(0,0,0,0.8)', null);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(toast.text, screenW / 2, py + ph / 2);
  ctx.restore();
}

module.exports = {
  roundRect: roundRect,
  fillRoundRect: fillRoundRect,
  wrapText: wrapText,
  Button: Button,
  createToast: createToast,
  showToast: showToast,
  updateToast: updateToast,
  drawToast: drawToast
};
