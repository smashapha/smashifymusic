import React, { useState, useEffect, useMemo } from 'react';
import { 
  Send, Plus, Users, Filter, CheckCircle2, 
  Trash2, ShieldCheck, Sparkles, MessageSquare, ArrowRight, X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { CrmSegmentRow } from './types';

interface Condition {
  field: string;
  operator: string;
  value: string;
}

export const AdminCampaigns = ({ 
  artists, 
  listeners, 
  agents,
  onNavigateToNotifications 
}: { 
  artists: any[]; 
  listeners: any[]; 
  agents: any[];
  onNavigateToNotifications?: (targetData: { audience: string; count: number }) => void;
}) => {
  const [segments, setSegments] = useState<CrmSegmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Segment Builder
  const [showBuilder, setShowBuilder] = useState(false);
  const [segmentName, setSegmentName] = useState('');
  const [baseAudience, setBaseAudience] = useState<'artists' | 'fans' | 'agents' | 'all'>('artists');
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [savingSegment, setSavingSegment] = useState(false);

  // Broadcast Composer
  const [activeSegmentForBroadcast, setActiveSegmentForBroadcast] = useState<CrmSegmentRow | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastLink, setBroadcastLink] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  useEffect(() => {
    fetchSegments();
  }, []);

  const fetchSegments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_segments')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setSegments(data);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  // Helper to resolve a segment to matching recipient IDs
  const resolveSegmentRecipients = (segment: CrmSegmentRow): Array<{ id: string; role: 'artist' | 'listener' }> => {
    let pool: any[] = [];
    const base = segment.definition?.base || 'artists';

    if (base === 'artists') pool = artists.map(a => ({ ...a, _role: 'artist' }));
    else if (base === 'fans') pool = listeners.map(l => ({ ...l, _role: 'listener' }));
    else if (base === 'agents') pool = agents.map(ag => ({ ...ag, id: ag.user_id || ag.id, _role: 'listener' }));
    else {
      pool = [
        ...artists.map(a => ({ ...a, _role: 'artist' })),
        ...listeners.map(l => ({ ...l, _role: 'listener' }))
      ];
    }

    const conds = segment.definition?.conditions || [];
    let filtered = pool;

    for (const cond of conds) {
      if (!cond.field || !cond.operator) continue;

      filtered = filtered.filter(item => {
        const val = item[cond.field];
        if (cond.operator === 'equals') {
          return String(val).toLowerCase() === cond.value.toLowerCase();
        }
        if (cond.operator === 'not_equals') {
          return String(val).toLowerCase() !== cond.value.toLowerCase();
        }
        if (cond.operator === 'contains') {
          return String(val).toLowerCase().includes(cond.value.toLowerCase());
        }
        if (cond.operator === 'is_true') {
          return !!val;
        }
        if (cond.operator === 'is_false') {
          return !val;
        }
        return true;
      });
    }

    return filtered.map(item => ({ id: item.id, role: item._role }));
  };

  const handleAddCondition = () => {
    if (conditions.length >= 3) {
      return toast.error('Maximum 3 conditions allowed per segment');
    }
    setConditions(prev => [...prev, { field: 'artist_tier', operator: 'equals', value: 'Rising Star' }]);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!segmentName.trim()) return toast.error('Segment name is required');
    setSavingSegment(true);

    try {
      const payload = {
        name: segmentName.trim(),
        definition: {
          base: baseAudience,
          conditions
        }
      };

      const { data, error } = await supabase
        .from('crm_segments')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      toast.success('Segment created');
      setSegments(prev => [data, ...prev]);
      setShowBuilder(false);
      setSegmentName('');
      setConditions([]);
    } catch (err: any) {
      toast.error('Failed to save segment: ' + err.message);
    } finally {
      setSavingSegment(false);
    }
  };

  const handleDeleteSegment = async (id: string) => {
    if (!confirm('Delete this saved segment?')) return;
    try {
      await supabase.from('crm_segments').delete().eq('id', id);
      setSegments(prev => prev.filter(s => s.id !== id));
      toast.success('Segment removed');
    } catch (err: any) {
      toast.error('Error deleting segment: ' + err.message);
    }
  };

  const handleSendSegmentBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSegmentForBroadcast) return;
    if (!broadcastMessage.trim()) return toast.error('Message is required');

    const targets = resolveSegmentRecipients(activeSegmentForBroadcast);
    if (targets.length === 0) return toast.error('No matching recipients in this segment');

    if (!confirm(`Send broadcast to ${targets.length} user(s) in segment "${activeSegmentForBroadcast.name}"?`)) return;

    setSendingBroadcast(true);
    try {
      // 1. Send notifications chunked
      const chunkSize = 500;
      for (let i = 0; i < targets.length; i += chunkSize) {
        const chunk = targets.slice(i, i + chunkSize);
        const payloads = chunk.map(t => ({
          profile_id: t.id,
          user_type: t.role,
          type: 'system_alert',
          message: broadcastMessage.trim(),
          link: broadcastLink.trim() || null
        }));
        
        await supabase.from('notifications').insert(payloads);
      }

      // 2. Write to campaign_log
      try {
        const logPayloads = targets.slice(0, 500).map(t => ({
          segment_name: activeSegmentForBroadcast.name,
          profile_id: t.id,
          channel: 'broadcast',
          message_ref: broadcastMessage.trim().slice(0, 200)
        }));
        await supabase.from('campaign_log').insert(logPayloads);
      } catch {
        // Ignored if table optional
      }

      toast.success(`Broadcast sent to ${targets.length} user(s)`);
      setActiveSegmentForBroadcast(null);
      setBroadcastMessage('');
      setBroadcastLink('');
    } catch (err: any) {
      toast.error('Broadcast failed: ' + err.message);
    } finally {
      setSendingBroadcast(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="p-5 bg-[#1A1A1A] border border-white/10 rounded-[16px] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Audience Segments & Campaigns</h2>
          <p className="text-[13px] text-[#737373] mt-1">
            Build filtered lists from your users and dispatch broadcast campaigns.
          </p>
        </div>

        <button
          onClick={() => setShowBuilder(true)}
          className="w-full sm:w-auto px-4 py-2 bg-[#00A3FF] hover:bg-[#00A3FF]/90 text-black font-semibold rounded-[10px] text-[13px] flex items-center justify-center gap-2 transition-colors shrink-0"
        >
          <Plus size={16} />
          Create Segment
        </button>
      </div>

      {/* Segments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full p-12 text-center bg-[#1A1A1A] border border-white/10 rounded-[16px]">
            <p className="text-[13px] text-white/40">Loading segments...</p>
          </div>
        ) : segments.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-3">
            <Users size={32} className="mx-auto text-[#737373] opacity-40" />
            <p className="text-[14px] text-white/60">No saved audience segments yet.</p>
            <button
              onClick={() => setShowBuilder(true)}
              className="text-[13px] text-[#00A3FF] hover:underline"
            >
              + Create your first segment (e.g. Rising Star Artists)
            </button>
          </div>
        ) : (
          segments.map(seg => {
            const count = resolveSegmentRecipients(seg).length;
            const conds = seg.definition?.conditions || [];

            return (
              <div
                key={seg.id}
                className="p-5 bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-4 hover:border-white/20 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[16px] font-semibold text-white">{seg.name}</h3>
                    <button
                      onClick={() => handleDeleteSegment(seg.id)}
                      className="p-1 text-[#737373] hover:text-[#EF4444] transition-colors"
                      title="Delete segment"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-[12px] text-[#737373]">
                    <span className="capitalize text-white/80 font-medium">Base: {seg.definition?.base || 'Artists'}</span>
                    <span>•</span>
                    <span className="font-mono text-[#00A3FF] font-semibold">{count} matching users</span>
                  </div>

                  {/* Conditions Pills */}
                  {conds.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {conds.map((c, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[11px] text-white/70">
                          {c.field} {c.operator.replace('_', ' ')} <strong className="text-white">{c.value}</strong>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#737373]">All users in base audience.</p>
                  )}
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-[#737373]">
                    Saved {formatDistanceToNow(new Date(seg.created_at), { addSuffix: true })}
                  </span>

                  <button
                    onClick={() => {
                      setActiveSegmentForBroadcast(seg);
                      setBroadcastMessage('');
                      setBroadcastLink('');
                    }}
                    className="px-3 py-1.5 bg-[#00A3FF]/15 border border-[#00A3FF]/30 text-[#00A3FF] hover:bg-[#00A3FF]/25 rounded-[10px] text-[12px] font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Send size={13} />
                    Use in Broadcast
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Segment Builder */}
      {showBuilder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Create Audience Segment</h3>
              <button onClick={() => setShowBuilder(false)} className="text-[#737373] hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSegment} className="space-y-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#737373] block mb-1.5">Segment Name</label>
                <input
                  type="text"
                  required
                  value={segmentName}
                  onChange={e => setSegmentName(e.target.value)}
                  placeholder="e.g., Rising Star Artists, Verified Creators..."
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white focus:outline-none focus:border-[#00A3FF]"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#737373] block mb-1.5">Base Audience</label>
                <select
                  value={baseAudience}
                  onChange={e => setBaseAudience(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#262626] border border-white/10 rounded-[10px] text-[13px] text-white focus:outline-none"
                >
                  <option value="artists">Artists only</option>
                  <option value="fans">Fans / Listeners only</option>
                  <option value="agents">Agents only</option>
                  <option value="all">All Platform Users</option>
                </select>
              </div>

              {/* Conditions Section */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] uppercase tracking-wider text-[#737373]">
                    Filters ({conditions.length}/3)
                  </label>
                  {conditions.length < 3 && (
                    <button
                      type="button"
                      onClick={handleAddCondition}
                      className="text-[12px] text-[#00A3FF] hover:underline"
                    >
                      + Add Condition
                    </button>
                  )}
                </div>

                {conditions.map((cond, index) => (
                  <div key={index} className="p-3 bg-white/5 rounded-[10px] space-y-2 border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase text-[#737373]">Rule {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCondition(index)}
                        className="text-[#737373] hover:text-[#EF4444]"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={cond.field}
                        onChange={e => {
                          const val = e.target.value;
                          setConditions(prev => prev.map((c, i) => i === index ? { ...c, field: val } : c));
                        }}
                        className="px-2 py-1.5 bg-[#262626] border border-white/10 rounded-[8px] text-[12px] text-white"
                      >
                        <option value="artist_tier">Tier</option>
                        <option value="verified">Verified</option>
                        <option value="location">Location</option>
                        <option value="genre">Genre</option>
                      </select>

                      <select
                        value={cond.operator}
                        onChange={e => {
                          const val = e.target.value;
                          setConditions(prev => prev.map((c, i) => i === index ? { ...c, operator: val } : c));
                        }}
                        className="px-2 py-1.5 bg-[#262626] border border-white/10 rounded-[8px] text-[12px] text-white"
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Not Equals</option>
                        <option value="contains">Contains</option>
                      </select>

                      <input
                        type="text"
                        value={cond.value}
                        onChange={e => {
                          const val = e.target.value;
                          setConditions(prev => prev.map((c, i) => i === index ? { ...c, value: val } : c));
                        }}
                        placeholder="Value"
                        className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-[8px] text-[12px] text-white"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowBuilder(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-[10px] text-[13px] text-white/70"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSegment}
                  className="px-5 py-2 bg-[#00A3FF] hover:bg-[#00A3FF]/90 text-black font-semibold rounded-[10px] text-[13px]"
                >
                  {savingSegment ? 'Saving...' : 'Save Segment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Broadcast Composer */}
      {activeSegmentForBroadcast && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Dispatch Broadcast</h3>
                <p className="text-[12px] text-[#737373]">
                  Segment: <strong className="text-white">{activeSegmentForBroadcast.name}</strong> ({resolveSegmentRecipients(activeSegmentForBroadcast).length} recipients)
                </p>
              </div>
              <button onClick={() => setActiveSegmentForBroadcast(null)} className="text-[#737373] hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendSegmentBroadcast} className="space-y-4">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#737373] block mb-1.5">Broadcast Message</label>
                <textarea
                  required
                  rows={4}
                  value={broadcastMessage}
                  onChange={e => setBroadcastMessage(e.target.value)}
                  placeholder="Type announcement or update message..."
                  className="w-full p-3 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white focus:outline-none focus:border-[#00A3FF]"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#737373] block mb-1.5">Action Link (Optional)</label>
                <input
                  type="text"
                  value={broadcastLink}
                  onChange={e => setBroadcastLink(e.target.value)}
                  placeholder="e.g., /pricing or /artist-hub"
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white focus:outline-none focus:border-[#00A3FF]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveSegmentForBroadcast(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-[10px] text-[13px] text-white/70"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingBroadcast}
                  className="px-5 py-2 bg-[#00A3FF] hover:bg-[#00A3FF]/90 text-black font-semibold rounded-[10px] text-[13px] flex items-center gap-2"
                >
                  <Send size={14} />
                  {sendingBroadcast ? 'Dispatching...' : 'Send Broadcast'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
