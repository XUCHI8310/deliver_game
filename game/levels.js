/**
 * 关卡管理模块
 * 
 * 负责：
 * - 加载内置关卡
 * - 管理用户自定义关卡
 * - 关卡数据的增删改查
 * 
 * 关卡数据格式 (JSON):
 * {
 *   id: "level_001",
 *   name: "初识传送",
 *   width: 8,           // 网格列数
 *   height: 6,          // 网格行数
 *   grid: [              // 二维数组, CELL类型
 *     ["empty","empty","wall",...],
 *     ...
 *   ],
 *   start: { x: 0, y: 2 },   // 起点坐标
 *   startDir: 1,              // 起始方向 (DIR.RIGHT=1)
 *   goal: { x: 7, y: 4 },    // 终点坐标
 *   items: {                  // 可用物品数量
 *     conveyor: 3,
 *     spring: 1,
 *     slope: 0
 *   }
 * }
 */

const STORAGE_KEY = 'custom_levels';

/**
 * 获取所有内置关卡列表
 * @returns {Array} 关卡数据数组
 */
function getBuiltinLevels() {
  try {
    return require('../levels/levels.js');
  } catch (e) {
    console.error('加载内置关卡失败:', e);
    return [];
  }
}

/**
 * 获取所有用户自定义关卡
 * @returns {Array}
 */
function getCustomLevels() {
  try {
    const data = wx.getStorageSync(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('读取自定义关卡失败:', e);
    return [];
  }
}

/**
 * 保存自定义关卡
 * @param {Object} level - 关卡数据
 */
function saveCustomLevel(level) {
  try {
    const levels = getCustomLevels();
    // 如果id已存在则更新，否则追加
    const idx = levels.findIndex(l => l.id === level.id);
    if (idx >= 0) {
      levels[idx] = level;
    } else {
      level.id = 'custom_' + Date.now();
      levels.push(level);
    }
    wx.setStorageSync(STORAGE_KEY, JSON.stringify(levels));
    return level.id;
  } catch (e) {
    console.error('保存关卡失败:', e);
    return null;
  }
}

/**
 * 删除自定义关卡
 * @param {string} levelId
 */
function deleteCustomLevel(levelId) {
  try {
    let levels = getCustomLevels();
    levels = levels.filter(l => l.id !== levelId);
    wx.setStorageSync(STORAGE_KEY, JSON.stringify(levels));
    return true;
  } catch (e) {
    console.error('删除关卡失败:', e);
    return false;
  }
}

/**
 * 获取全部关卡（内置 + 自定义）
 * @returns {Array}
 */
function getAllLevels() {
  const builtin = getBuiltinLevels().map(l => ({
    ...l,
    source: 'builtin'
  }));
  const custom = getCustomLevels().map(l => ({
    ...l,
    source: 'custom'
  }));
  return [...builtin, ...custom];
}

/**
 * 根据ID获取关卡
 * @param {string} levelId
 * @returns {Object|null}
 */
function getLevelById(levelId) {
  const all = getAllLevels();
  return all.find(l => l.id === levelId) || null;
}

/**
 * 创建空白关卡模板（用于编辑器）
 * @param {number} width
 * @param {number} height
 * @returns {Object}
 */
function createEmptyLevel(width, height) {
  const grid = [];
  for (let y = 0; y < height; y++) {
    grid.push(new Array(width).fill('empty'));
  }
  return {
    id: '',
    name: '新关卡',
    width,
    height,
    grid,
    start: { x: 0, y: 0 },
    startDir: 1, // DIR.RIGHT
    goal: { x: width - 1, y: height - 1 },
    items: {
      conveyor: 3,
      spring: 1,
      slope: 1
    }
  };
}

module.exports = {
  getBuiltinLevels,
  getCustomLevels,
  saveCustomLevel,
  deleteCustomLevel,
  getAllLevels,
  getLevelById,
  createEmptyLevel
};
