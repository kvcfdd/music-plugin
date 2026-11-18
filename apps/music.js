import { config } from "../model/config.js"
import { parseSource, searchSongs } from "../model/api.js"
import { formatSongList, parseFormat, sendSong } from "../model/sender.js"
import { getSearch, setSearch } from "../model/cache.js"

/** 等待选歌的上下文名称 */
const SELECT_CONTEXT = "musicSelect"

/** 从参数末尾提取格式，如「晴天 文件」「1 3」 */
function splitFormat(raw) {
  const text = String(raw || "").trim()
  const parts = text.split(/\s+/)
  if (parts.length > 1) {
    const format = parseFormat(parts.at(-1))
    if (format) return { text: parts.slice(0, -1).join(" "), format }
  }
  return { text, format: null }
}

export class music extends plugin {
  constructor() {
    super({
      name: "点歌",
      dsc: "基于 music.txqq.pro 的搜索与点歌",
      event: "message",
      priority: 5000,
      rule: [
        { reg: "^#(点歌|搜索)\\s*(.*)$", fnc: "search" },
        { reg: "^#(听歌|播放|听)\\s*(.*)$", fnc: "listen" },
      ],
    })
  }

  /** #点歌 / #搜索：返回列表并等待用户回复序号 */
  async search() {
    const raw = this.e.msg.replace(/^#(点歌|搜索)\s*/, "").trim()
    if (!raw) return this.reply("请输入歌名，例如：#点歌 晴天 文件")
    const { text, format } = splitFormat(raw)
    return this.doSearch(text, true, format)
  }

  /** #听 / #播放：直接播放；参数为数字时播放上次搜索结果 */
  async listen() {
    const raw = this.e.msg.replace(/^#(听歌|播放|听)\s*/, "").trim()
    if (!raw) return this.reply("请输入歌名或序号，例如：#听 晴天 语音")

    const { text, format } = splitFormat(raw)

    if (/^\d+$/.test(text)) {
      const history = getSearch(this.e)
      if (!history) return this.reply("搜索结果已过期，请先使用 #搜索 歌名")
      const index = Number(text)
      if (index < 1 || index > history.songs.length) return this.reply(`序号范围：1-${history.songs.length}`)
      this.finish(SELECT_CONTEXT)
      return sendSong(this.e, history.songs[index - 1], format || history.format)
    }

    return this.doSearch(text, false, format)
  }

  /** 用户直接回复序号时由上下文调用，支持「1 文件」 */
  async musicSelect() {
    const parts = this.e.msg.trim().split(/\s+/)
    if (!/^\d+$/.test(parts[0])) return "continue"

    const history = getSearch(this.e)
    if (!history) {
      this.finish(SELECT_CONTEXT)
      return this.reply("搜索结果已过期，请重新搜索")
    }

    const index = Number(parts[0])
    if (index < 1 || index > history.songs.length) return this.reply(`请输入 1-${history.songs.length} 之间的序号`)

    this.finish(SELECT_CONTEXT)
    await sendSong(this.e, history.songs[index - 1], parseFormat(parts[1]) || history.format)
    return true
  }

  /**
   * 搜索歌曲
   * @param {string} arg 歌名，可附带音源
   * @param {boolean} select 是否等待用户选歌
   * @param {string|null} format 发送格式
   */
  async doSearch(arg, select, format) {
    const { keyword, source } = parseSource(arg, config.source)
    if (!keyword) return this.reply("请输入歌名")

    try {
      const songs = await searchSongs(keyword, source, config.search_limit)
      if (!songs.length) return this.reply(`没有找到「${keyword}」，可以换个关键词或音源试试`)

      setSearch(this.e, songs, keyword, source, format)

      /** 重新搜索或直接播放前先结束旧上下文，避免旧定时器误删新上下文 */
      this.finish(SELECT_CONTEXT)
      if (!select) return sendSong(this.e, songs[0], format)

      this.setContext(SELECT_CONTEXT, false, config.select_timeout)
      return this.reply(formatSongList(songs, keyword, source, format))
    } catch (err) {
      logger.error(`[music] 搜索「${keyword}」失败：${err.message}`)
      return this.reply("搜索失败，请稍后再试")
    }
  }
}
