export function optimizeImage(url: string | null | undefined, _width = 300, _height = 300): string {
  if (!url) return 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop';
  // Ensure valid URL string
  return url;
}
