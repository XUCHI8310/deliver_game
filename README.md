# 快递到家 - 2D 闯关益智微信小程序

## 项目简介

这是一款微信小程序端的 2D 闯关益智游戏。玩家需要在网格路径上放置**传送带、弹簧、斜坡**等道具，引导正方形货物方块从**起点**移动到**终点**。

游戏核心玩法类似"开心消消乐"的关卡制——每一关有固定的网格地图、起点、终点和可用道具，玩家需要思考如何放置道具让货物顺利到达终点。

## 技术栈

- **平台**: 微信小程序（原生开发，非框架）
- **渲染**: Canvas 2D API
- **语言**: JavaScript (ES6)
- **状态管理**: 自研 GameEngine 类
- **数据存储**: wx.setStorageSync（本地持久化）
- **关卡格式**: JSON

## 项目结构

```
deliver_game_proj/
├── app.js / app.json / app.wxss    # 小程序入口
├── project.config.json              # 微信开发者工具配置
├── game/                            # 游戏核心引擎
│   ├── constants.js                 # 常量定义（方向、格子类型、物品类型、颜色主题）
│   ├── physics.js                   # 物理引擎（货物移动、物品交互、胜负判定）
│   ├── renderer.js                  # Canvas 渲染器（网格、物品、货物、轨迹、动画）
│   └── levels.js                    # 关卡管理（内置 + 自定义关卡的增删改查）
├── pages/
│   ├── index/                       # 首页 - 关卡选择（三星评价、解锁进度）
│   ├── game/                        # 游戏页 - 主玩法（放置物品、发射、动画、结果弹窗）
│   └── editor/                      # 编辑器页 - 关卡设计（可视化编辑、实时测试、保存）
├── levels/
│   └── levels.js                    # 内置关卡数据（5关渐进式教学）
└── utils/
    └── storage.js                   # 本地存储工具（进度、星级、解锁）
```

## 游戏机制

### 网格系统

每个关卡是一个 `width × height` 的网格，每个格子有以下类型：

| 类型 | 常量 | 说明 |
|------|------|------|
| 空格 | `CELL.EMPTY` | 可通行，可放置道具 |
| 墙壁 | `CELL.WALL` | 货物撞上即失败 |
| 起点 | `start` 坐标 | 货物出发位置（独立于 grid） |
| 终点 | `goal` 坐标 | 货物到达即过关（独立于 grid） |

### 道具系统

| 道具 | 常量 | 效果 | 颜色 |
|------|------|------|------|
| 传送带 | `ITEM.CONVEYOR` | 将货物方向**改为**传送带朝向 | 蓝色 #2196F3 |
| 弹簧 | `ITEM.SPRING` | 货物方向**反转 180°** | 橙色 #FF5722 |
| 斜坡 | `ITEM.SLOPE` | 货物方向**顺时针旋转 90°** | 紫色 #9C27B0 |

### 方向定义

```
DIR.UP    = 0  (↑)
DIR.RIGHT = 1  (→)
DIR.DOWN  = 2  (↓)
DIR.LEFT  = 3  (←)
```

方向增量（dx, dy）：
- UP:    (0, -1)
- RIGHT: (1, 0)
- DOWN:  (0, 1)
- LEFT:  (-1, 0)

### 模拟流程

1. 玩家选择道具和方向，在空格子上点击放置
2. 点击"发射"，货物从起点沿 `startDir` 方向开始移动
3. 每步：货物移动到下一格 → 检查格子类型 → 检查道具效果 → 更新方向
4. 到达终点 = 成功，撞墙/越界/超步数 = 失败
5. 模拟最大步数 `MAX_SIMULATION_STEPS = 200`

## 关卡数据格式 (JSON)

```json
{
  "id": "level_001",
  "name": "初识传送",
  "width": 7,
  "height": 5,
  "grid": [
    ["empty","empty","empty","empty","empty","empty","empty"],
    ["empty","empty","empty","empty","empty","empty","empty"],
    ["empty","empty","empty","empty","empty","empty","empty"],
    ["empty","empty","empty","empty","empty","empty","empty"],
    ["empty","empty","empty","empty","empty","empty","empty"]
  ],
  "start": { "x": 0, "y": 2 },
  "startDir": 1,
  "goal": { "x": 6, "y": 4 },
  "items": { "conveyor": 2, "spring": 0, "slope": 0 }
}
```

**关键字段说明：**
- `grid`: 二维数组，只包含 `"empty"` 和 `"wall"`，起点/终点不在 grid 中
- `start`: 起点坐标 `{x, y}`，x 是列号，y 是行号
- `startDir`: 初始移动方向，0=上 1=右 2=下 3=左
- `goal`: 终点坐标
- `items`: 玩家可用的各类道具数量

## 内置关卡

| 关卡 | 名称 | 网格 | 教学要点 |
|------|------|------|----------|
| 1 | 初识传送 | 7×5 | 只用传送带，学会基本放置 |
| 2 | 绕墙而行 | 8×6 | 墙壁障碍 + 传送带绕路 |
| 3 | 斜坡初体验 | 6×6 | 引入斜坡（顺时针转90°） |
| 4 | 弹簧妙用 | 6×6 | 弹簧反弹 + 斜坡组合 |
| 5 | 综合挑战 | 8×6 | 全部道具混合使用 |

## 关卡编辑器

编辑器页面 (`pages/editor/`) 提供可视化关卡设计：

- **格子工具**: 橡皮擦、墙壁、起点、终点
- **道具工具**: 传送带、弹簧、斜坡（带方向选择）
- **操作**: 点击放置，已有道具的格子再次点击可旋转方向
- **测试**: 一键运行模拟，验证关卡是否可通关
- **保存**: 关卡以 JSON 格式存入 wx.Storage，自动出现在关卡列表

### 编辑器数据流

```
用户编辑 editGrid + placedItems
  → _buildLevelData() 构建关卡 JSON
  → onTest() 创建 GameEngine 模拟验证
  → onSave() 调用 levelManager.saveCustomLevel()
  → 存入 wx.Storage (key: "custom_levels")
```

## 存储结构

### 游戏进度 (`game_progress`)

```json
{
  "maxUnlockedLevel": 3,
  "stars": {
    "level_001": 3,
    "level_002": 2
  }
}
```

### 自定义关卡 (`custom_levels`)

```json
[
  { "id": "custom_1717200000", "name": "我的关卡", ... }
]
```

## 开发与调试

### 环境要求

- **微信开发者工具**: [下载](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 导入项目目录 `E:\deliver_game_proj`
- AppID 可先用测试号，正式发布需替换为正式 AppID

### 在 Qoder IDE 中开发

直接用 Qoder IDE 打开 `E:\deliver_game_proj` 文件夹即可编辑代码。修改后在微信开发者工具中刷新预览。

### 真机调试

微信开发者工具 → 真机调试 → 手机微信扫码（需同局域网）

## 后续扩展方向

- **云函数**: 将关卡数据同步到云端，支持多设备
- **关卡分享**: 生成关卡二维码/链接，分享给好友
- **排行榜**: 按关卡用时/道具数排名
- **更多道具**: 黑洞（吞噬）、风扇（吹偏方向）、加速器
- **音效**: 放置、发射、成功/失败音效
- **动画增强**: 货物移动平滑过渡、道具放置特效
- **主题皮肤**: 不同视觉风格
- **关卡包**: 按主题分组的关卡合集
