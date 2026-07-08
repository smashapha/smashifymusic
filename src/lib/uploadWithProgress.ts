import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export interface UploadProgressInfo {
  loaded: number;
  total: number;
  percent: number;       // 0-100
  speedBps: number;      // bytes per second, average since upload started
  etaSeconds: number | null; // null until we have enough data to estimate
}

export interface UploadResult {
  path: string;
  publicUrl: string;
}

/**
 * Uploads a file/blob directly to Supabase Storage via XHR so we get real
 * byte-level progress events (the supabase-js `.upload()` helper does not
 * expose these). Mirrors what supabase-js does under the hood: same
 * endpoint shape, same auth headers, same public URL afterward.
 */
export function uploadFileWithProgress(
  bucket: string,
  path: string,
  file: Blob,
  contentType: string,
  onProgress: (info: UploadProgressInfo) => void,
  options?: { upsert?: boolean }
): { promise: Promise<UploadResult>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const startedAt = Date.now();

  const promise = new Promise<UploadResult>((resolve, reject) => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || SUPABASE_ANON_KEY;

      const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
      xhr.open('POST', url, true);
      xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.setRequestHeader('x-upsert', options?.upsert ? 'true' : 'false');

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const elapsedSeconds = Math.max((Date.now() - startedAt) / 1000, 0.001);
        const speedBps = event.loaded / elapsedSeconds;
        const remainingBytes = event.total - event.loaded;
        const etaSeconds = speedBps > 0 ? remainingBytes / speedBps : null;

        onProgress({
          loaded: event.loaded,
          total: event.total,
          percent: Math.round((event.loaded / event.total) * 100),
          speedBps,
          etaSeconds,
        });
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const { data } = supabase.storage.from(bucket).getPublicUrl(path);
          resolve({ path, publicUrl: data.publicUrl });
        } else {
          reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText || 'Unknown error'}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.onabort = () => reject(new Error('Upload cancelled'));

      xhr.send(file);
    })().catch(reject);
  });

  return { promise, abort: () => xhr.abort() };
}

export function formatSpeed(bps: number): string {
  if (!bps || bps <= 0) return '';
  return `${(bps / (1024 * 1024)).toFixed(2)} MB/s`;
}

export function formatEta(seconds: number | null): string {
  if (seconds == null || !isFinite(seconds) || seconds < 0) return '';
  if (seconds < 1) return 'almost done';
  if (seconds < 60) return `${Math.ceil(seconds)}s left`;
  const m = Math.floor(seconds / 60);
  const s = Math.ceil(seconds % 60);
  return `${m}m ${s}s left`;
}
