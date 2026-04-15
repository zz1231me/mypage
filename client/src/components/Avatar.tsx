// client/src/components/Avatar.tsx - 완전 최적화 버전
import React, { useState } from 'react';

interface User {
  id: string;
  name: string;
  avatar?: string | null;
}

interface AvatarProps {
  user: User;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'gradient' | 'solid' | 'muted';
  className?: string;
  showTooltip?: boolean;
}

const sizeClasses = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-10 h-10 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-20 h-20 text-xl',
};

const variantClasses = {
  gradient: 'bg-gradient-to-br from-blue-500 to-purple-600 text-white',
  solid: 'bg-blue-500 text-white',
  muted: 'bg-slate-400 dark:bg-slate-600 text-slate-100', // ✅ 삭제된 계정용 음소거 스타일
};

// 색상 해시 함수 (일관된 색상 생성)
const generateColorFromName = (name: string): string => {
  if (!name) return variantClasses.gradient;

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 32비트 정수로 변환
  }

  const colors = [
    'bg-gradient-to-br from-emerald-500 to-teal-500 text-white',
    'bg-gradient-to-br from-blue-500 to-cyan-500 text-white',
    'bg-gradient-to-br from-purple-500 to-pink-500 text-white',
    'bg-gradient-to-br from-orange-500 to-red-500 text-white',
    'bg-gradient-to-br from-green-500 to-lime-500 text-white',
    'bg-gradient-to-br from-indigo-500 to-purple-500 text-white',
    'bg-gradient-to-br from-pink-500 to-rose-500 text-white',
    'bg-gradient-to-br from-yellow-500 to-orange-500 text-white',
    'bg-gradient-to-br from-teal-500 to-green-500 text-white',
    'bg-gradient-to-br from-cyan-500 to-blue-500 text-white',
  ];

  return colors[Math.abs(hash) % colors.length];
};

export const Avatar: React.FC<AvatarProps> = React.memo(
  ({ user, size = 'md', variant = 'gradient', className = '', showTooltip = true }) => {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    // ✅ 아바타 URL 메모이제이션 - 사용자 ID나 아바타 URL이 변경될 때만 새로고침
    const avatarUrl = React.useMemo(() => {
      if (!user.avatar || imageError) return null;

      // ✅ XSS 방지: javascript: / data: 프로토콜 차단
      const trimmed = user.avatar.trim().toLowerCase();
      if (
        trimmed.startsWith('javascript:') ||
        trimmed.startsWith('data:text') ||
        trimmed.startsWith('vbscript:')
      ) {
        return null;
      }

      // http/https 또는 상대경로만 허용
      const isAbsolute = trimmed.startsWith('http://') || trimmed.startsWith('https://');
      const isRelative = trimmed.startsWith('/') || trimmed.startsWith('./');
      if (!isAbsolute && !isRelative) return null;

      const baseUrl = user.avatar;

      // ✅ 사용자별 고유 식별자로 캐시 버스팅 (매번 새로고침 방지)
      const cacheKey = btoa(`${user.id}_${user.avatar}`).replace(/[^a-zA-Z0-9]/g, '');
      const separator = baseUrl.includes('?') ? '&' : '?';

      return `${baseUrl}${separator}v=${cacheKey}`;
    }, [user.id, user.avatar, imageError]);

    const getInitials = React.useCallback((name: string): string => {
      if (!name || name.trim() === '') return '?';

      // 삭제된 계정 처리
      if (name.startsWith('삭제된계정_')) {
        return '🗑️';
      }

      // 한글, 영문, 숫자 등을 모두 처리
      const words = name.trim().split(/\s+/);

      if (words.length === 1) {
        const word = words[0];
        // 한글인 경우 첫 글자만
        if (/[가-힣]/.test(word)) {
          return word.charAt(0);
        }
        // 영문인 경우 첫 두 글자
        if (/[a-zA-Z]/.test(word)) {
          return word.substring(0, 2).toUpperCase();
        }
        // 기타 (숫자, 특수문자)
        return word.charAt(0);
      }

      // 여러 단어인 경우 각 단어의 첫 글자
      return words
        .slice(0, 2)
        .map(word => {
          if (/[가-힣]/.test(word)) return word.charAt(0);
          if (/[a-zA-Z]/.test(word)) return word.charAt(0).toUpperCase();
          return word.charAt(0);
        })
        .join('');
    }, []);

    const initials = React.useMemo(() => getInitials(user.name), [user.name, getInitials]);

    // 공통 클래스 메모이제이션
    const baseClasses = React.useMemo(
      () => `
    ${sizeClasses[size]}
    rounded-lg
    flex 
    items-center 
    justify-center 
    font-semibold 
    select-none
    transition-all
    duration-200
    flex-shrink-0
    ${className}
  `,
      [size, className]
    );

    const handleImageError = React.useCallback(() => {
      if (import.meta.env.DEV) console.warn('⚠️ 아바타 이미지 로드 실패:', user.avatar);
      setImageError(true);
      setImageLoaded(false);
    }, [user.avatar]);

    const handleImageLoad = React.useCallback(() => {
      setImageError(false);
      setImageLoaded(true);
    }, []);

    // Fallback: 이니셜 아바타 색상
    const colorClass = React.useMemo(() => {
      return variant === 'muted'
        ? variantClasses.muted
        : variant === 'solid'
          ? variantClasses.solid
          : generateColorFromName(user.name);
    }, [variant, user.name]);

    // ✅ 이미지가 있는 경우
    if (avatarUrl) {
      return (
        <div
          className={`${baseClasses} overflow-hidden relative`}
          title={showTooltip ? user.name : undefined}
        >
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <img
            src={avatarUrl}
            alt={`${user.name}님의 프로필`}
            className={`w-full h-full object-cover transition-opacity duration-200 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onError={handleImageError}
            onLoad={handleImageLoad}
            loading="lazy"
          />
        </div>
      );
    }

    return (
      <div className={`${baseClasses} ${colorClass}`} title={showTooltip ? user.name : undefined}>
        {initials}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // ✅ 얕은 비교로 불필요한 리렌더링 방지
    return (
      prevProps.user.id === nextProps.user.id &&
      prevProps.user.name === nextProps.user.name &&
      prevProps.user.avatar === nextProps.user.avatar &&
      prevProps.size === nextProps.size &&
      prevProps.variant === nextProps.variant &&
      prevProps.className === nextProps.className &&
      prevProps.showTooltip === nextProps.showTooltip
    );
  }
);

// 기존 인터페이스 호환성을 위한 래퍼 (기존 코드 호환)
interface LegacyAvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'gradient' | 'solid' | 'muted';
  className?: string;
}

export const LegacyAvatar: React.FC<LegacyAvatarProps> = ({
  name,
  size = 'md',
  variant = 'gradient',
  className = '',
}) => {
  const user = { id: '', name, avatar: null };
  return <Avatar user={user} size={size} variant={variant} className={className} />;
};

// 기존 export와의 호환성을 위해 default로도 export
export default Avatar;
