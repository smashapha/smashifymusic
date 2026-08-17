import React from 'react';
import { motion } from "motion/react";
import { Link } from 'react-router-dom';
import { PAGE_CONTAINER, PAGE_BOTTOM_PADDING } from '../lib/layout';
import SEO from '../components/common/SEO';

const Privacy = () => {
  return (
    <div className={`pt-6 md:pt-10 ${PAGE_CONTAINER} ${PAGE_BOTTOM_PADDING} text-white max-w-4xl mx-auto`}>
      <SEO title="Privacy Policy | Smashify" description="Privacy Policy and data protection details for Smashify." />

      <div className="flex items-center gap-2 text-[13px] text-[#B0B0B0] mb-6">
        <Link to="/" className="hover:text-white transition-colors">Home</Link>
        <span className="text-[#737373]">/</span>
        <span className="text-white">Privacy Policy</span>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl md:text-5xl font-studio font-bold text-white tracking-tight">Privacy Policy</h1>
        <p className="text-[13px] text-[#737373] mt-2">Effective Date: June 3, 2026</p>
      </div>

      <div className="bg-[#1A1A1A] border border-white/10 rounded-[16px] p-6 md:p-10 space-y-8 text-[14px] md:text-[15px] text-[#B0B0B0] leading-relaxed">
        <p className="text-white text-base leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
          At Smashify, we value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our platform.
        </p>

        <section className="space-y-2">
          <h2 className="text-base md:text-lg font-semibold text-white">1. Information We Collect</h2>
          <div className="space-y-3">
            <p>
              <strong className="text-white">Account Information:</strong> When you register, we collect basic details such as your name, email address, phone number, and account password.
            </p>
            <p>
              <strong className="text-white">Content and Usage Data:</strong> For artists, we collect the profile assets, track data, and audio files you upload. For listeners, we collect data regarding your streaming history, playlists, and platform preferences.
            </p>
            <p>
              <strong className="text-white">Payment Information:</strong> When you subscribe or make payments, transaction processing is handled entirely by our secure third-party payment gateways. Smashify does not collect or store your full credit card numbers or mobile money PINs.
            </p>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base md:text-lg font-semibold text-white">2. How We Use Your Information</h2>
          <p className="mb-2">We use the collected information to:</p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li>Provide, maintain, and optimize the Smashify streaming service.</li>
            <li>Manage user accounts, verify artist profiles, and process subscription payments.</li>
            <li>Communicate important platform updates, security alerts, and support responses.</li>
            <li>Prevent fraudulent activity, unauthorized uploads, and security breaches.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base md:text-lg font-semibold text-white">3. Data Sharing and Third Parties</h2>
          <p className="mb-2">
            We do not sell your personal data to third parties. We only share information with trusted third-party services necessary to operate the platform, including:
          </p>
          <ul className="list-disc pl-6 space-y-1.5">
            <li><strong className="text-white">Authentication Providers:</strong> To manage secure logins and account verification.</li>
            <li><strong className="text-white">Payment Gateways:</strong> To securely process local mobile money and card transactions.</li>
            <li><strong className="text-white">Database and Cloud Hosting:</strong> To securely store application data and audio files (e.g., via Supabase and Vercel infrastructure).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base md:text-lg font-semibold text-white">4. Data Security</h2>
          <p>
            We implement strict industry-standard security measures to protect your personal data against unauthorized access, alteration, or disclosure. This includes using encrypted HTTPS connections for all data transmission. However, please remember that no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base md:text-lg font-semibold text-white">5. Your Rights</h2>
          <p>
            You have the right to access, update, or correct your personal profile information at any time through your account settings. If you wish to permanently delete your Smashify account and delete your data from our systems, you may contact our support team.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base md:text-lg font-semibold text-white">6. Changes to This Policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on this page and updating the effective date.
          </p>
        </section>

        <section className="pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold text-[#737373] uppercase tracking-wider mb-1">Privacy or Data Queries?</p>
            <p className="text-sm text-[#B0B0B0]">Our Data Protection team is ready to assist you.</p>
          </div>
          <div className="space-y-1 text-sm text-[#B0B0B0]">
            <p><strong className="text-white">Email:</strong> <a href="mailto:smashfymusic@gmail.com" className="text-[#00A3FF] hover:underline">smashfymusic@gmail.com</a></p>
            <p><strong className="text-white">WA / Call:</strong> <a href="https://wa.me/265883728868" target="_blank" rel="noopener noreferrer" className="text-[#00A3FF] hover:underline">+265 88 372 88 68</a></p>
            <p><strong className="text-white">Company:</strong> Smashify Ltd., Blantyre, Malawi</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Privacy;
