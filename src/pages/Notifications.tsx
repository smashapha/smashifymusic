import React, { useState, useEffect } from 'react';
import { motion } from "motion/react";
import { Bell, Coins, Megaphone, Music2, AlertCircle, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import BrandLoader from '../components/common/BrandLoader';

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
      // Need to fetch notifications + related profiles (for artist avatars) if we had a join, 
      // but notifications table currently doesn't store related_id, only link and message.
      // Wait, let's look at how notifications are inserted. They just insert message, link, type.
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

  const getIcon = (type: string) => {
    switch(type) {
      case 'tip_received':
      case 'track_sold':
      case 'subscription_started':
        return <Coins size={20} />;
      case 'announcement':
      case 'system':
        return <Megaphone size={20} />;
      case 'new_drop':
      case 'artist_drop':
      case 'track_approved':
        return <Music2 size={20} />;
      case 'follow':
        return <Heart size={20} />;
      case 'ad_review':
      case 'payout_completed':
        return <AlertCircle size={20} />;
      default:
        return <Bell size={20} />;
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayNotifs = notifications.filter(n => new Date(n.created_at) >= today);
  const earlierNotifs = notifications.filter(n => new Date(n.created_at) < today);

  const renderGroup = (notifs: any[], title: string) => {
    if (notifs.length === 0) return null;
    return (
      <div className="mb-8">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#737373] mb-3 px-2">{title}</h3>
        <div className="divide-y divide-white/5 bg-[#1A1A1A] border border-white/10 rounded-[16px] overflow-hidden">
          {notifs.map(n => (
            <div key={n.id} className={`p-5 flex items-start gap-4 hover:bg-white/5 transition-colors ${!n.read ? 'bg-[#00A3FF]/5' : ''}`}>
              <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${!n.read ? 'bg-[#0084D6] text-white' : 'bg-white/5 text-[#737373]'}`}>
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <p className={`text-sm font-semibold ${!n.read ? 'text-white' : 'text-white/60'}`}>{n.message}</p>
                  <span className="text-xs text-[#737373] font-mono shrink-0 ml-4">{new Date(n.created_at).toLocaleDateString()}</span>
                </div>
                {n.link && (
                  <Link to={n.link} className="text-[11px] font-semibold text-[#00A3FF] hover:underline transition-colors">
                    View details &rarr;
                  </Link>
                )}
              </div>
              {!n.read && (
                <button onClick={() => markAsRead(n.id)} className="w-2 h-2 rounded-full mt-2 shrink-0 bg-[#00A3FF]" title="Mark as read" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h2 className="text-2xl font-display font-bold flex items-center gap-3 text-white mb-8">
        <Bell className="text-[#00A3FF]" /> 
        Notifications
      </h2>
      
      {loading ? (
        <div className="p-8 bg-[#1A1A1A] border border-white/10 rounded-[16px]">
          <BrandLoader label="Loading alerts" />
        </div>
      ) : notifications.length > 0 ? (
        <div>
          {renderGroup(todayNotifs, "Today")}
          {renderGroup(earlierNotifs, "Earlier")}
        </div>
      ) : (
        <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-16 text-center text-[#737373] text-sm font-medium">
          No notifications yet.
        </div>
      )}
    </div>
  );
}
