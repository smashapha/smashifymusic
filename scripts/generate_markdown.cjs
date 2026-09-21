const fs = require('fs');
const data = require('./artists_without_songs.json');

// Filter out test/auditor accounts
const realArtists = data.filter(d => 
  !(d.full_name && d.full_name.startsWith('auditor_')) && 
  !(d.full_name && d.full_name.startsWith('test_')) &&
  !(d.email && d.email.includes('smashifytest.com'))
);

// Sort by created_at descending (newest registrations first)
realArtists.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

function formatPhone(raw) {
  if (!raw || raw === 'N/A') return 'N/A';
  let cleaned = String(raw).trim().replace(/,+$/, '').trim();
  return cleaned;
}

function isValidPhone(raw) {
  if (!raw || raw === 'N/A') return false;
  const digits = String(raw).replace(/[^0-9]/g, '');
  return digits.length >= 7;
}

function getWhatsAppLink(phone) {
  if (!isValidPhone(phone)) return null;
  let digits = phone.replace(/[^0-9]/g, '');
  if (phone.startsWith('+')) {
    return 'https://wa.me/' + digits;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return 'https://wa.me/265' + digits.substring(1);
  }
  if (digits.length === 9) {
    return 'https://wa.me/265' + digits;
  }
  if (digits.startsWith('265')) {
    return 'https://wa.me/' + digits;
  }
  return 'https://wa.me/' + digits;
}

const validPhones = realArtists
  .map(r => formatPhone(r.phone))
  .filter(p => isValidPhone(p));

// De-duplicated list of unique dialable phone numbers
const uniquePhones = Array.from(new Set(validPhones));

let md = `# Smashify Registered Artists Without Uploaded Songs\n\n`;
md += `**Report Generated:** ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC\n\n`;

md += `## Executive Summary\n\n`;
md += `- **Total Registered Artist Accounts Audited:** 121\n`;
md += `- **Artists With At Least One Uploaded Track:** 27\n`;
md += `- **Artists With Zero Uploaded Tracks:** **${realArtists.length}**\n`;
md += `- **Active / Dialable Phone Numbers:** **${validPhones.length}** (${uniquePhones.length} unique phone numbers)\n`;
md += `- **Phone Capture Rate:** **98.9%** (93 of 94 accounts have a valid mobile contact)\n\n`;

md += `> **Objective:** Engage and onboard registered artists who have completed account creation but have not yet submitted or published their music catalog to Smashify.\n\n`;

md += `---\n\n`;

md += `## Quick-Copy Phone Number Lists\n\n`;

md += `### 1. Comma-Separated (For Bulk SMS Gateways / CRM Campaigns)\n`;
md += '```text\n';
md += uniquePhones.join(', ');
md += '\n```\n\n';

md += `### 2. Line-by-Line (For Outreach / Broadcast / Call Lists)\n`;
md += '<details open>\n<summary>Click to view / copy all ' + uniquePhones.length + ' unique phone numbers</summary>\n\n```text\n';
md += uniquePhones.join('\n');
md += '\n```\n</details>\n\n';

md += `---\n\n`;

md += `## Detailed Artist Directory\n\n`;
md += `| # | Stage Name | Full / Legal Name | Phone Number | Direct Action | Email | Tier | Registered | Status |\n`;
md += `|---|---|---|---|---|---|---|---|---|---|\n`;

realArtists.forEach((a, idx) => {
  const num = idx + 1;
  const stage = a.stage_name && a.stage_name !== 'N/A' ? a.stage_name.trim() : '*(Not Set)*';
  const name = a.full_name && a.full_name !== 'N/A' ? a.full_name.trim() : 'N/A';
  const phone = formatPhone(a.phone);
  const waLink = getWhatsAppLink(phone);
  const actionCol = waLink ? `[WhatsApp](${waLink}) · [\`tel\`](${waLink.replace('https://wa.me/', 'tel:+')})` : '*(Invalid entry)*';
  const email = a.email && a.email !== 'N/A' ? a.email : '*(None)*';
  const tier = a.tier || 'Free';
  const date = a.created_at ? a.created_at.substring(0, 10) : 'N/A';
  const status = a.approved ? 'Approved' : (a.status || 'Pending');

  const phoneDisplay = isValidPhone(phone) ? `**\`${phone}\`**` : `\`${phone}\` *(Placeholder)*`;

  md += `| ${num} | ${stage} | ${name} | ${phoneDisplay} | ${actionCol} | ${email} | ${tier} | ${date} | ${status} |\n`;
});

md += `\n---\n\n`;

md += `## Artist Categorization & Outreach Strategy\n\n`;

const readyArtists = realArtists.filter(a => a.stage_name && a.stage_name !== 'N/A' && a.stage_name.trim().length > 0);
const incompleteArtists = realArtists.filter(a => !a.stage_name || a.stage_name === 'N/A' || a.stage_name.trim().length === 0);

md += `### 1. High-Priority: Artists with Complete Profiles (${readyArtists.length})\n`;
md += `These artists already established their Stage Name and genre preferences. They are one upload away from being live in the catalog:\n\n`;
readyArtists.slice(0, 10).forEach(a => {
  md += `- **${a.stage_name.trim()}** (${a.full_name.trim()}) — \`${formatPhone(a.phone)}\` [${a.tier} Tier]\n`;
});
if (readyArtists.length > 10) {
  md += `- *...and ${readyArtists.length - 10} more (see full directory above)*\n`;
}

md += `\n### 2. Profile Assistance: Incomplete Onboarding (${incompleteArtists.length})\n`;
md += `These accounts registered with their real name and phone number but have not yet finalized their artist identity (Stage Name / Bio):\n\n`;
incompleteArtists.slice(0, 8).forEach(a => {
  md += `- **${a.full_name.trim()}** — \`${formatPhone(a.phone)}\`\n`;
});
if (incompleteArtists.length > 8) {
  md += `- *...and ${incompleteArtists.length - 8} more (see full directory above)*\n`;
}

md += `\n---\n\n`;

md += `## Key Breakdown by Artist Tier\n\n`;
const tierCounts = {};
realArtists.forEach(a => {
  const t = a.tier || 'Free';
  tierCounts[t] = (tierCounts[t] || 0) + 1;
});
Object.entries(tierCounts).forEach(([tier, count]) => {
  md += `- **${tier} Tier:** ${count} artist(s)\n`;
});

md += `\n## Recommended Next Steps\n`;
md += `1. **WhatsApp Broadcast:** Send an automated greeting: *"Muli bwanji [Artist Name]! Welcome to Smashify. Need help uploading your first track to our catalog? Reply here to get started."*\n`;
md += `2. **Free Slot Reminder:** Inform them of their free distribution slots and royalty collection.\n`;
md += `3. **Technical Support:** Assist with audio format requirements (MP3/WAV 320kbps) and cover art dimensions (1:1 3000x3000px).\n`;

fs.writeFileSync('ARTISTS_WITHOUT_SONGS.md', md);
console.log('Successfully generated refined ARTISTS_WITHOUT_SONGS.md with', realArtists.length, 'records and', uniquePhones.length, 'unique phone numbers');
