import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import PocketBase from "pocketbase"
import { getPocketBaseUrl } from "@/lib/pocketbase/client"
import { mapPocketBaseUser } from "@/lib/pocketbase/auth"

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    trustHost: true,
    providers: [
        Credentials({
            async authorize(credentials) {
                try {
                    const parsedCredentials = z
                        .object({ email: z.string().email(), password: z.string().min(6) })
                        .safeParse(credentials);

                    if (parsedCredentials.success) {
                        const { email, password } = parsedCredentials.data;
                        const pb = new PocketBase(getPocketBaseUrl());
                        const auth = await pb.collection("users").authWithPassword(email, password);
                        const user = mapPocketBaseUser(auth.record as unknown as Record<string, unknown>);
                        return { ...user, pbToken: auth.token };
                    }
                    return null;
                } catch (error) {
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        ...authConfig.callbacks,
        async jwt({ token, user }) {
            if (user) {
                token.roles = (user as any).roles;
                token.avatarConfig = (user as any).avatarConfig;
                token.picture = (user as any).image;
                token.nickname = (user as any).nickname;
                token.pbToken = (user as any).pbToken;
            }
            return token;
        }
    }
})
