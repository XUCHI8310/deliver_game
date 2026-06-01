/**
 * game.js - 游戏主页面逻辑
 *
 * 负责：
 * - 加载关卡数据并初始化引擎 / 渲染器
 * - 处理物品选择、方向选择、触摸放置
 * - 控制发射、重置、清空等操作
 * - 管理动画循环与结果弹窗
 */

const GameEngine = require('../../game/physics');
const Renderer   = require('../../game/renderer');
const levelManager = require('../../game/levels');
const storage = require('../../utils/storage');
const {
  ITEM, ITEM_NAME,
  DIR, DIR_NAME,
  STATE, ANIMATION_SPEED
} = require('../../game/constants');

Page({
  data: {
    // 顶部信息栏
    levelName: '',
    steps: 0,

    // 物品面板
    itemTypes: [],       // [{ type, name, remaining }]
    selectedItem: null,  // 当前选中的物品类型字符串 | null
    selectedDir: DIR.RIGHT,

    // 结果弹窗
    showResult: false,
    result: ''           // 'success' | 'fail'
  },

  /* ================================================================
   *  生命周期
   * ================================================================ */

  onLoad(options) {
    const levelId = options.levelId;
    const level = levelManager.getLevelById(levelId);

    if (!level) {
      wx.showToast({ title: '关卡不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }

    this.levelId    = levelId;
    this.level      = level;
    this.levelIndex = -1; // 稍后在 getAllLevels 中定位

    // 创建引擎并加载关卡
    this.engine = new GameEngine();
    this.engine.loadLevel(level);

    // 引擎状态变化回调（发射后每步结束都会触发）
    this.engine.onStateChange = this._onEngineStateChange.bind(this);

    // 深拷贝初始物品数量（用于重试时恢复）
    this._initialItems = JSON.parse(JSON.stringify(level.items || {}));

    // 记录已使用的物品数量（各类型初始为 0）
    this._usedCounts = {};
    Object.keys(this._initialItems).forEach(k => { this._usedCounts[k] = 0; });

    // 构造物品面板数据
    const itemTypes = this._buildItemTypes();

    this.setData({
      levelName: level.name || '未知关卡',
      itemTypes: itemTypes,
      steps: 0,
      showResult: false,
      result: '',
      selectedItem: null,
      selectedDir: DIR.RIGHT
    });

    this._animTimer = null;
    this.renderer   = null;
  },

  onReady() {
    const query = wx.createSelectorQuery();
    query.select('#gameCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) {
          console.error('获取 Canvas 节点失败');
          return;
        }

        const { node: canvas, width, height } = res[0];
        const dpr = wx.getSystemInfoSync().pixelRatio;

        // 设置物理像素尺寸
        canvas.width  = width  * dpr;
        canvas.height = height * dpr;

        // 创建渲染器
        this.renderer = new Renderer(canvas, width, height, dpr);

        // 缩放上下文以匹配 DPR
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // 根据关卡网格适配布局
        this.renderer.fitGrid(this.level.width, this.level.height);

        // 首次渲染
        this._render();
      });
  },

  onUnload() {
    this._clearAnimTimer();
  },

  /* ================================================================
   *  物品 & 方向选择
   * ================================================================ */

  /** 选中/取消选中物品类型 */
  onSelectItem(e) {
    if (this._isRunning()) return;

    const type = e.currentTarget.dataset.type;
    if (this.data.selectedItem === type) {
      // 再次点击同一物品 -> 取消选中
      this.setData({ selectedItem: null });
    } else {
      this.setData({
        selectedItem: type,
        selectedDir: DIR.RIGHT
      });
    }
  },

  /** 选中方向 */
  onSelectDir(e) {
    if (this._isRunning()) return;
    const dir = parseInt(e.currentTarget.dataset.dir, 10);
    this.setData({ selectedDir: dir });
  },

  /* ================================================================
   *  触摸事件 —— 在画布上放置 / 旋转物品
   * ================================================================ */

  onTouchStart(e) {
    if (this._isRunning() || !this.renderer) return;

    const touch  = e.touches[0];
    const gridPos = this.renderer.touchToGrid(touch.x, touch.y);
    if (!gridPos) return;

    const { x, y } = gridPos;

    // 如果该格已有物品 -> 顺时针旋转 90 度
    const existing = this.engine.getItem(x, y);
    if (existing) {
      this.engine.rotateItem(x, y);
      this._render();
      return;
    }

    // 尝试放置当前选中的物品
    const { selectedItem, selectedDir } = this.data;
    if (!selectedItem) return;

    const remaining = this._getRemaining(selectedItem);
    if (remaining <= 0) return;

    if (this.engine.placeItem(x, y, selectedItem, selectedDir)) {
      this._usedCounts[selectedItem] = (this._usedCounts[selectedItem] || 0) + 1;
      this.setData({ itemTypes: this._buildItemTypes() });
      this._render();
    }
  },

  onTouchMove() {
    // 预留：可做拖拽预览
  },

  onTouchEnd() {
    // 预留：可做长按删除等
  },

  /* ================================================================
   *  操作按钮
   * ================================================================ */

  /** 发射货物 */
  onLaunch() {
    if (this._isRunning() || this.data.showResult) return;

    this.setData({ selectedItem: null });
    this._clearAnimTimer();

    this.engine.launch();
    this._render();

    // 启动逐帧动画
    this._animTimer = setInterval(() => {
      const running = this.engine.step();
      this.setData({ steps: this.engine.steps });
      this._render();

      if (!running) {
        this._clearAnimTimer();
      }
    }, ANIMATION_SPEED);
  },

  /** 重置货物到起点（保留已放置物品） */
  onReset() {
    if (this.data.showResult) return;
    this._clearAnimTimer();
    this.engine.stopAndReset();
    this.setData({ steps: 0, selectedItem: null });
    this._render();
  },

  /** 清空所有已放置物品并重置货物 */
  onClear() {
    if (this.data.showResult) return;
    this._clearAnimTimer();
    this.engine.clearAllItems();

    // 重置使用计数
    Object.keys(this._usedCounts).forEach(k => { this._usedCounts[k] = 0; });

    this.setData({
      itemTypes: this._buildItemTypes(),
      steps: 0,
      selectedItem: null
    });
    this._render();
  },

  /** 返回关卡选择 */
  onBack() {
    this._clearAnimTimer();
    wx.navigateBack();
  },

  /* ================================================================
   *  结果弹窗相关
   * ================================================================ */

  /** 进入下一关 */
  onNextLevel() {
    this.setData({ showResult: false });
    this._clearAnimTimer();

    const allLevels = levelManager.getAllLevels();
    const curIdx = allLevels.findIndex(l => l.id === this.levelId);

    if (curIdx < 0 || curIdx >= allLevels.length - 1) {
      wx.showToast({ title: '已是最后一关', icon: 'none' });
      return;
    }

    const nextLevel = allLevels[curIdx + 1];
    this._loadLevel(nextLevel);
  },

  /** 重试当前关卡 */
  onRetry() {
    this.setData({ showResult: false });
    this._clearAnimTimer();

    // 重建引擎
    this.engine = new GameEngine();
    this.engine.loadLevel(this.level);
    this.engine.onStateChange = this._onEngineStateChange.bind(this);

    // 重置使用计数
    Object.keys(this._usedCounts).forEach(k => { this._usedCounts[k] = 0; });

    this.setData({
      itemTypes: this._buildItemTypes(),
      steps: 0,
      selectedItem: null,
      selectedDir: DIR.RIGHT
    });
    this._render();
  },

  /* ================================================================
   *  内部工具方法
   * ================================================================ */

  /**
   * 引擎状态变化回调
   * 当引擎进入 SUCCESS / FAIL 状态时弹出结果
   */
  _onEngineStateChange(state, result) {
    if (state === STATE.SUCCESS || state === STATE.FAIL) {
      this._showResult(state, result);
    }
  },

  /** 显示结果弹窗并保存进度 */
  _showResult(state, result) {
    this.setData({
      showResult: true,
      result: result
    });

    if (result === 'success') {
      // 根据步数评级（简单三星逻辑）
      const stars = this._calcStars();

      storage.updateLevelProgress(this.levelId, stars);

      // 解锁下一关
      const allLevels = levelManager.getAllLevels();
      const curIdx = allLevels.findIndex(l => l.id === this.levelId);
      if (curIdx >= 0) {
        storage.unlockNextLevel(curIdx + 1); // 传入 1-based 序号
      }
    }
  },

  /**
   * 简单星级评价：
   * - 使用了所有可用物品 -> 1 星
   * - 使用了一半以上   -> 2 星
   * - 使用了一半以下   -> 3 星
   */
  _calcStars() {
    const totalAvailable = Object.values(this._initialItems).reduce((s, v) => s + v, 0);
    const totalUsed = Object.values(this._usedCounts).reduce((s, v) => s + v, 0);

    if (totalAvailable === 0) return 3;
    const ratio = totalUsed / totalAvailable;
    if (ratio <= 0.5) return 3;
    if (ratio <= 0.8) return 2;
    return 1;
  },

  /** 加载指定关卡（用于"下一关"） */
  _loadLevel(level) {
    this.levelId = level.id;
    this.level   = level;

    this.engine = new GameEngine();
    this.engine.loadLevel(level);
    this.engine.onStateChange = this._onEngineStateChange.bind(this);

    this._initialItems = JSON.parse(JSON.stringify(level.items || {}));
    this._usedCounts = {};
    Object.keys(this._initialItems).forEach(k => { this._usedCounts[k] = 0; });

    this.setData({
      levelName:  level.name || '未知关卡',
      itemTypes:  this._buildItemTypes(),
      steps:      0,
      showResult: false,
      result:     '',
      selectedItem: null,
      selectedDir:  DIR.RIGHT
    });

    // 重新适配网格并渲染
    if (this.renderer) {
      this.renderer.fitGrid(level.width, level.height);
      this._render();
    }
  },

  /** 构建物品面板数据数组 */
  _buildItemTypes() {
    const types = [ITEM.CONVEYOR, ITEM.SPRING, ITEM.SLOPE];
    return types.map(type => ({
      type:      type,
      name:      ITEM_NAME[type],
      remaining: this._getRemaining(type)
    }));
  },

  /** 获取某物品类型的剩余可用数量 */
  _getRemaining(type) {
    const total = (this._initialItems[type] || 0);
    const used  = (this._usedCounts[type]   || 0);
    return Math.max(0, total - used);
  },

  /** 执行渲染 */
  _render() {
    if (!this.renderer || !this.engine || !this.engine.level) return;

    const options = {};

    // 如果正在放置模式且有选中物品，可以传入高亮坐标（可选增强）
    this.renderer.render(this.engine, options);
  },

  /** 判断引擎是否正在运行 */
  _isRunning() {
    return this.engine && this.engine.state === STATE.RUNNING;
  },

  /** 清除动画定时器 */
  _clearAnimTimer() {
    if (this._animTimer) {
      clearInterval(this._animTimer);
      this._animTimer = null;
    }
  }
});