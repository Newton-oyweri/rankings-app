const handledUrls = new Set<string>();

export function shouldHandleAuthUrl(url: string) {
  console.log('[guard] checking url:', url, '| already handled:', handledUrls.has(url));
  if (handledUrls.has(url)) return false;
  handledUrls.add(url);
  setTimeout(() => handledUrls.delete(url), 15000);
  return true;
}