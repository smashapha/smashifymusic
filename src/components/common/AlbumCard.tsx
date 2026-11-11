import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, CheckCircle, Disc, Tag, Play, Sparkles } from 'lucide-react';
import { Album } from '../../types';
import { optimizeImage } from '../../lib/imageUtils';
import { getEffectiveAlbumPrice, isAlbumOnSale, getAlbumSaleTimeRemaining } from '../../lib/pricing';
import { purchaseAlbum } from '../../lib/paychangu';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface AlbumCardProps {
  album: Album;
  songsCount?: number;
  isPurchased?: boolean;
  onBuyClick?: (e: React.MouseEvent) => void;
  layout?: 'grid' | 'horizontal';
}

export const AlbumCard: React.FC<AlbumCardProps> = ({
  album,
  songsCount,
  isPurchased: isPurchasedProp,
  onBuyClick,
  layout = 'grid'
}) => {
  const isPurchased = isPurchasedProp ?? album.is_purchased ?? false;
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [buying, setBuying] = useState(false);

  const effectivePrice = getEffectiveAlbumPrice(album);
  const onSale = isAlbumOnSale(album);
  const timeRemaining = getAlbumSaleTimeRemaining(album);
  const artistName = album.profiles?.stage_name || album.profiles?.full_name || 'Artist';

  const handleBuy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onBuyClick) {
      onBuyClick(e);
      return;
    }
    if (!userProfile) {
      toast.error('Please log in or sign up to buy this album');
      navigate('/auth/listener');
      return;
    }

    setBuying(true);
    try {
      await purchaseAlbum({ album, user: userProfile });
    } catch (err: any) {
      console.error('Album purchase failed:', err);
    } finally {
      setBuying(false);
    }
  };

  if (layout === 'horizontal') {
    return (
      <div 
        onClick={() => navigate(`/album/${album.id}`)}
        className="group relative flex items-center gap-4 p-3 bg-[#141414] hover:bg-[#1C1C1C] border border-white/5 hover:border-[#00A3FF]/30 rounded-[16px] transition-all cursor-pointer select-none"
      >
        <div className="w-16 h-16 shrink-0 rounded-[12px] overflow-hidden relative border border-white/10 bg-[#0A0A0A]">
          <img 
            src={optimizeImage(album.cover_url, 150, 150)} 
            alt={album.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy" 
          />
          {onSale && (
            <div className="absolute top-1 left-1 bg-[#EF4444] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
              <Tag size={9} />
              -{album.discount_percent}%
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-semibold text-[#00A3FF] uppercase tracking-wider bg-[#00A3FF]/10 px-1.5 py-0.5 rounded">
              Album
            </span>
            {album.release_year && (
              <span className="text-[11px] text-[#A3A3A3]">• {album.release_year}</span>
            )}
          </div>
          <h4 className="text-[14px] font-bold text-white truncate group-hover:text-[#00A3FF] transition-colors">
            {album.title}
          </h4>
          <p className="text-[12px] text-[#A3A3A3] truncate">
            {artistName} {songsCount ? `• ${songsCount} tracks` : ''}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {isPurchased ? (
            <span className="px-3 py-1.5 bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 rounded-[10px] text-[11px] font-semibold flex items-center gap-1">
              <CheckCircle size={12} /> Owned
            </span>
          ) : album.is_for_sale !== false && effectivePrice > 0 ? (
            <button
              onClick={handleBuy}
              disabled={buying}
              className="px-3 py-1.5 bg-[#00A3FF] hover:bg-[#0084D6] active:scale-95 text-white font-semibold text-[12px] rounded-[10px] transition-all flex items-center gap-1.5 shadow-md shadow-[#00A3FF]/20"
              title={`Buy full album for MK ${effectivePrice.toLocaleString()}`}
            >
              <ShoppingCart size={13} />
              <span>MK {effectivePrice.toLocaleString()}</span>
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => navigate(`/album/${album.id}`)}
      className="min-w-[150px] md:min-w-[180px] snap-start group cursor-pointer flex flex-col relative select-none"
    >
      <div className="aspect-square rounded-[14px] overflow-hidden mb-3 relative shadow-md border border-white/10 bg-[#141414]">
        <img 
          src={optimizeImage(album.cover_url, 350, 350)} 
          alt={album.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          loading="lazy" 
          decoding="async" 
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-[#00A3FF] text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
            <Play size={18} fill="white" className="ml-0.5" />
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-10">
          {onSale && (
            <span className="bg-[#EF4444] text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow flex items-center gap-1 animate-pulse">
              <Tag size={10} />
              -{album.discount_percent}% OFF
            </span>
          )}
          {isPurchased && (
            <span className="bg-[#22C55E] text-black text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
              <CheckCircle size={10} />
              OWNED
            </span>
          )}
        </div>

        {timeRemaining && (
          <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-md text-[10px] text-[#EAB308] font-semibold px-2 py-0.5 rounded-md text-center truncate border border-[#EAB308]/30">
            ⏰ {timeRemaining}
          </div>
        )}
      </div>

      <h4 className="font-semibold text-white text-[14px] truncate group-hover:text-[#00A3FF] transition-colors mb-0.5">
        {album.title}
      </h4>

      <p className="text-[12px] text-[#A3A3A3] truncate mb-2">
        {artistName}
      </p>

      {/* Album Buy Button / Price Row */}
      <div className="mt-auto flex items-center justify-between gap-1 pt-1 border-t border-white/5">
        <span className="text-[11px] text-[#737373] font-medium">
          {album.release_year ? `${album.release_year}` : 'Album'}
        </span>

        {isPurchased ? (
          <span className="text-[11px] text-[#22C55E] font-semibold flex items-center gap-1">
            <CheckCircle size={11} /> Purchased
          </span>
        ) : album.is_for_sale !== false && effectivePrice > 0 ? (
          <button
            onClick={handleBuy}
            disabled={buying}
            className="px-2.5 py-1 bg-[#00A3FF] hover:bg-[#0084D6] active:scale-95 text-white font-semibold text-[11px] rounded-[8px] transition-all flex items-center gap-1 shadow-sm"
            title={`Buy full album for MK ${effectivePrice.toLocaleString()}`}
          >
            <ShoppingCart size={11} />
            {onSale && album.price && (
              <span className="line-through text-white/60 text-[9px] mr-0.5">
                MK {album.price}
              </span>
            )}
            <span>MK {effectivePrice.toLocaleString()}</span>
          </button>
        ) : (
          <span className="text-[11px] text-[#00A3FF] font-medium">Stream</span>
        )}
      </div>
    </div>
  );
};

export default AlbumCard;
