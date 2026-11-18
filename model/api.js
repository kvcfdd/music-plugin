import { config } from "./config.js"

/** music.txqq.pro 聚合搜索接口 */
const API_URL = "https://music.txqq.pro/"

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
  Accept: "application/json, text/javascript, */*; q=0.01",
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
  "X-Requested-With": "XMLHttpRequest",
  Origin: "https://music.txqq.pro",
  Referer: "https://music.txqq.pro/",
}

/** 音源显示名 */
export const SOURCE_NAMES = {
  qq: "QQ音乐",
  netease: "网易云",
  kugou: "酷狗",
  kuwo: "酷我",
  migu: "咪咕",
  baidu: "百度",
  "1ting": "一听",
  lizhi: "荔枝",
  qingting: "蜻蜓",
  ximalaya: "喜马拉雅",
  "5singyc": "5sing原创",
  "5singfc": "5sing翻唱",
  kg: "全民K歌",
}

/** 音源别名，命令里可用中文或英文 */
const SOURCE_ALIASES = {
  qq: "qq",
  qq音乐: "qq",
  网易: "netease",
  网易云: "netease",
  netease: "netease",
  酷狗: "kugou",
  kugou: "kugou",
  酷我: "kuwo",
  kuwo: "kuwo",
  咪咕: "migu",
  migu: "migu",
  百度: "baidu",
  baidu: "baidu",
  一听: "1ting",
  "1ting": "1ting",
  荔枝: "lizhi",
  lizhi: "lizhi",
  蜻蜓: "qingting",
  qingting: "qingting",
  喜马拉雅: "ximalaya",
  喜马: "ximalaya",
  ximalaya: "ximalaya",
  "5sing原创": "5singyc",
  "5singyc": "5singyc",
  "5sing翻唱": "5singfc",
  "5singfc": "5singfc",
  全民: "kg",
  全民k歌: "kg",
  kg: "kg",
}

/**
 * 解析「歌名 + 音源」参数
 * 支持「#搜索 晴天 netease」「#搜索 netease 晴天」两种写法
 */
export function parseSource(input, fallback = "qq") {
  const text = String(input || "").trim()
  const parts = text.split(/\s+/)
  if (parts.length > 1) {
    const first = SOURCE_ALIASES[parts[0].toLowerCase()]
    if (first) return { keyword: parts.slice(1).join(" "), source: first }
    const last = SOURCE_ALIASES[parts.at(-1).toLowerCase()]
    if (last) return { keyword: parts.slice(0, -1).join(" "), source: last }
  }
  return { keyword: text, source: fallback }
}

/** 调用 txqq 接口搜索歌曲 */
export async function searchSongs(keyword, source = "qq", limit = 5) {
  const body = new URLSearchParams({
    input: keyword,
    filter: "name",
    type: source,
    page: "1",
  })

  const res = await fetch(API_URL, {
    method: "POST",
    headers: HEADERS,
    body,
    signal: AbortSignal.timeout(config.request_timeout || 15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const json = await res.json()
  if (!Array.isArray(json?.data)) throw new Error("接口返回格式异常")

  return json.data.slice(0, Math.max(1, limit)).map(song => ({
    id: String(song.songid || ""),
    source: song.type || source,
    title: song.title || "未知歌曲",
    artist: song.author || "未知歌手",
    link: song.link || "",
    audio: song.url || "",
    cover: song.pic || "",
    lyrics: song.lrc || "",
  }))
}
