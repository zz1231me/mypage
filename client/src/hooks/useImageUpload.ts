// client/src/hooks/useImageUpload.ts
import { useCallback, useState } from 'react';
import api from '../api/axios';
import { fileLogger } from '../utils/logger';

export const useImageUpload = () => {
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleImageUpload = useCallback(
    async (blob: Blob, callback: (url: string, alt: string) => void) => {
      setUploadError(null);
      try {
        const formData = new FormData();
        formData.append('image', blob);

        const res = await api.post('/uploads/images', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const data = res.data;
        const imageUrl = data.data?.imageUrl ?? data.imageUrl;
        callback(imageUrl, '업로드된 이미지');
        fileLogger.success('이미지 업로드 완료', { url: imageUrl });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        fileLogger.error('이미지 업로드 실패', err);
        setUploadError('이미지 업로드에 실패했습니다.');
      }
    },
    []
  );

  return { handleImageUpload, uploadError };
};
