const levelManager = require('../../game/levels');
const storage = require('../../utils/storage');

Page({
  data: {
    levels: []
  },

  onLoad() {
    this.loadLevels();
  },

  onShow() {
    // 每次返回时刷新进度数据（玩家可能刚完成一关）
    this.loadLevels();
  },

  /**
   * 加载关卡列表及玩家进度
   */
  loadLevels() {
    const allLevels = levelManager.getAllLevels();
    const progress = storage.getProgress();
    const maxUnlocked = progress.maxUnlockedLevel || 1;
    const starsMap = progress.stars || {};

    const levels = allLevels.map((level, index) => ({
      id: level.id,
      name: level.name || ('关卡 ' + (index + 1)),
      source: level.source,
      locked: index >= maxUnlocked,
      stars: starsMap[level.id] || 0
    }));

    this.setData({ levels });
  },

  /**
   * 点击关卡卡片 → 进入游戏页
   */
  onLevelTap(e) {
    const { id, index } = e.currentTarget.dataset;
    const level = this.data.levels[index];

    if (level && level.locked) {
      wx.showToast({ title: '关卡未解锁', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: '/pages/game/game?levelId=' + id
    });
  },

  /**
   * 点击关卡编辑按钮 → 进入编辑器页
   */
  onEditorTap() {
    wx.navigateTo({
      url: '/pages/editor/editor'
    });
  }
});
