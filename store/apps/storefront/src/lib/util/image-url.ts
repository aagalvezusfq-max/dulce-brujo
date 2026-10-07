export function storeImage(url?: string | null) {
  if (!url) {
    return ""
  }

  return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1):8000/, "")
}
