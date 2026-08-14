import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-shimmer rounded-md ${className}`}
      {...props}
    />
  );
};

export const AvatarSkeleton: React.FC<{ size?: number | string; className?: string }> = ({
  size,
  className = '',
}) => {
  const sizeStyle = typeof size === 'number' ? { width: size, height: size } : undefined;
  const sizeClass = typeof size === 'string' ? size : !size ? 'w-12 h-12' : '';
  return (
    <div
      aria-hidden="true"
      style={sizeStyle}
      className={`skeleton-shimmer rounded-full shrink-0 ${sizeClass} ${className}`}
    />
  );
};

export const SectionHeaderSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div aria-hidden="true" className={`space-y-2 mb-4 text-left ${className}`}>
      <Skeleton className="h-3 w-24 rounded" />
      <Skeleton className="h-6 w-44 rounded-md" />
      <Skeleton className="h-3 w-64 max-w-full rounded" />
    </div>
  );
};

export const SongCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`bg-[#1A1A1A] border border-white/5 rounded-[16px] p-3 flex flex-col shrink-0 ${className}`}
    >
      <div className="aspect-square w-full rounded-[8px] skeleton-shimmer mb-3" />
      <Skeleton className="h-4 w-3/4 rounded mb-2" />
      <Skeleton className="h-3 w-1/2 rounded" />
    </div>
  );
};

export const ListRowSkeleton: React.FC<{ showGhostNumber?: boolean; className?: string }> = ({
  showGhostNumber = false,
  className = '',
}) => {
  return (
    <div
      aria-hidden="true"
      className={`flex items-center gap-3.5 p-2.5 rounded-[12px] bg-[#1A1A1A] border border-white/5 ${className}`}
    >
      {showGhostNumber && <Skeleton className="w-6 h-8 rounded shrink-0" />}
      <div className="w-12 h-12 rounded-[10px] skeleton-shimmer shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton className="h-4 w-2/3 rounded" />
        <Skeleton className="h-3 w-1/3 rounded" />
      </div>
      <div className="w-8 h-8 rounded-full skeleton-shimmer shrink-0" />
    </div>
  );
};

export const PlaylistCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`bg-[#1A1A1A] border border-white/5 rounded-[16px] p-3 md:p-4 flex flex-col ${className}`}
    >
      <div className="aspect-square w-full rounded-[12px] overflow-hidden p-1 bg-[#141414] mb-3 grid grid-cols-2 gap-1">
        <div className="w-full h-full skeleton-shimmer rounded-[4px]" />
        <div className="w-full h-full skeleton-shimmer rounded-[4px]" />
        <div className="w-full h-full skeleton-shimmer rounded-[4px]" />
        <div className="w-full h-full skeleton-shimmer rounded-[4px]" />
      </div>
      <Skeleton className="h-4 w-3/4 rounded mb-1.5" />
      <Skeleton className="h-3 w-1/3 rounded" />
    </div>
  );
};

export default Skeleton;
