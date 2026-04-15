// client/src/store/siteSettings.ts
import { create } from 'zustand';

export interface SiteSettings {
  siteName: string;
  siteTitle: string;
  faviconUrl: string | null;
  logoUrl: string | null;
  description: string | null;
  allowRegistration: boolean;
  requireApproval: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  loginMessage: string | null;
  // ── 업로드 제한 ────────────────────────────────────────────────────────────
  maxFileCount: number;
  maxFileSizeMb: number;
  maxImageSizeMb: number;
  maxAvatarSizeMb: number;
  maxArchiveSizeMb: number;
  maxImageCount: number;
  allowedImageExtensions: string[];
  allowedDocumentExtensions: string[];
  allowedArchiveExtensions: string[];
  allowedMediaExtensions: string[];
  // ── 게시글 제한 ────────────────────────────────────────────────────────────
  postTitleMaxLength: number;
  postContentMaxLength: number;
  postSecretPasswordMinLength: number;
  // ── 계정 보안 ──────────────────────────────────────────────────────────────
  minPasswordLength: number;
  allowGuestComment: boolean;
  // ── 댓글 설정 ──────────────────────────────────────────────────────────────
  commentMaxDepth: number;
  commentMaxCount: number;
  // ── 아바타 처리 ────────────────────────────────────────────────────────────
  avatarSizePx: number;
  avatarQuality: number;
  // ── 에디터 설정 ────────────────────────────────────────────────────────────
  autoSaveIntervalSeconds: number;
  draftExpiryMinutes: number;
}

interface SiteSettingsStore {
  settings: SiteSettings;
  setSettings: (settings: SiteSettings) => void;
  updateSettings: (settings: Partial<SiteSettings>) => void;
}

export const useSiteSettings = create<SiteSettingsStore>(set => ({
  settings: {
    siteName: '마이홈',
    siteTitle: 'Secure Board App',
    faviconUrl: null,
    logoUrl: null,
    description: null,
    allowRegistration: true,
    requireApproval: false,
    maintenanceMode: false,
    maintenanceMessage: null,
    loginMessage: null,
    // 업로드 제한 기본값
    maxFileCount: 5,
    maxFileSizeMb: 100,
    maxImageSizeMb: 10,
    maxAvatarSizeMb: 5,
    maxArchiveSizeMb: 100,
    maxImageCount: 1,
    allowedImageExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.ico'],
    allowedDocumentExtensions: [
      '.pdf',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.ppt',
      '.pptx',
      '.txt',
      '.csv',
      '.rtf',
      '.odt',
      '.ods',
      '.odp',
      '.hwp',
    ],
    allowedArchiveExtensions: ['.zip', '.rar', '.7z', '.tar', '.gz'],
    allowedMediaExtensions: ['.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'],
    // 게시글 제한 기본값
    postTitleMaxLength: 200,
    postContentMaxLength: 500000,
    postSecretPasswordMinLength: 4,
    // 계정 보안 기본값
    minPasswordLength: 8,
    allowGuestComment: false,
    // 댓글 설정 기본값
    commentMaxDepth: 3,
    commentMaxCount: 1000,
    // 아바타 처리 기본값
    avatarSizePx: 200,
    avatarQuality: 90,
    // 에디터 설정 기본값
    autoSaveIntervalSeconds: 30,
    draftExpiryMinutes: 60,
  },
  setSettings: settings => set({ settings }),
  updateSettings: newSettings =>
    set(state => ({
      settings: { ...state.settings, ...newSettings },
    })),
}));
