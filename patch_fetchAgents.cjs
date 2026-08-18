const fs = require('fs');
let code = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const target = `  const fetchAgents = async () => {
    try {
      const { data: pending } = await supabase
        .from('agents')
        .select('*, user_profiles!user_id(full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setAgentApplications(pending || []);

      const { data: approved } = await supabase
        .from('agents')
        .select('*, user_profiles!user_id(full_name)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      
      if (approved) {
        // Also fetch pending commissions for them
        const { data: comms } = await supabase
          .from('agent_commissions')
          .select('agent_id, status');
          
        const agentsWithCounts = approved.map(a => {
          const aComms = comms?.filter(c => c.agent_id === a.id) || [];
          return {
            ...a,
            referred_count: aComms.length,
            has_processing: aComms.some(c => c.status === 'processing')
          };
        });
        setApprovedAgents(agentsWithCounts);
      }
    } catch (e) {
      console.error(e);
    }
  };`;

const replacement = `  const fetchAgents = async () => {
    try {
      const { data: pending } = await supabase
        .from('agents')
        .select('*, user_profiles!user_id(full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      setAgentApplications(pending || []);

      const { data: approved } = await supabase
        .from('agents')
        .select('*, user_profiles!user_id(full_name)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
      
      if (approved) {
        // Also fetch pending commissions for them
        const { data: comms } = await supabase
          .from('agent_commissions')
          .select('agent_id, status, artist_id');
          
        const { data: referredProfiles } = await supabase
          .from('profiles')
          .select('id, referred_by_agent_id')
          .not('referred_by_agent_id', 'is', null);
          
        const agentsWithCounts = approved.map(a => {
          const aComms = comms?.filter(c => c.agent_id === a.id) || [];
          
          const referredSet = new Set();
          aComms.forEach(c => {
             if (c.artist_id) referredSet.add(c.artist_id);
          });
          
          const aReferred = referredProfiles?.filter(p => p.referred_by_agent_id === a.id) || [];
          aReferred.forEach(p => referredSet.add(p.id));

          return {
            ...a,
            referred_count: referredSet.size,
            has_processing: aComms.some(c => c.status === 'processing')
          };
        });
        setApprovedAgents(agentsWithCounts);
      }
    } catch (e) {
      console.error(e);
    }
  };`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('src/pages/Admin.tsx', code);
    console.log("Patched fetchAgents");
} else {
    console.log("Target not found");
}
