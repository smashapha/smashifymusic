import React, { useState, useEffect } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  placeholderClassName?: string;
}

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  fallbackSrc = '/placeholder-cover.png',
  className = '',
  placeholderClassName = '',
  ...props
}) => {
  const [loaded, setLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');

  useEffect(() => {
    setLoaded(false);
    
    if (!src) {
      setCurrentSrc(fallbackSrc);
      return;
    }

    const img = new Image();
    img.src = src;
    img.onload = () => {
      setCurrentSrc(src);
      setLoaded(true);
    };
    img.onerror = () => {
      setCurrentSrc(fallbackSrc);
      setLoaded(true);
    };
  }, [src, fallbackSrc]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Skeleton placeholder during load */}
      {!loaded && (
        <div 
          className={`absolute inset-0 bg-zinc-900/60 animate-pulse flex items-center justify-center ${placeholderClassName}`}
        />
      )}
      
      {currentSrc && (
        <img
          src={currentSrc}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
};

export default LazyImage;
