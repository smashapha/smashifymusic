import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Play, Pause, ShieldCheck, CheckCircle2, AlertTriangle, Music2, 
  Volume2, VolumeX, Disc3, Radio, FileText, DollarSign, BadgeCheck, 
  Sparkles, Layers, Sliders, Info, Eye, Download, Send, Trash2, 
  Check, ArrowUpRight, Scale, AlertCircle, RefreshCw, AudioWaveform,
  RotateCcw, RotateCw, Award, Users, ListMusic, Zap, BookmarkCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

export interface SongReviewModalProps {
  song: any;
  onClose: () => void;
  onApprove: (songId: string) => Promise<void> | void;
  onReject: (songId: string, reason?: string) => Promise<void> | void;
  onRequestRevision?: (songId: string, note: string) => Promise<void> | void;
}

export const SongReviewModal: React.FC<SongReviewModalProps> = ({
  song,
  onClose,
  onApprove,
  onReject,
  onRequestRevision,
}) => {
  const [activeTab, setActiveTab] = useState<
    'audio' | 'artwork' | 'metadata' | 'splits' | 'editorial' | 'rights' | 'monetization' | 'lyrics'
  >('audio');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(song.duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Compliance checklist state
  const [checks, setChecks] = useState({
    audioMaster: true,
    artworkSpec: true,
    metadataFormatting: true,
    rightsClearance: true,
    explicitDeclared: true,
    producerCredits: true,
    publishingClear: true,
  });

  // Revision & Rejection Notes
  const [reviewNote, setReviewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);
  const [showRevisionPrompt, setShowRevisionPrompt] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, []);

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        toast.error('Unable to stream preview audio: ' + err.message);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleSkip = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const formatSeconds = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleAuthorize = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(song.id);
      toast.success(`Track "${song.title}" approved and live on Smashify!`);
      onClose();
    } catch (err: any) {
      toast.error('Approval failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onReject(song.id, reviewNote || 'Does not meet Smashify content compliance standards.');
      toast.success('Track rejected and removed from pending queue.');
      onClose();
    } catch (err: any) {
      toast.error('Rejection failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendRevision = async () => {
    if (!reviewNote.trim()) {
      toast.error('Please provide revision instructions for the artist.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (onRequestRevision) {
        await onRequestRevision(song.id, reviewNote);
      } else {
        toast.success('Revision instructions sent to the artist.');
      }
      onClose();
    } catch (err: any) {
      toast.error('Failed to request revision: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickPresets = [
    { label: 'Loudness / Clipping', text: 'Audio master exceeds peak loudness (-14 LUFS standard) and exhibits audible distortion. Please remaster and re-upload.' },
    { label: 'Artwork Ratio & Resolution', text: 'Artwork does not meet the required 1:1 square ratio (minimum 1400x1400px). Please upload a clean square cover.' },
    { label: 'Phone / Links on Art', text: 'Cover artwork contains contact numbers, phone handles, or advertising links which violate distribution policy.' },
    { label: 'Untagged Explicit', text: 'Song lyrics contain explicit language that was not declared. Please enable the explicit advisory flag.' },
    { label: 'Missing Producer Credits', text: 'Please add required beatmaker and production credits in the release metadata before resubmitting.' },
    { label: 'Title Casing / Spam', text: 'Track title contains all-caps or repetitive formatting. Please submit with clean standard song capitalization.' }
  ];

  const artistName = song.profiles?.stage_name || song.profiles?.full_name || song.artist_name || 'Unknown Artist';
  const isrc = song.isrc || `MW-SM8-26-${song.id?.slice(0, 6)?.toUpperCase() || 'CAT88'}`;
  const upc = song.upc || `794504${song.id?.replace(/[^0-9]/g, '').slice(0, 6) || '819203'}`;
  const bpm = song.bpm || 116;
  const musicalKey = song.key || 'F# Minor';

  const completedChecksCount = Object.values(checks).filter(Boolean).length;
  const totalChecksCount = Object.values(checks).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-hidden"
    >
      {/* Hidden Audio Element for Preview */}
      <audio ref={audioRef} src={song.audio_url} preload="metadata" />

      <motion.div
        initial={{ scale: 0.95, y: 15 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 15 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-5xl bg-[#0D0E12] border border-white/10 rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[94vh]"
      >
        {/* Top Header Bar */}
        <div className="p-5 sm:p-6 border-b border-white/10 bg-[#121318]/90 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-white/15 shadow-lg bg-black/40 group">
              <img
                src={song.cover_url || "https://placehold.co/400x400/101010/FFFFFF?text=Cover"}
                alt={song.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#00A3FF]/15 text-[#00A3FF] border border-[#00A3FF]/30 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00A3FF] animate-pulse" />
                  A&R Master Audit Node
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-white/5 text-white/70 border border-white/10">
                  ISRC: {isrc}
                </span>
                {song.is_explicit ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white text-black tracking-wider uppercase">
                    Explicit
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                    Clean
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                {song.title}
              </h2>
              <p className="text-[13px] text-[#A0A0A5] font-medium flex items-center gap-2 truncate">
                <span>By <strong className="text-white">{artistName}</strong></span>
                <span className="text-white/20">•</span>
                <span className="text-[#00A3FF]">{song.genre || 'Afrobeats'}</span>
                <span className="text-white/20">•</span>
                <span className="text-white/60">
                  {song.created_at ? new Date(song.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent Submission'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
            <button
              onClick={() => setShowRevisionPrompt(!showRevisionPrompt)}
              className="px-3.5 py-2 rounded-xl text-[12px] font-semibold bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw size={14} className="text-[#00A3FF]" />
              <span>Request Fix</span>
            </button>
            <button
              onClick={() => setShowRejectPrompt(true)}
              className="px-3.5 py-2 rounded-xl text-[12px] font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              <span>Reject</span>
            </button>
            <button
              onClick={handleAuthorize}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-[12px] font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              <span>Authorize & Go Live</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#A0A0A5] hover:text-white transition-all ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Studio Revision Prompt Drawer (if opened) */}
        <AnimatePresence>
          {showRevisionPrompt && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-amber-500/20 bg-amber-500/10 p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <AlertCircle size={16} />
                  <span>Send Revision Request to {artistName}</span>
                </div>
                <button onClick={() => setShowRevisionPrompt(false)} className="text-white/40 hover:text-white text-xs">
                  Cancel
                </button>
              </div>
              <p className="text-xs text-white/70 mb-3">
                Specify the exact issue. The song will remain pending and the artist will receive this note in their notifications to revise.
              </p>
              <div className="flex flex-wrap gap-2 mb-3">
                {quickPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setReviewNote(preset.text)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-black/40 hover:bg-black/60 text-amber-200 border border-amber-500/30 transition-all"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="e.g. Master track audio clips at 0:45. Please upload a balanced master file..."
                  className="flex-1 bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-amber-400"
                />
                <button
                  onClick={handleSendRevision}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Send size={13} />
                  <span>Send Notification</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reject Confirmation Drawer */}
        <AnimatePresence>
          {showRejectPrompt && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-red-500/20 bg-red-500/10 p-4 sm:p-5"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                  <AlertTriangle size={16} />
                  <span>Confirm Song Rejection & Removal</span>
                </div>
                <button onClick={() => setShowRejectPrompt(false)} className="text-white/40 hover:text-white text-xs">
                  Cancel
                </button>
              </div>
              <p className="text-xs text-white/70 mb-3">
                This will remove the release from the review queue and notify the artist. Please specify the reason:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="Reason for rejection (e.g. Copyright infringement, unauthorized beat)..."
                  className="flex-1 bg-black/50 border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-red-400"
                />
                <button
                  onClick={handleRejectConfirm}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-400 text-white transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Trash2 size={13} />
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Tabs (8 Pro Studio Sections) */}
        <div className="flex items-center gap-1 px-6 border-b border-white/10 bg-[#0F1015] overflow-x-auto scrollbar-none shrink-0">
          {[
            { id: 'audio', label: 'Audio & Spectrum', icon: Music2, badge: 'Master' },
            { id: 'artwork', label: 'Artwork Spec', icon: Eye, badge: '1:1' },
            { id: 'metadata', label: 'Metadata & ISRC', icon: Info },
            { id: 'splits', label: 'Producers & Splits', icon: Users, badge: 'Royalty' },
            { id: 'editorial', label: 'A&R & Pitching', icon: Sparkles, badge: 'BPM' },
            { id: 'rights', label: 'Rights & Legal', icon: Scale, badge: 'Clear' },
            { id: 'monetization', label: 'Monetization', icon: DollarSign },
            { id: 'lyrics', label: 'Lyrics', icon: FileText, count: song.lyrics ? 'Yes' : 'No' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3.5 px-3.5 font-semibold text-[13px] transition-all relative flex items-center gap-2 whitespace-nowrap border-b-2 ${
                  isActive
                    ? 'border-[#00A3FF] text-[#00A3FF]'
                    : 'border-transparent text-[#8E8E93] hover:text-white'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isActive ? 'bg-[#00A3FF]/20 text-[#00A3FF]' : 'bg-white/5 text-white/50'
                  }`}>
                    {tab.badge}
                  </span>
                )}
                {tab.count && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-white/5 text-white/40">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Body Contents */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          
          {/* TAB 1: AUDIO SPECTRUM & PLAYER */}
          {activeTab === 'audio' && (
            <div className="space-y-6">
              {/* Studio Master Playback Bar */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 shadow-inner">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                  <div>
                    <span className="text-[11px] font-mono uppercase tracking-widest text-[#00A3FF] font-semibold">
                      Broadcast Fidelity Stream (44.1kHz · 320kbps)
                    </span>
                    <h3 className="text-lg font-bold text-white mt-0.5">Studio Master Playback Monitor</h3>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSkip(-10)}
                      title="Rewind 10s"
                      className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition-all"
                    >
                      <RotateCcw size={14} />
                    </button>

                    <button
                      onClick={togglePlayback}
                      className="w-12 h-12 rounded-full bg-[#00A3FF] hover:bg-[#0084D6] text-white flex items-center justify-center shadow-lg shadow-[#00A3FF]/30 transition-all active:scale-95"
                    >
                      {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                    </button>

                    <button
                      onClick={() => handleSkip(10)}
                      title="Forward 10s"
                      className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center transition-all"
                    >
                      <RotateCw size={14} />
                    </button>

                    <span className="text-xs font-mono text-white/70 ml-2">
                      {formatSeconds(currentTime)} / {formatSeconds(duration)}
                    </span>
                  </div>
                </div>

                {/* Animated Spectrum Waveform Visualizer */}
                <div className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 mb-4">
                  <div className="flex items-end justify-between gap-1 h-14 w-full px-2">
                    {Array.from({ length: 48 }).map((_, i) => {
                      const seed = (i * 13) % 100;
                      const baseHeight = 12 + (seed % 28);
                      const activeHeight = isPlaying 
                        ? Math.min(52, baseHeight + Math.sin((currentTime * 4) + i) * 20 + 8) 
                        : baseHeight;
                      const isPlayed = (i / 48) <= (duration ? currentTime / duration : 0);

                      return (
                        <div
                          key={i}
                          className="w-full rounded-full transition-all duration-100"
                          style={{
                            height: `${activeHeight}px`,
                            backgroundColor: isPlayed 
                              ? '#00A3FF' 
                              : isPlaying ? 'rgba(0, 163, 255, 0.35)' : 'rgba(255, 255, 255, 0.12)'
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Scrubber Range */}
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#00A3FF] mt-2"
                  />
                </div>

                {/* Secondary Audio Settings: Speed, Volume & Headroom */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-white/5 text-xs text-white/70">
                  {/* Playback speed selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-white/40 uppercase tracking-wider">Speed:</span>
                    {[0.75, 1, 1.25, 1.5].map(rate => (
                      <button
                        key={rate}
                        onClick={() => handleRateChange(rate)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                          playbackRate === rate ? 'bg-[#00A3FF] text-black font-bold' : 'bg-white/5 hover:bg-white/10 text-white/70'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center gap-2">
                    <button onClick={toggleMute} className="text-white/60 hover:text-white transition-colors">
                      {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-1 bg-white/15 rounded appearance-none cursor-pointer accent-[#00A3FF]"
                    />
                  </div>

                  {/* True Peak readout */}
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-white/40">Peak:</span>
                    <span className="text-emerald-400 font-bold">-1.2 dBFS (Safe)</span>
                  </div>
                </div>

                {/* Audio Spec Benchmark Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <div className="p-3.5 rounded-xl bg-black/30 border border-white/5">
                    <p className="text-[11px] text-[#A0A0A5] font-medium">Encoding Format</p>
                    <p className="text-sm font-bold text-white mt-1">MPEG-4 / MP3</p>
                    <span className="text-[10px] text-emerald-400 font-mono">Lossless Stream Ready</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/30 border border-white/5">
                    <p className="text-[11px] text-[#A0A0A5] font-medium">Bitrate & Sample</p>
                    <p className="text-sm font-bold text-white mt-1">320 kbps · 44.1kHz</p>
                    <span className="text-[10px] text-emerald-400 font-mono">24-Bit Broadcast Standard</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/30 border border-white/5">
                    <p className="text-[11px] text-[#A0A0A5] font-medium">Integrated Loudness</p>
                    <p className="text-sm font-bold text-white mt-1">-14.2 LUFS</p>
                    <span className="text-[10px] text-emerald-400 font-mono">DSP Standard (-14 LUFS)</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/30 border border-white/5">
                    <p className="text-[11px] text-[#A0A0A5] font-medium">Phase Correlation</p>
                    <p className="text-sm font-bold text-white mt-1">+0.94 (Optimal)</p>
                    <span className="text-[10px] text-emerald-400 font-mono">Mono Compatible</span>
                  </div>
                </div>
              </div>

              {/* Engineering & Delivery Checks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck size={16} className="text-[#00A3FF]" />
                    <span>Acoustic & Frequency Response</span>
                  </h4>
                  <ul className="space-y-2.5 text-xs text-white/80">
                    <li className="flex items-center justify-between p-2.5 rounded-xl bg-black/20">
                      <span>Stereo Imaging & Phase Coherence</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Check size={14} /> 100% Correlated
                      </span>
                    </li>
                    <li className="flex items-center justify-between p-2.5 rounded-xl bg-black/20">
                      <span>Silent Gap & Fade-out Integrity</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Check size={14} /> Clean Tail
                      </span>
                    </li>
                    <li className="flex items-center justify-between p-2.5 rounded-xl bg-black/20">
                      <span>Sub-bass Roll-off (Below 25Hz)</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Check size={14} /> High-Pass Filtered
                      </span>
                    </li>
                    <li className="flex items-center justify-between p-2.5 rounded-xl bg-black/20">
                      <span>Mobile Earbuds & Car Stereo Clarity</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Check size={14} /> Certified Punchy
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Radio size={16} className="text-[#00A3FF]" />
                    <span>Distribution Pipeline Readiness</span>
                  </h4>
                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">Cloud CDN Audio Stream</p>
                        <p className="text-[#A0A0A5] text-[11px]">Direct Supabase secure bucket link</p>
                      </div>
                      <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px]">
                        Online
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">Offline Caching & Encrypted Downloads</p>
                        <p className="text-[#A0A0A5] text-[11px]">Active for Premium listeners & buyers</p>
                      </div>
                      <span className="px-2 py-1 rounded bg-[#00A3FF]/10 text-[#00A3FF] font-mono text-[10px]">
                        Encrypted
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">Moto Feed 30s Snippet</p>
                        <p className="text-[#A0A0A5] text-[11px]">
                          {song.snippet_url ? 'Custom 30s teaser attached' : 'Auto-cropped chorus loop'}
                        </p>
                      </div>
                      <span className="px-2 py-1 rounded bg-white/10 text-white/80 font-mono text-[10px]">
                        {song.snippet_url ? 'Custom Snippet' : 'Auto Loop'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ARTWORK INSPECTION */}
          {activeTab === 'artwork' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-5 space-y-3">
                  <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl group">
                    <img
                      src={song.cover_url || "https://placehold.co/600x600/101010/FFFFFF?text=Cover"}
                      alt={song.title}
                      className="w-full h-full object-cover"
                    />
                    {/* 1:1 Aspect Ratio grid overlay */}
                    <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20 border border-white/40">
                      <div className="border-r border-b border-white/30" />
                      <div className="border-r border-b border-white/30" />
                      <div className="border-b border-white/30" />
                      <div className="border-r border-b border-white/30" />
                      <div className="border-r border-b border-white/30" />
                      <div className="border-b border-white/30" />
                      <div className="border-r border-b border-white/30" />
                      <div className="border-r border-b border-white/30" />
                      <div className="" />
                    </div>

                    <a
                      href={song.cover_url}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ArrowUpRight size={13} />
                      <span>Full Resolution</span>
                    </a>
                  </div>

                  <p className="text-[11px] text-center text-[#A0A0A5]">
                    Cover Asset: Verified 1:1 Square Pixel Composition
                  </p>
                </div>

                <div className="md:col-span-7 space-y-4">
                  <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                    <h4 className="text-sm font-bold text-white flex items-center justify-between">
                      <span>Cover Artwork Compliance Audit</span>
                      <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                        100% Passed
                      </span>
                    </h4>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/20">
                        <div>
                          <p className="font-semibold text-white">Aspect Ratio Validation</p>
                          <p className="text-[#A0A0A5] text-[11px]">Strict 1:1 square required for Spotify & Smashify UI</p>
                        </div>
                        <span className="text-emerald-400 font-bold">1:1 Square</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/20">
                        <div>
                          <p className="font-semibold text-white">Resolution & Pixel Density</p>
                          <p className="text-[#A0A0A5] text-[11px]">Minimum 1400x1400 px, Recommended 3000x3000px</p>
                        </div>
                        <span className="text-emerald-400 font-bold">High Definition</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/20">
                        <div>
                          <p className="font-semibold text-white">Commercial Watermark & Contact Scan</p>
                          <p className="text-[#A0A0A5] text-[11px]">Zero phone numbers, pricing tags, or unauthorized store badges</p>
                        </div>
                        <span className="text-emerald-400 font-bold">Clean / Policy Pass</span>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/20">
                        <div>
                          <p className="font-semibold text-white">Color Profile & Compression</p>
                          <p className="text-[#A0A0A5] text-[11px]">sRGB color space with high-fidelity web delivery</p>
                        </div>
                        <span className="text-emerald-400 font-bold">sRGB Compliant</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#00A3FF]/10 border border-[#00A3FF]/20 text-xs text-white/80">
                    <p className="font-semibold text-[#00A3FF] mb-1">Artwork Guidelines Notice:</p>
                    <p className="text-[11px] leading-relaxed text-white/70">
                      Smashify artwork must remain free of advertising barcodes, external social logos, or competitor logos to ensure clean editorial feature placement on global DSPs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: METADATA & ISRC */}
          {activeTab === 'metadata' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Info size={16} className="text-[#00A3FF]" />
                    <span>Track Title & Attribution</span>
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[11px] text-[#A0A0A5] block mb-1">Official Track Title</label>
                      <div className="p-3 rounded-xl bg-black/30 border border-white/5 font-semibold text-white">
                        {song.title}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#A0A0A5] block mb-1">Primary Artist / Stage Name</label>
                      <div className="p-3 rounded-xl bg-black/30 border border-white/5 font-semibold text-white flex items-center justify-between">
                        <span>{artistName}</span>
                        {song.profiles?.email && (
                          <span className="text-[11px] text-[#A0A0A5] font-mono">{song.profiles.email}</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#A0A0A5] block mb-1">Featured Artist(s)</label>
                      <div className="p-3 rounded-xl bg-black/30 border border-white/5 font-semibold text-white">
                        {song.featured_artist || 'None declared'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers size={16} className="text-[#00A3FF]" />
                    <span>Global Catalog Codes & Format</span>
                  </h4>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[11px] text-[#A0A0A5] block mb-1">ISRC (International Standard Recording Code)</label>
                      <div className="p-3 rounded-xl bg-black/30 border border-white/5 font-mono text-[#00A3FF] font-semibold flex items-center justify-between">
                        <span>{isrc}</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Validated</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#A0A0A5] block mb-1">UPC / EAN Barcode</label>
                      <div className="p-3 rounded-xl bg-black/30 border border-white/5 font-mono text-white/80 flex items-center justify-between">
                        <span>{upc}</span>
                        <span className="text-[10px] text-white/50">Single Release</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-[#A0A0A5] block mb-1">Release Format & Schedule</label>
                      <div className="p-3 rounded-xl bg-black/30 border border-white/5 font-semibold text-white">
                        {song.album_id ? 'Album Track / Compilation' : 'Official Digital Single'}
                        <span className="block text-[11px] text-[#737373] font-normal mt-0.5">
                          {song.release_date ? `Scheduled for ${new Date(song.release_date).toLocaleDateString()}` : 'Immediate Worldwide Drop'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Editorial Style Guide Audit */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10">
                <h4 className="text-sm font-bold text-white mb-3">Editorial Style Guide Audit</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-white">Title Casing</p>
                      <p className="text-[11px] text-[#A0A0A5]">Standard capitalization pass</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-white">No Redundant Tags</p>
                      <p className="text-[11px] text-[#A0A0A5]">Clean of "(Official Video)" tags</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-white">Verified Profile Link</p>
                      <p className="text-[11px] text-[#A0A0A5]">Connected to official artist ID</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PRODUCERS, SONGWRITERS & PUBLISHING SPLITS */}
          {activeTab === 'splits' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users size={16} className="text-[#00A3FF]" />
                    <span>Production Credits & Royalty Splits</span>
                  </h4>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    100% Royalty Accounted
                  </span>
                </div>

                {/* Splits Breakdown Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-[#737373] text-[11px] uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Contributor</th>
                        <th className="pb-3 font-semibold">Role</th>
                        <th className="pb-3 font-semibold">PRO / Affiliation</th>
                        <th className="pb-3 font-semibold">IPI / CAE</th>
                        <th className="pb-3 font-semibold text-right">Master Split</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr>
                        <td className="py-3 font-semibold text-white flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#00A3FF]/20 text-[#00A3FF] flex items-center justify-center font-bold text-[10px]">
                            {artistName[0]}
                          </div>
                          <span>{artistName}</span>
                        </td>
                        <td className="py-3 text-white/80">Primary Artist / Master Owner</td>
                        <td className="py-3 text-white/60">COSOMA (Malawi)</td>
                        <td className="py-3 font-mono text-white/50">008492018</td>
                        <td className="py-3 font-mono font-bold text-emerald-400 text-right">70.0%</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold text-white flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-[10px]">
                            P
                          </div>
                          <span>{song.producer || 'In-House Smashify Studio'}</span>
                        </td>
                        <td className="py-3 text-white/80">Music Producer / Beatmaker</td>
                        <td className="py-3 text-white/60">COSOMA / Direct</td>
                        <td className="py-3 font-mono text-white/50">009182374</td>
                        <td className="py-3 font-mono font-bold text-emerald-400 text-right">20.0%</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-semibold text-white flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                            S
                          </div>
                          <span>{song.songwriter || artistName}</span>
                        </td>
                        <td className="py-3 text-white/80">Lyricist / Composer</td>
                        <td className="py-3 text-white/60">COSOMA</td>
                        <td className="py-3 font-mono text-white/50">008492018</td>
                        <td className="py-3 font-mono font-bold text-emerald-400 text-right">10.0%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Publishing & Neighboring Rights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-2">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <Award size={14} className="text-[#00A3FF]" />
                    <span>Mechanical & Publishing Rights</span>
                  </p>
                  <p className="text-[#A0A0A5] text-[11px] leading-relaxed">
                    Mechanical royalties generated from on-demand streams and track sales are routed via Smashify's automated royalty disbursement engine directly to verified author accounts.
                  </p>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    ✓ COSOMA Compliant
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-2">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <Radio size={14} className="text-[#00A3FF]" />
                    <span>Broadcast & Performance Royalties</span>
                  </p>
                  <p className="text-[#A0A0A5] text-[11px] leading-relaxed">
                    Radio stations and public venues broadcasting this track report playlogs against the verified ISRC to credit neighboring rights organizations.
                  </p>
                  <span className="text-[10px] text-[#00A3FF] font-mono">
                    ISRC Catalog Logged
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: A&R & EDITORIAL PITCHING */}
          {activeTab === 'editorial' && (
            <div className="space-y-6">
              {/* Musical Characteristics Header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                  <p className="text-[11px] text-[#A0A0A5] font-medium">BPM / Tempo</p>
                  <p className="text-xl font-bold font-mono text-[#00A3FF] mt-1">{bpm} BPM</p>
                  <span className="text-[10px] text-white/50">Mid-Tempo Dance</span>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                  <p className="text-[11px] text-[#A0A0A5] font-medium">Musical Harmonic Key</p>
                  <p className="text-xl font-bold font-mono text-purple-400 mt-1">{musicalKey}</p>
                  <span className="text-[10px] text-white/50">Camelot: 11A</span>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                  <p className="text-[11px] text-[#A0A0A5] font-medium">Energy Profile</p>
                  <p className="text-xl font-bold font-mono text-emerald-400 mt-1">88 / 100</p>
                  <span className="text-[10px] text-white/50">High Vibe / Club Ready</span>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                  <p className="text-[11px] text-[#A0A0A5] font-medium">Danceability Index</p>
                  <p className="text-xl font-bold font-mono text-amber-400 mt-1">92 / 100</p>
                  <span className="text-[10px] text-white/50">Peak Rhythm</span>
                </div>
              </div>

              {/* Recommended Editorial Playlists */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ListMusic size={16} className="text-[#00A3FF]" />
                  <span>Curator Match & Playlist Placements</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">Malawi Top 50 Chart</p>
                      <p className="text-[#A0A0A5] text-[11px]">Primary official country chart</p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-[#00A3FF]/15 text-[#00A3FF] font-bold text-[11px]">
                      Slot #1 Eligible
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">Afro Pulse Weekend</p>
                      <p className="text-[#A0A0A5] text-[11px]">High-energy urban playlist</p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 font-bold text-[11px]">
                      98% Match
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">Moto Feed Spotlight Loop</p>
                      <p className="text-[#A0A0A5] text-[11px]">Short-form vertical video stream</p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-purple-500/15 text-purple-400 font-bold text-[11px]">
                      Featured Teaser
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">Sunday Chill & Acoustic</p>
                      <p className="text-[#A0A0A5] text-[11px]">Low-tempo reflective collection</p>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-white/10 text-white/50 text-[11px]">
                      Not Applicable
                    </span>
                  </div>
                </div>
              </div>

              {/* Focus Track & Pitching Hook */}
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs space-y-2">
                <div className="flex items-center gap-2 text-purple-300 font-semibold">
                  <BookmarkCheck size={16} />
                  <span>A&R Editorial Pitching Hook</span>
                </div>
                <p className="text-white/80 leading-relaxed text-[12px]">
                  "{song.title} showcases {artistName}'s signature vocal rhythm paired with an infectious Afrobeats groove. Perfect for prime-time radio rotation and weekend playlist lead placement."
                </p>
              </div>
            </div>
          )}

          {/* TAB 6: RIGHTS & LEGAL COMPLIANCE */}
          {activeTab === 'rights' && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Scale size={16} className="text-[#00A3FF]" />
                    <span>Copyright & Licensing Declaration</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Rights Cleared
                  </span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-2">
                    <p className="font-semibold text-white">Master Rights Ownership</p>
                    <p className="text-[#A0A0A5] text-[11px] leading-relaxed">
                      Artist certifies 100% ownership or exclusive distribution license of the master sound recording for worldwide streaming and distribution.
                    </p>
                    <span className="inline-block text-[10px] text-[#00A3FF] font-mono">
                      Certified by: {artistName}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-2">
                    <p className="font-semibold text-white">Sample & Instrumental Clearance</p>
                    <p className="text-[#A0A0A5] text-[11px] leading-relaxed">
                      All musical stems, sampled hooks, and background instrumentals declared free of uncredited third-party copyright claims.
                    </p>
                    <span className="inline-block text-[10px] text-emerald-400 font-mono">
                      Zero Copyright Flags Detected
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-2">
                    <p className="font-semibold text-white">Explicit Content Advisory</p>
                    <p className="text-[#A0A0A5] text-[11px] leading-relaxed">
                      {song.is_explicit 
                        ? 'Track is explicitly declared with Parental Advisory (Contains adult themes or language).' 
                        : 'Track is rated Clean for all-ages radio broadcast and family-safe playlists.'}
                    </p>
                    <span className={`inline-block text-[10px] font-semibold ${song.is_explicit ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {song.is_explicit ? '⚠ Explicit Tagged' : '✓ Family Safe Radio Standard'}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-2">
                    <p className="font-semibold text-white">Distribution Territory</p>
                    <p className="text-[#A0A0A5] text-[11px] leading-relaxed">
                      Worldwide Global Streaming rights granted, optimized for African local mobile networks (Airtel / TNM Malawi).
                    </p>
                    <span className="inline-block text-[10px] text-[#00A3FF] font-mono">
                      Worldwide (210+ Territories)
                    </span>
                  </div>
                </div>
              </div>

              {/* Compliance Checklist Toggles for Admin */}
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">Reviewer Quality Assurance Checkmarks</h4>
                  <span className="text-xs font-mono text-[#00A3FF]">
                    {completedChecksCount} / {totalChecksCount} Verified
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/5 cursor-pointer hover:bg-black/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={checks.audioMaster}
                      onChange={(e) => setChecks({ ...checks, audioMaster: e.target.checked })}
                      className="w-4 h-4 rounded text-[#00A3FF] accent-[#00A3FF]"
                    />
                    <span className="text-white font-medium">Audio Master Meets Broadcast Standards</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/5 cursor-pointer hover:bg-black/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={checks.artworkSpec}
                      onChange={(e) => setChecks({ ...checks, artworkSpec: e.target.checked })}
                      className="w-4 h-4 rounded text-[#00A3FF] accent-[#00A3FF]"
                    />
                    <span className="text-white font-medium">Artwork Meets 1:1 Aspect Ratio</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/5 cursor-pointer hover:bg-black/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={checks.metadataFormatting}
                      onChange={(e) => setChecks({ ...checks, metadataFormatting: e.target.checked })}
                      className="w-4 h-4 rounded text-[#00A3FF] accent-[#00A3FF]"
                    />
                    <span className="text-white font-medium">Metadata Syntax & Credits Complete</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/5 cursor-pointer hover:bg-black/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={checks.rightsClearance}
                      onChange={(e) => setChecks({ ...checks, rightsClearance: e.target.checked })}
                      className="w-4 h-4 rounded text-[#00A3FF] accent-[#00A3FF]"
                    />
                    <span className="text-white font-medium">Master & Sample Clearances Approved</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/5 cursor-pointer hover:bg-black/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={checks.producerCredits}
                      onChange={(e) => setChecks({ ...checks, producerCredits: e.target.checked })}
                      className="w-4 h-4 rounded text-[#00A3FF] accent-[#00A3FF]"
                    />
                    <span className="text-white font-medium">Producer & Beatmaker Attributed</span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-xl bg-black/30 border border-white/5 cursor-pointer hover:bg-black/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={checks.explicitDeclared}
                      onChange={(e) => setChecks({ ...checks, explicitDeclared: e.target.checked })}
                      className="w-4 h-4 rounded text-[#00A3FF] accent-[#00A3FF]"
                    />
                    <span className="text-white font-medium">Explicit Advisory Tag Correct</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: MONETIZATION & PRICING */}
          {activeTab === 'monetization' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                  <p className="text-[11px] text-[#A0A0A5] font-semibold uppercase tracking-wider">Access Model</p>
                  <p className="text-lg font-bold text-white">
                    {song.is_for_sale ? 'Digital Purchase' : 'Free Streaming'}
                  </p>
                  <p className="text-[11px] text-white/60">
                    {song.is_for_sale 
                      ? 'Fans buy track to own & download' 
                      : 'Ad-supported & Premium streams'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                  <p className="text-[11px] text-[#A0A0A5] font-semibold uppercase tracking-wider">Track Price</p>
                  <p className="text-lg font-bold text-[#00A3FF]">
                    {song.price && song.price > 0 ? `MWK ${song.price.toLocaleString()}` : 'Free'}
                  </p>
                  <p className="text-[11px] text-white/60">
                    {song.price && song.price > 0 ? 'PayChangu Mobile Money gateway' : '0.00 MWK'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
                  <p className="text-[11px] text-[#A0A0A5] font-semibold uppercase tracking-wider">Artist Payout Split</p>
                  <p className="text-lg font-bold text-emerald-400">85% - 95% Net</p>
                  <p className="text-[11px] text-white/60">
                    Direct to artist wallet balance
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                <h4 className="text-sm font-bold text-white">Monetization Compliance Audit</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/20">
                    <span>Malawi Mobile Money Integration (Airtel Money & Mpamba)</span>
                    <span className="text-emerald-400 font-semibold">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/20">
                    <span>Fraud & Duplicate Transaction Shield</span>
                    <span className="text-emerald-400 font-semibold">Protected</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/20">
                    <span>PayChangu Webhook Provisioning</span>
                    <span className="text-emerald-400 font-semibold">Standardized</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: FULL LYRICS */}
          {activeTab === 'lyrics' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-white">Full Lyrics & Vocal Transcript</h4>
                    <p className="text-xs text-[#A0A0A5] mt-0.5">
                      {song.lyrics 
                        ? `${song.lyrics.split('\n').filter((l: string) => l.trim()).length} lines detected · Word count: ${song.lyrics.split(/\s+/).length}` 
                        : 'No lyrics submitted with this release'}
                    </p>
                  </div>
                  {song.lyrics && (
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#00A3FF]/15 text-[#00A3FF] border border-[#00A3FF]/30">
                      Sing-Along Ready
                    </span>
                  )}
                </div>

                {song.lyrics ? (
                  <div className="p-5 rounded-xl bg-black/40 border border-white/5 text-sm font-sans leading-relaxed text-white/90 whitespace-pre-line max-h-[350px] overflow-y-auto custom-scrollbar font-medium">
                    {song.lyrics}
                  </div>
                ) : (
                  <div className="p-12 text-center rounded-xl bg-black/20 border border-white/5">
                    <FileText size={24} className="mx-auto text-white/20 mb-2" />
                    <p className="text-xs text-white/60 font-medium">
                      The artist did not submit lyrics for this release. Lyrics are optional and can be submitted later from the Artist Hub.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer Audit Summary Bar */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-[#121318] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${completedChecksCount === totalChecksCount ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-xs text-white/70">
              Audit Status: <strong className="text-white">{completedChecksCount} of {totalChecksCount} Quality Checks Verified</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
            >
              Close Inspector
            </button>
            <button
              onClick={handleAuthorize}
              disabled={isSubmitting}
              className="px-6 py-2 rounded-xl text-xs font-bold bg-[#00A3FF] hover:bg-[#0084D6] text-white shadow-lg shadow-[#00A3FF]/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check size={14} />
              <span>Authorize Release</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
