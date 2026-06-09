import React from 'react';
import { motion } from 'motion/react';
import { Shield, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Terms = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 md:p-12 pb-32 max-w-4xl mx-auto text-white"
    >
      <div className="flex items-center gap-3 text-sm font-bold text-smash-gray uppercase tracking-widest mb-8">
         <Link to="/" className="hover:text-white transition-colors animate-pulse">Home</Link>
         <ChevronRight size={14} />
         <span className="text-smash-purple font-black">Terms of Service</span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <Shield size={32} className="text-smash-purple animate-bounce" />
        <h1 className="text-4xl md:text-5xl font-black font-display uppercase italic tracking-tighter text-white">Terms of Service</h1>
      </div>
      <p className="text-smash-gray font-black uppercase tracking-widest text-xs mb-10">Last updated: June 2026</p>

      <div className="space-y-10 text-zinc-300 font-medium leading-relaxed bg-zinc-950/40 p-8 md:p-12 rounded-[32px] border border-white/5 shadow-2xl">
        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">1. Agreement and Acceptance</h2>
          <p className="text-smash-gray text-sm md:text-base">
            By creating an account on Smashify, you agree to be legally bound by these Terms of Service. These terms constitute a legally enforceable agreement between you and Smashify Technologies, operating under Malawian law. If you are under 18 years of age, you may not create an account or use the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">2. Platform Description</h2>
          <p className="text-smash-gray text-sm md:text-base">
            Smashify is a digital music streaming and monetization marketplace that connects Malawian and African artists with their fans. The platform facilitates direct financial transactions between artists and fans including track purchases, tips, and fan subscriptions.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">3. Artist Content License</h2>
          <p className="text-smash-gray text-sm md:text-base">
            By uploading content to Smashify, you grant Smashify a non-exclusive, royalty-free, worldwide license to host, store, display, stream, and promote your content on the platform. You retain 100% copyright ownership of all your music. Smashify does not claim ownership of any artist content. You may remove your content at any time. Smashify's license to your content terminates when you delete it from the platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">4. Content Ownership Warranty</h2>
          <div className="space-y-3 text-smash-gray text-sm md:text-base">
            <p>You warrant and guarantee that:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>You own or have obtained all necessary rights, licenses, and permissions for every piece of content you upload</li>
              <li>Your content does not infringe any copyright, trademark, or intellectual property rights of any third party</li>
              <li>Your content does not violate any applicable law in Malawi or the country of origin</li>
              <li>You have the right to grant the license described in Section 3</li>
            </ul>
            <p>Violation of this warranty is grounds for immediate account termination and may result in civil and criminal liability under the Copyright Act of Malawi (Cap. 49:03).</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">5. Prohibited Content</h2>
          <div className="space-y-3 text-smash-gray text-sm md:text-base">
            <p>The following content is strictly prohibited and will result in immediate removal and permanent account ban:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Music or content that infringes third-party copyrights or trademarks</li>
              <li>Cover songs uploaded without a valid mechanical licence or explicit artist/label permission</li>
              <li>Content that promotes, glorifies, or facilitates violence, terrorism, or hatred based on race, religion, gender, ethnicity, or sexual orientation</li>
              <li>Sexually explicit content involving minors under any circumstances</li>
              <li>Content that facilitates illegal activity including drug trafficking, fraud, or money laundering</li>
              <li>Deliberately misleading content, misinformation, or impersonation of other artists</li>
              <li>Content uploaded with intent to artificially inflate play counts or earnings</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">6. Financial Terms and Platform Fees</h2>
          <p className="text-smash-gray text-sm md:text-base">
            Smashify charges a platform fee on artist earnings from tips and track sales based on the artist's subscription tier (Free: 15%, Rising Star: 10%, Standard: 7%, Elite: 5%). Studio subscription payments (Rising Star, Standard, Elite) are non-refundable once the subscription period has begun. Payout requests are subject to a 3% processing fee. Smashify processes payouts manually within 24-48 business hours of an approved request. Smashify reserves the right to withhold payouts pending fraud investigation.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">7. Fraud and Abuse Policy</h2>
          <div className="space-y-3 text-smash-gray text-sm md:text-base">
            <p>The following constitute fraud and will result in immediate permanent termination, forfeiture of wallet balance, and may be reported to relevant Malawian authorities:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use of bots, scripts, or third-party services to artificially inflate plays, followers, or engagement metrics</li>
              <li>Creating multiple accounts to exploit Free tier limits</li>
              <li>Submitting false withdrawal requests or attempting to manipulate the payout system</li>
              <li>Coordinating with others to mass-report legitimate content for anticompetitive purposes</li>
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">8. DMCA and Copyright Takedowns</h2>
          <p className="text-smash-gray text-sm md:text-base">
            Smashify respects intellectual property rights. Copyright holders may submit takedown requests to legal@smashify.mw including: (a) identification of the infringing work, (b) identification of the copyrighted work, (c) contact information, and (d) a statement of good faith belief. Smashify will respond within 72 hours and remove infringing content pending investigation. Artists may counter-notify if they believe the takedown is erroneous.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">9. Privacy and Data</h2>
          <p className="text-smash-gray text-sm md:text-base">
            Smashify collects: account information (name, email, phone number), payment information processed by PayChangu, usage data (plays, likes, purchases), and identity verification documents. We do not sell personal data to third parties. Payment details are handled exclusively by PayChangu and never stored on Smashify servers. Identity documents are stored securely and accessed only for verification purposes by authorized staff.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">10. Account Termination</h2>
          <p className="text-smash-gray text-sm md:text-base">
            Smashify reserves the right to suspend or permanently terminate any account that violates these terms, with or without prior notice. Upon termination: active subscriptions are cancelled with no refund, pending payout requests are reviewed and processed if legitimate, all artist content is removed from public access within 24 hours, and artist data is retained for 90 days before permanent deletion unless a legal hold applies.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">11. Limitation of Liability</h2>
          <p className="text-smash-gray text-sm md:text-base">
            Smashify is not liable for: loss of earnings due to platform downtime, content removed under copyright claims, decisions made by fans regarding purchases or tips, or any indirect, incidental, or consequential damages. Smashify's total liability to any user shall not exceed the amount paid by that user to Smashify in the 3 months preceding the claim.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">12. Governing Law and Disputes</h2>
          <p className="text-smash-gray text-sm md:text-base">
            These Terms are governed by the laws of the Republic of Malawi. Any dispute arising from these Terms shall first be attempted to be resolved through good faith negotiation. If unresolved within 30 days, disputes shall be referred to arbitration in Blantyre, Malawi under the Arbitration Act of Malawi.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black font-display uppercase italic tracking-tighter text-white">13. Changes to Terms</h2>
          <p className="text-smash-gray text-sm md:text-base">
            Smashify reserves the right to update these Terms at any time. Users will be notified of material changes via email and platform notification. Continued use of the platform after notification constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section className="pt-8 border-t border-white/5 pb-4">
          <div className="space-y-1.5 text-zinc-400 text-sm">
            <p><strong>Legal Contact:</strong> <a href="mailto:legal@smashify.mw" className="text-smash-purple hover:text-white transition-colors">legal@smashify.mw</a></p>
          </div>
        </section>
      </div>
    </motion.div>
  );
};

export default Terms;
