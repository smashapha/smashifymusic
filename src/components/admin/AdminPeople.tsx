import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, ShieldCheck, Mail, ChevronRight, Filter, 
  Sparkles, Wallet, Users, User, ArrowUpRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { HealthStatus } from './types';
import { Person360Detail } from './Person360Detail';

export interface PersonItem {
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
  onSelectPerson,
  onRefresh
}: { 
  artists: any[]; 
  listeners: any[]; 
  agents: any[];
  onSelectPerson?: (person: any) => void;
  onRefresh?: () => void;
}) => {
  const [selectedPerson, setSelectedPerson] = useState<PersonItem | null>(null);
  const [typeFilter, setTypeFilter] = useState<'all' | 'artists' | 'fans' | 'agents'>('all');
  const [healthFilter, setHealthFilter] = useState<'all' | 'verified' | 'active' | 'idle' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
        .limit(250);

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

    // 1. Artists
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

    // 2. Listeners / Fans
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
        verified: !!(l.verified || l.is_verified),
        health
      });
    }

    // 3. Agents
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
          last_activity_event: lastAct?.event || 'Agent registered',
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
      // Type filter
      if (typeFilter === 'artists' && p.type !== 'artist') return false;
      if (typeFilter === 'fans' && p.type !== 'fan') return false;
      if (typeFilter === 'agents' && p.type !== 'agent') return false;

      // Health/Status filter
      if (healthFilter === 'verified' && !p.verified) return false;
      if (healthFilter === 'active' && p.health !== 'green') return false;
      if (healthFilter === 'idle' && p.health !== 'amber') return false;
      if (healthFilter === 'inactive' && p.health !== 'red') return false;

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.stage_name && p.stage_name.toLowerCase().includes(q)) ||
        p.id.toLowerCase().includes(q)
      );
    });
  }, [peopleList, typeFilter, healthFilter, searchQuery]);

  const handleOpen360 = (person: PersonItem) => {
    setSelectedPerson(person);
    if (onSelectPerson) onSelectPerson(person);
  };

  const renderHealthBadge = (health: HealthStatus) => {
    if (health === 'green') {
      return (
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
          Active
        </span>
      );
    }
    if (health === 'amber') {
      return (
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] text-[11px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
          Idle
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-[11px] font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
        Inactive
      </span>
    );
  };

  const renderTypeChip = (type: string) => {
    switch (type) {
      case 'artist':
        return <span className="px-2 py-0.5 rounded bg-[#00A3FF]/15 text-[#00A3FF] text-[11px] font-bold uppercase tracking-wider">Artist</span>;
      case 'agent':
        return <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">Agent</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-white/10 text-white/70 text-[11px] font-bold uppercase tracking-wider">Fan</span>;
    }
  };

  // If 360 view open, render complete deep details and control component
  if (selectedPerson) {
    return (
      <Person360Detail 
        person={selectedPerson} 
        onBack={() => setSelectedPerson(null)} 
        onRefresh={onRefresh} 
      />
    );
  }

  // Directory View
  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <div className="p-5 bg-[#141414] border border-white/10 rounded-[18px] space-y-4 shadow-xl">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full lg:w-96">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, stage name, UUID..."
              className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-[12px] text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#00A3FF] transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Type Pills */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-[12px] border border-white/5">
              {(['all', 'artists', 'fans', 'agents'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-[10px] text-[12px] font-semibold capitalize transition-all ${
                    typeFilter === t
                      ? 'bg-[#00A3FF] text-black shadow-md shadow-[#00A3FF]/20'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {t === 'fans' ? 'Listeners' : t}
                </button>
              ))}
            </div>

            {/* Health / Status Filter */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-[12px] border border-white/5">
              {(['all', 'verified', 'active', 'idle', 'inactive'] as const).map(h => (
                <button
                  key={h}
                  onClick={() => setHealthFilter(h)}
                  className={`px-2.5 py-1.5 rounded-[10px] text-[11px] font-medium capitalize transition-all ${
                    healthFilter === h
                      ? 'bg-white/20 text-white'
                      : 'text-white/50 hover:text-white'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Directory Counter and Legend */}
        <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-white/40 pt-2 border-t border-white/5">
          <span>Showing {filteredPeople.length} contacts ({peopleList.length} total)</span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" /> Active 7d</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" /> Idle 7-14d</span>
            <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" /> Inactive &gt;14d</span>
          </span>
        </div>
      </div>

      {/* Directory Grid/List */}
      <div className="space-y-2.5">
        {filteredPeople.length === 0 ? (
          <div className="p-16 text-center bg-[#141414] border border-white/10 rounded-[18px]">
            <p className="text-[14px] text-white/50">No users match your criteria.</p>
          </div>
        ) : (
          filteredPeople.slice(0, 100).map(p => (
            <div
              key={p.id}
              onClick={() => handleOpen360(p)}
              className="p-4 bg-[#141414] hover:bg-[#1A1A1A] border border-white/10 hover:border-[#00A3FF]/40 rounded-[16px] flex items-center justify-between gap-4 cursor-pointer transition-all group shadow-md"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-[12px] bg-white/5 border border-white/10 flex items-center justify-center font-bold text-white shrink-0 overflow-hidden">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    p.name[0]
                  )}
                </div>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[14px] text-white group-hover:text-[#00A3FF] transition-colors truncate">
                      {p.name}
                    </span>
                    {renderTypeChip(p.type)}
                    {p.verified && <ShieldCheck size={14} className="text-[#00A3FF]" />}
                    {renderHealthBadge(p.health)}
                  </div>
                  <p className="text-[12px] text-white/50 truncate flex items-center gap-2">
                    {p.email && <span>{p.email} •</span>}
                    <span>{p.last_activity_event}</span>
                    <span>• {formatDistanceToNow(new Date(p.last_activity_date || p.created_at), { addSuffix: true })}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                {p.type === 'artist' && (
                  <div className="text-right hidden sm:block">
                    <span className="text-[11px] font-semibold text-purple-300 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                      {p.artist_tier || 'Free'} Tier
                    </span>
                    <p className="text-[11px] font-mono text-white/50 mt-1">
                      MK {Number(p.wallet_balance || 0).toLocaleString()}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-white/5 group-hover:bg-[#00A3FF] text-white/70 group-hover:text-black text-[12px] font-medium transition-all">
                  <span>360 Hub</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
