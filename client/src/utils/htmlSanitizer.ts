// client/src/utils/htmlSanitizer.ts - HTML 콘텐츠 안전화
import DOMPurify from 'dompurify';

// Safe CSS property allowlist for inline style sanitization
const SAFE_CSS_PROPS = new Set([
  'color',
  'background-color',
  'font-size',
  'font-family',
  'text-align',
  'text-decoration',
  'width',
  'height',
  'border',
  'border-collapse',
  'border-spacing',
  'border-color',
  'border-width',
  'border-style',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'vertical-align',
  'float',
  'min-width',
  'max-width',
  'min-height',
  'max-height',
  'line-height',
  'letter-spacing',
  'word-spacing',
  'font-weight',
  'font-style',
  'text-indent',
  'white-space',
]);

const DANGEROUS_CSS_VALUES = /javascript:|expression\s*\(|url\s*\(/i;

// Sanitize inline style attributes — only allow safe CSS properties and values
function sanitizeStyleAttr(node: Element): void {
  const style = node.getAttribute('style');
  if (!style) return;

  const safe = style
    .split(';')
    .map(s => s.trim())
    .filter(s => {
      if (!s) return false;
      const colonIdx = s.indexOf(':');
      if (colonIdx === -1) return false;
      const prop = s.slice(0, colonIdx).trim().toLowerCase();
      const value = s
        .slice(colonIdx + 1)
        .trim()
        .toLowerCase();
      return SAFE_CSS_PROPS.has(prop) && !DANGEROUS_CSS_VALUES.test(value);
    })
    .join('; ');

  if (safe) {
    node.setAttribute('style', safe);
  } else {
    node.removeAttribute('style');
  }
}

// <a> 태그 보안 속성 강제 적용 + 인라인 style 정화
DOMPurify.addHook('afterSanitizeAttributes', node => {
  if (node.tagName === 'A') {
    node.setAttribute('rel', 'noopener noreferrer');
    node.setAttribute('target', '_blank');
  }
  if (node.hasAttribute('style')) {
    sanitizeStyleAttr(node as Element);
  }
});

interface SanitizeOptions {
  ALLOWED_TAGS?: string[];
  ALLOWED_ATTR?: string[];
  ALLOW_DATA_ATTR?: boolean;
  KEEP_CONTENT?: boolean;
}

// ✅ 기본 허용 태그 및 속성 (CKEditor 5 출력 기준)
const defaultOptions: SanitizeOptions = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'em',
    'u',
    's',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'ul',
    'ol',
    'li',
    'blockquote',
    'a',
    'img',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'td',
    'th',
    'caption',
    'colgroup',
    'col',
    'code',
    'pre',
    'span',
    'div',
    'figure',
    'figcaption', // CKEditor wraps tables and images in <figure>
    'sub',
    'sup',
    'hr',
    'mark', // CKEditor Highlight 플러그인: <mark class="marker-yellow"> 등
  ],
  ALLOWED_ATTR: [
    'href',
    'src',
    'alt',
    'title',
    'width',
    'height',
    'class',
    'style',
    'rowspan',
    'colspan',
    'target',
    'rel',
    'data-figure-type', // CKEditor figure metadata
  ],
  ALLOW_DATA_ATTR: false,
  KEEP_CONTENT: true,
};

/**
 * HTML 콘텐츠를 안전하게 정화
 * @param dirty 정화할 HTML 문자열
 * @param options 정화 옵션
 * @returns 안전한 HTML 문자열
 */
export function sanitizeHTML(dirty: string, options: SanitizeOptions = {}): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  const config = { ...defaultOptions, ...options };

  const sanitized = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: config.ALLOWED_TAGS,
    ALLOWED_ATTR: config.ALLOWED_ATTR,
    ALLOW_DATA_ATTR: config.ALLOW_DATA_ATTR,
    KEEP_CONTENT: config.KEEP_CONTENT,

    FORBID_CONTENTS: ['script', 'style'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    // Note: 'style' attribute is allowed but sanitized via the afterSanitizeAttributes hook
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur'],
    SAFE_FOR_TEMPLATES: true,

    ALLOW_UNKNOWN_PROTOCOLS: false,
    SANITIZE_DOM: true,
  });

  return sanitized;
}

/**
 * 댓글용 HTML 정화 — CKEditor 댓글 에디터 출력 기준
 * (이미지·표·style 속성 불허, 기본 서식 + 목록 + 코드 허용)
 */
export function sanitizeCommentHTML(dirty: string): string {
  return sanitizeHTML(dirty, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      's',
      'a',
      'code',
      'pre',
      'ul',
      'ol',
      'li',
      'blockquote',
      'span',
      'sub',
      'sup',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * 텍스트만 추출 (모든 HTML 태그 제거)
 */
export function stripHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  });
}

/**
 * URL 유효성 검증
 */
export function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
