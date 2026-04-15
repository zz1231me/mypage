// client/src/components/editor/NewFileList.tsx - Primary 색상 적용
import React from 'react';
import FileIcon from '../../FileIcon';
import { getFileType, formatFileSize } from '../../../utils/fileUtils';

interface NewFileListProps {
  files: File[];
  onRemove: (index: number) => void;
}

const NewFileList: React.FC<NewFileListProps> = ({ files, onRemove }) => {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
        새로 선택된 파일 ({files.length}개)
      </h4>

      <div className="space-y-2">
        {files.map((file, index) => {
          const fileType = getFileType(file.name);

          return (
            <div
              key={`new-${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between p-3 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-8 h-8 bg-primary-500 dark:bg-primary-600 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                  <FileIcon fileType={fileType} className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate"
                    title={file.name}
                  >
                    {file.name}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {formatFileSize(file.size)} • {fileType} 파일
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="ml-3 flex-shrink-0 w-7 h-7 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 rounded-full flex items-center justify-center text-white transition-colors"
                title="파일 제거"
                aria-label={`${file.name} 제거`}
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NewFileList;
