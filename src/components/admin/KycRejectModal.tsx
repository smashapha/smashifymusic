import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldAlert, X, AlertTriangle, FileWarning, CheckCircle2, 
  Send, User, ExternalLink, Image as ImageIcon, Camera, RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface KycRejectModalProps {
  artistOrApplicant: any; // Can be a profile or an application
  isApplication?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const KYC_REJECT_PRESETS = [
  {
    id: 'personal_photo_instead_of_id',
    label: 'Submitted Personal Photo / Selfie (Not an ID Card)',
    badge: 'Common Error',
    reason: 'The uploaded file is a personal picture or selfie rather than an official Government-issued National ID, Driver\'s License, or Passport.'
  },
  {
    id: 'blurry_unreadable',
    label: 'Document is Blurry / Illegible',
    badge: 'Quality Issue',
    reason: 'The uploaded document image is blurry, low resolution, or too dark to verify name and identification numbers.'
  },
  {
    id: 'missing_corners_cutoff',
    label: 'Document is Cut Off / Incomplete',
    badge: 'Framing Issue',
    reason: 'The ID document is cropped, cut off, or missing essential corners/information required for compliance verification.'
  },
  {
    id: 'name_mismatch',
    label: 'Name on ID Does Not Match Profile',
    badge: 'Identity Mismatch',
    reason: 'The full legal name displayed on the identification document does not match the legal name registered on the account.'
  },
  {
    id: 'expired_invalid_type',
    label: 'Expired or Unsupported Document Type',
    badge: 'Invalid Document',
    reason: 'The submitted identification document is expired or is an unsupported card type (e.g., student ID, business card).'
  },
  {
    id: 'custom',
    label: 'Other Custom Compliance Reason',
    badge: 'Custom',
    reason: ''
  }
];

export const KycRejectModal: React.FC<KycRejectModalProps> = ({
  artistOrApplicant,
  isApplication = false,
  onClose,
  onSuccess
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>(KYC_REJECT_PRESETS[0].id);
  const [customReason, setCustomReason] = useState<string>(KYC_REJECT_PRESETS[0].reason);
  const [resetDocumentUrl, setResetDocumentUrl] = useState<boolean>(true);
  const [notifyArtist, setNotifyArtist] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [activePreview, setActivePreview] = useState<'id' | 'selfie'>('id');

  const personId = artistOrApplicant.id || artistOrApplicant.profile_id;
  const stageName = artistOrApplicant.stage_name || artistOrApplicant.full_name || 'Applicant';
  const realName = artistOrApplicant.full_name || artistOrApplicant.name || 'Not provided';
  const idDocumentUrl = artistOrApplicant.id_document_url;
  const selfieUrl = artistOrApplicant.selfie_url;

  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId);
    const found = KYC_REJECT_PRESETS.find(p => p.id === presetId);
    if (found && presetId !== 'custom') {
      setCustomReason(found.reason);
    } else if (presetId === 'custom') {
      setCustomReason('');
    }
  };

  const handleConfirmRejection = async () => {
    if (!customReason.trim()) {
      return toast.error('Please specify the KYC rejection reason.');
    }

    setLoading(true);
    try {
      const rejectionNote = customReason.trim();

      // 1. Update the profile
      const profileUpdates: any = {
        id_verified: false,
        is_verified: false,
        verified: false,
        verification_status: 'rejected'
      };

      if (resetDocumentUrl) {
        profileUpdates.id_document_url = null;
      }

      const { error: profileErr } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', personId);

      if (profileErr) {
        console.warn('Error updating profile verification status:', profileErr);
      }

      // 2. If it's an artist application or exists in artist_applications, update it too
      if (isApplication || artistOrApplicant.application_id || artistOrApplicant.profile_id) {
        const appId = artistOrApplicant.id || artistOrApplicant.application_id;
        try {
          await supabase
            .from('artist_applications')
            .update({
              status: 'rejected',
              admin_notes: `KYC Rejected: ${rejectionNote}`
            })
            .eq(isApplication ? 'id' : 'profile_id', appId);
        } catch (appErr) {
          console.warn('Could not update artist_applications table:', appErr);
        }
      }

      // 3. Send notification to the artist so they know what happened and how to fix it
      if (notifyArtist && personId) {
        try {
          const alertMessage = `KYC Verification Notice: Your ID verification was rejected. Reason: "${rejectionNote}". Please visit your Artist Hub settings and submit a valid, clear photo of your Government National ID or Passport to unlock full verification.`;
          
          await supabase.from('notifications').insert({
            profile_id: personId,
            user_type: 'artist',
            type: 'system_alert',
            message: alertMessage,
            link: '/artist-hub'
          });
        } catch (notifErr) {
          console.warn('Could not send KYC rejection notification:', notifErr);
        }
      }

      // 4. Log to activity_log for admin auditing
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('activity_log').insert({
          action: 'kyc_rejected',
          admin_id: user?.id || null,
          details: {
            target_id: personId,
            target_name: stageName,
            real_name: realName,
            reason: rejectionNote,
            preset: selectedPreset,
            document_reset: resetDocumentUrl,
            timestamp: new Date().toISOString()
          }
        });
      } catch (logErr) {
        console.warn('Failed to insert activity_log:', logErr);
      }

      toast.success(`KYC submission rejected for ${stageName}. Instructions sent.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error rejecting KYC:', err);
      toast.error(err.message || 'Failed to reject KYC');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-[#0F0F0F] border border-amber-500/30 rounded-[20px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-amber-500/20 bg-gradient-to-r from-amber-950/40 via-[#14110A] to-[#0F0F0F] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Camera size={22} />
            </div>
            <div>
              <h3 className="font-studio font-bold text-[16px] text-white flex items-center gap-2">
                Reject KYC Document Submission
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono uppercase tracking-wider">
                  Compliance
                </span>
              </h3>
              <p className="text-[12px] text-white/50">Reject invalid submissions (e.g. photos/selfies instead of government IDs)</p>
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
          {/* Target Profile Summary */}
          <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl flex items-center justify-between">
            <div>
              <p className="font-bold text-white text-[15px] flex items-center gap-2">
                {stageName}
                <span className="text-[12px] text-white/40 font-normal">({realName})</span>
              </p>
              <p className="text-white/50 text-[12px] mt-0.5">
                {artistOrApplicant.email || 'No email'} • {artistOrApplicant.phone || 'No phone'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">ID / NRC Declared</p>
              <p className="font-mono text-white/80 font-bold text-[12px]">
                {artistOrApplicant.nrc_number || artistOrApplicant.national_id_number || 'None'}
              </p>
            </div>
          </div>

          {/* Submitted Document Inspection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-semibold text-white/80 uppercase tracking-wider">
                Submitted Verification Media
              </label>
              <div className="flex gap-1.5 bg-black/50 p-1 rounded-lg border border-white/10 text-[11px]">
                <button
                  type="button"
                  onClick={() => setActivePreview('id')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activePreview === 'id' ? 'bg-white/20 text-white font-bold' : 'text-white/50'
                  }`}
                >
                  ID Document File
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreview('selfie')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activePreview === 'selfie' ? 'bg-white/20 text-white font-bold' : 'text-white/50'
                  }`}
                >
                  Selfie Photo
                </button>
              </div>
            </div>

            <div className="p-3 bg-black/40 border border-white/10 rounded-xl flex flex-col md:flex-row gap-4 items-center">
              <div className="w-full md:w-48 h-36 rounded-lg bg-white/5 border border-white/10 overflow-hidden relative group shrink-0 flex items-center justify-center">
                {activePreview === 'id' ? (
                  idDocumentUrl ? (
                    <>
                      <img 
                        src={idDocumentUrl} 
                        alt="Uploaded ID" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      />
                      <a
                        href={idDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[12px] font-bold gap-1.5 transition-opacity"
                      >
                        <ExternalLink size={14} /> Full View
                      </a>
                    </>
                  ) : (
                    <p className="text-white/30 text-[11px] text-center p-2">No ID Document Uploaded</p>
                  )
                ) : (
                  selfieUrl ? (
                    <>
                      <img 
                        src={selfieUrl} 
                        alt="Uploaded Selfie" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      />
                      <a
                        href={selfieUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[12px] font-bold gap-1.5 transition-opacity"
                      >
                        <ExternalLink size={14} /> Full View
                      </a>
                    </>
                  ) : (
                    <p className="text-white/30 text-[11px] text-center p-2">No Selfie Uploaded</p>
                  )
                )}
              </div>

              <div className="flex-1 space-y-1.5 text-[12px]">
                <p className="font-semibold text-white/90">
                  {activePreview === 'id' ? 'Reviewing Uploaded ID Proof' : 'Reviewing Uploaded Selfie'}
                </p>
                <p className="text-white/60 leading-relaxed">
                  Notice: If the file on the left shows a personal selfie, portrait, or random photo instead of an official National ID card or Passport, select the first preset below to request an official ID.
                </p>
                {idDocumentUrl && (
                  <a
                    href={idDocumentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#00A3FF] hover:underline text-[12px] font-medium pt-1"
                  >
                    Open Document in New Tab ↗
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Rejection Presets */}
          <div className="space-y-2">
            <label className="block text-[12px] font-semibold text-white/80 uppercase tracking-wider">
              Select Non-Compliance Reason
            </label>
            <div className="grid grid-cols-1 gap-2">
              {KYC_REJECT_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset.id)}
                    className={`p-3 rounded-xl text-left border transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-lg shadow-amber-950/30'
                        : 'bg-white/[0.02] border-white/10 text-white/70 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-4 h-4 rounded-full mt-0.5 shrink-0 flex items-center justify-center border ${
                        isSelected ? 'border-amber-400 bg-amber-500' : 'border-white/30'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                      <div>
                        <p className="font-semibold text-[13px] leading-tight">{preset.label}</p>
                        {preset.reason && (
                          <p className="text-[12px] text-white/50 mt-1 leading-snug">{preset.reason}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60 shrink-0 uppercase tracking-wider font-mono">
                      {preset.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Reason / Feedback Message */}
          <div className="space-y-1.5">
            <label className="block text-[12px] font-semibold text-white/80 uppercase tracking-wider">
              Detailed Notice to Artist
            </label>
            <textarea
              rows={3}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Explain to the artist why their submission was rejected and what official document is required..."
              className="w-full p-3.5 bg-black/60 border border-white/10 rounded-xl text-white placeholder-white/30 text-[13px] focus:outline-none focus:border-amber-500/50 transition-colors resize-none leading-relaxed"
            />
            <p className="text-[11px] text-white/40">
              This explanation will be delivered directly to the artist's dashboard notification center.
            </p>
          </div>

          {/* Resolution Options */}
          <div className="p-4 bg-amber-950/20 border border-amber-500/20 rounded-xl space-y-2.5">
            <div className="flex items-center gap-2">
              <input
                id="resetDocumentUrlCheckbox"
                type="checkbox"
                checked={resetDocumentUrl}
                onChange={(e) => setResetDocumentUrl(e.target.checked)}
                className="rounded border-white/20 bg-white/10 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="resetDocumentUrlCheckbox" className="text-white/90 text-[13px] cursor-pointer select-none">
                Reset document status so artist is immediately prompted to upload a valid ID
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="notifyArtistCheckboxKyc"
                type="checkbox"
                checked={notifyArtist}
                onChange={(e) => setNotifyArtist(e.target.checked)}
                className="rounded border-white/20 bg-white/10 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="notifyArtistCheckboxKyc" className="text-white/90 text-[13px] cursor-pointer select-none">
                Send instant notification to artist's notifications center
              </label>
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
            onClick={handleConfirmRejection}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-[13px] shadow-lg shadow-amber-950/50 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <AlertTriangle size={16} />
            {loading ? 'Rejecting Submission...' : 'Reject KYC Submission'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
