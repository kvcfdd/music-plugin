import { config } from "./config.js"
import { SOURCE_NAMES } from "./api.js"

/**
 * 构造 OneBot music 段
 */
const musicSegment = data => ({ type: "music", data })

const FORMAT_ALIASES = {
  card: "card",
  卡片: "card",
  1: "card",
  record: "record",
  语音: "record",
  2: "record",
  file: "file",
  文件: "file",
  3: "file",
  text: "text",
  文本: "text",
  4: "text",
}

const FORMAT_NAMES = {
  card: "卡片",
  record: "语音",
  file: "文件",
  text: "文本",
}

/** 解析发送格式，支持中英文和 1-4 */
export function parseFormat(value) {
  return FORMAT_ALIASES[String(value || "").trim().toLowerCase()] || null
}

/** 搜索结果的文本列表 */
export function formatSongList(songs, keyword, source, format, hint = "回复序号播放，可附加格式：1 卡片 / 2 语音 / 3 文件 / 4 文本") {
  const name = SOURCE_NAMES[source] || source
  const mode = format ? `（${FORMAT_NAMES[format]}）` : ""
  const lines = [`【${name}】搜索「${keyword}」${mode}：`]
  songs.forEach((song, index) => {
    lines.push(`${index + 1}. ${song.title} - ${song.artist}`)
  })
  if (hint) lines.push("", hint)
  return lines.join("\n")
}

/** 构造音乐卡片 */
function cardSegment(song) {
  // 网易云音源直接用官方 163 卡片
  if (song.source === "netease" && /^\d+$/.test(song.id)) {
    return musicSegment({ type: "163", id: song.id })
  }

  if (!song.link && !song.audio) return null

  const data = {
    type: "custom",
    url: song.link || song.audio,
    title: song.title,
    content: song.artist,
    image: song.cover || "",
  }
  if (song.audio) data.audio = song.audio
  return musicSegment(data)
}

/** 生成安全的文件名与后缀 */
function fileName(song) {
  const safe = text => String(text || "未知").replace(/[\\/:*?"<>|]/g, "_").slice(0, 60)
  let ext = "mp3"
  try {
    const match = new URL(song.audio).pathname.match(/\.([a-z0-9]{2,4})$/i)
    if (match) ext = match[1].toLowerCase()
  } catch {}
  return `${safe(song.title)} - ${safe(song.artist)}.${ext}`
}

function songText(song) {
  const lines = [`🎵 ${song.title} - ${song.artist}`]
  if (song.link) lines.push(`链接：${song.link}`)
  if (song.audio) lines.push(`音频：${song.audio}`)
  return lines.join("\n")
}

/** 检查歌曲是否支持指定发送格式；返回错误文案或 null */
export function checkFormat(song, format) {
  const mode = parseFormat(format) || parseFormat(config.send_mode) || "card"
  if (mode === "card") return cardSegment(song) ? null : "这首歌没有可用的卡片信息，请改用「文本」或「文件」"
  if (mode === "record" || mode === "file") return song.audio ? null : "这首歌没有音频链接，请改用「卡片」或「文本」"
  return null
}

/** 按指定格式发送 */
export async function sendSong(e, song, format) {
  const mode = parseFormat(format) || parseFormat(config.send_mode) || "card"
  const error = checkFormat(song, mode)
  if (error) return e.reply(error)

  switch (mode) {
    case "card":
      return e.reply(cardSegment(song))
    case "record":
      return e.reply(segment.record(song.audio))
    case "file":
      return e.reply(segment.file(song.audio, fileName(song)))
    case "text":
      return e.reply(songText(song))
  }
}
