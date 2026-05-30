export function optimizeImage(url: string | null | undefined, width = 300, height = 300): string {
  if (!url) return 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop';
  if (url.includes('supabase.co') && url.includes('storage/v1/object/public')) {
    // Check if there are already query parameters
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=${width}&height=${height}&resize=contain`;
  }
  return url;
}
