const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const primaryBtn = 'bg-[#0084D6] hover:bg-[#00A3FF] text-white h-8 px-4 rounded-[10px] text-[13px] font-semibold transition-colors flex items-center justify-center gap-2';
const ghostBtn = 'border border-white/10 text-white hover:border-white/30 h-8 px-4 rounded-[10px] text-[13px] font-semibold transition-colors flex items-center justify-center gap-2';
const dangerGhostBtn = 'border border-[#FF453A]/30 text-[#FF453A] hover:bg-[#FF453A]/10 h-8 px-4 rounded-[10px] text-[13px] font-semibold transition-colors flex items-center justify-center gap-2';

// 1. Approve/Release/Authorize buttons (currently bg-white text-black or bg-white/5 hover:border-blue)
content = content.replace(/className="px-4 py-2 bg-white text-black[^"]*"/g, `className="${primaryBtn}"`);

// 2. View/Edit/Manage buttons
content = content.replace(/className="px-5 py-2 bg-white\/5 border border-white\/10 rounded-xl text-\[9px\] font-bold[^"]*"/g, `className="${ghostBtn}"`);
content = content.replace(/className="px-4 py-1\.5 bg-white\/5 border border-white\/10 rounded-lg text-\[9px\] font-bold[^"]*"/g, `className="${ghostBtn}"`);

// 3. Reject buttons (currently h-9 w-9 icons or text)
content = content.replace(/className="h-9 w-9 bg-white\/5 text-smash-gray border border-white\/5 rounded-xl flex items-center justify-center hover:bg-\[\#FF453A\][^"]*"/g, `className="${dangerGhostBtn}"`);
content = content.replace(/className="w-10 h-10 rounded-xl bg-white\/5 border border-white\/10 flex items-center justify-center text-smash-gray hover:bg-\[\#FF453A\][^"]*"/g, `className="${dangerGhostBtn}"`);
content = content.replace(/className="px-4 py-2 bg-white\/5 border border-white\/10 rounded-xl text-\[9px\] font-bold text-white hover:bg-\[\#FF453A\][^"]*"/g, `className="${dangerGhostBtn}"`);
content = content.replace(/className="px-3 py-1 bg-\[\#FF453A\]\/10 text-\[\#FF453A\] rounded-md text-\[9px\] font-bold hover:bg-\[\#FF453A\] hover:text-white[^"]*"/g, `className="${dangerGhostBtn}"`);


// Update status chips
const chipBase = 'px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize border';
const chipPending = `${chipBase} bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30`;
const chipSuccess = `${chipBase} bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30`;
const chipDanger = `${chipBase} bg-[#FF453A]/10 text-[#FF453A] border-[#FF453A]/30`;
const chipNeutral = `${chipBase} bg-white/5 text-[#B0B0B0] border-white/10`;

// Pending/Processing
content = content.replace(/className="[^"]*(bg-\[\#F59E0B\]\/10|bg-amber-500\/10)[^"]*"/g, `className="${chipPending}"`);
// In Review
content = content.replace(/className="px-2 py-1 bg-\[\#0084D6\]\/20 text-\[\#00A3FF\] rounded text-\[9px\] font-bold"/g, `className="${chipPending}"`);

// Completed/Paid/Active/Approved
content = content.replace(/className="px-2 py-1 bg-\[\#22C55E\]\/20 text-\[\#22C55E\] rounded text-\[9px\] font-bold"/g, `className="${chipSuccess}"`);
content = content.replace(/className="px-2 py-1 bg-\[\#22C55E\]\/20 text-\[\#22C55E\] rounded text-\[9px\] font-bold  uppercase"/g, `className="${chipSuccess}"`);
content = content.replace(/className="px-2 py-1 rounded bg-\[\#22C55E\]\/20 text-\[\#22C55E\] text-\[9px\] font-bold "/g, `className="${chipSuccess}"`);
content = content.replace(/className="bg-\[\#22C55E\]\/10 text-\[\#22C55E\] text-\[9px\] font-bold px-2 py-1 rounded"/g, `className="${chipSuccess}"`);

// Rejected/Failed/Overdue
content = content.replace(/className="px-2 py-1 bg-\[\#FF453A\]\/20 text-\[\#FF453A\] rounded text-\[9px\] font-bold"/g, `className="${chipDanger}"`);
content = content.replace(/className="px-2 py-1 bg-\[\#FF453A\]\/20 text-\[\#FF453A\] rounded text-\[9px\] font-bold  uppercase"/g, `className="${chipDanger}"`);
content = content.replace(/className="bg-\[\#FF453A\]\/10 text-\[\#FF453A\] text-\[9px\] font-bold px-2 py-1 rounded"/g, `className="${chipDanger}"`);

// Neutral
content = content.replace(/className="px-2 py-1 bg-white\/5 text-smash-gray border border-white\/10 rounded text-\[9px\] font-bold"/g, `className="${chipNeutral}"`);

// Also fix some specific button layouts if any leftover
content = content.replace(/text-smash-gray/g, 'text-[#B0B0B0]');


fs.writeFileSync('src/pages/Admin.tsx', content);
