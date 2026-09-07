import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, AlertTriangle, CheckCircle2, Clock, 
  ArrowRight, ShieldCheck, Flame, ChevronDown, RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export type PipelineStage = 'lead' | 'onboarded' | 'active' | 'at_risk' | 'churned';

const STAGE_LABELS: Record<PipelineStage, { label: string; desc: string; color: string; border: string }> = {
  lead: { 
    label: 'Lead', 
    desc: 'Pending application or unapproved', 
    color: 'text-[#00A3FF] bg-[#00A3FF]/15',
    border: 'border-[#00A3FF]/30'
  },
  onboarded: { 
    label: 'Onboarded', 
    desc: 'Approved, Free tier, active in 14d', 
    color: 'text-[#A855F7] bg-[#A855F7]/15',
    border: 'border-[#A855F7]/30'
  },
  active: { 
    label: 'Active', 
    desc: 'Paid tier or regular platform activity', 
    color: 'text-[#22C55E] bg-[#22C55E]/15',
    border: 'border-[#22C55E]/30'
  },
  at_risk: { 
    label: 'At-Risk', 
    desc: 'Inactive >14d or sub expiring <7d', 
    color: 'text-[#F59E0B] bg-[#F59E0B]/15',
    border: 'border-[#F59E0B]/30'
  },
  churned: { 
    label: 'Churned', 
    desc: 'Sub expired >7d ago and no activity', 
    color: 'text-[#EF4444] bg-[#EF4444]/15',
    border: 'border-[#EF4444]/30'
  },
};

export const AdminPipeline = ({ 
  artists, 
  applications, 
  onSelectArtist 
}: { 
  artists: any[]; 
  applications: any[]; 
  onSelectArtist?: (artist: any) => void;
}) => {
  const [manualStageOverrides, setManualStageOverrides] = useState<Record<string, PipelineStage>>({});
  const [activeStageFilter, setActiveStageFilter] = useState<PipelineStage | 'all'>('all');
  const [movingId, setMovingId] = useState<string | null>(null);

  // Fetch recent manual moves from people_notes
  useEffect(() => {
    fetchStageOverrides();
  }, []);

  const fetchStageOverrides = async () => {
    try {
      const { data } = await supabase
        .from('people_notes')
        .select('profile_id, body, created_at')
        .like('body', 'moved to %')
        .order('created_at', { ascending: true });

      if (data) {
        const overrides: Record<string, PipelineStage> = {};
        for (const row of data) {
          const match = row.body.match(/moved to (lead|onboarded|active|at_risk|churned)/i);
          if (match && match[1]) {
            overrides[row.profile_id] = match[1].toLowerCase() as PipelineStage;
          }
        }
        setManualStageOverrides(overrides);
      }
    } catch {
      // Ignored if table in-flight
    }
  };

  // Classify each artist into a pipeline stage
  const categorizedPipeline = useMemo(() => {
    const pipeline: Record<PipelineStage, any[]> = {
      lead: [],
      onboarded: [],
      active: [],
      at_risk: [],
      churned: []
    };

    // 1. Leads from applications that are pending
    for (const app of applications) {
      if (app.status === 'pending') {
        pipeline.lead.push({
          id: app.profile_id || app.id,
          name: app.stage_name || app.full_name || 'New Applicant',
          email: app.email,
          stage_name: app.stage_name,
          artist_tier: 'Pending',
          created_at: app.created_at,
          last_activity: 'Applied to Smashify',
          is_lead: true
        });
      }
    }

    // 2. Classify artists
    const now = Date.now();
    for (const artist of artists) {
      // Check manual override first
      if (manualStageOverrides[artist.id]) {
        const targetStage = manualStageOverrides[artist.id];
        pipeline[targetStage].push(artist);
        continue;
      }

      // Check if unapproved
      if (artist.approved === false || artist.is_approved === false) {
        pipeline.lead.push(artist);
        continue;
      }

      const subEnds = artist.subscription_ends ? new Date(artist.subscription_ends).getTime() : null;
      const daysUntilExpiry = subEnds ? Math.ceil((subEnds - now) / (1000 * 60 * 60 * 24)) : null;
      const lastActiveDate = artist.updated_at || artist.created_at;
      const daysInactive = lastActiveDate ? Math.floor((now - new Date(lastActiveDate).getTime()) / (1000 * 60 * 60 * 24)) : 99;

      const hasPaidTier = artist.artist_tier && artist.artist_tier !== 'Free';

      // Churned logic: sub expired >7d ago AND inactive >30d
      if (subEnds && daysUntilExpiry !== null && daysUntilExpiry < -7 && daysInactive > 30) {
        pipeline.churned.push({ ...artist, daysUntilExpiry, daysInactive });
      }
      // At-risk logic: inactive >14d OR sub expiring <7d
      else if (daysInactive > 14 || (subEnds && daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry >= -7)) {
        pipeline.at_risk.push({ ...artist, daysUntilExpiry, daysInactive, isAtRisk: true });
      }
      // Active logic: has paid tier OR active in 14d
      else if (hasPaidTier || daysInactive <= 14) {
        pipeline.active.push({ ...artist, daysUntilExpiry, daysInactive });
      }
      // Onboarded logic: approved, Free tier, active in 14d
      else {
        pipeline.onboarded.push({ ...artist, daysUntilExpiry, daysInactive });
      }
    }

    // Sort: At-risk items sort by daysUntilExpiry ascending
    pipeline.at_risk.sort((a, b) => (a.daysUntilExpiry ?? 99) - (b.daysUntilExpiry ?? 99));

    return pipeline;
  }, [artists, applications, manualStageOverrides]);

  const handleMoveStage = async (artistId: string, newStage: PipelineStage) => {
    setMovingId(artistId);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const body = `moved to ${newStage}`;

      await supabase.from('people_notes').insert({
        profile_id: artistId,
        body,
        created_by: authData?.user?.id
      });

      setManualStageOverrides(prev => ({
        ...prev,
        [artistId]: newStage
      }));

      toast.success(`Artist moved to ${STAGE_LABELS[newStage].label}`);
    } catch (err: any) {
      toast.error('Failed to move stage: ' + err.message);
    } finally {
      setMovingId(null);
    }
  };

  const totalArtistsInPipeline = 
    categorizedPipeline.lead.length +
    categorizedPipeline.onboarded.length +
    categorizedPipeline.active.length +
    categorizedPipeline.at_risk.length +
    categorizedPipeline.churned.length;

  return (
    <div className="space-y-6">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(Object.keys(STAGE_LABELS) as PipelineStage[]).map(stageKey => {
          const count = categorizedPipeline[stageKey].length;
          const isSelected = activeStageFilter === stageKey;
          const stageInfo = STAGE_LABELS[stageKey];

          return (
            <button
              key={stageKey}
              onClick={() => setActiveStageFilter(isSelected ? 'all' : stageKey)}
              className={`p-4 bg-[#1A1A1A] border rounded-[16px] text-left transition-all relative overflow-hidden ${
                isSelected 
                  ? `${stageInfo.border} ring-1 ring-[#00A3FF]` 
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${stageInfo.color}`}>
                  {stageInfo.label}
                </span>
                <span className="font-mono text-lg font-bold text-white">{count}</span>
              </div>
              <p className="text-[11px] text-[#737373] leading-tight line-clamp-2">
                {stageInfo.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* Stage Filter Row */}
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#737373] px-1">
        <span>Pipeline Directory ({totalArtistsInPipeline} total)</span>
        {activeStageFilter !== 'all' && (
          <button 
            onClick={() => setActiveStageFilter('all')}
            className="text-[#00A3FF] hover:underline"
          >
            Show All Stages
          </button>
        )}
      </div>

      {/* Stages Display */}
      <div className="space-y-8">
        {(Object.keys(STAGE_LABELS) as PipelineStage[])
          .filter(stageKey => activeStageFilter === 'all' || activeStageFilter === stageKey)
          .map(stageKey => {
            const list = categorizedPipeline[stageKey];
            const stageInfo = STAGE_LABELS[stageKey];

            return (
              <div key={stageKey} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-[8px] text-[11px] font-semibold uppercase tracking-wider ${stageInfo.color}`}>
                    {stageInfo.label}
                  </span>
                  <span className="text-[13px] text-[#737373]">
                    {list.length} {list.length === 1 ? 'artist' : 'artists'}
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>

                {list.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-white/10 rounded-[16px] bg-white/[0.01]">
                    <p className="text-[13px] text-white/40">No artists in {stageInfo.label} stage.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {list.map(artist => (
                      <div
                        key={artist.id}
                        className="p-4 bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-3 hover:border-white/20 transition-all"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-white overflow-hidden shrink-0">
                              {artist.avatar_url ? (
                                <img src={artist.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                (artist.stage_name || artist.name || 'A')[0]
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-[14px] font-semibold text-white truncate">
                                {artist.stage_name || artist.name || artist.full_name || 'Unnamed Artist'}
                              </h4>
                              <div className="flex items-center gap-2 text-[11px] text-[#737373] mt-0.5">
                                <span>{artist.artist_tier || 'Free'}</span>
                                {artist.daysUntilExpiry !== undefined && artist.daysUntilExpiry !== null && (
                                  <>
                                    <span>•</span>
                                    <span className={artist.daysUntilExpiry <= 3 ? 'text-[#EF4444] font-mono' : 'font-mono'}>
                                      {artist.daysUntilExpiry > 0 
                                        ? `${artist.daysUntilExpiry}d left` 
                                        : `expired ${Math.abs(artist.daysUntilExpiry)}d ago`}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Move to Dropdown */}
                          <div className="relative shrink-0">
                            <select
                              value={stageKey}
                              disabled={movingId === artist.id}
                              onChange={e => handleMoveStage(artist.id, e.target.value as PipelineStage)}
                              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[10px] text-[12px] text-white focus:outline-none focus:border-[#00A3FF] transition-all cursor-pointer"
                            >
                              <option value="lead">Lead</option>
                              <option value="onboarded">Onboarded</option>
                              <option value="active">Active</option>
                              <option value="at_risk">At-Risk</option>
                              <option value="churned">Churned</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
};
