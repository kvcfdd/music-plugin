import fs from "node:fs"
import path from "node:path"

const appDir = path.join(import.meta.dirname, "apps")
const files = fs.readdirSync(appDir).filter(file => file.endsWith(".js"))
const ret = await Promise.allSettled(files.map(file => import(`./apps/${file}`)))

let apps = {}
for (const i in files) {
  const name = files[i].replace(".js", "")
  if (ret[i].status !== "fulfilled") {
    logger.error(`载入插件错误：${logger.red(name)}`)
    logger.error(ret[i].reason)
    continue
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}

export { apps }
