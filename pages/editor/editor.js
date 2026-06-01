/**
 * 关卡编辑器页面
 *
 * 功能:
 * - 可视化编辑网格 (墙壁 / 起点 / 终点)
 * - 放置 / 旋转物品 (传送带 / 弹簧 / 斜坡)
 * - 测试关卡是否可通关
 * - 保存自定义关卡
 */

const GameEngine = require('../../game/physics');
const Renderer = require('../../game/renderer');
const levelManager = require('../../game/levels');
const { CELL, ITEM, DIR, DIR_NAME } = require('../../game/constants');

// 物品工具名称集合，用于判断当前工具是否为物品类型
const ITEM_TOOLS = [ITEM.CONVEYOR, ITEM.SPRING, ITEM.SLOPE];

// 网格尺寸可选范围
const SIZE_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12];

Page({
  data: {
    // 关卡元信息
    levelId: '',
    levelName: '新关卡',

    // 网格尺寸
    gridWidth: 8,
    gridHeight: 6,
    gridWidthIdx: 4,   // SIZE_OPTIONS[4] = 8
    gridHeightIdx: 2,  // SIZE_OPTIONS[2] = 6
    sizeRange: SIZE_OPTIONS,

    // 当前工具与方向
    currentTool: 'empty',
    currentDir: DIR.RIGHT,
    showDir: false,  // 是否显示方向选择器

    // 状态
    isTesting: false
  },

  /* ======================== 生命周期 ======================== */

  onLoad(options) {
    // 初始化编辑网格与物品映射
    this.editGrid = [];
    this.placedItems = {};   // key: "x,y" -> { type, dir }
    this.startPos = { x: 0, y: 0 };
    this.goalPos = { x: 7, y: 5 };
    this.renderer = null;
    this.canvas = null;

    // 如果传入了关卡 ID，加载已有关卡进行编辑
    if (options && options.levelId) {
      this._loadExistingLevel(options.levelId);
    } else {
      this._initEmptyGrid(this.data.gridWidth, this.data.gridHeight);
    }
  },

  onReady() {
    this._initCanvas();
  },

  /* ======================== 初始化 ======================== */

  /**
   * 初始化空白网格
   */
  _initEmptyGrid(width, height) {
    const grid = [];
    for (let y = 0; y < height; y++) {
      grid.push(new Array(width).fill(CELL.EMPTY));
    }
    this.editGrid = grid;
    this.placedItems = {};
    this.startPos = { x: 0, y: 0 };
    this.goalPos = { x: width - 1, y: height - 1 };
  },

  /**
   * 加载已有关卡数据到编辑器
   */
  _loadExistingLevel(levelId) {
    const level = levelManager.getLevelById(levelId);
    if (!level) {
      wx.showToast({ title: '关卡不存在', icon: 'none' });
      this._initEmptyGrid(this.data.gridWidth, this.data.gridHeight);
      return;
    }

    const w = level.width;
    const h = level.height;

    this.setData({
      levelId: level.id,
      levelName: level.name,
      gridWidth: w,
      gridHeight: h,
      gridWidthIdx: SIZE_OPTIONS.indexOf(w),
      gridHeightIdx: SIZE_OPTIONS.indexOf(h)
    });

    // 深拷贝网格，只保留 empty/wall
    this.editGrid = level.grid.map(row =>
      row.map(cell => (cell === CELL.WALL ? CELL.WALL : CELL.EMPTY))
    );

    this.startPos = { ...level.start };
    this.goalPos = { ...level.goal };

    // 物品数据需要外部传入（关卡数据本身不包含已放置物品）
    // 编辑器默认物品为空
    this.placedItems = {};
  },

  /**
   * 初始化 Canvas 2D 上下文与渲染器
   */
  _initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#editorCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) {
          console.error('Canvas 初始化失败');
          return;
        }

        const canvas = res[0].node;
        const dpr = wx.getSystemInfoSync().pixelRatio;
        const width = res[0].width;
        const height = res[0].height;

        canvas.width = width * dpr;
        canvas.height = height * dpr;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        this.canvas = canvas;
        this.canvasW = width;
        this.canvasH = height;
        this.dpr = dpr;
        this.renderer = new Renderer(canvas, width, height, dpr);

        this._render();
      });
  },

  /* ======================== 渲染 ======================== */

  /**
   * 重绘整个编辑器画布
   * 构造一个伪 engine 对象供 Renderer.render 使用
   */
  _render(highlightCell) {
    if (!this.renderer) return;

    const w = this.data.gridWidth;
    const h = this.data.gridHeight;
    this.renderer.fitGrid(w, h);

    // 构造伪 engine 以复用 Renderer 的绘制方法
    const pseudoEngine = {
      grid: this.editGrid,
      placedItems: this.placedItems,
      cargo: { x: this.startPos.x, y: this.startPos.y },
      trail: [],
      state: 'idle',
      level: {
        width: w,
        height: h,
        start: this.startPos,
        startDir: this.data.currentDir,
        goal: this.goalPos
      }
    };

    this.renderer.render(pseudoEngine, {
      highlightCell: highlightCell || null
    });
  },

  /* ======================== 工具选择 ======================== */

  /**
   * 选择当前绘图工具
   */
  onSelectTool(e) {
    const tool = e.currentTarget.dataset.tool;
    const isItem = ITEM_TOOLS.indexOf(tool) !== -1;
    this.setData({
      currentTool: tool,
      showDir: isItem
    });
  },

  /**
   * 选择物品方向
   */
  onSelectDir(e) {
    const dir = parseInt(e.currentTarget.dataset.dir, 10);
    this.setData({ currentDir: dir });
  },

  /* ======================== 画布交互 ======================== */

  /**
   * 点击画布 - 放置 / 清除格子或物品
   */
  onCanvasTap(e) {
    if (this.data.isTesting) return;

    const touch = e.touches[0];
    const gridPos = this.renderer.touchToGrid(touch.x, touch.y);
    if (!gridPos) return;

    const { x, y } = gridPos;
    if (x < 0 || x >= this.data.gridWidth || y < 0 || y >= this.data.gridHeight) return;

    const tool = this.data.currentTool;
    const key = x + ',' + y;

    switch (tool) {
      case 'empty':
        // 橡皮擦：清除格子（恢复 empty）并移除物品
        this.editGrid[y][x] = CELL.EMPTY;
        delete this.placedItems[key];
        // 如果擦掉的是起点/终点标记，重置坐标为 -1（表示未设置）
        if (this.startPos.x === x && this.startPos.y === y) {
          this.startPos = { x: -1, y: -1 };
        }
        if (this.goalPos.x === x && this.goalPos.y === y) {
          this.goalPos = { x: -1, y: -1 };
        }
        break;

      case 'wall':
        // 不能把墙壁放在起点/终点位置
        if (this._isStartOrGoal(x, y)) {
          wx.showToast({ title: '不能覆盖起点/终点', icon: 'none', duration: 1000 });
          return;
        }
        this.editGrid[y][x] = CELL.WALL;
        delete this.placedItems[key];
        break;

      case 'start':
        // 放置起点（全局唯一）
        if (this.editGrid[y][x] === CELL.WALL) {
          wx.showToast({ title: '不能放在墙壁上', icon: 'none', duration: 1000 });
          return;
        }
        delete this.placedItems[key]; // 清除该位置物品
        this.startPos = { x, y };
        break;

      case 'goal':
        // 放置终点（全局唯一）
        if (this.editGrid[y][x] === CELL.WALL) {
          wx.showToast({ title: '不能放在墙壁上', icon: 'none', duration: 1000 });
          return;
        }
        delete this.placedItems[key];
        this.goalPos = { x, y };
        break;

      default:
        // 物品类工具: conveyor / spring / slope
        if (this._isStartOrGoal(x, y)) {
          wx.showToast({ title: '不能放在起点/终点', icon: 'none', duration: 1000 });
          return;
        }
        if (this.editGrid[y][x] === CELL.WALL) {
          wx.showToast({ title: '不能放在墙壁上', icon: 'none', duration: 1000 });
          return;
        }
        // 如果该位置已有同类物品，旋转它
        if (this.placedItems[key]) {
          this.placedItems[key].dir = (this.placedItems[key].dir + 1) % 4;
        } else {
          this.placedItems[key] = {
            type: tool,
            dir: this.data.currentDir
          };
        }
        break;
    }

    this._render(gridPos);
  },

  /**
   * 长按画布 - 旋转已有物品
   */
  onCanvasLongPress(e) {
    if (this.data.isTesting) return;

    const touch = e.touches[0];
    const gridPos = this.renderer.touchToGrid(touch.x, touch.y);
    if (!gridPos) return;

    const { x, y } = gridPos;
    const key = x + ',' + y;

    if (this.placedItems[key]) {
      this.placedItems[key].dir = (this.placedItems[key].dir + 1) % 4;
      this._render(gridPos);
      wx.showToast({
        title: '旋转: ' + DIR_NAME[this.placedItems[key].dir],
        icon: 'none',
        duration: 800
      });
    }
  },

  /* ======================== 网格尺寸调整 ======================== */

  onWidthChange(e) {
    const idx = parseInt(e.detail.value, 10);
    const newWidth = SIZE_OPTIONS[idx];
    this.setData({ gridWidthIdx: idx, gridWidth: newWidth });
    this._resizeGrid(newWidth, this.data.gridHeight);
  },

  onHeightChange(e) {
    const idx = parseInt(e.detail.value, 10);
    const newHeight = SIZE_OPTIONS[idx];
    this.setData({ gridHeightIdx: idx, gridHeight: newHeight });
    this._resizeGrid(this.data.gridWidth, newHeight);
  },

  /**
   * 调整网格大小，保留已有数据
   */
  _resizeGrid(newWidth, newHeight) {
    const oldGrid = this.editGrid;
    const oldHeight = oldGrid.length;
    const oldWidth = oldGrid.length > 0 ? oldGrid[0].length : 0;
    const newGrid = [];

    for (let y = 0; y < newHeight; y++) {
      const row = [];
      for (let x = 0; x < newWidth; x++) {
        if (y < oldHeight && x < oldWidth) {
          row.push(oldGrid[y][x]);
        } else {
          row.push(CELL.EMPTY);
        }
      }
      newGrid.push(row);
    }

    this.editGrid = newGrid;

    // 清除超出新边界的物品
    const keysToRemove = [];
    Object.keys(this.placedItems).forEach(key => {
      const [px, py] = key.split(',').map(Number);
      if (px >= newWidth || py >= newHeight) {
        keysToRemove.push(key);
      }
    });
    keysToRemove.forEach(k => delete this.placedItems[k]);

    // 修正起点/终点是否越界
    if (this.startPos.x >= newWidth || this.startPos.y >= newHeight) {
      this.startPos = { x: 0, y: 0 };
    }
    if (this.goalPos.x >= newWidth || this.goalPos.y >= newHeight) {
      this.goalPos = { x: newWidth - 1, y: newHeight - 1 };
    }

    this._render();
  },

  /* ======================== 关卡名称 ======================== */

  onNameInput(e) {
    this.setData({ levelName: e.detail.value });
  },

  /* ======================== 测试关卡 ======================== */

  onTest() {
    // 校验
    if (!this._validateLevel()) return;

    this.setData({ isTesting: true });

    try {
      const levelData = this._buildLevelData();
      const engine = new GameEngine();
      engine.loadLevel(levelData);

      // 将编辑器中放置的物品注入引擎
      Object.keys(this.placedItems).forEach(key => {
        const item = this.placedItems[key];
        const [px, py] = key.split(',').map(Number);
        engine.placedItems[key] = { type: item.type, dir: item.dir };
      });

      const result = engine.simulate();

      if (result.result === 'success') {
        wx.showToast({
          title: '测试通过! (' + result.steps + '步)',
          icon: 'success',
          duration: 2000
        });

        // 绘制测试轨迹
        const pseudoEngine = {
          grid: this.editGrid,
          placedItems: this.placedItems,
          cargo: { x: this.goalPos.x, y: this.goalPos.y },
          trail: result.trail,
          state: 'success',
          level: {
            width: this.data.gridWidth,
            height: this.data.gridHeight,
            start: this.startPos,
            startDir: this.data.currentDir,
            goal: this.goalPos
          }
        };
        this.renderer.fitGrid(this.data.gridWidth, this.data.gridHeight);
        this.renderer.render(pseudoEngine);
      } else {
        wx.showToast({
          title: '未能到达终点',
          icon: 'none',
          duration: 2000
        });

        // 绘制失败轨迹
        const pseudoEngine = {
          grid: this.editGrid,
          placedItems: this.placedItems,
          cargo: result.trail.length > 0
            ? result.trail[result.trail.length - 1]
            : this.startPos,
          trail: result.trail,
          state: 'fail',
          level: {
            width: this.data.gridWidth,
            height: this.data.gridHeight,
            start: this.startPos,
            startDir: this.data.currentDir,
            goal: this.goalPos
          }
        };
        this.renderer.fitGrid(this.data.gridWidth, this.data.gridHeight);
        this.renderer.render(pseudoEngine);
      }
    } catch (err) {
      console.error('测试失败:', err);
      wx.showToast({ title: '测试出错', icon: 'none' });
    }

    // 2秒后恢复编辑态
    setTimeout(() => {
      this.setData({ isTesting: false });
      this._render();
    }, 2500);
  },

  /* ======================== 保存关卡 ======================== */

  onSave() {
    if (!this._validateLevel()) return;

    const levelData = this._buildLevelData();
    // 保存时记录已放置的物品到关卡数据中（方便后续加载编辑）
    levelData.placedItems = {};
    Object.keys(this.placedItems).forEach(key => {
      levelData.placedItems[key] = { ...this.placedItems[key] };
    });

    const savedId = levelManager.saveCustomLevel(levelData);

    if (savedId) {
      this.setData({ levelId: savedId });
      wx.showToast({ title: '保存成功', icon: 'success', duration: 1500 });
    } else {
      wx.showToast({ title: '保存失败', icon: 'none', duration: 1500 });
    }
  },

  /* ======================== 内部工具方法 ======================== */

  /**
   * 构建供 GameEngine 使用的关卡数据
   * 注意: grid 中只包含 empty/wall，起点终点由 start/goal 字段单独表示
   */
  _buildLevelData() {
    // 构建纯 empty/wall 网格
    const cleanGrid = this.editGrid.map(row =>
      row.map(cell => (cell === CELL.WALL ? CELL.WALL : CELL.EMPTY))
    );

    // 将起点和终点写入网格（引擎需要 grid 中有 goal 来检测到达）
    if (this.goalPos.x >= 0 && this.goalPos.y >= 0) {
      cleanGrid[this.goalPos.y][this.goalPos.x] = CELL.GOAL;
    }

    return {
      id: this.data.levelId || '',
      name: this.data.levelName,
      width: this.data.gridWidth,
      height: this.data.gridHeight,
      grid: cleanGrid,
      start: {
        x: this.startPos.x >= 0 ? this.startPos.x : 0,
        y: this.startPos.y >= 0 ? this.startPos.y : 0
      },
      startDir: this.data.currentDir,
      goal: {
        x: this.goalPos.x >= 0 ? this.goalPos.x : this.data.gridWidth - 1,
        y: this.goalPos.y >= 0 ? this.goalPos.y : this.data.gridHeight - 1
      },
      items: {
        conveyor: 99,
        spring: 99,
        slope: 99
      }
    };
  },

  /**
   * 校验关卡数据完整性
   * @returns {boolean}
   */
  _validateLevel() {
    if (this.startPos.x < 0 || this.startPos.y < 0) {
      wx.showToast({ title: '请设置起点', icon: 'none', duration: 1500 });
      return false;
    }
    if (this.goalPos.x < 0 || this.goalPos.y < 0) {
      wx.showToast({ title: '请设置终点', icon: 'none', duration: 1500 });
      return false;
    }
    if (this.startPos.x === this.goalPos.x && this.startPos.y === this.goalPos.y) {
      wx.showToast({ title: '起点和终点不能重合', icon: 'none', duration: 1500 });
      return false;
    }
    if (!this.data.levelName || this.data.levelName.trim() === '') {
      wx.showToast({ title: '请输入关卡名称', icon: 'none', duration: 1500 });
      return false;
    }
    return true;
  },

  /**
   * 判断坐标是否为起点或终点
   */
  _isStartOrGoal(x, y) {
    if (this.startPos.x === x && this.startPos.y === y) return true;
    if (this.goalPos.x === x && this.goalPos.y === y) return true;
    return false;
  }
});
