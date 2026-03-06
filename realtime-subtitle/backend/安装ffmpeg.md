# 安装 ffmpeg（Whisper 必需）

Whisper 需要 ffmpeg 才能处理音频。Windows 安装方法：

## 方式一：winget（推荐）

```bash
winget install ffmpeg
```

## 方式二：手动安装

1. 打开 https://www.gyan.dev/ffmpeg/builds/
2. 下载 `ffmpeg-release-essentials.zip`
3. 解压到 `C:\ffmpeg`
4. 将 `C:\ffmpeg\bin` 添加到系统环境变量 PATH

## 验证

```bash
ffmpeg -version
```

显示版本号即安装成功。安装后需**重启后端**。
