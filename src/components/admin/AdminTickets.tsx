import React, { useState, useEffect, useMemo } from 'react';
import { 
  Ticket, Plus, CheckCircle2, Clock, AlertCircle, 
  MessageSquare, Search, Filter, ArrowRight, ShieldAlert, X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { TicketRow } from './types';

export const AdminTickets = ({ 
  artists, 
  listeners,
  agents 
}: { 
  artists: any[]; 
  listeners: any[]; 
  agents: any[];
}) => {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [resolvingTicket, setResolvingTicket] = useState<TicketRow | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // New ticket state
  const [newProfileId, setNewProfileId] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [newSource, setNewSource] = useState<'whatsapp' | 'in_app' | 'email'>('whatsapp');
  const [userSearchText, setUserSearchText] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (err: any) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  // Name map lookup
  const userMap: Record<string, { name: string; type: string }> = useMemo(() => {
    const map: Record<string, { name: string; type: string }> = {};
    for (const a of artists) {
      map[a.id] = { name: a.stage_name || a.full_name || 'Artist', type: 'Artist' };
    }
    for (const l of listeners) {
      if (!map[l.id]) map[l.id] = { name: l.full_name || 'Fan', type: 'Fan' };
    }
    for (const ag of agents) {
      const id = ag.user_id || ag.id;
      if (!map[id]) map[id] = { name: ag.user_profiles?.full_name || ag.full_name || 'Agent', type: 'Agent' };
    }
    return map;
  }, [artists, listeners, agents]);

  const userSuggestions = useMemo(() => {
    if (!userSearchText.trim()) return [];
    const q = userSearchText.toLowerCase();
    const list: Array<{ id: string; name: string; type: string }> = [];
    for (const [id, info] of Object.entries(userMap) as Array<[string, { name: string; type: string }]>) {
      if (info.name.toLowerCase().includes(q) || id.toLowerCase().includes(q)) {
        list.push({ id, name: info.name, type: info.type });
        if (list.length >= 6) break;
      }
    }
    return list;
  }, [userMap, userSearchText]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const userName = userMap[t.profile_id]?.name?.toLowerCase() || '';
      return (
        t.subject.toLowerCase().includes(q) ||
        userName.includes(q) ||
        t.profile_id.toLowerCase().includes(q)
      );
    });
  }, [tickets, statusFilter, searchQuery, userMap]);

  const handleUpdateStatus = async (ticketId: string, newStatus: TicketRow['status'], resNote?: string) => {
    setActionLoading(true);
    try {
      const payload: any = { status: newStatus };
      if (newStatus === 'resolved') {
        payload.resolved_at = new Date().toISOString();
        if (resNote) payload.resolution_note = resNote;
      }

      const { error } = await supabase
        .from('tickets')
        .update(payload)
        .eq('id', ticketId);

      if (error) throw error;

      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...payload } : t));
      toast.success(`Ticket status updated to ${newStatus.replace('_', ' ')}`);
      setResolvingTicket(null);
      setResolutionNote('');
    } catch (err: any) {
      toast.error('Failed to update ticket: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileId || !newSubject.trim()) {
      return toast.error('Please select a user and provide a subject');
    }
    setActionLoading(true);

    try {
      const payload = {
        profile_id: newProfileId,
        subject: newSubject.trim(),
        priority: newPriority,
        source: newSource,
        status: 'open'
      };

      const { data, error } = await supabase
        .from('tickets')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      toast.success('Ticket created');
      setTickets(prev => [data, ...prev]);
      setShowCreateModal(false);
      setNewSubject('');
      setNewProfileId('');
      setUserSearchText('');
    } catch (err: any) {
      toast.error('Failed to create ticket: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const renderStatusChip = (status: TicketRow['status']) => {
    switch (status) {
      case 'open':
        return <span className="px-2.5 py-1 rounded bg-[#00A3FF]/15 text-[#00A3FF] text-[11px] font-semibold uppercase tracking-wider">Open</span>;
      case 'in_progress':
        return <span className="px-2.5 py-1 rounded bg-[#F59E0B]/15 text-[#F59E0B] text-[11px] font-semibold uppercase tracking-wider">In Progress</span>;
      case 'resolved':
        return <span className="px-2.5 py-1 rounded bg-[#22C55E]/15 text-[#22C55E] text-[11px] font-semibold uppercase tracking-wider">Resolved</span>;
      case 'closed':
        return <span className="px-2.5 py-1 rounded bg-white/10 text-white/60 text-[11px] font-semibold uppercase tracking-wider">Closed</span>;
    }
  };

  const renderPriorityChip = (priority: TicketRow['priority']) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 py-0.5 rounded bg-[#EF4444]/15 text-[#EF4444] text-[11px] font-medium uppercase">High</span>;
      case 'normal':
        return <span className="px-2 py-0.5 rounded bg-white/10 text-white/70 text-[11px] font-medium uppercase">Normal</span>;
      case 'low':
        return <span className="px-2 py-0.5 rounded bg-white/5 text-[#737373] text-[11px] font-medium uppercase">Low</span>;
    }
  };

  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    closed: tickets.filter(t => t.status === 'closed').length,
  };

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="p-5 bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737373]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search tickets by subject or user..."
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#00A3FF]"
            />
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto px-4 py-2 bg-[#00A3FF] hover:bg-[#00A3FF]/90 text-black font-semibold rounded-[10px] text-[13px] flex items-center justify-center gap-2 transition-colors shrink-0"
          >
            <Plus size={16} />
            Log New Ticket
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-white/5">
          {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-[10px] text-[13px] font-medium capitalize transition-all flex items-center gap-2 shrink-0 ${
                statusFilter === st
                  ? 'bg-[#00A3FF]/15 border border-[#00A3FF]/30 text-[#00A3FF]'
                  : 'bg-white/5 border border-white/5 text-[#737373] hover:text-white'
              }`}
            >
              <span>{st.replace('_', ' ')}</span>
              <span className="text-[11px] font-mono opacity-80">({counts[st]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center bg-[#1A1A1A] border border-white/10 rounded-[16px]">
            <p className="text-[13px] text-white/40">Loading tickets queue...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-12 text-center bg-[#1A1A1A] border border-white/10 rounded-[16px]">
            <Ticket size={32} className="mx-auto text-[#737373] mb-3 opacity-40" />
            <p className="text-[14px] text-white/50">No tickets in this view.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-3 text-[13px] text-[#00A3FF] hover:underline"
            >
              + Log a ticket from WhatsApp or In-App
            </button>
          </div>
        ) : (
          filteredTickets.map(ticket => {
            const user = userMap[ticket.profile_id];

            return (
              <div
                key={ticket.id}
                className="p-5 bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-4 hover:border-white/20 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-[15px] font-semibold text-white">{ticket.subject}</h4>
                      {renderStatusChip(ticket.status)}
                      {renderPriorityChip(ticket.priority)}
                      <span className="px-2 py-0.5 rounded bg-white/5 text-[#737373] text-[11px] font-medium capitalize">
                        {ticket.source}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[12px] text-[#737373]">
                      <span className="text-white/80 font-medium">{user?.name || 'User'}</span>
                      {user?.type && <span>({user.type})</span>}
                      <span>•</span>
                      <span>Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>

                  {/* Workflow Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {ticket.status === 'open' && (
                      <button
                        onClick={() => handleUpdateStatus(ticket.id, 'in_progress')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/25 rounded-[10px] text-[12px] font-semibold transition-colors"
                      >
                        Start Progress
                      </button>
                    )}

                    {ticket.status === 'in_progress' && (
                      <button
                        onClick={() => {
                          setResolvingTicket(ticket);
                          setResolutionNote('');
                        }}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] hover:bg-[#22C55E]/25 rounded-[10px] text-[12px] font-semibold transition-colors"
                      >
                        Resolve Ticket
                      </button>
                    )}

                    {ticket.status === 'resolved' && (
                      <button
                        onClick={() => handleUpdateStatus(ticket.id, 'closed')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 rounded-[10px] text-[12px] font-semibold transition-colors"
                      >
                        Close Ticket
                      </button>
                    )}

                    {ticket.status === 'closed' && (
                      <button
                        onClick={() => handleUpdateStatus(ticket.id, 'open')}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/40 rounded-[10px] text-[12px] transition-colors"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>

                {ticket.resolution_note && (
                  <div className="p-3 bg-white/5 rounded-[10px] border border-white/5 text-[12px] text-white/80">
                    <p className="text-[11px] uppercase tracking-wider text-[#737373] mb-1">Resolution Note</p>
                    <p className="whitespace-pre-wrap">{ticket.resolution_note}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Resolve Ticket Note */}
      {resolvingTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-semibold text-white">Resolve Ticket</h3>
            <p className="text-[13px] text-white/60">
              Provide a resolution note before marking this ticket resolved.
            </p>
            <textarea
              rows={3}
              value={resolutionNote}
              onChange={e => setResolutionNote(e.target.value)}
              placeholder="e.g., Payout cleared manually via Airtel Money reference #9821..."
              className="w-full p-3 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white focus:outline-none focus:border-[#00A3FF]"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResolvingTicket(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-[10px] text-[13px] text-white/70"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleUpdateStatus(resolvingTicket.id, 'resolved', resolutionNote)}
                className="px-5 py-2 bg-[#22C55E] hover:bg-[#22C55E]/90 text-black font-semibold rounded-[10px] text-[13px]"
              >
                Confirm Resolved
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Ticket */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-6 max-w-lg w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Log Support Ticket</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-[#737373] hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="relative">
                <label className="text-[11px] uppercase tracking-wider text-[#737373] block mb-1.5">User</label>
                <input
                  type="text"
                  value={userSearchText}
                  onChange={e => {
                    setUserSearchText(e.target.value);
                    setShowUserDropdown(true);
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  placeholder="Search user name or paste UUID..."
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white focus:outline-none focus:border-[#00A3FF]"
                />
                {newProfileId && (
                  <p className="text-[11px] text-[#22C55E] mt-1">Selected UUID: {newProfileId}</p>
                )}

                {showUserDropdown && userSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#262626] border border-white/10 rounded-[10px] shadow-xl overflow-hidden z-20">
                    {userSuggestions.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setNewProfileId(u.id);
                          setUserSearchText(`${u.name} (${u.type})`);
                          setShowUserDropdown(false);
                        }}
                        className="w-full px-3.5 py-2 text-left hover:bg-white/5 text-[13px] text-white flex items-center justify-between"
                      >
                        <span>{u.name}</span>
                        <span className="text-[11px] text-[#737373]">{u.type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-wider text-[#737373] block mb-1.5">Subject</label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  placeholder="Summary of question or issue..."
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white focus:outline-none focus:border-[#00A3FF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] uppercase tracking-wider text-[#737373] block mb-1.5">Source</label>
                  <select
                    value={newSource}
                    onChange={e => setNewSource(e.target.value as any)}
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
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
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
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-[10px] text-[13px] text-white/70"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#00A3FF] hover:bg-[#00A3FF]/90 text-black font-semibold rounded-[10px] text-[13px]"
                >
                  {actionLoading ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
