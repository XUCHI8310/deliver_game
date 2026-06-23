/**
 * 场景管理器
 * 负责场景切换、触摸事件分发、画布上下文管理
 */

class SceneManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    const info = wx.getSystemInfoSync();
    this.width = info.windowWidth;
    this.height = info.windowHeight;
    this.dpr = info.pixelRatio;

    // 设置物理像素尺寸
    canvas.width = this.width * this.dpr;
    canvas.height = this.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);

    this.currentScene = null;

    // 全局触摸事件 → 转发给当前场景
    wx.onTouchStart(this._onTouch.bind(this, 'onTouchStart'));
    wx.onTouchMove(this._onTouch.bind(this, 'onTouchMove'));
    wx.onTouchEnd(this._onTouch.bind(this, 'onTouchEnd'));
  }

  _onTouch(method, e) {
    if (this.currentScene && typeof this.currentScene[method] === 'function') {
      this.currentScene[method](e);
    }
  }

  /**
   * 切换到新场景
   * @param {Object} scene - 新场景实例
   */
  switchTo(scene) {
    if (this.currentScene && typeof this.currentScene.onExit === 'function') {
      this.currentScene.onExit();
    }
    this.currentScene = scene;
    if (typeof scene.onEnter === 'function') {
      scene.onEnter(this);
    }
  }

  update() {
    if (this.currentScene && typeof this.currentScene.update === 'function') {
      this.currentScene.update();
    }
  }

  render() {
    if (this.currentScene && typeof this.currentScene.render === 'function') {
      this.currentScene.render(this.ctx);
    }
  }
}

module.exports = SceneManager;
