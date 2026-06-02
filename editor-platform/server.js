/**
 * 快递到家 - 关卡设计平台后端
 * 
 * API:
 *   GET    /api/levels          获取所有关卡
 *   GET    /api/levels/:id      获取单个关卡
 *   POST   /api/levels          保存关卡（新增或更新）
 *   DELETE /api/levels/:id      删除关卡
 *   POST   /api/levels/push     推送关卡到小程序端（导出JSON）
 *   GET    /api/levels/export   导出所有关卡为 levels.js 格式
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3456;
const DATA_DIR = path.join(__dirname, 'data');
const LEVELS_FILE = path.join(DATA_DIR, 'levels.json');

// 中间件
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 加载关卡数据
function loadLevels() {
  try {
    if (fs.existsSync(LEVELS_FILE)) {
      return JSON.parse(fs.readFileSync(LEVELS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('加载关卡失败:', e.message);
  }
  return [];
}

// 保存关卡数据
function saveLevels(levels) {
  fs.writeFileSync(LEVELS_FILE, JSON.stringify(levels, null, 2), 'utf-8');
}

// ========== API 路由 ==========

// 获取所有关卡
app.get('/api/levels', (req, res) => {
  const levels = loadLevels();
  res.json({
    total: levels.length,
    levels: levels.map(l => ({
      id: l.id,
      name: l.name,
      width: l.width,
      height: l.height,
      updatedAt: l.updatedAt || l.createdAt,
      verified: l.verified || false
    }))
  });
});

// 获取单个关卡
app.get('/api/levels/:id', (req, res) => {
  const levels = loadLevels();
  const level = levels.find(l => l.id === req.params.id);
  if (!level) return res.status(404).json({ error: '关卡不存在' });
  res.json(level);
});

// 保存关卡
app.post('/api/levels', (req, res) => {
  const levels = loadLevels();
  const level = req.body;

  if (!level.name || !level.grid || !level.start || !level.goal) {
    return res.status(400).json({ error: '关卡数据不完整' });
  }

  // 生成ID
  if (!level.id) {
    level.id = 'level_' + Date.now();
  }

  level.updatedAt = new Date().toISOString();
  if (!level.createdAt) {
    level.createdAt = level.updatedAt;
  }

  // 更新或新增
  const idx = levels.findIndex(l => l.id === level.id);
  if (idx >= 0) {
    levels[idx] = level;
  } else {
    levels.push(level);
  }

  saveLevels(levels);
  console.log(`✅ 保存关卡: ${level.name} (${level.id})`);
  res.json({ success: true, id: level.id, message: '保存成功' });
});

// 删除关卡
app.delete('/api/levels/:id', (req, res) => {
  let levels = loadLevels();
  const idx = levels.findIndex(l => l.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: '关卡不存在' });

  const name = levels[idx].name;
  levels.splice(idx, 1);
  saveLevels(levels);
  console.log(`🗑 删除关卡: ${name}`);
  res.json({ success: true, message: '已删除' });
});

// 导出所有关卡为 levels.js 格式（可直接替换小程序内的关卡文件）
app.get('/api/levels/export', (req, res) => {
  const levels = loadLevels();
  const code = `/**
 * 内置关卡数据（由关卡设计平台自动生成）
 * 生成时间: ${new Date().toISOString()}
 * 共 ${levels.length} 个关卡
 */
const levels = ${JSON.stringify(levels, null, 2)};
module.exports = levels;
`;

  // 同时写入到小程序项目目录
  const outputPath = path.join(__dirname, '..', 'levels', 'levels.js');
  try {
    fs.writeFileSync(outputPath, code, 'utf-8');
    console.log(`📦 导出关卡到: ${outputPath}`);
  } catch (e) {
    console.error('导出失败:', e.message);
  }

  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Content-Disposition', 'attachment; filename="levels.js"');
  res.send(code);
});

// 推送关卡到小程序项目目录
app.post('/api/levels/push', (req, res) => {
  const levels = loadLevels();
  const outputPath = path.join(__dirname, '..', 'levels', 'levels.js');

  const code = `/**
 * 内置关卡数据（由关卡设计平台自动生成）
 * 生成时间: ${new Date().toISOString()}
 * 共 ${levels.length} 个关卡
 */
const levels = ${JSON.stringify(levels, null, 2)};
module.exports = levels;
`;

  try {
    fs.writeFileSync(outputPath, code, 'utf-8');
    console.log(`🚀 推送 ${levels.length} 个关卡到小程序项目`);
    res.json({
      success: true,
      count: levels.length,
      message: `已推送 ${levels.length} 个关卡到小程序`
    });
  } catch (e) {
    res.status(500).json({ error: '推送失败: ' + e.message });
  }
});

// ========== 启动服务 ==========
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   🎮 快递到家 - 关卡设计平台              ║
║                                          ║
║   编辑器地址: http://localhost:${PORT}       ║
║   API 地址:   http://localhost:${PORT}/api   ║
║                                          ║
║   快捷键:                                 ║
║   Ctrl+S  保存当前关卡                     ║
║   Ctrl+T  测试关卡                        ║
║   Ctrl+P  推送到小程序                     ║
╚══════════════════════════════════════════╝
  `);
});
