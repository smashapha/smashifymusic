import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, CheckCircle2, Trash2, Music2, Plus, FileAudio, X, Flame, Volume2, VolumeX, Edit3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Admin = () => {
  const [artists, setArtists] = useState<any[]>([]); // Approved artists
  const [applications, setApplications] = useState<any[]>([]); // Pending artists
  const [ads, setAds] = useState<any[]>([]);
  const [showAdForm, setShowAdForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const { userProfile, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (userProfile && !userProfile.is_admin) {
      toast.error('Unauthorized access');
      navigate('/');
      return;
    }
    if (userProfile?.is_admin) {
      fetchArtists();
      fetchApplications();
      fetchAds();
    }
  }, [userProfile, navigate]);

  const fetchAds = async () => {
    const { data } = await supabase.from('audio_ads').select('*').order('created_at', { ascending: false });
    setAds(data || []);
  };

  const toggleAdStatus = async (ad: any) => {
    const { error } = await supabase.from('audio_ads').update({ active: !ad.active }).eq('id', ad.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Ad ${ad.active ? 'deactivated' : 'activated'}`);
      fetchAds();
    }
  };

  const deleteAd = async (adId: string) => {
    if (!confirm('Delete this ad permanently?')) return;
    const { error } = await supabase.from('audio_ads').delete().eq('id', adId);
    if (error) toast.error(error.message);
    else {
      toast.success('Ad deleted');
      fetchAds();
    }
  };

  const fetchArtists = async () => {
    setLoading(true);
    const { data: artistsData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_type', 'artist')
      .eq('approved', true)
      .order('created_at', { ascending: false });
    
    if (artistsData) {
      const artistsWithPending = await Promise.all(artistsData.map(async (art) => {
        const { count } = await supabase.from('songs').select('*', { count: 'exact', head: true }).eq('artist_id', art.id).eq('approved', false);
        return { ...art, pending_songs: count || 0 };
      }));
      setArtists(artistsWithPending);
    }
    setLoading(false);
  };

  const fetchApplications = async () => {
    const { data } = await supabase
      .from('artist_applications')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    setApplications(data || []);
  };

  const approveArtist = async (application: any) => {
    try {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: application.profile_id,
        full_name: application.full_name,
        stage_name: application.stage_name,
        email: application.email,
        genre: application.genre,
        city: application.city,
        phone: application.phone,
        approved: true,
        verified: false,
        wallet_balance: 0,
        user_type: 'artist',
      });
      if (profileError) throw profileError;

      const { error: appError } = await supabase
        .from('artist_applications')
        .update({ status: 'approved' })
        .eq('id', application.id);
      if (appError) throw appError;

      toast.success(`${application.stage_name} approved! They can now access the Artist Hub.`);
      fetchApplications();
      fetchArtists();

    } catch (err: any) {
      toast.error('Approval failed: ' + err.message);
    }
  };

  const rejectArtist = async (application: any, reason: string = "Not eligible") => {
    try {
      await supabase.from('artist_applications')
        .update({ status: 'rejected', admin_notes: reason })
        .eq('id', application.id);

      await supabase.from('user_profiles').upsert({
        id: application.profile_id,
        full_name: application.full_name,
        email: application.email,
        subscription_tier: 'Free',
        user_type: 'listener',
      });

      toast.success('Application rejected. User downgraded to listener account.');
      fetchApplications();

    } catch (err: any) {
      toast.error('Rejection failed: ' + err.message);
    }
  };

  const approveAllSongs = async (artistId: string) => {
    const { error } = await supabase.from('songs').update({ approved: true }).eq('artist_id', artistId).eq('approved', false);
    if (error) toast.error(error.message);
    else {
      toast.success('All songs approved!');
      fetchArtists();
    }
  };

  const deleteArtist = async (id: string, name: string) => {
    if (!confirm(`Are you absolutely sure you want to PERMANENTLY DELETE artist "${name}" and all their data? This cannot be undone.`)) return;
    
    try {
      await supabase.from('songs').delete().eq('artist_id', id);
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      
      if (error) throw error;
      toast.success('Artist removed successfully.');
      fetchArtists();
    } catch (err: any) {
      toast.error('Error deleting artist: ' + err.message);
    }
  };

  if (!userProfile?.is_admin) return null;

  return (
    <div className="min-h-screen bg-smash-black text-white p-6 md:p-12 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="flex justify-between items-center text-left">
          <h2 className="text-3xl font-studio font-black flex items-center gap-3 uppercase italic"><ShieldCheck className="text-smash-red" /> Admin Dashboard</h2>
          <div className="bg-smash-red/10 text-smash-red px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-smash-red/20">Authorized Access Only</div>
        </div>

        <div className="space-y-8">
          {/* Ad Management Section */}
          <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
               <div>
                  <p className="text-sm font-bold">Audio Ads Manager</p>
                  <p className="text-[10px] text-smash-gray uppercase tracking-widest font-bold">Manage platform and artist promotional ads</p>
               </div>
               <div className="flex items-center gap-3">
                 <p className="text-xs font-black text-smash-gray uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5">
                    Live Ads: {ads.filter(a => a.active).length} / {ads.length}
                 </p>
               </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-smash-gray text-xs uppercase tracking-widest font-bold">
                  <tr>
                    <th className="p-6 font-bold">Advertiser / Title</th>
                    <th className="p-6 font-bold">Type</th>
                    <th className="p-6 font-bold">Reach (Plays)</th>
                    <th className="p-6 font-bold">Status</th>
                    <th className="p-6 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {ads.map((ad) => (
                    <tr key={ad.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-6">
                         <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-smash-orange/10 rounded-xl flex items-center justify-center text-smash-orange">
                               <FileAudio size={18} />
                            </div>
                            <div>
                               <p className="font-bold">{ad.advertiser_name}</p>
                               <p className="text-[10px] text-smash-gray font-bold uppercase tracking-widest">{ad.title}</p>
                            </div>
                         </div>
                      </td>
                      <td className="p-6">
                         <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${ad.type === 'platform' ? 'bg-smash-purple/20 text-smash-purple' : 'bg-smash-cyan/20 text-smash-cyan'}`}>
                            {ad.type}
                         </span>
                      </td>
                      <td className="p-6">
                         <div className="flex flex-col">
                            <p className="font-bold">{ad.plays_used.toLocaleString()} / {ad.plays_purchased.toLocaleString()}</p>
                            <div className="w-24 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                               <div className="h-full bg-smash-orange" style={{ width: `${(ad.plays_used / ad.plays_purchased) * 100}%` }} />
                            </div>
                         </div>
                      </td>
                      <td className="p-6">
                         <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${ad.active ? 'bg-smash-green/10 text-smash-green' : 'bg-smash-red/10 text-smash-red'}`}>
                            {ad.active ? 'Active' : 'Inactive'}
                         </span>
                      </td>
                      <td className="p-6 text-right space-x-2">
                         <button 
                           onClick={() => toggleAdStatus(ad)}
                           className={`p-2 rounded-lg transition-all ${ad.active ? 'bg-smash-red/10 text-smash-red hover:bg-smash-red hover:text-white' : 'bg-smash-green/10 text-smash-green hover:bg-smash-green hover:text-white'}`}
                         >
                            {ad.active ? <X size={16} /> : <CheckCircle2 size={16} />}
                         </button>
                         <button onClick={() => deleteAd(ad.id)} className="p-2 bg-white/5 text-smash-gray hover:text-smash-red rounded-lg transition-colors">
                            <Trash2 size={16} />
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Applications Section */}
          <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
               <div>
                  <p className="text-sm font-bold">Pending Applications</p>
                  <p className="text-[10px] text-smash-gray uppercase tracking-widest font-bold">Review aspiring artists</p>
               </div>
               <p className="text-xs font-black text-smash-gray uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5">
                  Total Pending: {applications.length}
               </p>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                 <div className="p-10 flex justify-center">
                    <div className="w-8 h-8 border-4 border-smash-orange border-t-transparent rounded-full animate-spin" />
                 </div>
              ) : applications.length > 0 ? (
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-smash-gray text-xs uppercase tracking-widest font-bold">
                    <tr>
                      <th className="p-6 font-bold">Artist / Details</th>
                      <th className="p-6 font-bold">ID Doc</th>
                      <th className="p-6 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {applications.map((app) => (
                      <tr key={app.id} className="hover:bg-white/5 transition-colors group">
                        <td className="p-6">
                          <div className="flex flex-col">
                             <p className="font-bold">{app.stage_name || app.full_name}</p>
                             <p className="text-[10px] text-smash-gray font-bold uppercase tracking-widest">{app.email} • {app.phone}</p>
                             <p className="text-[10px] text-smash-gray font-bold uppercase tracking-widest">{app.city} • {app.genre}</p>
                          </div>
                        </td>
                        <td className="p-6">
                          {app.id_document_url ? (
                            <a href={app.id_document_url} target="_blank" rel="noopener noreferrer" className="text-smash-cyan hover:underline text-[10px] font-black uppercase tracking-widest">
                              View Document
                            </a>
                          ) : (
                            <span className="text-smash-red text-[10px] font-black uppercase tracking-widest">Missing</span>
                          )}
                        </td>
                        <td className="p-6 text-right flex items-center justify-end gap-2">
                           <button 
                               onClick={() => approveArtist(app)}
                               className="p-3 bg-smash-green/10 text-smash-green rounded-xl hover:bg-smash-green hover:text-white transition-all transform active:scale-90"
                               title="Approve Artist"
                             >
                               <CheckCircle2 size={18} />
                           </button>
                           <button 
                               onClick={() => rejectArtist(app, 'Declined by Admin.')}
                               className="p-3 bg-smash-red/10 text-smash-red rounded-xl hover:bg-smash-red hover:text-white transition-all transform active:scale-90"
                               title="Reject Artist"
                             >
                               <Trash2 size={18} />
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-10 text-center text-smash-gray font-bold uppercase tracking-widest text-xs italic">
                   No pending applications.
                </div>
              )}
            </div>
          </div>

          {/* Existing Artists Section */}
          <div className="bg-white/5 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
               <div>
                  <p className="text-sm font-bold">Platform Artists</p>
                  <p className="text-[10px] text-smash-gray uppercase tracking-widest font-bold">Manage and clean up fake or inactive profiles</p>
               </div>
               <p className="text-xs font-black text-smash-gray uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5">
                  Total Artists: {artists.length}
               </p>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                 <div className="p-20 flex justify-center">
                    <div className="w-8 h-8 border-4 border-smash-red border-t-transparent rounded-full animate-spin" />
                 </div>
              ) : artists.length > 0 ? (
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-smash-gray text-xs uppercase tracking-widest font-bold">
                    <tr>
                      <th className="p-6 font-bold">Artist</th>
                      <th className="p-6 font-bold">Location</th>
                      <th className="p-6 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {artists.map((artist) => {
                      const isFake = !artist.stage_name || !artist.avatar_url;
                      return (
                        <tr key={artist.id} className="hover:bg-white/5 transition-colors group">
                          <td className="p-6">
                            <div className="flex items-center gap-4">
                               <div className="relative">
                                  <img src={artist.avatar_url || "https://placehold.co/40x40/18162C/9B5DE5?text=?"} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                                  {artist.verified && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-smash-cyan rounded-full border-2 border-[#111] flex items-center justify-center text-black font-black text-[8px] italic">V</div>}
                               </div>
                               <div>
                                  <p className="font-bold flex items-center gap-2">
                                    {artist.stage_name || artist.full_name || 'Anonymous Artist'}
                                    {isFake && <span className="text-[10px] bg-smash-orange/20 text-smash-orange px-2 py-0.5 rounded-full uppercase italic">Potential Fake</span>}
                                  </p>
                                  <p className="text-[10px] text-smash-gray font-bold uppercase tracking-widest">{artist.email}</p>
                               </div>
                            </div>
                          </td>
                          <td className="p-6 text-smash-gray font-medium">{artist.city || artist.location || 'Unknown'}</td>
                          <td className="p-6 text-right flex items-center justify-end gap-2">
                            {artist.pending_songs > 0 && (
                              <button 
                                onClick={() => approveAllSongs(artist.id)}
                                className="p-3 bg-smash-purple/10 text-smash-purple rounded-xl hover:bg-smash-purple hover:text-white transition-all transform active:scale-90"
                                title="Approve All Songs"
                              >
                                <Music2 size={18} />
                              </button>
                            )}
                            <button 
                              onClick={() => deleteArtist(artist.id, artist.stage_name || artist.full_name || artist.email)}
                              className="p-3 bg-smash-red/10 text-smash-red rounded-xl hover:bg-smash-red hover:text-white transition-all transform active:scale-90"
                              title="Delete Artist"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-20 text-center text-smash-gray font-bold uppercase tracking-widest text-xs italic">
                   No artists found on the platform.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
