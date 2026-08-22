import { useState, useEffect } from 'react';

interface Props {
  message?: string;
  estimatedTime?: string;
}

export default function Maintenance({ message, estimatedTime }: Props) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-bg-page flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-8 relative">
        <div className="w-24 h-24 rounded-full bg-[#00A3FF]/10 border-2 border-[#00A3FF]/30 flex items-center justify-center mx-auto mb-6 animate-pulse">
          <span className="text-4xl">🎵</span>
        </div>
        <h1 className="text-5xl font-semibold font-display uppercase tracking-tighter text-white mb-2">
          SMASH<span className="text-[#00A3FF]">IFY</span>
        </h1>
      </div>

      <h2 className="text-2xl font-semibold uppercase tracking-widest text-white mb-4">
        Under Maintenance{dots}
      </h2>

      <p className="text-[#B0B0B0] text-lg max-w-md leading-relaxed mb-6">
        {message || "We're upgrading Smashify to bring you a better experience. We'll be back shortly!"}
      </p>

      {estimatedTime && (
        <div className="px-6 py-3 bg-[#00A3FF]/10 border border-[#00A3FF]/20 rounded-2xl mb-8">
          <p className="text-[#00A3FF] font-bold text-sm uppercase tracking-widest">
            ⏱ Estimated return: {estimatedTime}
          </p>
        </div>
      )}

      <div className="flex flex-col items-center gap-3 text-[#B0B0B0] text-sm">
        <p>Follow us for updates:</p>
        <a
          href="https://wa.me/265883728868"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-green-400 hover:text-green-300 font-bold transition-colors"
        >
          📱 WhatsApp Support
        </a>
      </div>
    </div>
  );
}
