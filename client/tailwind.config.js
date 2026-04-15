/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // ── Primary: Indigo-Blue ──────────────────────────────────
      // 순수 Tailwind blue보다 한 단계 프리미엄.
      // Linear, Clerk, Supabase 등 현대 SaaS 제품의 색상 계열.
      colors: {
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',   // 포커스 링, 강조
          600: '#4f46e5',   // 버튼 · 주요 액션 (WCAG AA ✓ 5.1:1)
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },

        // ── Secondary: Violet ──────────────────────────────────
        secondary: {
          50:  '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },

        // ── Neutral: Slate ─────────────────────────────────────
        // dark:bg-gray-* 대신 dark:bg-slate-* 사용 권장.
        // Indigo primary와 자연스럽게 어울리는 차가운 중립 계열.
        // (Tailwind 기본 slate와 동일 — 명시적 alias)
        neutral: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          850: '#172032',   // 다크모드 카드 배경 (Tailwind 없는 커스텀)
          900: '#0f172a',
          950: '#020617',
        },
      },

      // ── Typography ────────────────────────────────────────────
      fontSize: {
        // 가독성 우선 — 기존보다 1~2px 업
        'xs':   ['0.8125rem', { lineHeight: '1.3125rem' }],  // 13px / 21px (was 12/18)
        'sm':   ['0.9375rem', { lineHeight: '1.5625rem' }],  // 15px / 25px (was 14/22)
        'base': ['1rem',      { lineHeight: '1.625rem'  }],  // 16px / 26px (keep)
        'lg':   ['1.125rem',  { lineHeight: '1.75rem'   }],  // 18px / 28px (keep)
        'xl':   ['1.25rem',   { lineHeight: '1.875rem'  }],  // 20px / 30px (keep)
        '2xl':  ['1.5rem',    { lineHeight: '2rem'      }],  // 24px / 32px (keep)
        '3xl':  ['1.875rem',  { lineHeight: '2.375rem'  }],  // 30px / 38px (keep)
        '4xl':  ['2.25rem',   { lineHeight: '2.75rem'   }],  // 36px / 44px (keep)
      },

      // ── Box Shadow ────────────────────────────────────────────
      // 불투명도 낮춤 — 더 정제된 elevation 느낌
      boxShadow: {
        'xs':      '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'sm':      '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'DEFAULT': '0 2px 4px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'md':      '0 4px 8px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'lg':      '0 10px 20px -3px rgb(0 0 0 / 0.08), 0 4px 8px -4px rgb(0 0 0 / 0.04)',
        'xl':      '0 20px 30px -5px rgb(0 0 0 / 0.08), 0 8px 12px -6px rgb(0 0 0 / 0.04)',
        '2xl':     '0 25px 50px -12px rgb(0 0 0 / 0.18)',
        'none':    'none',
      },

      // ── Border Radius ─────────────────────────────────────────
      // design-system.css 변수와 완전 동기화
      borderRadius: {
        'sm':      '0.25rem',    // 4px
        'DEFAULT': '0.375rem',   // 6px
        'md':      '0.5rem',     // 8px  ← 버튼, 인풋
        'lg':      '0.75rem',    // 12px ← 카드
        'xl':      '1rem',       // 16px ← 드롭다운
        '2xl':     '1.5rem',     // 24px ← 모달
        '3xl':     '2rem',       // 32px
      },

      // ── Transition Duration ───────────────────────────────────
      transitionDuration: {
        DEFAULT: '200ms',
        '75':  '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
        '500': '500ms',
      },

      // ── Font Family ───────────────────────────────────────────
      fontFamily: {
        sans: [
          'Pretendard Variable', 'Pretendard',
          '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto',
          'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo',
          'Noto Sans KR', 'Malgun Gothic', 'sans-serif',
        ],
        mono: [
          'JetBrains Mono', 'Fira Code', 'Cascadia Code',
          'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco',
          'Consolas', 'Liberation Mono', 'Courier New', 'monospace',
        ],
      },

      // ── Spacing extras ────────────────────────────────────────
      spacing: {
        '4.5': '1.125rem',   // 18px — w-4.5, h-4.5 등 중간 크기
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
      },

      // ── Ring (focus) ──────────────────────────────────────────
      ringColor: {
        DEFAULT: '#6366f1',   // primary-500
      },
      ringOpacity: {
        DEFAULT: '0.5',
      },
    },
  },
  plugins: [],
};
