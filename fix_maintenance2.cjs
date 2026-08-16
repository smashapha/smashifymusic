const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf8');

const regex = /<div className="flex flex-col md:flex-row gap-6 relative z-10">[\s\S]*?(?=<\/div>\s*<\/div>\s*<div className="grid grid-cols-1 md:grid-cols-2 gap-4">)/;

const replacement = `<div className="flex items-center justify-between py-4 border-b border-white/5 mb-6">
                        <div>
                          <p className="text-[14px] font-semibold text-white">Maintenance Mode</p>
                          <p className="text-[12px] text-[#B0B0B0] mt-1">Enable to show the maintenance screen to all users.</p>
                        </div>
                        <button
                          onClick={() => toggleMaintenance(!maintenance.active)}
                          disabled={maintenanceLoading}
                          className={\`w-11 h-6 rounded-full flex items-center transition-colors px-1 \${maintenance.active ? 'bg-[#00A3FF]' : 'bg-white/10'}\`}
                        >
                          <div className={\`w-4 h-4 bg-white rounded-full transition-transform \${maintenance.active ? 'translate-x-5' : 'translate-x-0'}\`} />
                        </button>
                     </div>

                     <form onSubmit={saveMaintenanceConfig} className="space-y-4 max-w-xl">
                        <div className="space-y-2">
                          <label className="text-[13px] text-[#B0B0B0]">Maintenance Message</label>
                          <textarea
                             value={maintenance.message}
                             onChange={e => setMaintenance({...maintenance, message: e.target.value})}
                             className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-[12px] min-h-[100px] text-[13px] focus:outline-none focus:border-[#00A3FF]/50 transition-colors"
                            placeholder="We are upgrading..."
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[13px] text-[#B0B0B0]">Estimated Time</label>
                          <input 
                            type="text"
                            value={maintenance.estimatedTime}
                            onChange={e => setMaintenance({...maintenance, estimatedTime: e.target.value})}
                            className="w-full px-4 bg-white/5 border border-white/10 rounded-[12px] h-10 text-[13px] focus:outline-none focus:border-[#00A3FF]/50 transition-colors"
                            placeholder="e.g. 30 minutes, 1 hour"
                          />
                        </div>
                        <button
                           type="submit"
                           disabled={maintenanceLoading}
                          className="bg-[#0084D6] hover:bg-[#00A3FF] text-white h-8 px-4 rounded-[10px] text-[13px] font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          {maintenanceLoading ? 'Saving...' : 'Save Configuration'}
                        </button>
                     </form>`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/pages/Admin.tsx', content);
