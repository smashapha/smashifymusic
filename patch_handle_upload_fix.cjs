const fs = require('fs');
let code = fs.readFileSync('src/pages/ArtistHub.tsx', 'utf8');

const regex = /const handleUploadAlbum = async \([^)]*\) => \{[\s\S]*?setUploading\(false\);\n    \}\n  \};/;

const replace = `const handleUploadAlbum = async (e: React.FormEvent, asDraft: boolean = false) => {
    e.preventDefault();
    if (albumTracks.length === 0 || !coverFile || !title) return toast.error('Check files and fields');

    const stillWorking = albumTracks.some(t => t.uploadStatus === 'pending' || t.uploadStatus === 'compressing' || t.uploadStatus === 'uploading');
    if (stillWorking) return toast.error('Please wait for all tracks to finish uploading.');

    const failed = albumTracks.filter(t => t.uploadStatus === 'error');
    if (failed.length > 0) return toast.error(\`\${failed.length} track(s) failed to upload. Retry them before publishing.\`);

    setUploading(true);
    setUploadProgress(5);

    try {
      // 1. Upload Cover (unchanged — cover is a single small file, no need to background it)
      toast.loading('Optimising album artwork...', { id: 'covercomp' });
      const compressedAlbumCover = await compressCoverImage(coverFile);
      toast.dismiss('covercomp');
      const coverExt = 'jpg';
      const coverPath = \`covers/\${userProfile?.id}/cover-\${Date.now()}.\${coverExt}\`;
      const { error: coverErr } = await supabase.storage.from('covers').upload(coverPath, compressedAlbumCover, { contentType: 'image/jpeg' });
      if (coverErr) throw coverErr;
      const { data: { publicUrl: coverUrl } } = supabase.storage.from('covers').getPublicUrl(coverPath);

      setUploadProgress(20);

      // 2. Create Album Record
      const { data: newAlbum, error: albumErr } = await supabase.from('albums').insert({
        artist_id: userProfile?.id,
        title,
        cover_url: coverUrl,
        release_year: new Date(releaseDate).getFullYear()
      }).select().single();

      if (albumErr) throw albumErr;

      // 3. Insert track DB rows using the already-uploaded URLs — no upload happens here anymore
      const totalTracks = albumTracks.length;
      let completed = 0;

      for (const track of albumTracks) {
        const trackPrice = isForSale
          ? (albumPricingMode === 'album' ? Math.floor(price / totalTracks) : track.price)
          : 0;

        const { error: dbErr } = await supabase.from('songs').insert({
          title: track.title,
          artist_id: userProfile?.id,
          audio_url: track.uploadedUrl,
          cover_url: coverUrl,
          is_explicit: track.is_explicit || false,
          release_date: releaseDate,
          featured_artist: track.featured_artist || '',
          language: language,
          lyrics: track.lyrics || '',
          genre: genre,
          album_id: newAlbum.id,
          price: trackPrice,
          is_for_sale: isForSale,
          is_exclusive: isExclusive,
          approved: false,
          status: 'pending',
          type: 'single',
          plays: 0
        });

        if (dbErr) throw dbErr;

        completed++;
        setUploadProgress(20 + Math.floor((completed / totalTracks) * 80));
      }

      if (isExclusive && subscriptionPrice && userProfile?.id) {
         await supabase.from('profiles').update({ subscription_price: subscriptionPrice }).eq('id', userProfile.id);
      }

      setUploadProgress(100);
      setIsSuccess(true);
      if (onComplete) onComplete();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };`;

if (regex.test(code)) {
    code = code.replace(regex, replace);
    fs.writeFileSync('src/pages/ArtistHub.tsx', code);
    console.log('Replaced successfully!');
} else {
    console.log('Could not find regex match');
}
