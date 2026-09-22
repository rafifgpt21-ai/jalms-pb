"use server"

import { db as prisma } from "@/lib/db"

export async function getDashboardStats() {
    try {
        const [
            totalUsersRes,
            attendanceRes,
            lastLoginRes
        ] = await Promise.all([
            getTotalUsersCount(),
            getAttendancePulse(),
            getLastLoggedInUsers()
        ])

        return {
            stats: {
                totalUsers: totalUsersRes.totalUsers || 0,
                attendance: attendanceRes.attendance || {
                    percentage: 0,
                    totalRecords: 0,
                    presentCount: 0,
                    absentCount: 0
                }
            },
            lastLoggedInUsers: lastLoginRes.lastLoggedInUsers || []
        }

    } catch (error) {
        console.error("Error fetching dashboard stats:", error)
        return { error: "Failed to load dashboard statistics" }
    }
}

export async function getTotalUsersCount() {
    try {
        const totalUsers = await prisma.user.count({
            where: {
                deletedAt: { isSet: false },
                isActive: true
            }
        })
        return { totalUsers }
    } catch (error) {
        console.error("Error fetching total users:", error)
        return { error: "Failed to fetch total users" }
    }
}

export async function getLastLoggedInUsers() {
    try {
        const lastLoggedInUsers = await prisma.user.findMany({
            where: {
                deletedAt: { isSet: false },
                lastLoginAt: { not: null }
            },
            orderBy: { lastLoginAt: "desc" },
            take: 5,
            select: {
                id: true,
                name: true,
                email: true,
                roles: true,
                lastLoginAt: true,
                image: true
            }
        })
        return { lastLoggedInUsers }
    } catch (error) {
        console.error("Error fetching last logged in users:", error)
        return { error: "Failed to fetch recent users" }
    }
}

export async function getAttendancePulse() {
    try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const dateFilter = {
            date: { gte: today, lt: tomorrow },
            deletedAt: { isSet: false } as const
        }
        const [totalRecords, totalPresent] = await Promise.all([
            prisma.attendance.count({ where: dateFilter }),
            prisma.attendance.count({ where: { ...dateFilter, status: "PRESENT" } })
        ])
        const percentage = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0

        return {
            attendance: {
                percentage,
                totalRecords,
                presentCount: totalPresent,
                absentCount: totalRecords - totalPresent
            }
        }
    } catch (error) {
        console.error("Error fetching attendance pulse:", error)
        return { error: "Failed to fetch attendance stats" }
    }
}
