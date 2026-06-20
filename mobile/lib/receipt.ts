import * as ImagePicker from "expo-image-picker"
import * as DocumentPicker from "expo-document-picker"
import * as FileSystem from "expo-file-system/legacy"

/** A receipt the user attached, ready to scan (AI) and/or upload (storage). */
export type PickedReceipt = {
  /** base64 data URL (for the AI scan endpoint), e.g. `data:image/jpeg;base64,...` */
  dataUrl: string
  /** Local file URI (for binary upload + on-device caching). */
  uri: string
  /** MIME type, e.g. `image/jpeg` or `application/pdf`. */
  mime: string
  name: string
  isPdf: boolean
}

function toDataUrl(base64: string, mime: string): string {
  return `data:${mime};base64,${base64}`
}

/** Take a photo of the receipt with the camera. Returns null if cancelled/denied. */
export async function captureReceiptPhoto(): Promise<PickedReceipt | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync()
  if (!perm.granted) throw new Error("Camera permission is required to scan a receipt")

  const result = await ImagePicker.launchCameraAsync({
    base64: true,
    quality: 0.6,
    mediaTypes: ["images"],
  })
  if (result.canceled) return null
  const asset = result.assets[0]
  if (!asset?.base64) throw new Error("Could not read the photo")
  const mime = asset.mimeType ?? "image/jpeg"
  return { dataUrl: toDataUrl(asset.base64, mime), uri: asset.uri, mime, name: asset.fileName ?? "receipt.jpg", isPdf: false }
}

/** Pick a receipt image from the photo library. Returns null if cancelled. */
export async function pickReceiptImage(): Promise<PickedReceipt | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    base64: true,
    quality: 0.6,
    mediaTypes: ["images"],
  })
  if (result.canceled) return null
  const asset = result.assets[0]
  if (!asset?.base64) throw new Error("Could not read the image")
  const mime = asset.mimeType ?? "image/jpeg"
  return { dataUrl: toDataUrl(asset.base64, mime), uri: asset.uri, mime, name: asset.fileName ?? "receipt.jpg", isPdf: false }
}

/** Pick a PDF or image file (e.g. an emailed invoice). Returns null if cancelled. */
export async function pickReceiptDocument(): Promise<PickedReceipt | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/*"],
    copyToCacheDirectory: true,
  })
  if (result.canceled) return null
  const asset = result.assets[0]
  if (!asset?.uri) throw new Error("Could not read the file")
  const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 })
  const mime = asset.mimeType ?? (asset.name?.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg")
  return { dataUrl: toDataUrl(base64, mime), uri: asset.uri, mime, name: asset.name ?? "receipt", isPdf: mime === "application/pdf" }
}
