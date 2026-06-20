import Constants from "expo-constants"

/**
 * Base URL of the PFMS backend. In dev this must be reachable from the device:
 * use your machine's LAN IP (e.g. http://192.168.1.5:3000), not localhost, when
 * running on a physical phone. Override via app.json → expo.extra.apiBaseUrl or
 * the EXPO_PUBLIC_API_BASE_URL env var.
 */
export const API_BASE_URL: string =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  "http://localhost:3000"
