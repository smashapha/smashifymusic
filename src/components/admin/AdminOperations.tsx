import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, Square, Music2, CircleCheck, Radio, Wallet, 
  Users, Clock, ArrowRight, ShieldCheck, Plus, RefreshCw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow, isToday } from 'date-fns';
import toast from 'react-hot-toast';
import { OpsChecklistRow } from './types';

const DEFAULT_OPS_TASKS: Array<{ task: string; cadence: string }> = [
  { task: 'Approve pending songs queue', cadence: 'Daily' },
  { task: 'Review new artist verification applications', cadence: 'Daily' },
  { task: 'Audit pending payout requests and mobile money balances', cadence: 'Daily' },
  { task: 'Review new agent applications and referral links', cadence: 'Daily' },
  { task: 'Audit Moto Feed snippet uploads', cadence: 'Daily' },
  { task: 'Dispatch renewal reminder notifications to expiring artists', cadence: 'Weekly' },
  { task: 'Review monthly platform revenue and agent commissions ledger', cadence: 'Monthly' },
];

export const AdminOperations = ({
  pendingSongsCount,
  applicationsCount,
  pendingSnippetsCount,
  payoutsCount,
  agentsCount,
  onNavigateTab
}: {
  pendingSongsCount: number;
  applicationsCount: number;
  pendingSnippetsCount: number;
  payoutsCount: number;
  agentsCount: number;
  onNavigateTab: (tab: any) => void;
}) => {
  const [tasks, setTasks] = useState<OpsChecklistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskName, setNewTaskName] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchChecklists();
  }, []);

  const fetchChecklists = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ops_checklists')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data && data.length > 0) {
        setTasks(data);
      } else {
        // Use default tasks
        setTasks(DEFAULT_OPS_TASKS.map((t, idx) => ({
          id: String(idx + 1),
          task: t.task,
          cadence: t.cadence,
          last_run_at: null
        })));
      }
    } catch {
      // Use fallback defaults
      setTasks(DEFAULT_OPS_TASKS.map((t, idx) => ({
        id: String(idx + 1),
        task: t.task,
        cadence: t.cadence,
        last_run_at: null
      })));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (task: OpsChecklistRow) => {
    setTogglingId(task.id);
    try {
      const isCompletedToday = task.last_run_at ? isToday(new Date(task.last_run_at)) : false;
      const newTimestamp = isCompletedToday ? null : new Date().toISOString();

      // Attempt DB update if valid UUID
      try {
        await supabase
          .from('ops_checklists')
          .update({ last_run_at: newTimestamp })
          .eq('id', task.id);
      } catch {
        // Local state fallback
      }

      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, last_run_at: newTimestamp } : t));
      toast.success(newTimestamp ? 'Task marked as completed' : 'Task marked as pending');
    } catch (err: any) {
      toast.error('Error updating task: ' + err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;
    setAddingTask(true);

    try {
      const newTask = {
        task: newTaskName.trim(),
        cadence: 'Daily',
        last_run_at: null
      };

      const { data, error } = await supabase
        .from('ops_checklists')
        .insert(newTask)
        .select()
        .single();

      if (!error && data) {
        setTasks(prev => [...prev, data]);
      } else {
        setTasks(prev => [...prev, { id: String(Date.now()), ...newTask }]);
      }

      toast.success('Checklist item added');
      setNewTaskName('');
    } catch (err: any) {
      toast.error('Failed to add task: ' + err.message);
    } finally {
      setAddingTask(false);
    }
  };

  const completedTodayCount = tasks.filter(t => t.last_run_at && isToday(new Date(t.last_run_at))).length;

  return (
    <div className="space-y-6">
      {/* Queues Summary Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-[#737373]">Live Governance Queues</h2>
          <span className="text-[11px] text-[#737373]">Click to open queue</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Songs to review */}
          <button
            onClick={() => onNavigateTab('song-reviews')}
            className="p-4 bg-[#1A1A1A] hover:bg-white/[0.04] border border-white/10 hover:border-[#00A3FF]/30 rounded-[16px] text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-full bg-[#00A3FF]/10 flex items-center justify-center text-[#00A3FF]">
                <Music2 size={16} />
              </div>
              <span className="font-mono text-xl font-bold text-white group-hover:text-[#00A3FF]">
                {pendingSongsCount}
              </span>
            </div>
            <p className="text-[13px] font-semibold text-white">Song Reviews</p>
            <p className="text-[11px] text-[#737373] mt-0.5">Pending releases</p>
          </button>

          {/* Artist Applications */}
          <button
            onClick={() => onNavigateTab('applications')}
            className="p-4 bg-[#1A1A1A] hover:bg-white/[0.04] border border-white/10 hover:border-[#00A3FF]/30 rounded-[16px] text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-full bg-[#A855F7]/10 flex items-center justify-center text-[#A855F7]">
                <CircleCheck size={16} />
              </div>
              <span className="font-mono text-xl font-bold text-white group-hover:text-[#A855F7]">
                {applicationsCount}
              </span>
            </div>
            <p className="text-[13px] font-semibold text-white">Applicants</p>
            <p className="text-[11px] text-[#737373] mt-0.5">Artist verifications</p>
          </button>

          {/* Moto Feed */}
          <button
            onClick={() => onNavigateTab('snippet-reviews')}
            className="p-4 bg-[#1A1A1A] hover:bg-white/[0.04] border border-white/10 hover:border-[#00A3FF]/30 rounded-[16px] text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Radio size={16} />
              </div>
              <span className="font-mono text-xl font-bold text-white group-hover:text-emerald-400">
                {pendingSnippetsCount}
              </span>
            </div>
            <p className="text-[13px] font-semibold text-white">Moto Feed</p>
            <p className="text-[11px] text-[#737373] mt-0.5">Audio snippets</p>
          </button>

          {/* Payouts Pending */}
          <button
            onClick={() => onNavigateTab('payouts')}
            className="p-4 bg-[#1A1A1A] hover:bg-white/[0.04] border border-white/10 hover:border-[#00A3FF]/30 rounded-[16px] text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-full bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B]">
                <Wallet size={16} />
              </div>
              <span className="font-mono text-xl font-bold text-white group-hover:text-[#F59E0B]">
                {payoutsCount}
              </span>
            </div>
            <p className="text-[13px] font-semibold text-white">Payout Registry</p>
            <p className="text-[11px] text-[#737373] mt-0.5">Pending cashouts</p>
          </button>

          {/* Agents */}
          <button
            onClick={() => onNavigateTab('agents')}
            className="p-4 bg-[#1A1A1A] hover:bg-white/[0.04] border border-white/10 hover:border-[#00A3FF]/30 rounded-[16px] text-left transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Users size={16} />
              </div>
              <span className="font-mono text-xl font-bold text-white group-hover:text-blue-400">
                {agentsCount}
              </span>
            </div>
            <p className="text-[13px] font-semibold text-white">Agents</p>
            <p className="text-[11px] text-[#737373] mt-0.5">Pending applications</p>
          </button>
        </div>
      </div>

      {/* Daily Operations Checklist */}
      <div className="p-5 bg-[#1A1A1A] border border-white/10 rounded-[16px] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-white">Daily Operations Checklist</h3>
            <p className="text-[13px] text-[#737373]">
              {completedTodayCount} of {tasks.length} standard operations executed today.
            </p>
          </div>

          <form onSubmit={handleAddTask} className="flex items-center gap-2">
            <input
              type="text"
              value={newTaskName}
              onChange={e => setNewTaskName(e.target.value)}
              placeholder="Add custom ops task..."
              className="px-3.5 py-1.5 bg-white/5 border border-white/10 rounded-[10px] text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#00A3FF] w-60"
            />
            <button
              type="submit"
              disabled={addingTask || !newTaskName.trim()}
              className="px-3 py-1.5 bg-[#00A3FF] hover:bg-[#00A3FF]/90 text-black font-semibold rounded-[10px] text-[12px] transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0"
            >
              <Plus size={14} />
              Add
            </button>
          </form>
        </div>

        {/* Task List */}
        <div className="divide-y divide-white/5 pt-2">
          {tasks.map(task => {
            const isCompletedToday = task.last_run_at ? isToday(new Date(task.last_run_at)) : false;

            return (
              <div
                key={task.id}
                onClick={() => handleToggleTask(task)}
                className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] px-2 rounded-[8px] transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`text-lg transition-transform ${isCompletedToday ? 'text-[#22C55E]' : 'text-[#737373] group-hover:text-white'}`}>
                    {isCompletedToday ? <CheckSquare size={18} /> : <Square size={18} />}
                  </div>
                  <span className={`text-[13px] font-medium transition-all ${
                    isCompletedToday ? 'line-through text-[#737373]' : 'text-white'
                  }`}>
                    {task.task}
                  </span>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {task.cadence && (
                    <span className="px-2 py-0.5 rounded bg-white/5 text-[11px] text-[#737373]">
                      {task.cadence}
                    </span>
                  )}
                  <span className="text-[11px] text-[#737373]">
                    {task.last_run_at ? (
                      `Run ${formatDistanceToNow(new Date(task.last_run_at), { addSuffix: true })}`
                    ) : (
                      'Never run'
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
