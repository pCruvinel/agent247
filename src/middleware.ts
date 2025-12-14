import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Get the path
    const path = request.nextUrl.pathname;

    // Define paths that require authentication
    const isDashboardPath = path.startsWith('/dashboard');

    // Get the token from cookies
    const token = request.cookies.get('auth-token')?.value;

    // If trying to access dashboard without token, redirect to login
    if (isDashboardPath && !token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // If trying to access login with token, redirect to dashboard
    if (path === '/login' && token) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/dashboard/:path*',
        '/login'
    ],
};
