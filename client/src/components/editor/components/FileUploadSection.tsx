// client/src/components/editor/FileUploadSection.tsx - 깔끔하게 개선
import React from 'react';
// Since these files are now in the same directory, these imports are actually correct
// But let's verify if there are any other broken imports
import ExistingFileList from './ExistingFileList';
import NewFileList from './NewFileList';

interface AttachmentInfo {
  url: string;
  originalName: string;
  storedName: string;
  size?: number;
  mimeType?: string;
}

interface FileUploadSectionProps {
  files: File[];
  existingFiles: AttachmentInfo[];
  onNewFilesAdd: (files: File[]) => void;
  onNewFileRemove: (index: number) => void;
  onExistingFileRemove: (index: number) => void;
  maxFiles: number;
  maxFileSize: number;
  isEditMode: boolean;
}

const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  files,
  existingFiles,
  onNewFilesAdd,
  onNewFileRemove,
  onExistingFileRemove,
  maxFiles,
  maxFileSize,
  isEditMode,
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    const oversizedFiles = selectedFiles.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      alert(
        `파일 크기는 ${Math.round(maxFileSize / 1024 / 1024)}MB를 초과할 수 없습니다.\n초과 파일: ${oversizedFiles.map(f => f.name).join(', ')}`
      );
      return;
    }

    const totalFiles = existingFiles.length + files.length + selectedFiles.length;
    if (totalFiles > maxFiles) {
      alert(`최대 ${maxFiles}개의 파일만 첨부할 수 있습니다.`);
      return;
    }

    onNewFilesAdd(selectedFiles);
    e.target.value = '';
  };

  const totalFiles = existingFiles.length + files.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          첨부파일
        </label>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          최대 {maxFiles}개, 각 {Math.round(maxFileSize / 1024 / 1024)}MB 이하
        </span>
      </div>

      <div className="space-y-4">
        {/* 기존 첨부파일 */}
        {isEditMode && existingFiles.length > 0 && (
          <ExistingFileList files={existingFiles} onRemove={onExistingFileRemove} />
        )}

        {/* 새로 선택된 파일 */}
        {files.length > 0 && <NewFileList files={files} onRemove={onNewFileRemove} />}

        {/* ✅ 파일 업로드 영역 */}
        <div className="relative">
          <input
            type="file"
            id="file-upload"
            multiple
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            aria-label="파일 선택"
          />
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-primary-400 dark:hover:border-primary-500 rounded-lg px-6 py-8 text-center cursor-pointer transition-colors bg-slate-50 dark:bg-slate-800/50 hover:bg-primary-50 dark:hover:bg-primary-900/10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-slate-600 dark:text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  파일을 선택하거나 드래그하세요
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  현재: {totalFiles}/{maxFiles}개
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadSection;
