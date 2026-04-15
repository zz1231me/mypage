// server/src/utils/tiptapRenderer.ts
// ✅ Tiptap JSON을 HTML로 변환하는 유틸리티 (서버사이드) - 개선 버전
import { logInfo } from './logger';

export interface TiptapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  marks?: Array<{
    type: string;
    attrs?: Record<string, any>;
  }>;
  text?: string;
}

export interface TiptapDocument {
  type: 'doc';
  content?: TiptapNode[];
}

// ✅ 콘텐츠를 HTML로 변환 — Tiptap JSON 및 CKEditor HTML 모두 지원
export function renderTiptapToHTML(json: string | TiptapDocument): string {
  try {
    // If it's already an HTML string (CKEditor), return it as-is
    if (typeof json === 'string') {
      const trimmed = json.trimStart();
      if (trimmed.startsWith('<') || trimmed === '') {
        return json;
      }
      // Try to parse as Tiptap JSON
      const doc = JSON.parse(json) as TiptapDocument;
      if (!doc || doc.type !== 'doc') {
        return json; // Unknown format — return as-is
      }
      return renderNodes(doc.content || []);
    }
    // TiptapDocument object
    const doc = json as TiptapDocument;
    if (!doc || doc.type !== 'doc') {
      return '<p>잘못된 문서 형식입니다.</p>';
    }
    return renderNodes(doc.content || []);
  } catch {
    // JSON parse failed — content is likely HTML
    return typeof json === 'string' ? json : '<p>문서를 렌더링할 수 없습니다.</p>';
  }
}

// ✅ 노드 배열을 HTML로 변환
function renderNodes(nodes: TiptapNode[]): string {
  return nodes.map(node => renderNode(node)).join('');
}

// ✅ 개별 노드를 HTML로 변환 (스타일링 개선)
function renderNode(node: TiptapNode): string {
  const { type, attrs = {}, content = [], marks = [], text } = node;

  switch (type) {
    case 'paragraph': {
      const allowedAligns = ['left', 'center', 'right', 'justify'];
      const safeAlign =
        attrs.textAlign && allowedAligns.includes(attrs.textAlign) ? attrs.textAlign : null;
      const pAttrs = safeAlign ? ` style="text-align: ${safeAlign}"` : '';
      const pContent = renderNodes(content);
      // 빈 단락 처리
      return `<p${pAttrs}>${pContent || ''}</p>`;
    }

    case 'heading': {
      const allowedAligns = ['left', 'center', 'right', 'justify'];
      const safeAlign =
        attrs.textAlign && allowedAligns.includes(attrs.textAlign) ? attrs.textAlign : null;
      const level = Math.min(6, Math.max(1, attrs.level || 1));
      const hAttrs = safeAlign ? ` style="text-align: ${safeAlign}"` : '';
      return `<h${level}${hAttrs}>${renderNodes(content)}</h${level}>`;
    }

    case 'text':
      if (!text) return '';

      // 마크 적용 (중첩 순서 중요)
      let result = escapeHtml(text);
      marks.forEach(mark => {
        switch (mark.type) {
          case 'bold':
            result = `<strong>${result}</strong>`;
            break;
          case 'italic':
            result = `<em>${result}</em>`;
            break;
          case 'strike':
            result = `<s>${result}</s>`;
            break;
          case 'code':
            // 인라인 코드 스타일링 개선
            result = `<code class="inline-code">${result}</code>`;
            break;
          case 'link': {
            const href = mark.attrs?.href || '#';
            const rawTarget = mark.attrs?.target || '_blank';
            const safeTarget = rawTarget === '_self' ? '_self' : '_blank';
            result = `<a href="${escapeHtml(href)}" target="${safeTarget}" rel="noopener noreferrer">${result}</a>`;
            break;
          }
          case 'highlight':
            // ✅ null 체크 및 기본값 적용
            let bgColor = mark.attrs?.color;
            if (bgColor === null || bgColor === undefined || bgColor === '') {
              bgColor = '#ffff00'; // 기본 노란색
            }
            result = `<mark style="background-color: ${escapeHtml(bgColor)}; padding: 2px 4px; border-radius: 2px;">${result}</mark>`;
            break;
          case 'superscript':
            result = `<sup>${result}</sup>`;
            break;
          case 'subscript':
            result = `<sub>${result}</sub>`;
            break;
        }
      });
      return result;

    case 'hardBreak':
      return '<br>';

    case 'bulletList':
      return `<ul style="list-style-type: disc; margin-left: 20px; margin-bottom: 16px;">${renderNodes(content)}</ul>`;

    case 'orderedList': {
      const rawStart = parseInt(String(attrs.start ?? ''), 10);
      const safeStart = Number.isFinite(rawStart) && rawStart > 0 ? rawStart : null;
      const startAttr = safeStart !== null ? ` start="${safeStart}"` : '';
      return `<ol${startAttr} style="list-style-type: decimal; margin-left: 20px; margin-bottom: 16px;">${renderNodes(content)}</ol>`;
    }

    case 'listItem':
      return `<li style="margin-bottom: 4px;">${renderNodes(content)}</li>`;

    case 'blockquote':
      return `<blockquote style="border-left: 4px solid #3B82F6; background-color: rgba(59, 130, 246, 0.1); padding: 12px 16px; margin: 16px 0; font-style: italic;">${renderNodes(content)}</blockquote>`;

    case 'codeBlock':
      const language = attrs.language || '';
      const langClass = language ? ` class="language-${escapeHtml(language)}"` : '';
      const codeContent = renderNodes(content);
      return `<pre style="background-color: #1f2937; color: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; border: 1px solid #374151;"><code${langClass}>${codeContent}</code></pre>`;

    case 'horizontalRule':
      return '<hr style="border: 0; border-top: 1px solid #d1d5db; margin: 24px 0;">';

    case 'image':
      const src = attrs.src || '';
      const alt = attrs.alt || '';
      const title = attrs.title || '';
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${titleAttr} style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); margin: 16px auto; display: block; border: 1px solid #e5e7eb;">`;

    default:
      // 알 수 없는 노드 타입의 경우 콘텐츠만 렌더링
      logInfo(`알 수 없는 노드 타입: ${type}`);
      return renderNodes(content);
  }
}

// ✅ HTML 이스케이프 함수
function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';

  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return text.replace(/[&<>"']/g, match => htmlEscapes[match] || match);
}

// ✅ 텍스트 요약 생성 (검색 결과용) — Tiptap JSON 및 CKEditor HTML 모두 지원
export function extractTextFromTiptap(
  json: string | TiptapDocument,
  maxLength: number = 200
): string {
  try {
    let doc: TiptapDocument | null = null;

    if (typeof json === 'string') {
      try {
        const parsed = JSON.parse(json);
        if (parsed && parsed.type === 'doc') {
          doc = parsed;
        }
      } catch {
        // Not JSON — treat as HTML below
      }
    } else if (json && (json as TiptapDocument).type === 'doc') {
      doc = json as TiptapDocument;
    }

    let text: string;
    if (doc) {
      // Tiptap JSON path
      text = extractText(doc.content || []);
    } else {
      // CKEditor HTML path — strip tags
      const html = typeof json === 'string' ? json : '';
      text = html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  } catch {
    return '';
  }
}

// ✅ 노드에서 텍스트만 추출
function extractText(nodes: TiptapNode[]): string {
  let result = '';

  for (const node of nodes) {
    if (node.type === 'text' && node.text) {
      result += node.text;
    } else if (node.content) {
      result += extractText(node.content);
    }

    // 블록 노드 뒤에 공백 추가
    if (['paragraph', 'heading', 'listItem'].includes(node.type)) {
      result += ' ';
    }
  }

  return result.replace(/\s+/g, ' ').trim();
}

// ✅ JSON 콘텐츠 유효성 검사
export function validateTiptapJSON(json: string): { isValid: boolean; error?: string } {
  try {
    const parsed = JSON.parse(json);

    if (!parsed || typeof parsed !== 'object') {
      return { isValid: false, error: '유효하지 않은 JSON 객체입니다.' };
    }

    if (parsed.type !== 'doc') {
      return { isValid: false, error: '문서 타입이 올바르지 않습니다.' };
    }

    if (parsed.content && !Array.isArray(parsed.content)) {
      return { isValid: false, error: '콘텐츠가 배열 형태가 아닙니다.' };
    }

    return { isValid: true };
  } catch (_error) {
    return { isValid: false, error: 'JSON 파싱에 실패했습니다.' };
  }
}

export default {
  renderTiptapToHTML,
  extractTextFromTiptap,
  validateTiptapJSON,
};
