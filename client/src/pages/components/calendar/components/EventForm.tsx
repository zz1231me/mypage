// client/src/pages/components/calendar/components/EventForm.tsx
import React, { useMemo } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  ClassicEditor,
  Alignment,
  AutoLink,
  BlockQuote,
  Bold,
  Essentials,
  FontColor,
  Heading,
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
  Paragraph,
  PasteFromOffice,
  RemoveFormat,
  Strikethrough,
  Underline,
  type EditorConfig,
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';
import '../../../../components/editor/core/CKEditorOverride.css';
import koTranslations from 'ckeditor5/translations/ko.js';
import { EventFormData } from '../types';
import { categories } from '../constants';

// 모듈 레벨 업로드 어댑터 (CKEditorWrapper와 동일한 패턴)
class EventImageUploadAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private loader: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(loader: any) {
    this.loader = loader;
  }
  upload(): Promise<{ default: string }> {
    return this.loader.file.then((file: File) => {
      return new Promise<{ default: string }>((resolve, reject) => {
        const formData = new FormData();
        formData.append('image', file);
        fetch('/api/uploads/images', {
          method: 'POST',
          credentials: 'include',
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
          body: formData,
        })
          .then(res => res.json())
          .then(data => {
            const url = data?.data?.imageUrl ?? data?.data?.url ?? data?.imageUrl;
            if (url) resolve({ default: url });
            else reject(new Error('이미지 업로드 실패'));
          })
          .catch(reject);
      });
    });
  }
  abort() {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EventUploadAdapterPlugin(editor: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor.plugins.get('FileRepository').createUploadAdapter = (loader: any) =>
    new EventImageUploadAdapter(loader);
}

/* ── 플러그인 (이미지 업로드 포함) ── */
const EVENT_PLUGINS = [
  Essentials,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  FontColor,
  Alignment,
  Link,
  AutoLink,
  Image,
  ImageCaption,
  ImageResize,
  ImageStyle,
  ImageToolbar,
  ImageUpload,
  List,
  ListProperties,
  Indent,
  IndentBlock,
  BlockQuote,
  PasteFromOffice,
  RemoveFormat,
];

/*
 * 툴바: shouldNotGroupWhenFull: true → 넘치면 줄바꿈 (점점점 X)
 * 아이템을 두 줄에 나눠 표시되도록 구성
 */
const EVENT_TOOLBAR_ITEMS = [
  'undo',
  'redo',
  '|',
  'heading',
  '|',
  'bold',
  'italic',
  'underline',
  'strikethrough',
  '|',
  'fontColor',
  'alignment',
  '|',
  'bulletedList',
  'numberedList',
  'outdent',
  'indent',
  '|',
  'link',
  'insertImage',
  'blockQuote',
  '|',
  'removeFormat',
];

const EVENT_LINK_CONFIG = {
  defaultProtocol: 'https://',
  addTargetToExternalLinks: true,
  decorators: {
    isExternal: {
      mode: 'automatic' as const,
      callback: (url: string | null) => url !== null && /^(https?:)?\/\//.test(url),
      attributes: { target: '_blank', rel: 'noopener noreferrer' },
    },
  },
};

interface EventFormProps {
  formData: EventFormData;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<EventFormData>) => void;
  onCancel: () => void;
  mode: 'create' | 'edit';
  submitting?: boolean;
}

// 공통 input 클래스
const inputCls = [
  'block w-full px-3.5 py-2.5 rounded-lg text-base',
  'border border-slate-300 dark:border-slate-600',
  'bg-white dark:bg-slate-800',
  'text-slate-900 dark:text-slate-100',
  'placeholder:text-slate-400 dark:placeholder:text-slate-500',
  'focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500',
  'transition-all duration-150',
].join(' ');

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

export const EventForm: React.FC<EventFormProps> = ({
  formData,
  onSubmit,
  onChange,
  onCancel,
  mode,
  submitting = false,
}) => {
  const editorConfig = useMemo<EditorConfig>(
    () => ({
      licenseKey: 'GPL',
      translations: [koTranslations],
      plugins: EVENT_PLUGINS,
      extraPlugins: [EventUploadAdapterPlugin],
      toolbar: {
        items: EVENT_TOOLBAR_ITEMS,
        shouldNotGroupWhenFull: true,
      },
      heading: {
        options: [
          { model: 'paragraph', title: '본문', class: 'ck-heading_paragraph' },
          { model: 'heading2', view: 'h2', title: '제목 1', class: 'ck-heading_heading2' },
          { model: 'heading3', view: 'h3', title: '제목 2', class: 'ck-heading_heading3' },
        ],
      },
      list: { properties: { styles: true, startIndex: true, reversed: true } },
      link: EVENT_LINK_CONFIG,
      image: {
        toolbar: ['imageStyle:inline', 'imageStyle:block', '|', 'imageTextAlternative'],
        styles: { options: ['inline', 'block', 'side'] },
      },
      placeholder: '일정에 대한 메모나 설명을 입력하세요 (선택사항)',
    }),
    []
  );

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* 일정 종류 */}
      <div>
        <FieldLabel required>일정 종류</FieldLabel>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {categories.map(category => {
            const isSelected = formData.category === category.key;
            return (
              <button
                key={category.key}
                type="button"
                onClick={() => {
                  let newTitle = formData.title.replace(/^\[.*?\]\s*/, '').trim();
                  newTitle = newTitle ? `[${category.label}] ${newTitle}` : `[${category.label}] `;
                  onChange({
                    category: category.key,
                    title: newTitle,
                    color: category.bg,
                    backgroundColor: category.bg,
                  });
                }}
                className={`
                  relative flex flex-col items-center justify-center gap-1.5
                  px-2 py-3 rounded-xl border-2
                  transition-all duration-150
                  ${
                    isSelected
                      ? 'border-current font-semibold shadow-md scale-[1.04]'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                  }
                `}
                style={
                  isSelected
                    ? {
                        backgroundColor: category.bg,
                        borderColor: category.border,
                        color: category.textColor,
                      }
                    : undefined
                }
              >
                <span className="text-lg leading-none">{category.emoji}</span>
                <span className="text-xs leading-tight font-semibold whitespace-nowrap">
                  {category.label}
                </span>
                {isSelected && (
                  <div
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 rounded-full
                                  flex items-center justify-center shadow-sm"
                  >
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        {!formData.category && (
          <p className="mt-2 text-sm text-red-500 dark:text-red-400 flex items-center gap-1.5">
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            일정 종류를 선택해주세요
          </p>
        )}
      </div>

      {/* 제목 */}
      <div>
        <FieldLabel required>제목</FieldLabel>
        <input
          type="text"
          value={formData.title}
          onChange={e => onChange({ title: e.target.value })}
          className={inputCls}
          placeholder="일정 제목을 입력하세요"
          required
        />
      </div>

      {/* 날짜 */}
      <div>
        <FieldLabel required>일정 날짜</FieldLabel>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              시작일
            </p>
            <input
              type="date"
              value={formData.start}
              onChange={e => {
                const newStart = e.target.value;
                onChange({
                  start: newStart,
                  end: newStart > formData.end ? newStart : formData.end,
                });
              }}
              onClick={e => e.currentTarget.showPicker?.()}
              className={`${inputCls} cursor-pointer`}
              required
            />
          </div>
          <div className="flex-shrink-0 pb-3 text-slate-300 dark:text-slate-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
              종료일
            </p>
            <input
              type="date"
              value={formData.end}
              min={formData.start}
              onChange={e => onChange({ end: e.target.value })}
              onClick={e => e.currentTarget.showPicker?.()}
              className={`${inputCls} cursor-pointer`}
              required
            />
          </div>
        </div>
      </div>

      {/* 장소 */}
      <div>
        <FieldLabel>장소</FieldLabel>
        <div className="relative">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
            <svg
              className="w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={formData.location || ''}
            onChange={e => onChange({ location: e.target.value })}
            className={`${inputCls} pl-10`}
            placeholder="장소를 입력하세요 (선택사항)"
          />
        </div>
      </div>

      {/* 상세 내용 — CKEditor */}
      <div>
        <FieldLabel>상세 내용</FieldLabel>
        <div
          className="event-ck-editor-wrapper rounded-lg overflow-hidden
                        border border-slate-200 dark:border-slate-700"
        >
          <CKEditor
            editor={ClassicEditor}
            config={editorConfig}
            data={formData.body}
            onChange={(_, editor) => {
              onChange({ body: editor.getData() });
            }}
          />
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 inline-flex items-center justify-center gap-2
                     px-4 py-2.5 rounded-lg text-sm font-semibold
                     bg-primary-600 hover:bg-primary-700 active:bg-primary-800
                     text-white shadow-sm
                     transition-all duration-150 active:scale-[0.98]
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              저장 중…
            </>
          ) : mode === 'create' ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              일정 생성
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              수정 완료
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2.5 rounded-lg text-sm font-medium
                     text-slate-600 dark:text-slate-400
                     bg-slate-100 dark:bg-slate-800
                     hover:bg-slate-200 dark:hover:bg-slate-700
                     hover:text-slate-800 dark:hover:text-slate-200
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors duration-150"
        >
          취소
        </button>
      </div>
    </form>
  );
};
