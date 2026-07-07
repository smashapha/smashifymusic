const fs = require('fs');
let code = fs.readFileSync('src/pages/ArtistHub.tsx', 'utf8');

const funcs = `
  const openPromoModal = (song: any) => {
    setPromoModalSong(song);
    setPromoPercent(song.discount_percent || 20);
    setPromoEndsAt(song.sale_ends_at ? song.sale_ends_at.slice(0, 16) : '');
  };

  const savePromo = async () => {
    if (!promoModalSong) return;
    if (!promoEndsAt) {
      toast.error('Please set an end date/time for the promotion');
      return;
    }
    const endsAtIso = new Date(promoEndsAt).toISOString();
    if (new Date(endsAtIso) <= new Date()) {
      toast.error('End time must be in the future');
      return;
    }
    const { error } = await supabase
      .from('songs')
      .update({ discount_percent: promoPercent, sale_ends_at: endsAtIso })
      .eq('id', promoModalSong.id)
      .eq('artist_id', userProfile?.id);

    if (error) {
      toast.error('Could not save promotion');
      return;
    }
    toast.success(\`\${promoPercent}% off applied until \${new Date(endsAtIso).toLocaleString()}\`);
    setPromoModalSong(null);
    fetchData(false); // Refresh
  };

  const cancelPromo = async () => {
    if (!promoModalSong) return;
    const { error } = await supabase
      .from('songs')
      .update({ discount_percent: 0, sale_ends_at: null })
      .eq('id', promoModalSong.id)
      .eq('artist_id', userProfile?.id);

    if (error) {
      toast.error('Could not remove promotion');
      return;
    }
    toast.success('Promotion removed');
    setPromoModalSong(null);
    fetchData(false); // Refresh
  };

  const handleDelete = async (song: any) => {`;

code = code.replace('  const handleDelete = async (song: any) => {', funcs);
fs.writeFileSync('src/pages/ArtistHub.tsx', code);
