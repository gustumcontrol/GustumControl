'use client';

import { useEffect } from 'react';
import { Icon } from '@/components/icon';

export function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const goPrev = () => onIndexChange((index - 1 + photos.length) % photos.length);
  const goNext = () => onIndexChange((index + 1) % photos.length);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Captura antes que el listener de Escape del Dialog de fondo, para
        // que solo se cierre la foto y no también el modal que la contiene.
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, photos.length]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 p-4 sm:p-8"
      style={{ background: 'rgba(0,0,0,0.9)' }}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
        style={{ background: 'rgba(255,255,255,0.12)' }}
      >
        <Icon name="xmark" style="solid" size={16} color="#FFFFFF" />
      </button>

      <div
        className="relative flex-1 w-full flex items-center justify-center min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        {photos.length > 1 && (
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-2 sm:left-4 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer shrink-0"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <Icon name="chevron-left" style="solid" size={16} color="#FFFFFF" />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[index]}
          alt={`Foto ${index + 1}`}
          className="max-w-full max-h-full object-contain rounded-lg"
        />

        {photos.length > 1 && (
          <button
            type="button"
            onClick={goNext}
            className="absolute right-2 sm:right-4 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer shrink-0"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <Icon name="chevron-right" style="solid" size={16} color="#FFFFFF" />
          </button>
        )}
      </div>

      {photos.length > 1 && (
        <div
          className="relative w-full flex items-center justify-center gap-4 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 overflow-x-auto">
            {photos.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => onIndexChange(i)}
                className="w-12 h-12 rounded-lg overflow-hidden cursor-pointer shrink-0"
                style={{
                  border:
                    i === index ? '2px solid var(--accent-c)' : '2px solid rgba(255,255,255,0.2)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          <span
            className="absolute right-0 text-xs font-medium shrink-0"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            {index + 1} / {photos.length}
          </span>
        </div>
      )}
    </div>
  );
}
