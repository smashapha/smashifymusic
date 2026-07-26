import re

with open("src/pages/ArtistHub.tsx", "r") as f:
    content = f.read()

start_marker = "                           uploadAudioInBackground(file);"

idx = content.find(start_marker)

if idx != -1:
    missing_chunk = """                           uploadAudioInBackground(file);
                           const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
                           const cleanName = nameWithoutExt.replace(/[-_]/g, ' ').replace(/\\b\w/g, c => c.toUpperCase()).trim();
                           if (!title) setTitle(cleanName);
                        }
                      }}
                      onClick={() => document.getElementById('audio-file-wizard')?.click()}
                    >
                       {(mode === 'album' ? albumTracks.length > 0 : songFile) ? (
                         <div className="w-full relative z-10">
                            {coverFile && (
                              <img src={URL.createObjectURL(coverFile)} className="absolute inset-0 w-full h-full object-cover opacity-30 blur-3xl pointer-events-none -z-10" />
                            )}
                            
                            <div className="flex flex-col items-center max-w-xl mx-auto space-y-6">
                               <CircleCheck size={56} className="text-smash-green mx-auto bg-smash-green/10 p-3 rounded-full" />
                               
                               {mode === 'album' ? (
                                  <div className="w-full bg-black/40 rounded-2xl p-4 border border-white/10 space-y-2">
                                     <h3 className="font-studio font-black text-xl text-white mb-2">{albumTracks.length} Tracks Selected</h3>
                                     <div className="max-h-[150px] overflow-y-auto space-y-2 pr-2 custom-scrollbar pointer-events-auto">
                                        {albumTracks.map((track) => (
                                           <div key={track.id} className="bg-white/5 rounded-xl px-4 py-2">
                                              <div className="flex items-center justify-between mb-1">
                                                <span className="text-[14px] font-display font-medium text-white truncate max-w-[200px] text-left">{track.file.name}</span>
                                                <span className="text-[12px] font-mono text-text-muted">{(track.file.size / (1024*1024)).toFixed(1)} MB</span>
                                              </div>
                                              {track.uploadStatus === 'compressing' && (
                                                <div className="text-[10px] font-display font-bold uppercase tracking-widest text-smash-purple">Compressing...</div>
                                              )}
                                              {track.uploadStatus === 'uploading' && (
                                                <div>
                                                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                                                    <div className="h-full bg-smash-orange rounded-full transition-all" style={{ width: `${track.uploadProgress}%` }} />
                                                  </div>
                                                  <div className="flex items-center justify-between text-[10px] font-mono text-text-muted">
                                                    <span>{track.uploadProgress}% · {formatSpeed(track.uploadSpeedBps)}</span>
                                                    <span>{formatEta(track.uploadEtaSeconds)}</span>
                                                  </div>
                                                </div>
                                              )}
                                              {track.uploadStatus === 'done' && (
                                                <div className="text-[10px] font-display font-bold uppercase tracking-widest text-smash-green">✓ Uploaded</div>
                                              )}
                                              {track.uploadStatus === 'error' && (
                                                <button type="button" onClick={(e) => { e.stopPropagation(); retryAlbumTrackUpload(track.id); }} className="text-[10px] font-display font-bold uppercase tracking-widest text-red-400 hover:text-red-300">
                                                  ⚠ {track.uploadError || 'Failed'} — Tap to retry
                                                </button>
                                              )}
                                           </div>
                                        ))}
                                     </div>
                                  </div>
                               ) : (
                                  <div className="space-y-4 w-full pointer-events-auto">
                                     <div className="flex items-center justify-between">
                                        <div className="text-left">
                                           <h3 className="font-studio font-black text-2xl text-white truncate max-w-[300px]">{songFile.name}</h3>
                                           <p className="text-text-muted text-[13px] font-sans">{audioFileSize} • {audioDuration}</p>
                                        </div>
                                     </div>
                                     <div className="bg-white/5 rounded-2xl p-4">
                                        {audioUploading ? (
                                           <div>
                                             <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                                               <div className="h-full bg-smash-orange rounded-full transition-all" style={{ width: `${audioUploadProgress}%` }} />
                                             </div>
                                             <div className="flex items-center justify-between text-[11px] font-mono text-text-muted">
                                               <span>{audioUploadProgress}% · {formatSpeed(audioUploadSpeedBps)}</span>
                                               <span>{formatEta(audioUploadEtaSeconds)}</span>
                                             </div>
                                           </div>
                                        ) : audioUploadError ? (
                                           <button type="button" onClick={() => uploadAudioInBackground(songFile!)} className="w-full h-10 border border-red-500/20 bg-red-500/10 text-red-500 font-display font-bold uppercase tracking-widest text-[11px] rounded-xl hover:bg-red-500/20 transition-all">
                                             ⚠ Upload Failed — Tap to retry
                                           </button>
                                        ) : audioUploadUrl ? (
                                           <div className="flex items-center gap-2 text-smash-green font-display font-black uppercase tracking-widest text-[12px]">
                                              <CircleCheck size={16} /> Ready
                                           </div>
                                        ) : null}
                                     </div>
                                  </div>
                               )}
                            </div>
                         </div>
                       ) : (
                         <div className="flex flex-col items-center justify-center space-y-6 max-w-sm mx-auto pointer-events-none">
                            <div className="w-24 h-24 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center relative shadow-lg">
                               <Music size={40} className={`text-white transition-all ${isDraggingAudio ? 'scale-110 text-smash-orange' : ''}`} />
                               <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-smash-orange text-black flex items-center justify-center shadow-lg">
                                  <Upload size={16} />
                               </div>
                            </div>
                            <div className="flex gap-1">
                              {Array.from({ length: 5 }).map((_, i) => {
                                const heights = [0.4, 0.7, 1, 0.6, 0.3];
                                const h = heights[i];
                                return (
                                <div 
                                  key={i} 
                                  className="w-1.5 bg-smash-orange rounded-full" 
                                  style={{ 
                                    height: `${h * 100}%`,
                                    animation: `waveBar 1.2s ease-in-out infinite alternate`,
                                    animationDelay: `${i * 0.1}s`,
                                    opacity: isDraggingAudio ? 1 : 0.5,
                                  }} 
                                />
                              )})}
                            </div>
                            <div>
                               <h3 className="font-studio text-2xl md:text-3xl text-white uppercase tracking-tight mb-2">Drop your MP3 here</h3>
                               <p className="text-text-muted text-[13px] md:text-sm font-sans">MP3 Only · Max 50MB · Fast direct upload</p>
                            </div>
                            <button type="button" className="px-8 py-3 rounded-full bg-smash-orange text-black font-display font-black uppercase text-xs tracking-widest hover:brightness-110 shadow-[0_0_20px_rgba(255,95,0,0.3)] transition-all pointer-events-auto">
                               Browse Files
                            </button>
                         </div>
                       )}
                       <input id="audio-file-wizard" type="file" multiple={mode === 'album'} accept="audio/mpeg, audio/mp3, .mp3" onChange={e => {
                         if (mode === 'album') {
                           const files = Array.from(e.target.files || []) as File[];
                           const mp3Files = files.filter(f => f.name.toLowerCase().endsWith('.mp3'));
                           if (mp3Files.length !== files.length) {
                              toast.error('Only MP3 files are allowed.');
                           }
                           initAlbumTracks(mp3Files);
                         } else {
                           const file = e.target.files?.[0];
                           if (!file) return;
                           if (!file.name.toLowerCase().endsWith('.mp3') && file.type !== 'audio/mpeg') {
                              toast.error('Only MP3 files are allowed.');
                              return;
                           }
                           setSongFile(file);
                           setTitle(file.name.replace(/\.[^/.]+$/, ""));
                           const audio = new Audio();
                           audio.src = URL.createObjectURL(file);
                           setAudioPreviewUrl(audio.src);
                           audio.onloadedmetadata = () => {
                             const mins = Math.floor(audio.duration / 60);
                             const secs = Math.floor(audio.duration % 60);
                             setAudioDuration(`${mins}:${secs.toString().padStart(2, '0')}`);
                           };
                           setAudioFileSize((file.size / (1024*1024)).toFixed(1) + ' MB');
"""
    new_content = content[:idx] + missing_chunk + content[idx:]
    with open("src/pages/ArtistHub.tsx", "w") as f:
        f.write(new_content)
    print("Restored!")
else:
    print("Marker not found!")
