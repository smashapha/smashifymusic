import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, ArrowLeft, Plus, Clock, MessageSquare, Ticket, 
  Wallet, ShieldCheck, Mail, Calendar, CheckCircle2, AlertCircle, 
  Send, DollarSign, Activity, FileText, ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { ActivityLogRow, PeopleNoteRow, TicketRow, HealthStatus } from './types';

interface PersonItem {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  type: 'artist' | 'fan' | 'agent';
  created_at: string;
  stage_name?: string;
  artist_tier?: string;
  verified?: boolean;
  wallet_balance?: number;
  followers_count?: number;
  last_activity_event?: string;
  last_activity_date?: string;
  health: HealthStatus;
  total_paid_in?: number;
  tx_count?: number;
}

export const AdminPeople = ({ 
  artists, 
  listeners, 
  agents,
  onSelectPerson 
}: { 
  artists: any[]; 
  listeners: any[]; 
  agents: any[];
  onSelectPerson?: (person: any) => void;
}) => {
  const [selectedPerson, setSelectedPerson] = useState<PersonItem | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'artists' | 'fans' | 'agents'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Person 360 State
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);
  const [notes, setNotes] = useState<PeopleNoteRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketPriority, setTicketPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [ticketSource, setTicketSource] = useState<'whatsapp' | 'in_app' | 'email'>('whatsapp');
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [personStats, setPersonStats] = useState({ totalPaid: 0, txCount: 0 });
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Global activity map for health calculation
  const [latestActivities, setLatestActivities] = useState<Record<string, { event: string; date: string }>>({});

  useEffect(() => {
    fetchGlobalActivities();
  }, []);

  const fetchGlobalActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('profile_id, event, created_at')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && data) {
        const actMap: Record<string, { event: string; date: string }> = {};
        for (const row of data) {
          if (row.profile_id && !actMap[row.profile_id]) {
            actMap[row.profile_id] = { event: row.event, date: row.created_at };
          }
        }
        setLatestActivities(actMap);
      }
    } catch {
      // Ignore if table still propagating
    }
  };

  // Compile unified list
  const peopleList: PersonItem[] = useMemo(() => {
    const list: PersonItem[] = [];

    // Artists
    for (const a of artists) {
      const lastAct = latestActivities[a.id];
      const actDate = lastAct?.date || a.updated_at || a.created_at;
      const daysAgo = actDate ? (Date.now() - new Date(actDate).getTime()) / (1000 * 60 * 60 * 24) : 999;
      const health: HealthStatus = daysAgo <= 7 ? 'green' : daysAgo <= 14 ? 'amber' : 'red';

      list.push({
        id: a.id,
        name: a.stage_name || a.full_name || 'Unnamed Artist',
        email: a.email,
        avatar_url: a.avatar_url,
        type: 'artist',
        created_at: a.created_at || new Date().toISOString(),
        stage_name: a.stage_name,
        artist_tier: a.artist_tier || 'Free',
        verified: !!(a.verified || a.is_verified),
        wallet_balance: a.wallet_balance || 0,
        followers_count: a.followers_count || 0,
        last_activity_event: lastAct?.event || 'Joined platform',
        last_activity_date: actDate,
        health
      });
    }

    // Listeners / Fans
    for (const l of listeners) {
      if (list.some(p => p.id === l.id)) continue;
      const lastAct = latestActivities[l.id];
      const actDate = lastAct?.date || l.updated_at || l.created_at;
      const daysAgo = actDate ? (Date.now() - new Date(actDate).getTime()) / (1000 * 60 * 60 * 24) : 999;
      const health: HealthStatus = daysAgo <= 7 ? 'green' : daysAgo <= 14 ? 'amber' : 'red';

      list.push({
        id: l.id,
        name: l.full_name || 'Fan Member',
        email: l.email,
        avatar_url: l.avatar_url,
        type: 'fan',
        created_at: l.created_at || new Date().toISOString(),
        last_activity_event: lastAct?.event || 'Account created',
        last_activity_date: actDate,
        health
      });
    }

    // Agents
    for (const ag of agents) {
      const agId = ag.user_id || ag.id;
      const existing = list.find(p => p.id === agId);
      if (existing) {
        existing.type = 'agent';
      } else {
        const lastAct = latestActivities[agId];
        const actDate = lastAct?.date || ag.created_at;
        const daysAgo = actDate ? (Date.now() - new Date(actDate).getTime()) / (1000 * 60 * 60 * 24) : 999;
        const health: HealthStatus = daysAgo <= 7 ? 'green' : daysAgo <= 14 ? 'amber' : 'red';

        list.push({
          id: agId,
          name: ag.user_profiles?.full_name || ag.full_name || 'Smashify Agent',
          email: ag.phone_number || ag.email,
          type: 'agent',
          created_at: ag.created_at || new Date().toISOString(),
          last_activity_event: lastAct?.event || 'Agent activated',
          last_activity_date: actDate,
          health
        });
      }
    }

    return list;
  }, [artists, listeners, agents, latestActivities]);

  // Filtered list
  const filteredPeople = useMemo(() => {
    return peopleList.filter(p => {
      if (typeFilter === 'artists' && p.type !== 'artist') return false;
      if (typeFilter === 'fans' && p.type !== 'fan') return false;
      if (typeFilter === 'agents' && p.type !== 'agent') return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.stage_name && p.stage_name.toLowerCase().includes(q)) ||
        p.id.toLowerCase().includes(q)
      );
    });
  }, [peopleList, typeFilter, searchQuery]);

  // Open 360 detail
  const handleOpen360 = async (person: PersonItem) => {
    setSelectedPerson(person);
    setLoadingDetails(true);

    try {
      // 1. Fetch activity logs
      const { data: logs } = await supabase
        .from('activity_log')
        .select('*')
        .eq('profile_id', person.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setActivityLogs(logs || []);

      // 2. Fetch people notes
      const { data: noteRows } = await supabase
        .from('people_notes')
        .select('*')
        .eq('profile_id', person.id)
        .order('created_at', { ascending: false });
      setNotes(noteRows || []);

      // 3. Fetch tickets
      const { data: ticketRows } = await supabase
        .from('tickets')
        .select('*')
        .eq('profile_id', person.id)
        .order('created_at', { ascending: false });
      setTickets(ticketRows || []);

      // 4. Compute stats (transactions)
      const { data: txs } = await supabase
        .from('transactions')
        .select('gross_amount, status')
        .or(`user_id.eq.${person.id},fan_id.eq.${person.id}`)
        .eq('status', 'completed');

      const totalPaid = (txs || []).reduce((acc: number, t: any) => acc + Number(t.gross_amount || 0), 0);
      setPersonStats({
        totalPaid,
        txCount: txs?.length || 0
      });
    } catch (err) {
      console.error('Error fetching 360 profile:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedPerson) return;
    setAddingNote(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const payload: Partial<PeopleNoteRow> = {
        profile_id: selectedPerson.id,
        body: newNote.trim(),
        created_by: authData?.user?.id
      };

      const { data, error } = await supabase
        .from('people_notes')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      toast.success('Note saved');
      setNotes(prev => [data, ...prev]);
      setNewNote('');
    } catch (err: any) {
      toast.error('Failed to save note: ' + err.message);
    } finally {
      setAddingNote(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !selectedPerson) return;
    setCreatingTicket(true);

    try {
      const payload = {
        profile_id: selectedPerson.id,
        subject: ticketSubject.trim(),
        priority: ticketPriority,
        source: ticketSource,
        status: 'open'
      };

      const { data, error } = await supabase
        .from('tickets')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      toast.success('Ticket opened');
      setTickets(prev => [data, ...prev]);
      setShowNewTicketModal(false);
      setTicketSubject('');
    } catch (err: any) {
      toast.error('Failed to create ticket: ' + err.message);
    } finally {
      setCreatingTicket(false);
    }
  };

  const renderHealthBadge = (health: HealthStatus) => {
    if (health === 'green') {
      return (
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
          Active (7d)
        </span>
      );
    }
    if (health === 'amber') {
      return (
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
          Idle (7–14d)
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-[11px] font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
        Inactive (&gt;14d)
      </span>
    );
  };

  const renderTypeChip = (type: string) => {
    switch (type) {
      case 'artist':
        return <span className="px-2 py-0.5 rounded bg-[#00A3FF]/15 text-[#00A3FF] text-[11px] font-medium uppercase tracking-wider">Artist</span>;
      case 'agent':
        return <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[11px] font-medium uppercase tracking-wider">Agent</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-white/10 text-white/70 text-[11px] font-medium uppercase tracking-wider">Fan</span>;
    }
  };

  // If 360 view open
  if (selectedPerson) {
    return (
      <div className="space-y-6">
        {/* Back header */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setSelectedPerson(null)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[10px] text-[13px] text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Back to People Directory
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewTicketModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00A3FF]/15 border border-[#00A3FF]/30 text-[#00A3FF] hover:bg-[#00A3FF]/25 rounded-[10px] text-[13px] font-medium transition-colors"
            >
              <Ticket size={14} />
              Open Ticket
            </button>
          </div>
        </div>

        {/* 360 Header Card */}
        <div className="p-6 bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center text-white text-xl font-bold">
                {selectedPerson.avatar_url ? (
                  <img src={selectedPerson.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  selectedPerson.name[0]
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-semibold text-white">{selectedPerson.name}</h2>
                  {renderTypeChip(selectedPerson.type)}
                  {selectedPerson.verified && <ShieldCheck size={16} className="text-[#00A3FF]" />}
                  {renderHealthBadge(selectedPerson.health)}
                </div>
                <div className="flex items-center gap-3 text-[13px] text-[#737373] mt-1 flex-wrap">
                  {selectedPerson.email && <span>{selectedPerson.email}</span>}
                  <span>•</span>
                  <span>Joined {formatDistanceToNow(new Date(selectedPerson.created_at), { addSuffix: true })}</span>
                  {selectedPerson.artist_tier && (
                    <>
                      <span>•</span>
                      <span className="text-white/80">{selectedPerson.artist_tier} Tier</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right flex md:flex-col justify-between items-end">
              <p className="text-[11px] uppercase tracking-wider text-[#737373]">UUID</p>
              <p className="text-[12px] font-mono text-white/60 select-all">{selectedPerson.id}</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/5">
            <div className="p-4 bg-white/5 rounded-[12px]">
              <p className="text-[11px] uppercase tracking-wider text-[#737373] mb-1">Total Paid In</p>
              <p className="text-lg font-mono text-[#22C55E]">MK {personStats.totalPaid.toLocaleString()}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-[12px]">
              <p className="text-[11px] uppercase tracking-wider text-[#737373] mb-1">Purchases / Tips</p>
              <p className="text-lg font-mono text-white">{personStats.txCount}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-[12px]">
              <p className="text-[11px] uppercase tracking-wider text-[#737373] mb-1">Wallet Balance</p>
              <p className="text-lg font-mono text-white">MK {(selectedPerson.wallet_balance || 0).toLocaleString()}</p>
            </div>
            <div className="p-4 bg-white/5 rounded-[12px]">
              <p className="text-[11px] uppercase tracking-wider text-[#737373] mb-1">Followers</p>
              <p className="text-lg font-mono text-white">{(selectedPerson.followers_count || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* 3-Column Split: Activity Timeline | Notes | Tickets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Timeline */}
          <div className="p-5 bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-white flex items-center gap-2">
                <Activity size={16} className="text-[#00A3FF]" />
                Activity Timeline
              </h3>
              <span className="text-[11px] uppercase tracking-wider text-[#737373]">{activityLogs.length} events</span>
            </div>

            {loadingDetails ? (
              <div className="py-8 text-center text-white/40 text-[13px]">Loading timeline...</div>
            ) : activityLogs.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-white/10 rounded-[12px]">
                <p className="text-[13px] text-white/40">No activity logged yet.</p>
                <p className="text-[11px] text-white/30 mt-1">Triggers automatically capture events.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 no-scrollbar">
                {activityLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-white/5 rounded-[10px] space-y-1 text-[13px]">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white capitalize">
                        {log.event.replace(/_/g, ' ')}
                      </span>
                      {log.amount && log.amount > 0 ? (
                        <span className="font-mono text-[#22C55E] text-[12px] font-bold">
                          +MK {Number(log.amount).toLocaleString()}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-[#737373]">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* People Notes */}
          <div className="p-5 bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-white flex items-center gap-2">
                <FileText size={16} className="text-[#00A3FF]" />
                Admin Notes
              </h3>
              <span className="text-[11px] uppercase tracking-wider text-[#737373]">{notes.length} notes</span>
            </div>

            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Write a note (e.g., Spoke on WhatsApp, wants Elite upgrade)..."
                rows={2}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#00A3FF] transition-all resize-none"
              />
              <button
                type="submit"
                disabled={addingNote || !newNote.trim()}
                className="w-full py-2 bg-[#00A3FF] hover:bg-[#00A3FF]/90 text-black font-semibold rounded-[10px] text-[13px] transition-colors disabled:opacity-50"
              >
                {addingNote ? 'Saving...' : 'Add Note'}
              </button>
            </form>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
              {notes.length === 0 ? (
                <p className="text-[13px] text-white/40 text-center py-4">No notes recorded yet.</p>
              ) : (
                notes.map(n => (
                  <div key={n.id} className="p-3 bg-white/5 border border-white/5 rounded-[10px] space-y-1">
                    <p className="text-[13px] text-white/90 whitespace-pre-wrap">{n.body}</p>
                    <p className="text-[11px] text-[#737373]">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tickets */}
          <div className="p-5 bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-semibold text-white flex items-center gap-2">
                <Ticket size={16} className="text-[#00A3FF]" />
                Support Tickets
              </h3>
              <span className="text-[11px] uppercase tracking-wider text-[#737373]">{tickets.length} tickets</span>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 no-scrollbar">
              {tickets.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-white/10 rounded-[12px]">
                  <p className="text-[13px] text-white/40">No tickets for this user.</p>
                  <button
                    onClick={() => setShowNewTicketModal(true)}
                    className="mt-2 text-[12px] text-[#00A3FF] hover:underline"
                  >
                    + Open ticket
                  </button>
                </div>
              ) : (
                tickets.map(t => (
                  <div key={t.id} className="p-3 bg-white/5 border border-white/5 rounded-[10px] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-white">{t.subject}</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium capitalize ${
                        t.status === 'resolved' || t.status === 'closed'
                          ? 'bg-[#22C55E]/15 text-[#22C55E]'
                          : t.status === 'in_progress'
                          ? 'bg-[#F59E0B]/15 text-[#F59E0B]'
                          : 'bg-[#00A3FF]/15 text-[#00A3FF]'
                      }`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#737373]">
                      <span className="capitalize">{t.source} • {t.priority} priority</span>
                      <span>{formatDistanceToNow(new Date(t.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Modal: New Ticket */}
        {showNewTicketModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-6 max-w-md w-full space-y-4">
              <h3 className="text-lg font-semibold text-white">Open Ticket for {selectedPerson.name}</h3>
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#737373] block mb-1.5">Subject</label>
                  <input
                    type="text"
                    required
                    value={ticketSubject}
                    onChange={e => setTicketSubject(e.target.value)}
                    placeholder="e.g., Payout delayed, WhatsApp query..."
                    className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white focus:outline-none focus:border-[#00A3FF]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-[#737373] block mb-1.5">Source</label>
                    <select
                      value={ticketSource}
                      onChange={e => setTicketSource(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#262626] border border-white/10 rounded-[10px] text-[13px] text-white focus:outline-none"
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="in_app">In-App</option>
                      <option value="email">Email</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-[#737373] block mb-1.5">Priority</label>
                    <select
                      value={ticketPriority}
                      onChange={e => setTicketPriority(e.target.value as any)}
                      className="w-full px-3 py-2 bg-[#262626] border border-white/10 rounded-[10px] text-[13px] text-white focus:outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewTicketModal(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-[10px] text-[13px] text-white/70 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTicket}
                    className="px-5 py-2 bg-[#00A3FF] hover:bg-[#00A3FF]/90 text-black font-semibold rounded-[10px] text-[13px] transition-colors disabled:opacity-50"
                  >
                    {creatingTicket ? 'Creating...' : 'Create Ticket'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Directory View
  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="p-5 bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full sm:w-96">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737373]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search people by name, email, stage name, UUID..."
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#00A3FF] transition-all"
            />
          </div>

          {/* Type Chips */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto no-scrollbar">
            {(['all', 'artists', 'fans', 'agents'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3.5 py-1.5 rounded-[10px] text-[13px] font-medium capitalize transition-all shrink-0 ${
                  typeFilter === t
                    ? 'bg-[#00A3FF]/15 border border-[#00A3FF]/30 text-[#00A3FF]'
                    : 'bg-white/5 border border-white/5 text-[#737373] hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#737373] pt-2 border-t border-white/5">
          <span>Showing {filteredPeople.length} contacts</span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" /> Active 7d</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" /> Idle 7-14d</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" /> Inactive &gt;14d</span>
          </span>
        </div>
      </div>

      {/* Directory Grid/List */}
      <div className="space-y-2">
        {filteredPeople.length === 0 ? (
          <div className="p-12 text-center bg-[#1A1A1A] border border-white/10 rounded-[16px]">
            <p className="text-[14px] text-white/50">No contacts matching criteria.</p>
          </div>
        ) : (
          filteredPeople.slice(0, 100).map(p => (
            <div
              key={p.id}
              onClick={() => handleOpen360(p)}
              className="p-4 bg-[#1A1A1A] hover:bg-white/[0.04] border border-white/10 hover:border-[#00A3FF]/30 rounded-[16px] flex items-center justify-between gap-4 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-white shrink-0 overflow-hidden">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    p.name[0]
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[13px] text-white group-hover:text-[#00A3FF] transition-colors truncate">
                      {p.name}
                    </span>
                    {renderTypeChip(p.type)}
                    {p.verified && <ShieldCheck size={14} className="text-[#00A3FF]" />}
                    {renderHealthBadge(p.health)}
                  </div>
                  <p className="text-[11px] text-[#737373] truncate mt-0.5">
                    {p.last_activity_event} • {formatDistanceToNow(new Date(p.last_activity_date || p.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                {p.artist_tier && p.type === 'artist' && (
                  <span className="text-[11px] text-white/60 hidden sm:inline-block">
                    {p.artist_tier}
                  </span>
                )}
                <ChevronRight size={16} className="text-white/30 group-hover:text-[#00A3FF] transition-colors" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
