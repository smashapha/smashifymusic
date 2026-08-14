import React from 'react';

interface BrandLoaderProps {
  label?: string;
  className?: string;
  fullscreen?: boolean;
}

export const BrandLoader: React.FC<BrandLoaderProps> = ({
  label = 'Loading',
  className = '',
  fullscreen = false,
}) => {
  const content = (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-5 py-16 ${className}`}
    >
      <span className="sr-only">{label}</span>
      {/* Equalizer bars in Electric Blue */}
      <div className="flex items-end gap-1 h-8" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="w-1.5 rounded-full bg-[#00A3FF] smash-eq"
            style={{
              height: '100%',
              animation: `smash-eq 1s ease-in-out ${i * 0.15}s infinite`,
              transformOrigin: 'bottom',
            }}
          />
        ))}
      </div>
      <p className="text-[13px] font-medium text-[#B0B0B0] tracking-wide">
        {label}
      </p>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="min-h-screen w-full bg-[#0A0A0A] flex items-center justify-center px-4">
        {content}
      </div>
    );
  }

  return content;
};

export default BrandLoader;
