export function optimizeImage(url: string | null | undefined, width = 300, height = 300): string {
  if (!url) return 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop';
  if (url.includes('supabase.co') && url.includes('storage/v1/object/public')) {
    // Supabase image transform endpoint replaces /object/public/ with /render/image/public/
    const renderUrl = url.replace('storage/v1/object/public', 'storage/v1/render/image/public');
    const separator = renderUrl.includes('?') ? '&' : '?';
    return `${renderUrl}${separator}width=${width}&height=${height}&resize=cover&quality=80`;
  }
  return url;
}
