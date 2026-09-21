const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
const client = createClient(url, key);

async function runAudit() {
  const testEmail = 'auditor_' + Date.now() + '@smashifytest.com';
  const testPass = 'TempAudit2026!#$';
  await client.auth.signUp({ email: testEmail, password: testPass });

  // 1. Fetch all profiles
  let allProfiles = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) { console.error('Profiles error:', error); break; }
    if (!data || data.length === 0) break;
    allProfiles = allProfiles.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  // Also check user_profiles to see if any phone numbers are in user_profiles
  let allUserProfiles = [];
  page = 0;
  while (true) {
    const { data, error } = await client
      .from('user_profiles')
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) { break; }
    if (!data || data.length === 0) break;
    allUserProfiles = allUserProfiles.concat(data);
    if (data.length < pageSize) break;
    page++;
  }
  const userProfileMap = new Map();
  for (const up of allUserProfiles) {
    userProfileMap.set(up.id, up);
  }

  // 2. Fetch all songs
  let allSongs = [];
  page = 0;
  while (true) {
    const { data, error } = await client
      .from('songs')
      .select('id, artist_id, title, status, approved')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) { console.error('Songs error:', error); break; }
    if (!data || data.length === 0) break;
    allSongs = allSongs.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  // 3. Check albums just in case songs are linked via albums or artist uploaded an album
  let allAlbums = [];
  page = 0;
  while (true) {
    const { data, error } = await client
      .from('albums')
      .select('id, artist_id, title')
      .range(page * pageSize, (page + 1) * pageSize - 1);
    if (error) { break; }
    if (!data || data.length === 0) break;
    allAlbums = allAlbums.concat(data);
    if (data.length < pageSize) break;
    page++;
  }

  // Set of artist IDs who have songs
  const artistsWithSongs = new Set();
  for (const s of allSongs) {
    if (s.artist_id) {
      artistsWithSongs.add(s.artist_id);
    }
  }

  // Set of artist IDs who have albums
  const artistsWithAlbums = new Set();
  for (const a of allAlbums) {
    if (a.artist_id) {
      artistsWithAlbums.add(a.artist_id);
    }
  }

  // Artists who haven't uploaded songs
  const artistsWithoutSongs = allProfiles.filter(p => {
    // Check if user is an artist
    const isArtist = (
      p.user_type === 'artist' || 
      p.role === 'artist' || 
      Boolean(p.stage_name && p.stage_name.trim())
    );
    if (!isArtist) return false;
    // Check if they uploaded any song
    const hasSong = artistsWithSongs.has(p.id);
    return !hasSong;
  });

  console.log('Total profiles:', allProfiles.length);
  console.log('Total songs:', allSongs.length);
  console.log('Artists who uploaded at least 1 song:', artistsWithSongs.size);
  console.log('Artists who have NOT uploaded any song:', artistsWithoutSongs.length);

  // Write out detailed analysis
  const results = artistsWithoutSongs.map((a, index) => {
    const up = userProfileMap.get(a.id);
    // clean phone
    let phone = a.phone || up?.phone || up?.phone_number || a.payout_phone || 'N/A';
    if (typeof phone === 'string') {
      phone = phone.trim().replace(/,+$/, '').trim();
    }
    return {
      index: index + 1,
      id: a.id,
      stage_name: a.stage_name || 'N/A',
      full_name: a.full_name || up?.full_name || 'N/A',
      phone: phone,
      email: a.email || up?.email || 'N/A',
      city: a.city || a.location || 'N/A',
      genre: a.genre || 'N/A',
      tier: a.artist_tier || a.subscription_tier || 'Free',
      has_album: artistsWithAlbums.has(a.id),
      created_at: a.created_at,
      status: a.status || 'N/A',
      approved: a.approved,
      verified: a.verified || a.is_verified
    };
  });

  fs.writeFileSync('scripts/artists_without_songs.json', JSON.stringify(results, null, 2));
  console.log('Saved to scripts/artists_without_songs.json');

  // Let's print summary stats of phones
  const withPhone = results.filter(r => r.phone && r.phone !== 'N/A' && r.phone.length >= 7);
  const withoutPhone = results.filter(r => !r.phone || r.phone === 'N/A' || r.phone.length < 7);
  console.log('Artists with available phone numbers:', withPhone.length);
  console.log('Artists without phone numbers:', withoutPhone.length);
}

runAudit().catch(console.error);
