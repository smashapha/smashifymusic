const fs = require('fs');

const code = `import React from 'react';
import { motion } from "motion/react";
import { Link } from 'react-router-dom';
import { PAGE_CONTAINER, PAGE_BOTTOM_PADDING } from '../lib/layout';
import SEO from '../components/common/SEO';

const About = () => {
  return (
    <div className={\`pt-6 md:pt-10 \${PAGE_CONTAINER} \${PAGE_BOTTOM_PADDING} text-white max-w-4xl mx-auto\`}>
      <SEO 
        title="About Us | Smashify Music" 
        description="Learn about Smashify Music's mission to empower African musicians and connect fans directly with artists." 
      />
      
      <div className="flex items-center gap-2 text-[13px] text-[#B0B0B0] mb-6">
        <Link to="/" className="hover:text-white transition-colors">Home</Link>
        <span className="text-[#737373]">/</span>
        <span className="text-white">About Us</span>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl md:text-5xl font-studio font-bold text-white tracking-tight">About Smashify</h1>
        <p className="text-[13px] text-[#737373] mt-2">Empowering Artists. Connecting Fans. Shifting the Culture.</p>
      </div>

      <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-6 md:p-10 space-y-8 text-[14px] md:text-[15px] text-[#B0B0B0] leading-relaxed">
        
        <section className="space-y-4">
          <h2 className="text-base md:text-lg font-semibold text-white">Our Mission</h2>
          <p>
            Smashify Music is a next-generation music streaming and monetization platform designed specifically for the African music industry, starting right here in Malawi.
          </p>
          <p>
            For too long, local artists have relied on generic global platforms that pay fractions of a cent per stream, offering no localized payment solutions or direct monetization avenues. We are here to change that narrative. Smashify gives artists direct access to fan support, track sales, and subscription models, deeply integrated with local mobile money solutions.
          </p>
          <div className="pt-4 mt-6">
            <p className="text-white font-bold">— Seleman Shadreck Manyungwa</p>
            <p className="text-[#737373] text-[13px] mt-0.5">Founder & Owner</p>
            <p className="text-[#737373] text-[13px] mt-0.5">Built in Blantyre, Malawi</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-base md:text-lg font-semibold text-white">What Makes Us Different</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-white mb-1">Direct-to-Fan Monetization</h3>
              <p>We are moving away from opaque streaming math. Smashify features a transparent model built with local artists in mind, offering clear upload tiers that put control back into the hands of the creators.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Built for Our Market</h3>
              <p>We don’t just build for the web; we build for the community. By deeply integrating secure, localized payment gateways and mobile money solutions (like TNM Mpamba and Airtel Money), we make it incredibly easy for fans to support their favorite artists without friction.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Artist-First Philosophy</h3>
              <p>On Smashify, artists retain 100% ownership of their copyrights. We provide the infrastructure, the security, and the distribution—you provide the talent.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-base md:text-lg font-semibold text-white">Built on Innovation and Trust</h2>
          <p>
            Smashify is a legally registered entity with the Registrar General of Malawi. We take pride in merging rapid technological innovation with high security and strict legal standards. From secure user authentication to robust data privacy, we are committed to providing a professional, dependable ecosystem that artists and music lovers can fully trust.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-base md:text-lg font-semibold text-white">Ready to support or create?</h2>
          <p>
            Whether you want to find affordable listener plans or join our artist platform, Smashify has you covered. Learn more about our plans or start publishing.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link to="/pricing" className="text-[#00A3FF] hover:underline font-semibold">View Pricing Plans →</Link>
            <Link to="/artist-studio" className="text-[#00A3FF] hover:underline font-semibold">Join as Artist →</Link>
          </div>
        </section>

        <section className="pt-6 border-t border-white/10">
          <h2 className="text-base md:text-lg font-semibold text-white mb-4">Connect With Us</h2>
          <div className="space-y-2 text-[14px]">
            <p><strong className="text-white">Email:</strong> <a href="mailto:smashfymusic@gmail.com" className="text-[#00A3FF] hover:underline">smashfymusic@gmail.com</a></p>
            <p><strong className="text-white">WhatsApp & Call:</strong> <a href="https://wa.me/265883728868" target="_blank" rel="noopener noreferrer" className="text-[#00A3FF] hover:underline">+265 88 372 88 68</a></p>
            <p><strong className="text-white">Address:</strong> Smashify Ltd., Blantyre, Malawi</p>
          </div>
        </section>

      </div>
    </div>
  );
};

export default About;
`;

fs.writeFileSync('src/pages/About.tsx', code);
console.log("Rewrote About.tsx");
