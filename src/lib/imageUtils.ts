export function optimizeImage(url: string | null | undefined, width = 300, height = 300): string {
  if (!url) return 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop';
  
  // Don't proxy data URIs, local blobs, or relative paths
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) {
    return url;
  }

  // If it's already placehold.co, return directly
  if (url.includes('placehold.co')) {
    return url;
  }

  // Use wsrv.nl free edge proxy for fast, light WebP images (bypasses Supabase Pro requirement)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (url.includes('wsrv.nl')) return url;
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&h=${height}&fit=cover&output=webp&q=80`;
  }

  return url;
}

