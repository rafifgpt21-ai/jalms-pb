"use server"

import { db as prisma } from "@/lib/db"
import { AcademicDomain } from "@prisma/client"

export type LearningProfile = {
    domain: AcademicDomain
    score: number // Average percentage (0-100)
    count: number // Number of graded assignments
}

export async function getStudentLearningProfile(studentId: string, termId?: string) {
    try {
        // Fetch all graded submissions
        const submissions = await prisma.submission.findMany({
            where: {
                studentId,
                grade: { not: null },
                deletedAt: { isSet: false },
                assignment: {
                    deletedAt: { isSet: false },
                    course: {
                        deletedAt: { isSet: false },
                        ...(termId ? { termId } : {})
                    }
                }
            },
            select: {
                grade: true,
                assignment: {
                    select: {
                        maxPoints: true,
                        academicDomains: true,
                        course: {
                            select: {
                                subject: { select: { academicDomains: true } }
                            }
                        }
                    }
                }
            }
        })

        // Accumulators
        const domainScores: Record<string, { total: number; count: number }> = {}

        // Initialize for all types to ensure consistent return structure (optional, but good for charts)
        Object.values(AcademicDomain).forEach(domain => {
            domainScores[domain] = { total: 0, count: 0 }
        })

        for (const sub of submissions) {
            const assignment = sub.assignment
            const grade = sub.grade || 0
            const normalizedScore = assignment.maxPoints > 0
                ? Math.max(0, Math.min(100, (grade / assignment.maxPoints) * 100))
                : 0

            // Determine effective tags
            let domains: AcademicDomain[] = []

            if (assignment.academicDomains && assignment.academicDomains.length > 0) {
                // Formatting Check: Prisma returns enum array, so this is straightforward
                domains = assignment.academicDomains
            } else if (assignment.course.subject?.academicDomains && assignment.course.subject.academicDomains.length > 0) {
                // Fallback to Subject tags
                domains = assignment.course.subject.academicDomains
            }
            // Logic note: If both are empty, this assignment contributes to NO domain.

            // Distribute score to each tag
            domains.forEach(domain => {
                domainScores[domain].total += normalizedScore
                domainScores[domain].count += 1
            })
        }

        // Calculate averages
        const profile: LearningProfile[] = Object.entries(domainScores).map(([domain, data]) => ({
            domain: domain as AcademicDomain,
            score: data.count > 0 ? Math.round(data.total / data.count) : 0,
            count: data.count
        })).sort((a, b) => b.score - a.score) // Sort by highest score

        return { profile }

    } catch (error) {
        console.error("Error calculating learning profile:", error)
        return { error: "Failed to calculate profile" }
    }
}
