import React from 'react';
import { motion } from 'motion/react';
import { Info, ChevronRight, Music, Heart, BarChart, Globe, DollarSign, ShieldAlert, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import Footer from '../components/common/Footer';

const About = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 md:p-12 pb-32 max-w-5xl mx-auto text-white select-none"
    >
      <SEO 
        title="About Us | Smashify Music" 
        description="Learn about Smashify Music's mission to empower African musicians and connect fans directly with artists." 
      />

      {/* Breadcrumbs */}
      <div className="flex items-center gap-3 text-sm font-bold text-smash-gray uppercase tracking-widest mb-8">
         <Link to="/" className="hover:text-white transition-colors animate-pulse">Home</Link>
         <ChevronRight size={14} />
         <span className="text-smash-orange font-black">About Us</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4 mb-3">
        <Info size={32} className="text-smash-orange animate-bounce" />
        <h1 className="text-4xl md:text-5xl font-black font-display uppercase italic tracking-tighter text-white">About Smashify</h1>
      </div>
      <p className="text-xl text-smash-gray font-semibold mb-12 max-w-3xl leading-relaxed italic border-l-4 border-smash-orange pl-4 py-1">
        Empowering Artists. Connecting Fans. Shifting the Culture.
      </p>

      {/* Intro and Mission */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="bg-zinc-950/40 p-8 md:p-10 rounded-[32px] border border-white/5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-full bg-smash-orange/10 flex items-center justify-center mb-6">
              <Music className="text-smash-orange" size={24} />
            </div>
            <h2 className="text-2xl font-black font-display uppercase italic tracking-tighter text-white mb-4">Our Vision</h2>
            <p className="text-zinc-300 font-medium text-sm md:text-base leading-relaxed">
              Smashify is a forward-thinking digital music streaming and monetization platform built specifically to champion independent musical talent and give listeners unfiltered access to the sounds they love. Founded in 2026, Smashify was born out of a clear vision: the traditional music industry infrastructure is changing, and creators deserve a direct, transparent, and secure path to build a career on their own terms.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-950 to-zinc-900/60 p-8 md:p-10 rounded-[32px] border border-smash-orange/10 shadow-xl flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
              <Heart className="text-red-500" size={24} />
            </div>
            <h2 className="text-2xl font-black font-display uppercase italic tracking-tighter text-white mb-4">Our Mission</h2>
            <p className="text-zinc-300 font-medium text-sm md:text-base leading-relaxed">
              Our mission is simple: <strong className="text-white">To bridge the gap between creative passion and sustainable commerce.</strong>
              <br /><br />
              We believe that upcoming and established artists shouldn't have to navigate complex, gatekept global systems just to share their art and get paid. By providing tailored, flexible upload tiers for creators and a seamless streaming experience for fans, Smashify serves as the ultimate launchpad for local music to make a global impact.
            </p>
          </div>
        </div>
      </div>

      {/* From the Founder */}
      <div className="bg-zinc-950/40 p-8 md:p-12 rounded-[32px] border border-white/5 shadow-2xl mb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-smash-orange/5 rounded-full blur-3xl pointer-events-none" />
        <h2 className="text-2xl md:text-3xl font-black font-display uppercase italic tracking-tighter text-white mb-6 flex items-center gap-3">
          <Award className="text-smash-orange" size={28} />
          From the Founder
        </h2>
        <div className="space-y-4 text-zinc-300 font-medium leading-relaxed relative z-10 text-sm md:text-lg">
          <p className="italic">
            "As an artist and a self-taught software developer, I experienced firsthand the hurdles creators face trying to share and monetize their art in our region. Global platforms often feel distant, disconnected from our local reality, and full of friction when it comes to getting paid."
          </p>
          <p className="italic">
            "I built Smashify entirely from the ground up to change that. This platform isn't just about streaming audio; it’s about giving creators financial independence, protecting their intellectual property, and making local support completely frictionless through the mobile payment systems we use every day. Smashify is built by a creator, for creators, with a commitment to security, transparency, and shifting the culture forward."
          </p>
          <div className="pt-4 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
            <div>
              <p className="text-white font-black font-display tracking-tight text-lg">— Seleman Shadreck Manyungwa</p>
              <p className="text-smash-orange font-bold text-xs uppercase tracking-widest mt-0.5">Founder &amp; Owner</p>
            </div>
            <span className="text-xs bg-white/5 py-1.5 px-3 rounded-full text-zinc-400 font-bold uppercase tracking-wider">
               Built in Blantyre, Malawi
            </span>
          </div>
        </div>
      </div>

      {/* What Makes Us Different */}
      <div className="mb-12">
        <h2 className="text-2xl md:text-3xl font-black font-display uppercase italic tracking-tighter text-white text-center mb-8">
           What Makes Us Different
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-950/10 p-6 rounded-2xl border border-white/5 flex flex-col h-full hover:border-smash-orange/20 transition-all duration-300">
            <DollarSign className="text-smash-orange mb-4" size={28} />
            <h3 className="font-bold text-lg text-white mb-2">Direct-to-Fan Monetization</h3>
            <p className="text-zinc-400 text-sm font-medium leading-relaxed">
              We are moving away from opaque streaming math. Smashify features a transparent model built with local artists in mind, offering clear "Upcoming," "Standard," and "Pro" upload tiers that put control back into the hands of the creators.
            </p>
          </div>

          <div className="bg-zinc-950/10 p-6 rounded-2xl border border-white/5 flex flex-col h-full hover:border-smash-orange/20 transition-all duration-300">
            <Globe className="text-smash-orange mb-4" size={28} />
            <h3 className="font-bold text-lg text-white mb-2">Built for Our Market</h3>
            <p className="text-zinc-400 text-sm font-medium leading-relaxed">
              We don’t just build for the web; we build for the community. By deeply integrating secure, localized payment gateways and mobile money solutions (like TNM Mpamba and Airtel Money), we make it incredibly easy for fans to support their favorite artists without friction.
            </p>
          </div>

          <div className="bg-zinc-950/10 p-6 rounded-2xl border border-white/5 flex flex-col h-full hover:border-smash-orange/20 transition-all duration-300">
            <Music className="text-smash-orange mb-4" size={28} />
            <h3 className="font-bold text-lg text-white mb-2">Artist-First Philosophy</h3>
            <p className="text-zinc-400 text-sm font-medium leading-relaxed">
              On Smashify, artists retain 100% ownership of their copyrights. We provide the infrastructure, the security, and the distribution—you provide the talent.
            </p>
          </div>
        </div>
      </div>

      {/* Built on Innovation and Trust */}
      <div className="bg-zinc-950/40 p-8 md:p-10 rounded-[32px] border border-white/5 shadow-xl mb-12 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
             <BarChart className="text-smash-orange" size={24} />
             <h2 className="text-2xl font-black font-display uppercase italic tracking-tighter text-white">Built on Innovation and Trust</h2>
          </div>
          <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-2xl">
            Smashify is a legally registered entity with the Registrar General of Malawi. We take pride in merging rapid technological innovation with high security and strict legal standards. From secure user authentication to robust data privacy, we are committed to providing a professional, dependable ecosystem that artists and music lovers can fully trust.
          </p>
        </div>
        <div className="bg-zinc-900/40 py-3 px-6 rounded-2xl border border-white/5 shrink-0 self-stretch md:self-auto flex flex-col justify-center text-center">
          <p className="text-[10px] font-black tracking-wider uppercase text-zinc-400 mb-0.5">Registration Status</p>
          <p className="text-xs font-bold text-green-400">✅ Fully Registered Entity</p>
        </div>
      </div>

      {/* The Numbers Section */}
      <div className="bg-gradient-to-br from-smash-orange to-red-600 rounded-[32px] p-8 md:p-12 mb-12 shadow-[0_0_80px_rgba(255,95,0,0.15)] text-white">
        <h2 className="text-3xl font-black font-display italic uppercase text-center mb-10 tracking-tight">Smashify in Numbers</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-4xl md:text-5xl font-black font-display mb-1">50k+</div>
            <div className="text-white/80 font-bold uppercase tracking-widest text-xs text-balance">Registered Listeners</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-black font-display mb-1">200+</div>
            <div className="text-white/80 font-bold uppercase tracking-widest text-xs text-balance">Verified Artists</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-black font-display mb-1">1M+</div>
            <div className="text-white/80 font-bold uppercase tracking-widest text-xs text-balance">Songs Streamed</div>
          </div>
          <div>
            <div className="text-4xl md:text-5xl font-black font-display mb-1">MK 5M+</div>
            <div className="text-white/80 font-bold uppercase tracking-widest text-xs text-balance">Paid to Artists</div>
          </div>
        </div>
      </div>

      {/* Contextual CTA links for SEO internal linking */}
      <div className="bg-zinc-950/20 border border-white/5 p-8 rounded-[32px] mt-12 mb-12 text-center">
        <h3 className="text-xl font-bold font-display uppercase tracking-wider text-white mb-4">Ready to support or create?</h3>
        <p className="text-zinc-400 text-sm max-w-xl mx-auto mb-6">
          Whether you want to find affordable listener plans or join our artist platform, Smashify has you covered. Learn more about our plans or start publishing.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/pricing" className="px-6 py-3 bg-smash-orange text-white font-bold rounded-full hover:brightness-110 transition-all text-sm uppercase tracking-wider">
            View Pricing Plans
          </Link>
          <Link to="/artists" className="px-6 py-3 bg-smash-purple/20 border border-smash-purple/30 text-smash-purple font-bold rounded-full hover:bg-smash-purple/30 transition-all text-sm uppercase tracking-wider">
            Join as Artist
          </Link>
        </div>
      </div>

      {/* Contact Section */}
      <div className="bg-zinc-950/40 p-8 md:p-12 rounded-[32px] border border-white/5 text-center shadow-lg">
        <h2 className="text-2xl font-black font-display uppercase italic tracking-tighter text-white mb-6">Connect With Us</h2>
        <div className="flex flex-col md:flex-row md:justify-around items-center gap-6 text-smash-gray font-medium text-sm">
          <p className="flex items-center gap-2">
            <strong className="text-white">Email:</strong> 
            <a href="mailto:smashfymusic@gmail.com" className="hover:text-smash-orange transition-colors">smashfymusic@gmail.com</a>
          </p>
          <p className="flex items-center gap-2">
            <strong className="text-white">WhatsApp &amp; Call:</strong> 
            <a href="https://wa.me/265883728868" target="_blank" rel="noopener noreferrer" className="hover:text-smash-orange transition-colors">+265 88 372 88 68</a>
          </p>
          <p className="flex items-center gap-2 text-center">
            <strong className="text-white">Address:</strong> 
            <span className="text-zinc-400">Smashify Ltd., Blantyre, Malawi</span>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 -mx-8 md:-mx-12 -mb-32">
        <Footer />
      </div>
    </motion.div>
  );
};

export default About;
