import { useState, useCallback } from 'react';
import { UploadGuardResult, checkCanUpload } from '../lib/uploadGuard';

export function useUploadGuard() {
  const [guardResult, setGuardResult] = useState<UploadGuardResult | null>(null);
  const [checking, setChecking] = useState(false);

  const checkUpload = useCallback(async (artistId: string) => {
    setChecking(true);
    try {
      const result = await checkCanUpload(artistId);
      setGuardResult(result);
      return result;
    } catch (err) {
      const errResult = { allowed: false, message: "An unexpected error occurred while checking upload limits." };
      setGuardResult(errResult);
      return errResult;
    } finally {
      setChecking(false);
    }
  }, []);

  const refresh = useCallback(async (artistId: string) => {
    return checkUpload(artistId);
  }, [checkUpload]);

  return { guardResult, checking, checkUpload, refresh };
}
