import React from 'react';
import { User } from 'lucide-react';
import { optimizeImage } from '../../lib/imageUtils';

interface AvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ src, name, className = "" }) => {
  if (src) {
    const widthVal = Number(className.match(/(?:w|h)-(\d+)/)?.[1] || 12);
    const isLarge = widthVal >= 20 || className.includes('h-[') || className.includes('w-[');
    const size = isLarge ? 200 : 80;
    return <img src={optimizeImage(src, size, size)} className={`object-cover ${className}`} alt={name || "Avatar"} />;
  }

  // Fallback: Initial or placeholder
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const initials = name ? getInitials(name) : '?';
  
  return (
    <div className={`flex items-center justify-center bg-white/10 text-white ${className}`}>
      {name ? (
        <span className="text-xl font-black">{initials}</span>
      ) : (
        <User className="text-smash-gray" size={Number(className.match(/w-(\d+)/)?.[1] || 24) / 2} />
      )}
    </div>
  );
};

export default Avatar;
