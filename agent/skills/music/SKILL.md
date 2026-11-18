---
name: music
description: 搜索和播放音乐；当用户想听歌、点歌、找歌或询问某首歌时使用。
tools: music_search music_play
---

# 音乐

使用 `music_search` 搜索，使用 `music_play` 发送歌曲。

## 流程

1. 用户给出明确的歌名或歌手：先调用 `music_search` 获取候选。只有一首明显匹配时，直接调用 `music_play({ index: 1 })`。
2. 用户描述模糊（如“来首歌”“推荐点歌”）：先 `music_search`，把候选列表发给用户选择；用户回复序号后调用 `music_play({ index: N })`。
3. 用户指定音源：把 `source` 传给工具。可用 `qq`、`netease`、`kugou`、`kuwo`、`migu`、`baidu`、`1ting`、`lizhi`、`qingting`、`ximalaya`、`5singyc`、`5singfc`、`kg`。
4. 用户指定发送方式：`format` 可选 `card`（卡片，默认）、`record`（语音）、`file`（文件）、`text`（文本链接）。
5. `music_search` 的候选按序号缓存，`music_play` 的 `index` 使用最近一次搜索结果。

## 注意

- 没有搜索结果时不要猜序号，重新调用 `music_search`。
- `record` / `file` 需要歌曲有音频链接；工具提示格式不可用时，改用 `card` 或 `text`。
- 工具会直接发送音乐，最终回复只需简短确认，不要重复贴歌曲列表或链接。
- 不要调用 shell 或访问项目文件；点歌只需要这两个工具。
