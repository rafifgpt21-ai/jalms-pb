"use server"

import { signIn } from "@/auth"
import { AuthError } from "next-auth"

export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        const data = Object.fromEntries(formData.entries())
        console.log("Attempting login with:", data.email)
        await signIn("credentials", { ...data, redirectTo: "/" })
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return "Invalid credentials."
                default:
                    return "Something went wrong."
            }
        }

        // Next.js redirects are thrown as errors, we should rethrow them without logging
        const isRedirectError = error instanceof Error && (
            error.message === 'NEXT_REDIRECT' ||
            (error as any).digest?.startsWith('NEXT_REDIRECT')
        );

        if (!isRedirectError) {
            console.error("Login error:", error)
        }

        throw error
    }
}
