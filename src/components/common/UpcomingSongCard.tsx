import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Check, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UpcomingSongCard({ song }: { song: any; key?: React.Key }) {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [presaved, setPresaved] = useState(false);
  const [presaveCount, setPresaveCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPresaveData();
  }, [userProfile?.id, song.id]);

  const fetchPresaveData = async () => {
    try {
      const { data: countData } = await supabase.rpc('get_presave_count', { p_song_id: song.id });
      setPresaveCount(countData || 0);

      if (userProfile?.id) {
        const { data: hasPresaved } = await supabase.rpc('has_presaved', { p_fan_id: userProfile.id, p_song_id: song.id });
        setPresaved(!!hasPresaved);
      }
    } catch (error) {
      console.error('Error fetching presave data', error);
    }
  };

  const togglePresave = async () => {
    if (!userProfile) {
      navigate('/auth/listener');
      return;
    }
    
    setLoading(true);
    try {
      if (presaved) {
        await supabase.from('pre_saves').delete().eq('fan_id', userProfile.id).eq('song_id', song.id);
        setPresaved(false);
        setPresaveCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase.from('pre_saves').insert({ fan_id: userProfile.id, song_id: song.id });
        setPresaved(true);
        setPresaveCount(prev => prev + 1);
        toast.success("Pre-saved! We'll add it to your Library on release day.");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const dropDate = new Date(song.release_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const formatCount = (num: number) => num > 999 ? (num/1000).toFixed(1) + 'K' : num;

  return (
    <div className="w-full relative group flex flex-col gap-3 min-w-[160px]">
      <div className="aspect-square w-full rounded-2xl overflow-hidden relative border border-white/5 bg-[#1A1A1A]">
        <img 
          src={song.cover_url || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=400&fit=crop'} 
          alt={song.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors duration-300" />
        
        {/* Count Badge */}
        {presaveCount > 0 && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-white uppercase tracking-widest border border-white/10">
            {formatCount(presaveCount)} pre-saves
          </div>
        )}

        {/* Drops Date Chip */}
        <div className="absolute bottom-2 left-2 bg-white/10 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-white border border-white/10">
          Drops {dropDate}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-[13px] font-bold text-white truncate group-hover:text-[#00A3FF] transition-colors">{song.title}</h3>
        <p className="text-[11px] text-[#B0B0B0] truncate">{song.artist_name || (song.profiles?.stage_name || song.profiles?.full_name)}</p>
      </div>

      <button 
        onClick={togglePresave}
        disabled={loading}
        className={`w-full h-9 rounded-[10px] font-bold text-[13px] transition-all flex items-center justify-center gap-2 \${
          presaved 
            ? 'bg-[#22C55E]/15 text-[#22C55E]' 
            : 'bg-gradient-to-r from-[#00A3FF] to-[#0084D6] text-white hover:brightness-110 shadow-lg shadow-[#00A3FF]/20'
        }`}
      >
        {presaved ? (
          <>
            <Check size={14} />
            <span>Pre-saved ✓</span>
          </>
        ) : (
          <>
            <Download size={14} />
            <span>Pre-save</span>
          </>
        )}
      </button>
    </div>
  );
}
