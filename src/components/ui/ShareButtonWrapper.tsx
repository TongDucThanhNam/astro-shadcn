import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MovieDetail } from '@/types';
import ShareButton from './share-button';
import { ChatCircle as MessageCircle } from '@phosphor-icons/react/dist/ssr/ChatCircle';
import { LinkSimple as Link2 } from '@phosphor-icons/react/dist/ssr/LinkSimple';
import { cn } from '@/lib/utils';

interface ShareButtonWrapperProps {
  movie: MovieDetail;
  className?: string;
}

const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M13.5 22v-8h2.8l.5-3h-3.3V9.2c0-.9.3-1.5 1.7-1.5h1.8V5a23 23 0 0 0-2.6-.1c-2.6 0-4.4 1.6-4.4 4.5V11H7v3h3v8h3.5Z" />
  </svg>
);

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M7.2 3h9.6A4.2 4.2 0 0 1 21 7.2v9.6a4.2 4.2 0 0 1-4.2 4.2H7.2A4.2 4.2 0 0 1 3 16.8V7.2A4.2 4.2 0 0 1 7.2 3Zm-.1 1.8a2.4 2.4 0 0 0-2.3 2.3v9.8a2.4 2.4 0 0 0 2.3 2.3h9.8a2.4 2.4 0 0 0 2.3-2.3V7.1a2.4 2.4 0 0 0-2.3-2.3H7.1Zm10.4 1.5a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4ZM12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 1.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z" />
  </svg>
);

const ShareButtonWrapper: React.FC<ShareButtonWrapperProps> = ({ movie, className }) => {
  const [feedback, setFeedback] = useState('');
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareText = `Xem phim "${movie.name}"${movie.year ? ` (${movie.year})` : ''} trên AstroFilm`;
  const popupOptions = 'width=640,height=720,noopener,noreferrer';

  const getShareUrl = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return window.location.href;
  }, []);

  const notify = useCallback((message: string) => {
    setFeedback(message);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setFeedback(''), 2500);
  }, []);

  const copyToClipboard = useCallback(
    async (text: string, successMessage: string) => {
      try {
        await navigator.clipboard.writeText(text);
        notify(successMessage);
      } catch (error) {
        console.error('Failed to copy shared content:', error);
        notify('Không thể sao chép nội dung chia sẻ.');
      }
    },
    [notify],
  );

  const openPopup = useCallback((url: string) => {
    if (typeof window === 'undefined') return;
    window.open(url, '_blank', popupOptions);
  }, []);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const onFacebookShare = useCallback(() => {
    const shareUrl = getShareUrl();
    if (!shareUrl) return;
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    openPopup(url);
  }, [getShareUrl, openPopup, shareText]);

  const onThreadsShare = useCallback(() => {
    const shareUrl = getShareUrl();
    if (!shareUrl) return;
    const threadsText = `${shareText}\n${shareUrl}`;
    const url = `https://www.threads.net/intent/post?text=${encodeURIComponent(threadsText)}`;
    openPopup(url);
  }, [getShareUrl, openPopup, shareText]);

  const onInstagramShare = useCallback(async () => {
    const shareUrl = getShareUrl();
    if (!shareUrl) return;
    notify('Instagram không hỗ trợ tự điền nội dung từ web.');
    openPopup('https://www.instagram.com/');
  }, [getShareUrl, notify, openPopup]);

  const onCopyLink = useCallback(async () => {
    const shareUrl = getShareUrl();
    if (!shareUrl) return;
    await copyToClipboard(shareUrl, 'Đã sao chép link.');
  }, [copyToClipboard, getShareUrl]);

  const shareLinks = useMemo(
    () => [
      {
        icon: FacebookIcon,
        onClick: onFacebookShare,
        label: 'Facebook',
      },
      {
        icon: InstagramIcon,
        onClick: onInstagramShare,
        label: 'Instagram',
      },
      {
        icon: MessageCircle,
        onClick: onThreadsShare,
        label: 'Threads',
      },
      {
        icon: Link2,
        onClick: onCopyLink,
        label: 'Sao chép link',
      },
    ],
    [onCopyLink, onFacebookShare, onInstagramShare, onThreadsShare],
  );

  return (
    <div className="relative inline-flex w-full items-center sm:w-auto">
      <ShareButton links={shareLinks} className={className}>
        <Link2 size={15} />
        Chia sẻ
      </ShareButton>
      <p
        className={cn(
          'pointer-events-none absolute left-0 top-full mt-1 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.16em] transition-opacity duration-200',
          feedback ? 'opacity-100 text-[#DFE104]' : 'opacity-0 text-[#A1A1AA]',
        )}
      >
        {feedback || 'Đã sẵn sàng chia sẻ'}
      </p>
    </div>
  );
};

export default ShareButtonWrapper;
