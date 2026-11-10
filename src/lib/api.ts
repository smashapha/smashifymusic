/**
 * Resolves the backend API base URL for fetch calls.
 * - In production (smashifymusic.vercel.app) or local server (localhost), uses relative path /api/...
 * - In AI Studio Preview (run.app iframe), falls back to VITE_API_URL or the production Vercel server https://smashifymusic.vercel.app
 */
export const getApiUrl = (endpointPath: string): string => {
  const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;

  // 1. If explicit environment variable VITE_API_URL is configured
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl && envApiUrl.trim() !== '') {
    const base = envApiUrl.trim().endsWith('/') ? envApiUrl.trim().slice(0, -1) : envApiUrl.trim();
    return `${base}${cleanPath}`;
  }

  // 2. In AI Studio Preview (run.app iframe)
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.run.app')) {
    const vercelProdUrl = 'https://smashifymusic.vercel.app';
    return `${vercelProdUrl}${cleanPath}`;
  }

  // 3. Standard relative URL for same-origin production or local dev server
  return cleanPath;
};
