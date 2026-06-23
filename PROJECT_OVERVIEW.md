# 快递到家 - 项目综合文档

> **项目定位**: 微信小程序端 2D 闯关益智游戏，核心玩法是在网格路径上放置物理引导道具（传送带、弹簧、斜坡），引导货物从起点到达终点。

---

## 1. 项目目录结构

```
e:\deliver_game_proj\
├── assets\                          # 资源目录（当前为空，预留图片/音频资源）
├── editor-platform\                 # 关卡设计平台（Web端，独立后端服务）
│   ├── data\
│   │   └── levels.json              # 关卡平台持久化存储（JSON格式关卡数据）
│   ├── node_modules\                # Node.js 依赖
│   ├── public\
│   │   └── index.html               # 关卡编辑器前端页面（单页应用，含完整Canvas编辑器）
│   ├── package.json                 # 平台依赖配置（express + cors）
│   └── server.js                    # Express 后端服务（REST API）
├── game\                            # 游戏核心逻辑层
│   ├── constants.js                 # 全局常量定义（方向、格子类型、物品、颜色主题等）
│   ├── levels.js                    # 关卡管理模块（加载/保存/增删改查关卡数据）
│   ├── physics.js                   # 物理引擎 GameEngine 类（货物移动、物品效果、模拟）
│   └── renderer.js                  # Canvas 2D 渲染器（网格、物品、货物、动画绘制）
├── js\                              # 场景与UI层
│   ├── scenes\
│   │   ├── editor-scene.js          # 关卡编辑器场景（小程序端可视化编辑器）
│   │   ├── game-scene.js            # 游戏主场景（放置物品、发射、过关判定）
│   │   ├── menu-scene.js            # 关卡选择场景（列表、星级评价、进度）
│   │   └── scene-manager.js         # 场景管理器（场景切换、触摸事件分发、Canvas管理）
│   └── ui.js                        # Canvas UI 工具库（按钮、圆角矩形、Toast通知）
├── levels\
│   └── levels.js                    # 内置关卡数据（5关渐进教学关卡）
├── utils\
│   └── storage.js                   # 本地存储工具（wx.setStorageSync 封装）
├── game.js                          # 微信小游戏入口文件（初始化Canvas、启动主循环）
├── game.json                        # 小游戏配置（竖屏、隐藏状态栏、网络超时）
├── project.config.json              # 微信开发者工具项目配置
├── project.private.config.json      # 开发者私有配置（不纳入版本控制）
└── .gitignore                       # Git 忽略规则
```

---

## 2. 代码架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                     game.js (入口)                        │
│           创建Canvas → 初始化SceneManager → 主循环         │
└───────────────────────┬─────────────────────────────────┘
                        │
            ┌───────────▼───────────┐
            │   SceneManager        │
            │   场景切换 + 事件分发   │
            └───┬───────┬───────┬───┘
                │       │       │
     ┌──────────▼──┐ ┌──▼────┐ ┌▼──────────────┐
     │ MenuScene   │ │Game   │ │EditorScene    │
     │ 关卡选择     │ │Scene  │ │小程序端编辑器   │
     │             │ │游戏主  │ │               │
     └─────────────┘ │场景   │ └───────────────┘
                     └───┬───┘
                         │
              ┌──────────▼──────────┐
              │    GameEngine       │
              │    物理引擎核心       │
              │  (physics.js)       │
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
  ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
  │ constants   │ │  Renderer   │ │   levels    │
  │ 常量定义     │ │  Canvas渲染  │ │  关卡管理    │
  └─────────────┘ └─────────────┘ └──────┬──────┘
                                          │
                                   ┌──────▼──────┐
                                   │  storage    │
                                   │ 本地存储     │
                                   └─────────────┘
```

### 2.2 核心模块说明

| 模块 | 文件 | 职责 |
|------|------|------|
| **入口** | `game.js` | 创建主画布、初始化SceneManager、启动requestAnimationFrame主循环 |
| **场景管理** | `scene-manager.js` | 管理当前场景实例，转发触摸事件，处理DPR适配 |
| **菜单场景** | `menu-scene.js` | 绘制关卡列表卡片（编号、名称、星级、锁定状态），支持滚动和编辑入口 |
| **游戏场景** | `game-scene.js` | 物品选择/放置/旋转、发射模拟、步数动画、过关判定（星级计算）、结果弹窗 |
| **编辑器场景** | `editor-scene.js` | 小程序端关卡编辑器，支持网格编辑、物品放置、测试模拟、保存自定义关卡 |
| **物理引擎** | `physics.js` | `GameEngine`类：加载关卡、放置/移除/旋转物品、发射货物、单步模拟、物品效果应用 |
| **渲染器** | `renderer.js` | `Renderer`类：网格布局计算、格子/墙壁/起点终点绘制、传送带/弹簧/斜坡精细绘制、轨迹绘制 |
| **常量** | `constants.js` | 方向(DIR)、格子类型(CELL)、物品类型(ITEM)、游戏状态(STATE)、颜色主题(THEME) |
| **关卡管理** | `levels.js` | 内置关卡加载、自定义关卡CRUD、关卡合并、空白模板创建 |
| **存储** | `utils/storage.js` | wx.setStorageSync封装、游戏进度保存/读取、关卡解锁逻辑 |
| **UI工具** | `js/ui.js` | Button组件、圆角矩形绘制、文字换行、Toast通知系统 |

### 2.3 物理规则

| 物品 | 效果 | 方向逻辑 |
|------|------|----------|
| **传送带** (conveyor) | 改变货物移动方向为传送带朝向 | `cargo.dir = item.dir` |
| **弹簧** (spring) | 反弹货物180° | `cargo.dir = (cargo.dir + 2) % 4` |
| **斜坡** (slope) | 顺时针旋转货物方向90° | `cargo.dir = (cargo.dir + 1) % 4` |

- 货物撞墙或越界 → 失败
- 货物到达终点格 → 成功
- 最大模拟步数：200步

### 2.4 关卡数据格式 (JSON)

```json
{
  "id": "level_001",
  "name": "初识传送",
  "width": 7,
  "height": 5,
  "grid": [["empty","empty",...], ...],
  "start": { "x": 0, "y": 2 },
  "startDir": 1,
  "goal": { "x": 6, "y": 4 },
  "items": { "conveyor": 2, "spring": 0, "slope": 0 }
}
```

### 2.5 星级评价算法

```
使用物品比例 = 已用物品数 / 可用物品总数
≤ 50%  → 3星
≤ 80%  → 2星
> 80%  → 1星
```

---

## 3. 技术栈

| 类别 | 技术 |
|------|------|
| **平台** | 微信小游戏（原生开发，非框架） |
| **渲染** | Canvas 2D API |
| **语言** | JavaScript (ES6)，部分场景使用ES5 function构造器风格 |
| **状态管理** | 自研 `GameEngine` 类 |
| **数据存储** | `wx.setStorageSync`（本地持久化） |
| **关卡格式** | JSON（grid, start, goal, items 等字段） |
| **编辑器后端** | Node.js + Express + CORS |
| **编辑器前端** | 原生HTML/CSS/JS 单页应用 + Canvas |

---

## 4. 开发与使用方法

### 4.1 环境准备

1. **安装微信开发者工具**：[下载地址](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. **导入项目**：打开微信开发者工具 → 导入项目 → 选择目录 `E:\deliver_game_proj`
3. **AppID**：开发阶段可用测试号；正式发布需替换为正式 AppID（当前: `wx507ea7f9220e0db9`）

### 4.2 开发流程

```
1. 在 Qoder IDE 或任意编辑器中修改 JS 文件
2. 在微信开发者工具中点击「编译」或「刷新」即可预览最新代码
3. 无需传统编译步骤，源码直接运行
```

### 4.3 真机调试

微信开发者工具 → 真机调试 → 手机微信扫码（需同局域网）

### 4.4 关卡编辑平台（Web端）

```bash
# 进入编辑器平台目录
cd editor-platform

# 安装依赖
npm install

# 启动服务
npm start
# 访问 http://localhost:3456
```

**API 接口：**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/levels` | 获取所有关卡列表 |
| GET | `/api/levels/:id` | 获取单个关卡详情 |
| POST | `/api/levels` | 保存关卡（新增或更新） |
| DELETE | `/api/levels/:id` | 删除关卡 |
| POST | `/api/levels/push` | 推送关卡到小程序 `levels/levels.js` |
| GET | `/api/levels/export` | 导出所有关卡为 `levels.js` 格式 |

**快捷键：**
- `Ctrl+S` 保存当前关卡
- `Ctrl+T` 测试关卡
- `Ctrl+P` 推送到小程序
- `1-7` 快速选择工具
- 右键旋转物品

### 4.5 小程序端关卡编辑

在菜单场景点击右下角「关卡编辑」按钮进入，支持：
- 7种工具：橡皮、墙壁、起点、终点、传送带、弹簧、斜坡
- 4方向选择：上/下/左/右
- 操作：测试、保存、清空、返回

---

## 5. 部署与发布

### 5.1 预览/体验版

1. 微信开发者工具 → 工具栏 → 「预览」→ 扫码体验
2. 或「真机调试」→ 扫码调试

### 5.2 上传发布

1. 微信开发者工具 → 「上传」→ 填写版本号和描述
2. 登录 [微信公众平台](https://mp.weixin.qq.com/) → 版本管理 → 提交审核
3. 审核通过后 → 发布上线

### 5.3 关卡推送工作流

```
1. 在 Web 编辑器平台设计关卡并测试
2. 点击「推送到小程序」或 Ctrl+P
3. 关卡数据自动写入 levels/levels.js
4. 微信开发者工具刷新即可看到新关卡
```

---

## 6. 注意事项

### 6.1 代码风格

- **场景文件** (`js/scenes/`) 使用 ES5 `function` 构造器 + `prototype` 方法风格
- **核心模块** (`game/`) 混用 ES6 `class` 和 ES5 风格
- 缩进：2空格
- 编码：UTF-8

### 6.2 坐标系

- 网格坐标系：`x` = 列（向右增大），`y` = 行（向下增大）
- 方向编码：`0=上, 1=右, 2=下, 3=左`
- 触摸坐标需通过 `Renderer.touchToGrid()` 转换为网格坐标

### 6.3 Canvas 渲染

- 使用 DPR (devicePixelRatio) 适配高清屏：`canvas.width = screenWidth * dpr`
- 所有绘制使用 CSS 像素坐标（已通过 `ctx.scale(dpr, dpr)` 缩放）
- 主循环使用 `requestAnimationFrame`，但动画步进使用 `setInterval`

### 6.4 数据存储

- 游戏进度 key: `game_progress`（含 `maxUnlockedLevel` 和 `stars` 映射）
- 自定义关卡 key: `custom_levels`（JSON字符串数组）
- 使用 `wx.setStorageSync` 同步 API，注意异常处理

### 6.5 关卡设计原则

- 内置5关采用渐进教学：传送带 → 绕墙 → 斜坡 → 弹簧 → 综合
- grid 数组只包含 `empty` 和 `wall`，起点/终点用独立坐标表示
- 编辑器保存的自定义关卡 `items` 字段默认为 99（自由模式）

### 6.6 性能

- 模拟最大步数限制 200 步，防止死循环
- 动画步进间隔 120ms（可调节 `ANIMATION_SPEED` 常量）
- Canvas 绘制已做基础优化（仅重绘变化区域）

### 6.7 已知限制

- 斜坡的方向 `0(上)` 和 `1(右)` 的三角形顶点坐标相同（代码 bug，待修复）
- 编辑器场景 `_render` 中 `offsetX/offsetY` 直接赋值，与 `fitGrid` 计算冲突
- 场景文件使用 `require` 延迟加载避免循环依赖

---

## 7. 项目记忆文件清单

以下记忆文件存储于 `C:\Users\Chi\.qoder\memories\019caeaa\projects\e-deliver_game_proj\`：

| 文件 | 类别 | 内容概要 |
|------|------|----------|
| `project_build_configuration/微信小程序源码级构建与调试流程.md` | 构建配置 | 源码直接运行模式，无传统编译步骤 |
| `project_environment_configuration/微信小程序开发与真机调试环境要求.md` | 环境配置 | 微信开发者工具、AppID、真机调试要求 |
| `project_ide_configuration/Qoder_IDE与微信开发者工具协同开发流程.md` | IDE配置 | Qoder IDE + 微信开发者工具协同方式 |
| `project_introduction/快递到家项目核心功能与关卡设计逻辑.md` | 项目介绍 | 2D闯关益智游戏定位、核心玩法、关卡设计 |
| `project_tech_stack/微信小程序原生技术栈.md` | 技术栈 | Canvas 2D、GameEngine、wx存储、JSON关卡 |

---

## 8. 技能与配置

### 8.1 开发工具配置

- **IDE**: Qoder IDE（直接打开项目文件夹 `E:\deliver_game_proj`）
- **微信开发者工具**: 导入项目目录，编译/刷新预览
- **编辑器**: tabIndent = insertSpaces, tabSize = 2

### 8.2 project.config.json 关键配置

```json
{
  "compileType": "game",           // 小游戏类型
  "libVersion": "3.3.4",           // 基础库版本
  "appid": "wx507ea7f9220e0db9",  // 小程序AppID
  "setting": {
    "es6": true,                   // ES6转ES5
    "enhance": true,               // 增强编译
    "postcss": true,               // 样式后处理
    "minified": true,              // 代码压缩
    "compileHotReLoad": true       // 编译热重载
  }
}
```

### 8.3 game.json 配置

```json
{
  "deviceOrientation": "portrait",  // 竖屏
  "showStatusBar": false,           // 隐藏状态栏
  "networkTimeout": {               // 网络超时（毫秒）
    "request": 5000,
    "connectSocket": 5000,
    "uploadFile": 5000,
    "downloadFile": 5000
  }
}
```

### 8.4 编辑器平台依赖

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
```

### 8.5 .gitignore 规则

```
node_modules/
miniprogram_npm/
.DS_Store
*.log
project.private.config.json
```

---

## 9. 内置关卡一览

| # | ID | 名称 | 尺寸 | 可用物品 | 教学目标 |
|---|-----|------|------|----------|----------|
| 1 | level_001 | 初识传送 | 7x5 | 传送带x2 | 学习传送带基本用法 |
| 2 | level_002 | 绕墙而行 | 8x6 | 传送带x3 | 绕过墙壁障碍 |
| 3 | level_003 | 斜坡初体验 | 6x6 | 传送带x1, 斜坡x2 | 学习斜坡90°偏转 |
| 4 | level_004 | 弹簧妙用 | 6x6 | 传送带x1, 弹簧x1, 斜坡x1 | 学习弹簧180°反弹 |
| 5 | level_005 | 综合挑战 | 8x6 | 传送带x3, 弹簧x1, 斜坡x1 | 综合运用所有道具 |
