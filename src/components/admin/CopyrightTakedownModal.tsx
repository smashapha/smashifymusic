import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, X, AlertTriangle, FileWarning, CheckCircle2, 
  Send, User, Music2, ExternalLink 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface CopyrightTakedownModalProps {
  song: any;
  onClose: () => void;
  onSuccess: () => void;
}

const COPYRIGHT_PRESETS = [
  {
    id: 'personal_photo_selfie',
    label: 'Unauthorized Beat / Stolen Instrumental',
    reason: 'Unauthorized use of third-party instrumental beat without commercial licensing or producer clearance.'
  },
  {
    id: 'uncleared_sample',
    label: 'Uncleared Master Sample / Remix',
    reason: 'Contains uncleared master audio samples from another registered commercial release.'
  },
  {
    id: 'direct_audio_rip',
    label: 'Direct Ripped Audio / Impersonation',
    reason: 'Audio is a direct rip or unauthorized re-upload of another recording artist\'s release.'
  },
  {
    id: 'formal_dmca_notice',
    label: 'Formal DMCA / Copyright Owner Takedown Notice',
    reason: 'Received formal takedown notice from rights-holder / copyright collection agency (e.g., COSOMA).'
  },
  {
    id: 'false_authorship',
    label: 'False Authorship / Fraudulent Upload',
    reason: 'Uploader does not hold distribution rights or master ownership for this sound recording.'
  },
  {
    id: 'custom',
    label: 'Custom Copyright Violation',
    reason: ''
  }
];

export const CopyrightTakedownModal: React.FC<CopyrightTakedownModalProps> = ({
  song,
  onClose,
  onSuccess
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>(COPYRIGHT_PRESETS[0].id);
  const [claimantName, setClaimantName] = useState<string>('');
  const [claimReference, setClaimReference] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>(COPYRIGHT_PRESETS[0].reason);
  const [actionSeverity, setActionSeverity] = useState<'standard' | 'strike'>('strike');
  const [notifyArtist, setNotifyArtist] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const found = COPYRIGHT_PRESETS.find(p => p.id === presetId);
    if (found && presetId !== 'custom') {
      setCustomReason(found.reason);
    } else if (presetId === 'custom') {
      setCustomReason('');
    }
  };

  const handleConfirmTakedown = async () => {
    if (!customReason.trim()) {
      return toast.error('Please specify the copyright infringement reason.');
    }

    setLoading(true);
    try {
      const fullTakedownNote = `Copyright Infringement: ${customReason.trim()}${
        claimantName.trim() ? ` [Claimant: ${claimantName.trim()}${claimReference ? ` Ref: ${claimReference.trim()}` : ''}]` : ''
      }`;

      // 1. Update the song in Supabase: take down immediately
      const { error: songError } = await supabase
        .from('songs')
        .update({
          approved: false,
          status: 'copyright_takedown',
          is_active: false,
          vaulted_at: new Date().toISOString(),
          vaulted_reason: fullTakedownNote
        })
        .eq('id', song.id);

      if (songError) throw songError;

      // 2. Send notification to the artist
      if (notifyArtist && song.artist_id) {
        try {
          const alertMessage = `URGENT - COPYRIGHT TAKEDOWN: Your release "${song.title}" has been taken down due to a copyright infringement report: ${customReason.trim()}. Public streaming and monetization have been disabled. If you possess valid master clearance, contact compliance@smashify.com with your documentation.`;
          
          await supabase.from('notifications').insert({
            profile_id: song.artist_id,
            user_type: 'artist',
            type: 'system_alert',
            message: alertMessage,
            link: '/artist-hub'
          });
        } catch (notifErr) {
          console.warn('Failed to insert takedown notification:', notifErr);
        }
      }

      // 3. Log to activity_log for admin governance
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('activity_log').insert({
          action: 'copyright_takedown',
          admin_id: user?.id || null,
          details: {
            song_id: song.id,
            song_title: song.title,
            artist_id: song.artist_id,
            artist_name: song.profiles?.stage_name || 'Unknown',
            reason: customReason.trim(),
            claimant: claimantName.trim() || null,
            claim_ref: claimReference.trim() || null,
            severity: actionSeverity,
            timestamp: new Date().toISOString()
          }
        });
      } catch (logErr) {
        console.warn('Failed to insert activity_log:', logErr);
      }

      toast.success(`Song "${song.title}" taken down under copyright.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error during copyright takedown:', err);
      toast.error(err.message || 'Failed to process copyright takedown');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-[#0D0D0D] border border-red-500/30 rounded-[20px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-red-500/20 bg-gradient-to-r from-red-950/40 via-[#140A0A] to-[#0D0D0D] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h3 className="font-studio font-bold text-[16px] text-white flex items-center gap-2">
                Copyright Infringement Takedown
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-wider font-mono">
                  DMCA / Rights Protection
                </span>
              </h3>
              <p className="text-[12px] text-white/50">Halt broadcasting, revoke access, and notify artist</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-[13px]">
          {/* Target Track Preview */}
          <div className="p-3.5 bg-white/[0.03] border border-white/10 rounded-xl flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-lg bg-white/5 overflow-hidden border border-white/10 shrink-0">
              {song.cover_url ? (
                <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/30">
                  <Music2 size={20} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-[14px] truncate">{song.title}</p>
              <p className="text-white/60 text-[12px] flex items-center gap-2 mt-0.5 truncate">
                <span className="text-white/80 font-medium">{song.profiles?.stage_name || 'Unknown Artist'}</span>
                <span>•</span>
                <span className="text-white/40">{song.genre || 'General'}</span>
                <span>•</span>
                <span className="text-white/40">Plays: {song.plays || 0}</span>
              </p>
            </div>
            <div className="text-right">
              <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                song.approved ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}>
                {song.approved ? 'Broadcasting Now' : 'In Review'}
              </span>
            </div>
          </div>

          {/* Infringement Preset Selection */}
          <div className="space-y-2">
            <label className="block text-[12px] font-semibold text-white/80 uppercase tracking-wider">
              1. Infringement Classification
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {COPYRIGHT_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetChange(preset.id)}
                    className={`p-3 rounded-xl text-left border transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-red-500/15 border-red-500/50 text-white shadow-lg shadow-red-950/30'
                        : 'bg-white/[0.02] border-white/10 text-white/70 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full mt-0.5 shrink-0 flex items-center justify-center border ${
                      isSelected ? 'border-red-400 bg-red-500' : 'border-white/30'
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className="font-semibold text-[13px] leading-tight">{preset.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Claimant & Reference Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-white/60 uppercase tracking-wider mb-1">
                Claimant / Rights-Holder (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. COSOMA, Sony Music, Producer Name"
                value={claimantName}
                onChange={(e) => setClaimantName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white placeholder-white/30 text-[13px] focus:outline-none focus:border-red-500/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-white/60 uppercase tracking-wider mb-1">
                Claim / Reference ID (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. DMCA-2026-9811"
                value={claimReference}
                onChange={(e) => setClaimReference(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-black/60 border border-white/10 rounded-xl text-white placeholder-white/30 text-[13px] focus:outline-none focus:border-red-500/50 transition-colors font-mono"
              />
            </div>
          </div>

          {/* Detailed Reason Message */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-white/80 uppercase tracking-wider">
              2. Specific Violation Details & Legal Basis
            </label>
            <textarea
              rows={3}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="State the specific legal or audio copyright violation details..."
              className="w-full p-3.5 bg-black/60 border border-white/10 rounded-xl text-white placeholder-white/30 text-[13px] focus:outline-none focus:border-red-500/50 transition-colors resize-none leading-relaxed"
            />
            <p className="text-[11px] text-white/40">
              This message is logged in the track's governance record and sent directly to the artist.
            </p>
          </div>

          {/* Action Severity & Notification Toggle */}
          <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white text-[13px]">Action Severity</p>
                <p className="text-[11px] text-white/50">Apply a recorded copyright strike to artist profile</p>
              </div>
              <div className="flex bg-black/50 p-1 rounded-lg border border-white/10 text-[12px]">
                <button
                  type="button"
                  onClick={() => setActionSeverity('standard')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    actionSeverity === 'standard' ? 'bg-white/20 text-white font-bold' : 'text-white/50'
                  }`}
                >
                  Unpublish Only
                </button>
                <button
                  type="button"
                  onClick={() => setActionSeverity('strike')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    actionSeverity === 'strike' ? 'bg-red-500 text-white font-bold' : 'text-white/50'
                  }`}
                >
                  Issue Strike
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  id="notifyArtistCheckbox"
                  type="checkbox"
                  checked={notifyArtist}
                  onChange={(e) => setNotifyArtist(e.target.checked)}
                  className="rounded border-white/20 bg-white/10 text-red-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="notifyArtistCheckbox" className="text-white/80 cursor-pointer select-none">
                  Send immediate priority alert to Artist Hub
                </label>
              </div>
              <span className="text-[11px] text-red-400/80 font-mono">Real-time alert</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-white/10 bg-[#0A0A0A] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 text-[13px] font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmTakedown}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-[13px] font-bold shadow-lg shadow-red-950/50 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <ShieldAlert size={16} />
            {loading ? 'Processing Takedown...' : 'Execute Copyright Takedown'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
