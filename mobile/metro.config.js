// Metro config tuned for this monorepo: the Expo app lives in `mobile/` but
// imports the `@pfms/shared` package (TS source) from `packages/shared/`. We
// watch the repo root so Metro picks up changes to shared, resolve modules from
// both node_modules trees, and enable package "exports" so the subpath/main
// exports in @pfms/shared resolve.
const { getDefaultConfig } = require("expo/metro-config")
const path = require("path")

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, "..")

const config = getDefaultConfig(projectRoot)

config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
]
config.resolver.unstable_enablePackageExports = true

// NativeWind: process global.css through Tailwind.
const { withNativeWind } = require("nativewind/metro")
module.exports = withNativeWind(config, { input: "./global.css" })
