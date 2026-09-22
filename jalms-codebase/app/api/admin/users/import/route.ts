import { auth } from "@/auth"
import { db as prisma } from "@/lib/db"
import { Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    const session = await auth()
    // Check if user is admin
    if (!session?.user?.roles.includes("ADMIN")) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    try {
        const { users } = await req.json()

        if (!Array.isArray(users) || users.length === 0) {
            return new NextResponse("No users provided", { status: 400 })
        }

        const results = {
            success: 0,
            failed: 0,
            skipped: 0,
            errors: [] as string[]
        }

        // Process in parallel
        await Promise.all(users.map(async (user: any) => {
            try {
                // Basic validation
                if (!user.email || !user.name || !user.password) {
                    throw new Error(`Missing fields for ${user.email || 'unknown user'}`)
                }

                // Check if user exists by NAME first (for bulk update)
                const existingUserByName = await prisma.user.findFirst({
                    where: { name: { equals: user.name, mode: "insensitive" } }
                })

                if (existingUserByName) {
                    // Update existing user (Partial Update)
                    const updateData: any = {}

                    if (user.email) updateData.email = user.email
                    if (user.password) updateData.password = await bcrypt.hash(String(user.password), 10)
                    if (user.nip) updateData.nip = String(user.nip)
                    if (user.nis) updateData.nis = String(user.nis)
                    if (user.nisn) updateData.nisn = String(user.nisn)

                    if (user.roles) {
                        const roleStrings = user.roles.split(',').map((r: string) => r.trim().toUpperCase().replace(' ', '_'))
                        const validRoles = roleStrings.filter((r: string) => Object.values(Role).includes(r as Role))
                        if (validRoles.length > 0) {
                            updateData.roles = validRoles
                        }
                    }

                    if (Object.keys(updateData).length > 0) {
                        await prisma.user.update({
                            where: { id: existingUserByName.id },
                            data: updateData
                        })
                    }
                    results.success++
                } else {
                    // Create new user (using email as unique identifier for upsert safety, but really it's a new entry)
                    // If name doesn't exist but email does, this might fail or upsert depending on intent.
                    // Standard import flow usually relies on Email uniqueness. 
                    // However, here we prioritize Name match. If Name not found, we check if Email exists to avoid dupes via unique constraint.

                    const hashedPassword = await bcrypt.hash(String(user.password), 10)

                    // Parse roles with default
                    let roles: Role[] = [Role.STUDENT]
                    if (user.roles) {
                        const roleStrings = user.roles.split(',').map((r: string) => r.trim().toUpperCase().replace(' ', '_'))
                        const validRoles = roleStrings.filter((r: string) => Object.values(Role).includes(r as Role))
                        if (validRoles.length > 0) roles = validRoles
                    }

                    await prisma.user.upsert({
                        where: { email: user.email },
                        update: {
                            // If email matches but name didn't (case insensitive), we essentially update that email's user to matches the new name
                            name: user.name,
                            roles: roles,
                            password: hashedPassword,
                            nip: user.nip ? String(user.nip) : undefined,
                            nis: user.nis ? String(user.nis) : undefined,
                            nisn: user.nisn ? String(user.nisn) : undefined,
                        },
                        create: {
                            email: user.email,
                            name: user.name,
                            password: hashedPassword,
                            roles: roles,
                            isActive: true,
                            nip: user.nip ? String(user.nip) : undefined,
                            nis: user.nis ? String(user.nis) : undefined,
                            nisn: user.nisn ? String(user.nisn) : undefined,
                            creationSource: "excel_import"
                        }
                    })
                    results.success++
                }
                results.success++
            } catch (error: any) {
                results.failed++
                results.errors.push(`Failed to import ${user.email}: ${error.message}`)
            }
        }))

        return NextResponse.json(results)

    } catch (error) {
        console.error("Import error:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}
