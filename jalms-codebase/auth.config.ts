import type { NextAuthConfig } from "next-auth"
import { getDefaultDashboardHref } from "@/lib/role-dashboard"

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    secret: process.env.AUTH_SECRET,
    session: { strategy: "jwt" },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnLogin = nextUrl.pathname.startsWith('/login');

            if (isOnLogin || nextUrl.pathname === '/') {
                if (isLoggedIn) {
                    const roles = (auth?.user as any)?.roles || [];
                    return Response.redirect(new URL(getDefaultDashboardHref(roles), nextUrl));
                }
                if (nextUrl.pathname === '/') return false; // Redirect unauthenticated users on root to login (handled by return false below)
                return true;
            }

            if (isLoggedIn) {
                const roles = (auth?.user as any)?.roles || [];
                const pathname = nextUrl.pathname;

                if (pathname.startsWith('/admin')) {
                    // Allow access to admin route in middleware to let the Layout handle the role check
                    // This allows for fresh DB checks in the Layout and prevents issues with stale sessions
                    return true;
                }

                if (pathname.startsWith('/teacher')) {
                    return roles.includes("SUBJECT_TEACHER") || roles.includes("HOMEROOM_TEACHER") || roles.includes("ADMIN");
                }

                if (pathname.startsWith('/student')) {
                    if (pathname.startsWith('/student/learning-profile')) {
                        // Allow parents to view learning profile if they have access to student? 
                        // For now keep strict.
                        return roles.includes("STUDENT") || roles.includes("PARENT") || roles.includes("ADMIN");
                    }
                    return roles.includes("STUDENT") || roles.includes("ADMIN");
                }

                if (pathname.startsWith('/parent')) {
                    return roles.includes("PARENT") || roles.includes("ADMIN");
                }

                if (pathname.startsWith('/homeroom')) {
                    return roles.includes("HOMEROOM_TEACHER") || roles.includes("ADMIN");
                }

                return true;
            }

            return false;
        },
        async session({ session, token }: { session: any; token: any }) {
            if (token.sub && session.user) {
                session.user.id = token.sub;
            }
            if (token.roles && session.user) {
                session.user.roles = token.roles;
            }
            if (token.avatarConfig && session.user) {
                session.user.avatarConfig = token.avatarConfig;
            }
            if (session.user) {
                session.user.nickname = token.nickname;
                session.pbToken = token.pbToken;
            }
            return session;
        },
    },
    providers: [],
} satisfies NextAuthConfig
