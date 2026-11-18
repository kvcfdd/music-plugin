import { config } from "../../model/config.js"
import { SOURCE_NAMES, parseSource, resolveSource, searchSongs } from "../../model/api.js"
import { checkFormat, parseFormat, sendSong } from "../../model/sender.js"
import { getSearch, setSearch } from "../../model/cache.js"

export default {
  name: "music_play",
  description: "播放最近一次 music_search 结果中的歌曲，或用关键词搜索并播放第一首。",
  parameters: {
    type: "object",
    properties: {
      index: { type: "integer", minimum: 1, description: "music_search 结果中的 1-based 序号；优先使用。" },
      keyword: { type: "string", description: "没有 index 时使用的歌名或歌手关键词。" },
      source: { type: "string", enum: Object.keys(SOURCE_NAMES), description: "关键词搜索使用的音源。" },
      format: { type: "string", enum: ["card", "record", "file", "text"], description: "发送格式；默认使用插件配置。" },
    },
  },
  async execute(args, ctx) {
    const event = ctx?.event
    if (!event?.reply || !event?.self_id || !event?.user_id) return { text: "无法获取当前对话上下文。" }

    const format = parseFormat(args?.format) || null
    let song = null

    if (args?.index != null) {
      const history = getSearch(event)
      if (!history) return { text: "没有可用的搜索结果，请先调用 music_search。" }

      const index = Number(args.index)
      if (!Number.isInteger(index) || index < 1 || index > history.songs.length) {
        return { text: `序号必须在 1-${history.songs.length} 之间。` }
      }
      song = history.songs[index - 1]
    } else {
      const raw = String(args?.keyword || "").trim()
      if (!raw) return { text: "请提供 index 或 keyword。" }

      const fallback = resolveSource(args?.source, config.source)
      const { keyword, source } = parseSource(raw, fallback)
      try {
        const songs = await searchSongs(keyword, source, 1, ctx?.signal)
        if (!songs.length) return { text: `没有找到「${keyword}」。` }

        song = songs[0]
        setSearch(event, songs, keyword, source, format)
      } catch (err) {
        logger.warn(`[music] 工具播放搜索「${keyword}」失败：${err.message}`)
        return { text: `搜索失败：${err.message}` }
      }
    }

    const mode = format || parseFormat(config.send_mode) || "card"
    const error = checkFormat(song, mode)
    if (error) return { text: error }

    await sendSong(event, song, mode)
    return { text: `已发送《${song.title} - ${song.artist}》` }
  },
}
