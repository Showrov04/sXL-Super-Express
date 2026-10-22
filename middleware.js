import { NextResponse } from 'next/server';

// In-memory store for rate limiting (resets on deployment)
const rateLimitMap = new Map();

export function middleware(request) {
  const ip = request.ip ?? '127.0.0.1';
  
  // Limit: 10 requests per 1 minute (60000 ms)
  const limit = 10;
  const windowMs = 60 * 1000;

  // Only apply to login and register API routes
  if (
    request.nextUrl.pathname.startsWith('/api/auth/login') || 
    request.nextUrl.pathname.startsWith('/api/auth/register')
  ) {
    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, { count: 1, lastReset: Date.now() });
    } else {
      const data = rateLimitMap.get(ip);
      
      // Reset the count if the time window has passed
      if (Date.now() - data.lastReset > windowMs) {
        data.count = 1;
        data.lastReset = Date.now();
      } else {
        data.count++;
      }

      // Block if they exceed the limit
      if (data.count > limit) {
        return new NextResponse(
          JSON.stringify({ success: false, error: 'Too many requests. Please try again later.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  }

  return NextResponse.next();
}

// Only run this middleware on API auth routes
export const config = {
  matcher: '/api/auth/:path*',
};
