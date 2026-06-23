/**
 * 微信小游戏入口文件
 * 初始化 Canvas、场景管理器，启动游戏主循环
 */

const SceneManager = require('./js/scenes/scene-manager');

// 创建主画布（小游戏自动创建全屏主画布）
const canvas = wx.createCanvas();

// 初始化场景管理器
const sceneManager = new SceneManager(canvas);

// 进入关卡选择场景
const MenuScene = require('./js/scenes/menu-scene');
sceneManager.switchTo(new MenuScene());

// 启动 requestAnimationFrame 主循环
function loop() {
  sceneManager.update();
  sceneManager.render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
