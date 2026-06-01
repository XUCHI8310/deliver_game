App({
  globalData: {
    // 关卡数据目录（后续可改为远程加载）
    levelBaseUrl: '/levels/',
    // 用户自定义关卡存储key
    customLevelsKey: 'custom_levels',
    // 游戏进度存储key
    gameProgressKey: 'game_progress'
  },

  onLaunch() {
    // 初始化游戏进度
    this.initProgress();
  },

  initProgress() {
    try {
      const progress = wx.getStorageSync(this.globalData.gameProgressKey);
      if (!progress) {
        wx.setStorageSync(this.globalData.gameProgressKey, {
          maxUnlockedLevel: 1,
          stars: {}
        });
      }
    } catch (e) {
      console.error('初始化进度失败:', e);
    }
  }
});
