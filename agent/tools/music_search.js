import { config } from "../../model/config.js"
import { SOURCE_NAMES, parseSource, resolveSource, searchSongs } from "../../model/api.js"
import { formatSongList } from "../../model/sender.js"
import { setSearch } from "../../model/cache.js"

const DEFAULT_LIMIT = 5
const MAX_LIMIT = 10

export default {
  name: "music_search",
  description: "搜索 music.txqq.pro 的歌曲，返回带序号的候选列表；需要播放时调用 music_play(index=N)。",
  parameters: {
    type: "object",
    properties: {
      keyword: { type: "string", description: "歌名或歌手关键词。" },
      source: { type: "string", enum: Object.keys(SOURCE_NAMES), description: "音源；不填使用插件默认音源。" },
      limit: { type: "integer", minimum: 1, maximum: MAX_LIMIT, description: "返回数量，默认使用插件配置。" },
    },
    required: ["keyword"],
  },
  async execute(args, ctx) {
    const event = ctx?.event
    if (!event?.self_id || !event?.user_id) return { text: "无法获取当前对话上下文。" }

    const raw = String(args?.keyword || "").trim()
    if (!raw) return { text: "请提供歌名或歌手关键词。" }

    const fallback = resolveSource(args?.source, config.source)
    const { keyword, source } = parseSource(raw, fallback)
    if (!keyword) return { text: "请提供歌名或歌手关键词。" }

    const configured = Number(config.search_limit) || DEFAULT_LIMIT
    const limit = Math.min(Math.max(Number(args?.limit) || configured, 1), MAX_LIMIT)

    try {
      const songs = await searchSongs(keyword, source, limit, ctx?.signal)
      if (!songs.length) return { text: `没有找到「${keyword}」，可以换个关键词或音源试试。` }

      setSearch(event, songs, keyword, source, null)
      return { text: formatSongList(songs, keyword, source, null, "使用 music_play(index=N) 播放；format 可选 card/record/file/text。") }
    } catch (err) {
      logger.warn(`[music] 工具搜索「${keyword}」失败：${err.message}`)
      return { text: `搜索失败：${err.message}` }
    }
  },
}
