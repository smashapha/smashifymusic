import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Notifications() {
  const { userProfile, role } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [userProfile]);

  const fetchNotifications = async () => {
    if (!userProfile?.id) return;
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('profile_id', userProfile.id)
        .order('created_at', { ascending: false });
      setNotifications(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h2 className="text-3xl font-studio font-black flex items-center gap-3 uppercase italic mb-8">
        <Bell className={role === 'artist' ? 'text-smash-purple' : 'text-smash-orange'} /> 
        Notifications
      </h2>
      
      <div className="bg-white/5 border border-white/5 rounded-[40px] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-smash-gray font-bold uppercase tracking-widest animate-pulse italic">
            Loading alerts...
          </div>
        ) : notifications.length > 0 ? (
          <div className="divide-y divide-white/5">
            {notifications.map(n => (
              <div key={n.id} className={`p-6 flex items-start gap-4 hover:bg-white/5 transition-colors ${!n.read ? (role === 'artist' ? 'bg-smash-purple/5' : 'bg-smash-orange/5') : ''}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${!n.read ? (role === 'artist' ? 'bg-smash-purple text-white' : 'bg-smash-orange text-white') : 'bg-white/5 text-smash-gray'}`}>
                  <Bell size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className={`text-sm font-bold ${!n.read ? 'text-white' : 'text-white/60'}`}>{n.message}</p>
                    <span className="text-[10px] text-smash-gray font-bold uppercase tracking-widest">{new Date(n.created_at).toLocaleDateString()}</span>
                  </div>
                  {n.link && (
                    <Link to={n.link} className={`text-[10px] font-black uppercase tracking-widest ${role === 'artist' ? 'text-smash-purple' : 'text-smash-orange'} hover:text-white transition-colors`}>
                      View Details →
                    </Link>
                  )}
                </div>
                {!n.read && (
                  <button onClick={() => markAsRead(n.id)} className={`w-2 h-2 rounded-full mt-2 shrink-0 ${role === 'artist' ? 'bg-smash-purple' : 'bg-smash-orange'}`} title="Mark as read" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-20 text-center text-smash-gray font-bold uppercase tracking-widest italic opacity-50">
            No notifications yet.
          </div>
        )}
      </div>
    </div>
  );
}
