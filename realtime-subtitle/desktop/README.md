# 会议实时字幕 - 桌面版

类似腾讯会议，可点击启动的桌面应用。选择正在运行的会议窗口，为其添加实时翻译字幕。

## 使用前

1. **先启动后端**（与扩展共用同一后端）：
   ```bash
   cd ../backend
   python run.py
   ```

2. **启动桌面应用**：
   ```bash
   cd desktop
   npm install
   npm start
   ```

3. **操作步骤**：
   - 打开 Zoom、腾讯会议、Teams 等会议软件
   - 启动本应用
   - 在列表中选择要添加字幕的窗口（如「Zoom - Meeting」）
   - 选择目标语言，点击「开始字幕」
   - 字幕将显示在独立悬浮窗中

## 打包为 .exe

```bash
npm run dist
```

生成的安装包在 `dist/` 目录。

## 目录结构

```
desktop/
├── main.js          # 主进程
├── preload.js       # 预加载脚本
├── renderer/
│   ├── main.html    # 主窗口
│   ├── main.js      # 主窗口逻辑
│   └── overlay.html # 字幕悬浮窗
├── icons/
└── package.json
```
