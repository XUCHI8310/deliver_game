/**
 * 本地存储工具
 */

/**
 * 保存数据到本地存储
 */
function save(key, data) {
  try {
    wx.setStorageSync(key, typeof data === 'string' ? data : JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('存储失败:', key, e);
    return false;
  }
}

/**
 * 从本地存储读取数据
 */
function load(key, defaultValue) {
  try {
    const data = wx.getStorageSync(key);
    if (!data) return defaultValue;
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (e) {
    console.error('读取失败:', key, e);
    return defaultValue;
  }
}

/**
 * 删除本地存储
 */
function remove(key) {
  try {
    wx.removeStorageSync(key);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 获取游戏进度
 */
function getProgress() {
  return load('game_progress', {
    maxUnlockedLevel: 1,
    stars: {}
  });
}

/**
 * 更新关卡进度
 * @param {string} levelId
 * @param {number} stars - 0~3星
 */
function updateLevelProgress(levelId, stars) {
  const progress = getProgress();
  const prevStars = progress.stars[levelId] || 0;
  progress.stars[levelId] = Math.max(prevStars, stars);
  save('game_progress', progress);
  return progress;
}

/**
 * 解锁下一关
 * @param {number} currentLevel - 当前关卡序号(从1开始)
 */
function unlockNextLevel(currentLevel) {
  const progress = getProgress();
  if (currentLevel >= progress.maxUnlockedLevel) {
    progress.maxUnlockedLevel = currentLevel + 1;
    save('game_progress', progress);
  }
  return progress;
}

module.exports = {
  save,
  load,
  remove,
  getProgress,
  updateLevelProgress,
  unlockNextLevel
};
