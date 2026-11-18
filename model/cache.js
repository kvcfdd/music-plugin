import { config } from "./config.js"

/** 搜索结果缓存，key 为「机器人 + 用户」，用于 #听 序号 */
const searchCache = new Map()

function keyOf(e) {
  return `${e.self_id}:${e.user_id}`
}

/** 保存一次搜索结果 */
export function setSearch(e, songs, keyword, source, format) {
  searchCache.set(keyOf(e), { songs, keyword, source, format, time: Date.now() })
}

/** 读取搜索结果，超过选歌时长视为过期 */
export function getSearch(e) {
  const key = keyOf(e)
  const item = searchCache.get(key)
  if (!item) return null

  const ttl = (config.select_timeout || 120) * 1000
  if (Date.now() - item.time > ttl) {
    searchCache.delete(key)
    return null
  }
  return item
}
