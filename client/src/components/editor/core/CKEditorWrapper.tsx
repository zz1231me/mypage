// client/src/components/editor/core/CKEditorWrapper.tsx
// CKEditor 5 게시글 에디터 래퍼 컴포넌트

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  ClassicEditor,
  Alignment,
  AutoLink,
  BlockQuote,
  Bold,
  Code,
  CodeBlock,
  Essentials,
  FindAndReplace,
  FontBackgroundColor,
  FontColor,
  FontFamily,
  FontSize,
  Heading,
  Highlight,
  HorizontalLine,
  Image,
  ImageCaption,
  ImageResize,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  Indent,
  IndentBlock,
  Italic,
  Link,
  List,
  ListProperties,
  PageBreak,
  Paragraph,
  PasteFromOffice,
  RemoveFormat,
  SpecialCharacters,
  SpecialCharactersEssentials,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  TableCellProperties,
  TableColumnResize,
  TableProperties,
  TableToolbar,
  Underline,
  WordCount,
  type EditorConfig,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
import './CKEditorOverride.css';
import koTranslations from 'ckeditor5/translations/ko.js';

// Module-level ref for upload function.
// CKEditor plugins are instantiated once, so we use a module-level ref
// to avoid stale closure issues when the onImageUpload prop changes.
const uploadFnRef = {
  current: null as ((blob: Blob, callback: (url: string, alt?: string) => void) => void) | null,
};

class CKEditorUploadAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private loader: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(loader: any) {
    this.loader = loader;
  }
  upload(): Promise<{ default: string }> {
    return this.loader.file.then((file: File) => {
      return new Promise<{ default: string }>((resolve, reject) => {
        const fn = uploadFnRef.current;
        if (!fn) {
          reject(new Error('이미지 업로드 핸들러가 설정되지 않았습니다.'));
          return;
        }
        fn(file, (url: string) => resolve({ default: url }));
      });
    });
  }
  abort() {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function UploadAdapterPlugin(editor: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor.plugins.get('FileRepository').createUploadAdapter = (loader: any) => {
    return new CKEditorUploadAdapter(loader);
  };
}

interface CKEditorWrapperProps {
  onImageUpload: (blob: Blob, callback: (url: string, alt?: string) => void) => void;
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  editorRef?: React.MutableRefObject<CKEditorRef | null>;
}

export interface CKEditorRef {
  getInstance: () => {
    getContent: () => string;
    setContent: (content: string) => void;
    focus: () => void;
  };
}

// FileRepository is auto-included as a dependency of ImageUpload — do NOT add explicitly
const EDITOR_PLUGINS = [
  Essentials,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Subscript,
  Superscript,
  Alignment,
  Highlight,
  List,
  ListProperties,
  BlockQuote,
  CodeBlock,
  HorizontalLine,
  Link,
  AutoLink,
  Image,
  ImageCaption,
  ImageResize,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  PageBreak,
  SpecialCharacters,
  SpecialCharactersEssentials,
  Table,
  TableCellProperties,
  TableColumnResize,
  TableProperties,
  TableToolbar,
  FontColor,
  FontBackgroundColor,
  FontSize,
  FontFamily,
  PasteFromOffice,
  FindAndReplace,
  Indent,
  IndentBlock,
  RemoveFormat,
  WordCount,
];

const CKEditorWrapper: React.FC<CKEditorWrapperProps> = ({
  onImageUpload,
  initialContent = '',
  onChange,
  placeholder = '내용을 입력하세요...',
  editorRef,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorInstanceRef = useRef<any>(null);
  const [wordCount, setWordCount] = useState(0);

  // Keep module-level uploadFnRef up to date with the latest prop
  useEffect(() => {
    uploadFnRef.current = onImageUpload;
  }, [onImageUpload]);

  // Sync editorRef whenever it changes
  useEffect(() => {
    if (!editorRef) return;
    editorRef.current = {
      getInstance: () => ({
        getContent: () => editorInstanceRef.current?.getData() ?? '',
        setContent: (content: string) => editorInstanceRef.current?.setData(content),
        focus: () => editorInstanceRef.current?.editing?.view?.focus(),
      }),
    };
  }, [editorRef]);

  // Memoize config — recreated only when placeholder changes
  const editorConfig = useMemo<EditorConfig>(
    () => ({
      licenseKey: 'GPL',
      translations: [koTranslations],
      plugins: EDITOR_PLUGINS,
      extraPlugins: [UploadAdapterPlugin],
      toolbar: {
        items: [
          'undo',
          'redo',
          '|',
          'heading',
          '|',
          'fontFamily',
          'fontSize',
          '|',
          'bold',
          'italic',
          'underline',
          'strikethrough',
          'code',
          '|',
          'fontColor',
          'fontBackgroundColor',
          'highlight',
          '|',
          'subscript',
          'superscript',
          '|',
          'alignment',
          '|',
          'bulletedList',
          'numberedList',
          '|',
          'outdent',
          'indent',
          '|',
          'blockQuote',
          'codeBlock',
          '|',
          'link',
          'uploadImage',
          'insertTable',
          '|',
          'specialCharacters',
          'horizontalLine',
          'pageBreak',
          '|',
          'removeFormat',
          'findAndReplace',
        ],
        shouldNotGroupWhenFull: true,
      },
      heading: {
        options: [
          { model: 'paragraph', title: '본문', class: 'ck-heading_paragraph' },
          { model: 'heading1', view: 'h1', title: '제목 1', class: 'ck-heading_heading1' },
          { model: 'heading2', view: 'h2', title: '제목 2', class: 'ck-heading_heading2' },
          { model: 'heading3', view: 'h3', title: '제목 3', class: 'ck-heading_heading3' },
          { model: 'heading4', view: 'h4', title: '제목 4', class: 'ck-heading_heading4' },
          { model: 'heading5', view: 'h5', title: '제목 5', class: 'ck-heading_heading5' },
        ],
      },
      image: {
        toolbar: [
          'imageStyle:inline',
          'imageStyle:wrapText',
          'imageStyle:breakText',
          '|',
          'toggleImageCaption',
          'imageTextAlternative',
          '|',
          'resizeImage',
        ],
      },
      table: {
        contentToolbar: [
          'tableColumn',
          'tableRow',
          'mergeTableCells',
          'tableProperties',
          'tableCellProperties',
        ],
      },
      placeholder,
      link: {
        defaultProtocol: 'https://',
        addTargetToExternalLinks: true,
        decorators: {
          isExternal: {
            mode: 'automatic',
            callback: (url: string | null) => url !== null && /^(https?:)?\/\//.test(url),
            attributes: { target: '_blank', rel: 'noopener noreferrer' },
          },
        },
      },
      fontFamily: {
        options: [
          'default',
          'Pretendard Variable, Pretendard, sans-serif',
          '맑은 고딕, Malgun Gothic, sans-serif',
          '나눔고딕, NanumGothic, sans-serif',
          '나눔명조, NanumMyeongjo, serif',
          'Arial, sans-serif',
          'Georgia, serif',
          'Courier New, monospace',
          'Times New Roman, serif',
          'Verdana, sans-serif',
        ],
        supportAllValues: false,
      },
      fontSize: {
        options: [9, 10, 11, 12, 14, 'default', 18, 20, 22, 24, 28, 32, 36, 48],
        supportAllValues: false,
      },
      highlight: {
        options: [
          {
            model: 'yellowMarker',
            class: 'marker-yellow',
            title: '노랑',
            color: 'var(--ck-highlight-marker-yellow)',
            type: 'marker',
          },
          {
            model: 'greenMarker',
            class: 'marker-green',
            title: '초록',
            color: 'var(--ck-highlight-marker-green)',
            type: 'marker',
          },
          {
            model: 'pinkMarker',
            class: 'marker-pink',
            title: '분홍',
            color: 'var(--ck-highlight-marker-pink)',
            type: 'marker',
          },
          {
            model: 'blueMarker',
            class: 'marker-blue',
            title: '파랑',
            color: 'var(--ck-highlight-marker-blue)',
            type: 'marker',
          },
          {
            model: 'redPen',
            class: 'pen-red',
            title: '빨강',
            color: 'var(--ck-highlight-pen-red)',
            type: 'pen',
          },
          {
            model: 'greenPen',
            class: 'pen-green',
            title: '초록펜',
            color: 'var(--ck-highlight-pen-green)',
            type: 'pen',
          },
        ],
      },
      codeBlock: {
        languages: [
          { language: 'plaintext', label: '텍스트' },
          { language: 'javascript', label: 'JavaScript' },
          { language: 'typescript', label: 'TypeScript' },
          { language: 'html', label: 'HTML' },
          { language: 'css', label: 'CSS' },
          { language: 'python', label: 'Python' },
          { language: 'java', label: 'Java' },
          { language: 'csharp', label: 'C#' },
          { language: 'cpp', label: 'C++' },
          { language: 'php', label: 'PHP' },
          { language: 'sql', label: 'SQL' },
          { language: 'json', label: 'JSON' },
          { language: 'bash', label: 'Bash' },
          { language: 'xml', label: 'XML' },
          { language: 'markdown', label: 'Markdown' },
        ],
      },
      list: {
        properties: {
          styles: true,
          startIndex: true,
          reversed: true,
        },
      },
      wordCount: {
        onUpdate: (stats: { characters: number; words: number }) => {
          setWordCount(stats.characters);
        },
      },
    }),
    [placeholder]
  );

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
        내용
      </label>
      <div className="ck-editor-wrapper post-ck-editor-wrapper">
        <CKEditor
          editor={ClassicEditor}
          config={editorConfig}
          data={initialContent}
          onReady={editor => {
            editorInstanceRef.current = editor;
          }}
          onChange={(_event, editor) => {
            if (onChange) {
              onChange(editor.getData());
            }
          }}
          onError={error => {
            if (import.meta.env.DEV) console.error('CKEditor error:', error);
          }}
        />
      </div>
      {wordCount > 0 && (
        <p className="mt-1 text-right text-xs text-slate-400 dark:text-slate-500 select-none">
          {wordCount.toLocaleString()} 자
        </p>
      )}
    </div>
  );
};

export default CKEditorWrapper;
