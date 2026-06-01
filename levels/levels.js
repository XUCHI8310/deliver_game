/**
 * 内置关卡数据
 * 
 * 关卡设计说明：
 * - grid 只包含 'empty' 和 'wall'
 * - start / goal 用独立坐标表示
 * - startDir: 0=上 1=右 2=下 3=左
 * - items: 玩家可用的物品数量
 * 
 * 物品效果：
 * - conveyor (传送带): 改变货物方向为传送带朝向
 * - spring (弹簧): 反弹货物180°
 * - slope (斜坡): 顺时针旋转货物方向90°
 */

const levels = [
  // ========== 第1关: 初识传送 ==========
  {
    id: 'level_001',
    name: '初识传送',
    width: 7,
    height: 5,
    grid: [
      ['empty','empty','empty','empty','empty','empty','empty'],
      ['empty','empty','empty','empty','empty','empty','empty'],
      ['empty','empty','empty','empty','empty','empty','empty'],
      ['empty','empty','empty','empty','empty','empty','empty'],
      ['empty','empty','empty','empty','empty','empty','empty']
    ],
    start: { x: 0, y: 2 },
    startDir: 1,  // → 右
    goal: { x: 6, y: 4 },
    items: { conveyor: 2, spring: 0, slope: 0 }
    // 解法: 在(4,2)放传送带朝下, 在(4,4)放传送带朝右
    // 路径: →→→→(↓)↓↓(→)→→★  共8步
  },

  // ========== 第2关: 绕墙而行 ==========
  {
    id: 'level_002',
    name: '绕墙而行',
    width: 8,
    height: 6,
    grid: [
      ['empty','empty','empty','empty','empty','empty','empty','empty'],
      ['empty','empty','empty','empty','empty','empty','empty','empty'],
      ['empty','empty','empty','empty','empty','wall', 'wall', 'empty'],
      ['empty','empty','empty','empty','empty','empty','empty','empty'],
      ['empty','empty','empty','empty','empty','empty','empty','empty'],
      ['empty','empty','empty','empty','empty','empty','empty','empty']
    ],
    start: { x: 0, y: 2 },
    startDir: 1,  // → 右
    goal: { x: 7, y: 5 },
    items: { conveyor: 3, spring: 0, slope: 0 }
    // 解法: (4,2)↓传送带, (4,5)→传送带
    // 路径: →→→→(↓)↓↓↓(→)→→→★
  },

  // ========== 第3关: 斜坡初体验 ==========
  {
    id: 'level_003',
    name: '斜坡初体验',
    width: 6,
    height: 6,
    grid: [
      ['empty','empty','empty','empty','empty','empty'],
      ['empty','empty','empty','wall', 'empty','empty'],
      ['empty','empty','empty','wall', 'empty','empty'],
      ['empty','empty','empty','wall', 'empty','empty'],
      ['empty','empty','empty','empty','empty','empty'],
      ['empty','empty','empty','empty','empty','empty']
    ],
    start: { x: 0, y: 0 },
    startDir: 1,  // → 右
    goal: { x: 5, y: 5 },
    items: { conveyor: 1, spring: 0, slope: 2 }
    // 解法: (3,0)放斜坡(→变↓), (3,4)放传送带(→)
    // 路径: →→→(↓)↓↓↓↓(→)→→★  共9步
  },

  // ========== 第4关: 弹簧妙用 ==========
  {
    id: 'level_004',
    name: '弹簧妙用',
    width: 6,
    height: 6,
    grid: [
      ['empty','empty','empty','empty','empty','empty'],
      ['empty','empty','empty','empty','empty','empty'],
      ['empty','empty','empty','empty','empty','empty'],
      ['empty','empty','empty','empty','empty','empty'],
      ['empty','empty','empty','empty','empty','empty'],
      ['empty','empty','empty','empty','empty','empty']
    ],
    start: { x: 0, y: 0 },
    startDir: 1,  // → 右
    goal: { x: 5, y: 2 },
    items: { conveyor: 1, spring: 1, slope: 1 }
    // 解法:
    // (3,0)放斜坡 → 顺时针转↓
    // (3,3)放弹簧 → ↓反弹为↑
    // (3,0)斜坡再次生效: ↑顺时针转→
    // (5,0)放传送带朝下 → ↓到终点
    // 路径: →→→(↓)↓↓↓(↑)↑↑↑(→)→(↓)↓↓★  共13步
  },

  // ========== 第5关: 综合挑战 ==========
  {
    id: 'level_005',
    name: '综合挑战',
    width: 8,
    height: 6,
    grid: [
      ['empty','empty','empty','empty','empty','empty','empty','empty'],
      ['empty','empty','empty','empty','empty','empty','empty','empty'],
      ['empty','empty','empty','empty','wall', 'wall', 'empty','empty'],
      ['empty','empty','empty','empty','empty','empty','empty','empty'],
      ['empty','empty','empty','empty','empty','empty','empty','empty'],
      ['empty','empty','empty','empty','empty','empty','empty','empty']
    ],
    start: { x: 0, y: 1 },
    startDir: 1,  // → 右
    goal: { x: 7, y: 5 },
    items: { conveyor: 3, spring: 1, slope: 1 }
    // 解法:
    // (3,1)放斜坡 → 顺时针转↓
    // (3,3)放弹簧 → ↓反弹为↑
    // (3,0)放传送带朝右
    // (7,0)放传送带朝下
    // 路径: →→→(↓)↓↓(↑)↑↑(→)→→→→→(↓)↓↓↓↓↓★  共18步
  }
];

module.exports = levels;
