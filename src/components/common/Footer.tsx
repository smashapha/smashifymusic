import React from 'react';
import { Link } from 'react-router-dom';
import Logo from './Logo';
import { Facebook, Instagram, Youtube, Music } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-bg-surface border-t border-border-subtle py-12 px-6 lg:px-8 mt-auto w-full">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Branding Column */}
        <div className="md:col-span-2 space-y-4">
          <Logo size="md" />
          <p className="text-text-secondary text-sm max-w-sm font-sans">
            Africa's first direct fan-to-artist music platform. Stream free, buy tracks, and support your favorite creators directly.
          </p>
          <div className="flex items-center gap-4 text-text-muted">
            <a href="https://facebook.com/Smashify" aria-label="Facebook" target="_blank" rel="noopener noreferrer" className="hover:text-smash-orange transition-colors">
              <Facebook size={18} />
            </a>
            <a href="https://instagram.com/Smashify" aria-label="Instagram" target="_blank" rel="noopener noreferrer" className="hover:text-smash-orange transition-colors">
              <Instagram size={18} />
            </a>
            <a href="https://tiktok.com/@Smashify" aria-label="TikTok" target="_blank" rel="noopener noreferrer" className="hover:text-smash-orange transition-colors">
              <Music size={18} />
            </a>
            <a href="https://youtube.com/@Smashify" aria-label="YouTube" target="_blank" rel="noopener noreferrer" className="hover:text-smash-orange transition-colors">
              <Youtube size={18} />
            </a>
          </div>
        </div>

        {/* Navigation Column */}
        <div>
          <h3 className="text-xs uppercase font-display font-bold tracking-widest text-text-muted mb-4">Explore</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/discover" className="text-text-secondary hover:text-smash-orange transition-colors font-medium">
                Discover
              </Link>
            </li>
            <li>
              <Link to="/trending" className="text-text-secondary hover:text-smash-orange transition-colors font-medium">
                Trending
              </Link>
            </li>
            <li>
              <Link to="/artists" className="text-text-secondary hover:text-smash-orange transition-colors font-medium">
                Artists
              </Link>
            </li>
          </ul>
        </div>

        {/* Resources Column */}
        <div>
          <h3 className="text-xs uppercase font-display font-bold tracking-widest text-text-muted mb-4">Platform</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/pricing" className="text-text-secondary hover:text-smash-orange transition-colors font-medium">
                Pricing
              </Link>
            </li>
            <li>
              <Link to="/about" className="text-text-secondary hover:text-smash-orange transition-colors font-medium">
                About Us
              </Link>
            </li>
            <li>
              <Link to="/contact" className="text-text-secondary hover:text-smash-orange transition-colors font-medium">
                Contact
              </Link>
            </li>
          </ul>
        </div>

      </div>

      <div className="max-w-7xl mx-auto border-t border-border-subtle mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
        <p>&copy; {new Date().getFullYear()} Smashify Music. All rights reserved.</p>
        <div className="flex gap-6">
          <Link to="/terms" className="hover:text-text-primary transition-colors">Terms of Service</Link>
          <Link to="/privacy" className="hover:text-text-primary transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}
