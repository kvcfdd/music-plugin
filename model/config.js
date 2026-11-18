import fs from "node:fs"
import path from "node:path"
import yaml from "yaml"
import chokidar from "chokidar"
import lodash from "lodash"

const root = path.resolve(import.meta.dirname, "..")
const configDir = path.join(root, "config")
const defFile = path.join(root, "defSet/config.yaml")
const userFile = path.join(configDir, "config.yaml")

fs.mkdirSync(configDir, { recursive: true })

function read(file) {
  try {
    return yaml.parse(fs.readFileSync(file, "utf8")) || {}
  } catch {
    return {}
  }
}

function load() {
  return { ...read(defFile), ...read(userFile) }
}

/** 原地更新，保证各模块持有的 config 引用始终有效 */
function update(next) {
  for (const key of Object.keys(config)) if (!(key in next)) delete config[key]
  Object.assign(config, next)
}

/** 默认配置 + 用户配置（config/config.yaml 可选） */
export const config = load()

/** 参考宿主配置热更：文件变化后 5 秒防抖重载 */
const reload = lodash.debounce(() => {
  const next = load()
  if (lodash.isEqual(next, config)) return
  update(next)
  logger.debug("[music-plugin] 配置已重新加载")
}, 5000)

chokidar.watch([defFile, configDir], { depth: 0 }).on("all", (event, file) => {
  if (path.resolve(file) === path.resolve(defFile) || path.resolve(file) === path.resolve(userFile)) reload()
})
