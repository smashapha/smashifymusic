import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import { Facebook, Instagram, Youtube, Music } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#0A0A0A] border-t border-white/8 py-16 px-6 lg:px-12 mt-auto w-full font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-10">
        
        {/* Branding Column */}
        <div className="md:col-span-2 space-y-4">
          <Logo size="md" />
          <p className="text-[#B0B0B0] text-[14px] max-w-sm leading-[1.6]">
            Africa's first direct fan-to-artist music ecosystem. Stream freely, tip creators, and power local music growth.
          </p>
          <div className="flex items-center gap-4 text-[#B0B0B0] pt-2">
            <a href="https://facebook.com/Smashify" aria-label="Facebook" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              <Facebook size={18} />
            </a>
            <a href="https://instagram.com/Smashify" aria-label="Instagram" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              <Instagram size={18} />
            </a>
            <a href="https://tiktok.com/@Smashify" aria-label="TikTok" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              <Music size={18} />
            </a>
            <a href="https://youtube.com/@Smashify" aria-label="YouTube" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              <Youtube size={18} />
            </a>
          </div>
        </div>

        {/* Platform Column */}
        <div>
          <h3 className="text-[11px] uppercase font-semibold tracking-[0.18em] text-[#B0B0B0] mb-4">Platform</h3>
          <ul className="space-y-3 text-[14px]">
            <li>
              <Link to="/discover" className="text-[#B0B0B0] hover:text-white transition-colors">
                Discover Music
              </Link>
            </li>
            <li>
              <Link to="/artists" className="text-[#B0B0B0] hover:text-white transition-colors">
                Artists & Creators
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="text-[#B0B0B0] hover:text-white transition-colors">
                Listener Plans
              </Link>
            </li>
            <li>
              <Link to="/auth/artist" className="text-[#B0B0B0] hover:text-white transition-colors">
                Artist Studio
              </Link>
            </li>
          </ul>
        </div>

        {/* Company Column */}
        <div>
          <h3 className="text-[11px] uppercase font-semibold tracking-[0.18em] text-[#B0B0B0] mb-4">Company</h3>
          <ul className="space-y-3 text-[14px]">
            <li>
              <Link to="/about" className="text-[#B0B0B0] hover:text-white transition-colors">
                About Us
              </Link>
            </li>
            <li>
              <Link to="/contact" className="text-[#B0B0B0] hover:text-white transition-colors">
                Contact & Support
              </Link>
            </li>
            <li>
              <a 
                href="https://wa.me/265883728868?text=I%20want%20to%20become%20a%20Smashify%20Agent" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-[#B0B0B0] hover:text-white transition-colors"
              >
                Become an Agent
              </a>
            </li>
          </ul>
        </div>

        {/* Download Column */}
        <div>
          <h3 className="text-[11px] uppercase font-semibold tracking-[0.18em] text-[#B0B0B0] mb-4">Download</h3>
          <ul className="space-y-3 text-[14px]">
            <li>
              <a 
                href="/downloads/Smashify.apk" 
                download="Smashify.apk" 
                className="text-[#00A3FF] hover:underline transition-colors font-medium"
              >
                Android APK (Direct)
              </a>
            </li>
            <li>
              <span className="text-[#B0B0B0]/60 text-[13px] block">
                Web PWA (Installed via browser)
              </span>
            </li>
          </ul>
        </div>

      </div>

      <div className="max-w-7xl mx-auto border-t border-white/8 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-[#B0B0B0]">
        <p>&copy; {new Date().getFullYear()} Smashify Music. All rights reserved.</p>
        <div className="flex gap-6">
          <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}
