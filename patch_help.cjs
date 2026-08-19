const fs = require('fs');

const code = `import React from 'react';
import { Link } from 'react-router-dom';
import { PAGE_CONTAINER, PAGE_BOTTOM_PADDING } from '../lib/layout';
import SEO from '../components/common/SEO';

const Help = () => {
  return (
    <div className={\`pt-6 md:pt-10 \${PAGE_CONTAINER} \${PAGE_BOTTOM_PADDING} text-white max-w-4xl mx-auto\`}>
      <SEO 
        title="Help & Support | Smashify Music" 
        description="Get help and support with your Smashify account, payouts, and uploads." 
      />
      
      <div className="flex items-center gap-2 text-[13px] text-[#B0B0B0] mb-6">
        <Link to="/" className="hover:text-white transition-colors">Home</Link>
        <span className="text-[#737373]">/</span>
        <span className="text-white">Help & Support</span>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl md:text-5xl font-studio font-bold text-white tracking-tight">Help & Support</h1>
        <p className="text-[13px] text-[#737373] mt-2">Need assistance? We're here to help you get the most out of our platform.</p>
      </div>

      <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-6 md:p-10 space-y-8 text-[14px] md:text-[15px] text-[#B0B0B0] leading-relaxed">
        
        <section className="space-y-4">
          <h2 className="text-base md:text-lg font-semibold text-white">Contact Us Directly</h2>
          <p>
            Whether you are an artist needing help with payouts and uploads, or a listener having trouble with your account, our support team is available to assist you.
          </p>
          <div className="space-y-4 mt-4">
            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-[12px]">
              <h3 className="font-semibold text-white mb-2">WhatsApp Support</h3>
              <p className="mb-4">Chat with our support team directly. We are online to help with payouts, uploads, and account issues.</p>
              <a href="https://wa.me/265883728868" target="_blank" rel="noopener noreferrer" className="inline-block text-[#00A3FF] hover:underline font-semibold">
                +265 88 372 88 68 (Chat on WhatsApp) →
              </a>
            </div>
            <div className="p-5 bg-white/[0.02] border border-white/5 rounded-[12px]">
              <h3 className="font-semibold text-white mb-2">Email Support</h3>
              <p className="mb-4">Send us an email for more detailed inquiries, business partnerships, or copyright claims.</p>
              <a href="mailto:smashfymusic@gmail.com" className="inline-block text-[#00A3FF] hover:underline font-semibold">
                smashfymusic@gmail.com →
              </a>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-base md:text-lg font-semibold text-white pt-4 border-t border-white/10">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-white mb-1">How do I get paid?</h3>
              <p>Payouts are sent directly to your Airtel Money or TNM Mpamba wallet. The minimum withdrawal is MK 10,000, and processing time depends on your Studio Tier (Instant for Elite members!).</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">Can fans listen for free?</h3>
              <p>Yes, fans can stream music for free! You make money when fans purchase tracks, drop tips, or subscribe to your exclusive fan tier.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">How long does my application take?</h3>
              <p>Artist reviews usually take 24–48 hours, but if you upgrade to a paid Studio plan (Rising Star, Standard, or Elite), you get instant approval and can upload immediately!</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Help;
`;

fs.writeFileSync('src/pages/Help.tsx', code);
console.log("Rewrote Help.tsx");
