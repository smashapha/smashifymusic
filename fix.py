import re

with open("src/pages/ArtistHub.tsx", "r") as f:
    content = f.read()

# Let's fix the damaged region.
# It starts around `uploadAudioInBackground(file);`
# And goes until `{/* LEFT COLUMN: COVER */}`

start_marker = "                           uploadAudioInBackground(file);"
end_marker = "                        {/* LEFT COLUMN: COVER */}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    good_chunk = """                           uploadAudioInBackground(file);
                           const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
                           const cleanName = nameWithoutExt.replace(/[-_]/g, ' ').replace(/\\b\w/g, c => c.toUpperCase()).trim();
                           if (!title) setTitle(cleanName);
                         }
                       }} className="hidden" />
                    </div>

                    <div className="mt-8 flex gap-4">
                       <button
                         type="button"
                         onClick={() => setCurrentStep(1)}
                         className="h-14 px-8 border border-white/10 hover:bg-white/5 text-white font-display font-black uppercase tracking-widest text-[13px] rounded-2xl transition-all"
                       >
                         ← BACK
                       </button>
                       <button
                         type="button"
                         disabled={mode === 'album' ? albumTracks.length === 0 : !songFile}
                         onClick={() => setCurrentStep(3)} 
                         className="flex-1 h-14 bg-smash-purple text-white font-display font-black uppercase tracking-widest text-[13px] rounded-2xl disabled:opacity-50 hover:brightness-110 transition-all flex items-center justify-center gap-2"
                       >
                         NEXT: Final Check <ChevronRight size={18} />
                       </button>
                    </div>
                  </div>
                )}

                {currentStep === 1 && (
                  <div className="p-4 md:p-12">
                    <div className="flex bg-bg-elevated p-1.5 rounded-full w-full md:w-fit overflow-x-auto custom-scrollbar mx-auto md:mx-0 gap-1 border border-white/5 shadow-inner mb-8">
                       {['single', 'album', 'snippet'].map((m) => (
                         <button type="button" key={m} onClick={() => {
                           if (m === 'album' && !limits.canCreateAlbums) return toast.error('Standard Plan required');
                           if (m === 'snippet' && !limits.canPostSnippets) return toast.error('Rising Star plan required to post MotoFeed snippets');
                           setMode(m as any);
                         }} className={`flex-1 md:flex-none whitespace-nowrap px-4 md:px-8 py-3 rounded-full text-[11px] font-display font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-smash-purple text-white shadow-xl scale-[1.02]' : 'text-text-secondary hover:text-text-primary'}`}>
                           {m}
                         </button>
                       ))}
                    </div>

                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
"""
    new_content = content[:start_idx] + good_chunk + content[end_idx:]
    with open("src/pages/ArtistHub.tsx", "w") as f:
        f.write(new_content)
    print("Fixed!")
else:
    print("Markers not found!")
