import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory store for rate limiting (Note: In a serverless/edge environment like Vercel,
// this state is not shared across regions or instances. For production, use Upstash Redis).
const rateLimitMap = new Map();

export function middleware(request: NextRequest) {
  // Apply rate limiting specifically to the artist login endpoint
  if (request.nextUrl.pathname.startsWith('/auth/artist')) {
    const ip = request.ip || '127.0.0.1';
    const limit = 5; // Max 5 requests
    const windowMs = 60 * 1000; // per 1 minute

    const currentTime = Date.now();
    const rateLimitInfo = rateLimitMap.get(ip) || { count: 0, resetTime: currentTime + windowMs };

    if (currentTime > rateLimitInfo.resetTime) {
      rateLimitInfo.count = 0;
      rateLimitInfo.resetTime = currentTime + windowMs;
    }

    rateLimitInfo.count += 1;
    rateLimitMap.set(ip, rateLimitInfo);

    if (rateLimitInfo.count > limit) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  const response = NextResponse.next();
  return response;
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/auth/:path*'],
};
