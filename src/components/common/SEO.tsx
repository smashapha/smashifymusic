import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  url?: string;
  type?: string;
  image?: string;
}

export default function SEO({
  title,
  description,
  url,
  type = 'website',
  image
}: SEOProps) {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://smashifymusic.vercel.app';
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://smashifymusic.vercel.app');

  // Ensure image is an absolute URL so WhatsApp, Twitter, Facebook crawlers parse it correctly
  const rawImage = image || '/og-image.png';
  const fullImageUrl = rawImage.startsWith('http://') || rawImage.startsWith('https://')
    ? rawImage
    : `${currentOrigin}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`;

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Smashify" />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:image:secure_url" content={fullImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`${title} — Smashify Music`} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@Smashify" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
    </Helmet>
  );
}

