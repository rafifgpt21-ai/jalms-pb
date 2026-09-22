"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { unlink } from "fs/promises"
import path from "path"
import { isRichTextEmpty } from "@/lib/rich-text"

// --- Quiz Actions ---

export async function getQuizzes(teacherId?: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "Unauthorized" };

        // If teacherId is not provided, use the current user's ID
        // (Assuming teacher can only see their own quizzes for now)
        const targetTeacherId = teacherId || session.user.id;

        const [quizzes, folders] = await Promise.all([
            db.quiz.findMany({
                where: {
                    teacherId: targetTeacherId,
                    deletedAt: { isSet: false }
                },
                orderBy: {
                    updatedAt: 'desc'
                },
                include: {
                    folder: true,
                    _count: {
                        select: { questions: true, assignments: true }
                    }
                }
            }),
            db.quizFolder.findMany({
                where: { teacherId: targetTeacherId },
                include: {
                    _count: {
                        select: {
                            quizzes: {
                                where: { deletedAt: { isSet: false } }
                            }
                        }
                    }
                },
                orderBy: { name: "asc" }
            })
        ])
        return { quizzes, folders }
    } catch (error) {
        console.error("Error fetching quizzes:", error)
        return { error: "Failed to fetch quizzes" }
    }
}

const QUIZ_FOLDER_COLORS = new Set(["indigo", "sky", "emerald", "amber", "rose", "violet"])

export async function createQuizFolder(name: string, color = "indigo") {
    try {
        const session = await auth()
        if (!session?.user?.id) return { folder: null, error: "Unauthorized" }

        const cleanName = name.trim()
        if (!cleanName) return { folder: null, error: "Folder name is required" }
        if (cleanName.length > 60) return { folder: null, error: "Folder name is too long" }

        const existing = await db.quizFolder.findFirst({
            where: { teacherId: session.user.id, name: { equals: cleanName, mode: "insensitive" } }
        })
        if (existing) return { folder: null, error: "A folder with this name already exists" }

        const folder = await db.quizFolder.create({
            data: {
                name: cleanName,
                color: QUIZ_FOLDER_COLORS.has(color) ? color : "indigo",
                teacherId: session.user.id
            }
        })
        revalidatePath("/teacher/quiz-manager")
        return { folder, error: undefined }
    } catch (error) {
        console.error("Error creating quiz folder:", error)
        return { folder: null, error: "Failed to create folder" }
    }
}

export async function renameQuizFolder(folderId: string, name: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, error: "Unauthorized" }

        const cleanName = name.trim()
        if (!cleanName) return { success: false, error: "Folder name is required" }
        if (cleanName.length > 60) return { success: false, error: "Folder name is too long" }

        const folder = await db.quizFolder.findUnique({ where: { id: folderId } })
        if (!folder || folder.teacherId !== session.user.id) return { success: false, error: "Folder not found" }

        const duplicate = await db.quizFolder.findFirst({
            where: {
                teacherId: session.user.id,
                id: { not: folderId },
                name: { equals: cleanName, mode: "insensitive" }
            }
        })
        if (duplicate) return { success: false, error: "A folder with this name already exists" }

        await db.quizFolder.update({ where: { id: folderId }, data: { name: cleanName } })
        revalidatePath("/teacher/quiz-manager")
        return { success: true, error: undefined }
    } catch (error) {
        console.error("Error renaming quiz folder:", error)
        return { success: false, error: "Failed to rename folder" }
    }
}

export async function deleteQuizFolder(folderId: string) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, error: "Unauthorized" }

        const folder = await db.quizFolder.findUnique({ where: { id: folderId } })
        if (!folder || folder.teacherId !== session.user.id) return { success: false, error: "Folder not found" }

        await db.quiz.updateMany({ where: { teacherId: session.user.id, folderId }, data: { folderId: null } })
        await db.quizFolder.delete({ where: { id: folderId } })
        revalidatePath("/teacher/quiz-manager")
        return { success: true, error: undefined }
    } catch (error) {
        console.error("Error deleting quiz folder:", error)
        return { success: false, error: "Failed to delete folder" }
    }
}

export async function moveQuizToFolder(quizId: string, folderId: string | null) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { success: false, error: "Unauthorized" }

        const quiz = await db.quiz.findUnique({ where: { id: quizId } })
        if (!quiz || quiz.teacherId !== session.user.id) return { success: false, error: "Quiz not found" }

        if (folderId) {
            const folder = await db.quizFolder.findUnique({ where: { id: folderId } })
            if (!folder || folder.teacherId !== session.user.id) return { success: false, error: "Folder not found" }
        }

        await db.quiz.update({ where: { id: quizId }, data: { folderId } })
        revalidatePath("/teacher/quiz-manager")
        return { success: true, error: undefined }
    } catch (error) {
        console.error("Error moving quiz:", error)
        return { success: false, error: "Failed to move quiz" }
    }
}

export async function getQuiz(quizId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "Unauthorized" };

        const quiz = await db.quiz.findUnique({
            where: { id: quizId },
            include: {
                questions: {
                    orderBy: { order: 'asc' },
                    include: {
                        choices: {
                            orderBy: { order: 'asc' }
                        }
                    }
                }
            }
        })

        if (!quiz) return { error: "Quiz not found" }
        if (quiz.teacherId !== session.user.id) return { error: "Unauthorized access to this quiz" }

        return { quiz }

    } catch (error) {
        console.error("Error fetching quiz:", error)
        return { error: "Failed to fetch quiz" }
    }
}

export async function createQuiz(title: string, description?: string, randomizeChoices: boolean = false) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "Unauthorized" };

        const quiz = await db.quiz.create({
            data: {
                title,
                description,
                randomizeChoices,
                teacherId: session.user.id
            }
        })

        revalidatePath("/teacher/quiz-manager")
        return { quiz }
    } catch (error) {
        console.error("Error creating quiz:", error)
        return { error: "Failed to create quiz" }
    }
}

export async function updateQuiz(quizId: string, data: { title?: string, description?: string, randomizeChoices?: boolean }) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "Unauthorized" };

        const quiz = await db.quiz.findUnique({ where: { id: quizId } });
        if (!quiz) return { error: "Quiz not found" };
        if (quiz.teacherId !== session.user.id) return { error: "Unauthorized" };

        const updatedQuiz = await db.quiz.update({
            where: { id: quizId },
            data: {
                ...data
            }
        })

        revalidatePath("/teacher/quiz-manager")
        revalidatePath(`/teacher/quiz-manager/${quizId}`)
        return { quiz: updatedQuiz }
    } catch (error) {
        console.error("Error updating quiz:", error)
        return { error: "Failed to update quiz" }
    }
}

export async function deleteQuiz(quizId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "Unauthorized" };

        // Fetch quiz with all questions and choices to find files
        const quiz = await db.quiz.findUnique({
            where: { id: quizId },
            include: {
                questions: {
                    include: {
                        choices: true
                    }
                }
            }
        });

        if (!quiz) return { error: "Quiz not found" };
        if (quiz.teacherId !== session.user.id) return { error: "Unauthorized" };

        // Collect all file URLs to delete
        const filesToDelete: string[] = [];
        quiz.questions.forEach(q => {
            if (q.imageUrl) filesToDelete.push(q.imageUrl);
            if (q.audioUrl) filesToDelete.push(q.audioUrl);
            q.choices.forEach(c => {
                if (c.imageUrl) filesToDelete.push(c.imageUrl);
            });
        });

        // Hard Delete from DB
        // Note: Relation to 'Assignment' might cause issues if not set to SetNull or Cascade.
        // Assuming Validation or Cascade is handled, or we let it fail if in use.
        // If it fails, files won't be deleted (good).
        await db.quiz.delete({
            where: { id: quizId }
        })

        // If DB delete successful, delete files
        if (filesToDelete.length > 0) {
            // Fire and forget or await? Await is safer to ensuring it triggers but we don't want to block too long.
            // deleteQuizImages handles mixed local/remote
            await deleteQuizImages(filesToDelete);
        }

        revalidatePath("/teacher/quiz-manager")
        return { success: true }

    } catch (error) {
        console.error("Error deleting quiz:", error)
        // Check for Foreign Key constraint
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2003") {
            return { error: "Cannot delete quiz because it is assigned to students. Delete the assignment first." }
        }
        return { error: "Failed to delete quiz" }
    }
}

export async function restoreQuiz(quizId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "Unauthorized" };

        const quiz = await db.quiz.findUnique({
            where: { id: quizId }
        });

        if (!quiz) return { error: "Quiz not found" };
        if (quiz.teacherId !== session.user.id) return { error: "Unauthorized" };

        // Restore
        await db.quiz.update({
            where: { id: quizId },
            data: { deletedAt: null }
        })

        revalidatePath("/teacher/quiz-manager")
        return { success: true }

    } catch (error) {
        console.error("Error restoring quiz:", error)
        return { error: "Failed to restore quiz" }
    }
}

// --- Question Actions ---

interface ChoiceInput {
    id?: string; // If present, update; else create
    text: string;
    imageUrl?: string;
    isCorrect: boolean;
    order: number;
}

interface QuestionInput {
    id?: string; // If present, update; else create
    text: string;
    imageUrl?: string;
    audioUrl?: string; // [NEW] Added audioUrl
    audioLimit?: number; // [NEW] Added audioLimit
    order: number;
    points?: number;
    gradingType?: 'ALL_OR_NOTHING' | 'RIGHT_MINUS_WRONG';
    explanation?: string | null;
    choices: ChoiceInput[];
}

export async function upsertQuestion(quizId: string, data: QuestionInput) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "Unauthorized" };
        if (isRichTextEmpty(data.text)) return { error: "Question text is required" };

        const quiz = await db.quiz.findUnique({ where: { id: quizId } });
        if (!quiz) return { error: "Quiz not found" };
        if (quiz.teacherId !== session.user.id) return { error: "Unauthorized" };

        // Transactional update/create for question and its choices
        // For simplicity, if it's an update, we can delete existing choices and recreate them to handle reordering/deletion easily
        // Or strictly upsert choices. Recreating choices is safer for "state sync".

        if (data.id) {
            // Update existing question
            // 1. Update question fields
            // 2. Delete all existing choices (simplest way to handle removed choices)
            // 3. Create new choices
            // NOTE: This changes choice IDs, which might be bad if we track stats per choice later.
            // But for now, for a quiz editor, it's fine.

            // HOWEVER, if we want to be smarter:
            // separate choices into "to create", "to update", "to delete"
            // But let's stick to the "Delete all choices and recreate" strategy for MVP reliability unless `id` is provided for choices.

            // Actually, if choice has ID, we update. If not, create. 
            // What about deleted choices? Input `choices` is the *complete* list. Any existing choice NOT in this list should be deleted.

            return await db.$transaction(async (tx) => {
                // 1. Update Question
                const question = await tx.quizQuestion.update({
                    where: { id: data.id },
                    data: {
                        text: data.text,
                        imageUrl: data.imageUrl,
                        audioUrl: data.audioUrl,
                        audioLimit: data.audioLimit ?? 0,
                        order: data.order,
                        points: data.points ?? 1,
                        gradingType: data.gradingType ?? 'ALL_OR_NOTHING',
                        explanation: data.explanation
                    }
                });

                // 2. Handle Choices
                // Get existing choice IDs
                const existingChoices = await tx.quizChoice.findMany({
                    where: { questionId: data.id },
                    select: { id: true }
                });
                const existingIds = existingChoices.map(c => c.id);
                const incomingIds = data.choices.filter(c => c.id).map(c => c.id);

                // Delete choices not in incoming list
                const toDelete = existingIds.filter(id => !incomingIds.includes(id));
                if (toDelete.length > 0) {
                    await tx.quizChoice.deleteMany({
                        where: { id: { in: toDelete } }
                    });
                }

                // Upsert choices
                for (let i = 0; i < data.choices.length; i++) {
                    const choice = data.choices[i];
                    if (choice.id) {
                        await tx.quizChoice.update({
                            where: { id: choice.id },
                            data: {
                                text: choice.text,
                                imageUrl: choice.imageUrl,
                                isCorrect: choice.isCorrect,
                                order: i // Ensure order matches array order
                            }
                        })
                    } else {
                        await tx.quizChoice.create({
                            data: {
                                questionId: data.id!,
                                text: choice.text,
                                imageUrl: choice.imageUrl,
                                isCorrect: choice.isCorrect,
                                order: i
                            }
                        })
                    }
                }

                return { question };
            });

        } else {
            // Create New Question
            const lastQuestion = await db.quizQuestion.findFirst({
                where: { quizId },
                orderBy: { order: 'desc' },
                select: { order: true }
            })
            const question = await db.quizQuestion.create({
                data: {
                    quizId,
                    text: data.text,
                    imageUrl: data.imageUrl,
                    audioUrl: data.audioUrl,
                    audioLimit: data.audioLimit ?? 0,
                    order: (lastQuestion?.order ?? -1) + 1,
                    points: data.points ?? 1,
                    gradingType: data.gradingType ?? 'ALL_OR_NOTHING',
                    explanation: data.explanation,
                    choices: {
                        create: data.choices.map((c, index) => ({
                            text: c.text,
                            imageUrl: c.imageUrl,
                            isCorrect: c.isCorrect,
                            order: index
                        }))
                    }
                },
                include: { choices: true }
            })

            revalidatePath(`/teacher/quiz-manager/${quizId}`)
            return { question }
        }

    } catch (error) {
        console.error("Error upserting question:", error)
        return { error: "Failed to save question" }
    }
}

export async function moveQuestion(questionId: string, direction: 'up' | 'down') {
    try {
        const session = await auth()
        if (!session?.user?.id) return { error: "Unauthorized" }

        const question = await db.quizQuestion.findUnique({
            where: { id: questionId },
            include: { quiz: { select: { teacherId: true } } }
        })
        if (!question) return { error: "Question not found" }
        if (question.quiz.teacherId !== session.user.id) return { error: "Unauthorized" }

        const questions = await db.quizQuestion.findMany({
            where: { quizId: question.quizId },
            orderBy: [{ order: 'asc' }, { id: 'asc' }],
            select: { id: true }
        })
        const currentIndex = questions.findIndex((item) => item.id === questionId)
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
        if (currentIndex < 0 || targetIndex < 0 || targetIndex >= questions.length) {
            return { success: true }
        }

        const reordered = [...questions]
        ;[reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]]

        await db.$transaction(reordered.map((item, index) =>
            db.quizQuestion.update({ where: { id: item.id }, data: { order: index } })
        ))

        revalidatePath(`/teacher/quiz-manager/${question.quizId}`)
        return { success: true }
    } catch (error) {
        console.error("Error moving question:", error)
        return { error: "Failed to move question" }
    }
}

export async function reorderQuestions(quizId: string, questionIds: string[]) {
    try {
        const session = await auth()
        if (!session?.user?.id) return { error: "Unauthorized" }

        const quiz = await db.quiz.findUnique({
            where: { id: quizId },
            select: { teacherId: true }
        })
        if (!quiz || quiz.teacherId !== session.user.id) return { error: "Quiz not found" }

        const existingQuestions = await db.quizQuestion.findMany({
            where: { quizId },
            select: { id: true }
        })
        const existingIds = new Set(existingQuestions.map((question) => question.id))
        const uniqueIncomingIds = new Set(questionIds)
        if (
            questionIds.length !== existingQuestions.length ||
            uniqueIncomingIds.size !== questionIds.length ||
            questionIds.some((id) => !existingIds.has(id))
        ) {
            return { error: "Question order is out of date. Refresh and try again." }
        }

        await db.$transaction(questionIds.map((id, index) =>
            db.quizQuestion.update({ where: { id }, data: { order: index } })
        ))

        revalidatePath(`/teacher/quiz-manager/${quizId}`)
        return { success: true }
    } catch (error) {
        console.error("Error reordering questions:", error)
        return { error: "Failed to reorder questions" }
    }
}

export async function deleteQuestion(questionId: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "Unauthorized" };

        const question = await db.quizQuestion.findUnique({
            where: { id: questionId },
            include: {
                quiz: true,
                choices: true // Need choices to delete their images
            }
        });

        if (!question) return { error: "Question not found" };
        if (question.quiz.teacherId !== session.user.id) return { error: "Unauthorized" };

        // Collect all images to delete
        const imagesToDelete: string[] = [];
        if (question.imageUrl) imagesToDelete.push(question.imageUrl);
        if (question.audioUrl) imagesToDelete.push(question.audioUrl);
        question.choices.forEach(c => {
            if (c.imageUrl) imagesToDelete.push(c.imageUrl);
        });

        if (imagesToDelete.length > 0) {
            await deleteQuizImages(imagesToDelete);
        }

        await db.quizQuestion.delete({
            where: { id: questionId }
        })

        revalidatePath(`/teacher/quiz-manager/${question.quizId}`)
        return { success: true }

    } catch (error) {
        console.error("Error deleting question:", error)
        return { error: "Failed to delete question" }
    }
}

// Bulk Import Helper
export async function bulkCreateQuestions(quizId: string, questionsData: QuestionInput[]) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "Unauthorized" };
        if (questionsData.some((question) => isRichTextEmpty(question.text))) {
            return { error: "Every question needs text" };
        }

        const quiz = await db.quiz.findUnique({ where: { id: quizId } });
        if (!quiz) return { error: "Quiz not found" };
        if (quiz.teacherId !== session.user.id) return { error: "Unauthorized" };

        // For bulk import, we just create everything.
        // We assume the parsing logic handles validation.

        await db.$transaction(async (tx) => {
            // Find max order to append
            const lastQuestion = await tx.quizQuestion.findFirst({
                where: { quizId: quizId },
                orderBy: { order: 'desc' }
            });
            let startOrder = (lastQuestion?.order ?? -1) + 1;

            for (const q of questionsData) {
                await tx.quizQuestion.create({
                    data: {
                        quizId,
                        text: q.text,
                        imageUrl: q.imageUrl,
                        audioUrl: q.audioUrl,
                        audioLimit: q.audioLimit ?? 0,
                        order: startOrder++,
                        points: q.points ?? 1,
                        gradingType: q.gradingType ?? 'ALL_OR_NOTHING',
                        explanation: q.explanation,
                        choices: {
                            create: q.choices.map((c, idx) => ({
                                text: c.text,
                                imageUrl: c.imageUrl,
                                isCorrect: c.isCorrect,
                                order: idx
                            }))
                        }
                    }
                })
            }
        })

        revalidatePath(`/teacher/quiz-manager/${quizId}`)
        return { success: true }

    } catch (error) {
        console.error("Error bulk creating questions:", error)
        return { error: "Failed to import questions" }
    }
}


export async function deleteQuizImages(urls: string[]) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "Unauthorized" };

        for (const url of urls) {
            if (!url) continue;

            // Check if it is a local file
            if (url.startsWith("/api/files/")) {
                // Local file deletion logic
                const relativePath = url.replace("/api/files/", "");

                // Sanitize check
                if (relativePath.includes("..")) {
                    console.warn(`Skipping deletion of potential path traversal: ${relativePath}`);
                    continue;
                }

                const filePath = path.join(process.cwd(), "uploads", relativePath);
                if (relativePath.startsWith("quiz-pictures/") || relativePath.startsWith("quiz-audio/")) {
                    // Fire and forget local unlink
                    unlink(filePath).catch((err) => console.error("Bg unlink error:", err));
                }

            }
        }
        return { success: true }
    } catch (error) {
        console.error("Error deleting images:", error);
        return { error: "Failed to delete images" }
    }
}

export async function getStudentQuiz(quizId: string, assignmentId?: string) {
    try {
        const session = await auth();
        if (!session?.user?.id) return { error: "Unauthorized" };

        // 1. Check Submission Status if assignmentId provided
        // 1. Check Submission Status
        let isSubmitted = false
        if (assignmentId) {
            const submission = await db.submission.findFirst({
                where: {
                    assignmentId,
                    studentId: session.user.id
                }
            })
            if (submission) isSubmitted = true
        } else {
            // Check for direct quiz submission by finding related assignment
            const assignment = await db.assignment.findFirst({
                where: { quizId: quizId }
            });
            if (assignment) {
                const submission = await db.submission.findFirst({
                    where: {
                        assignmentId: assignment.id,
                        studentId: session.user.id
                    }
                })
                if (submission) isSubmitted = true
            }
        }

        const quiz = await db.quiz.findUnique({
            where: { id: quizId },
            include: {
                questions: {
                    orderBy: { order: 'asc' },
                    include: {
                        choices: {
                            orderBy: { order: 'asc' }
                            // Fetch all to compute flags, filter later
                        }
                    }
                }
            }
        })

        if (!quiz) return { error: "Quiz not found" }

        const questions = quiz.questions.map(q => {
            const correctCount = q.choices.filter(c => c.isCorrect).length
            const allowMultiple = correctCount > 1 || q.gradingType === 'RIGHT_MINUS_WRONG'

            const choices = [...q.choices]
            // Randomize only if NOT reviewing (or preserve order if reviewing? usually preserve original order is hard if we didn't save seed. 
            // If we randomize, explanation might be confusing if it refers to "Option A". 
            // For now, let's randomize if configured, even in review. 
            // Ideally we store the randomized order in submission, but strictly for MVP:
            // If isSubmitted, maybe we shouldn't randomize to avoid confusion? 
            // But if we didn't store the order, showing "sorted" choices might mismap with user memory.
            // Let's stick to randomizing if enabled. 
            // NOTE: If user refreshes, order changes. This is acceptable for simple quiz.

            if (quiz.randomizeChoices) {
                for (let i = choices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [choices[i], choices[j]] = [choices[j], choices[i]];
                }
            }

            const sanitizedChoices = choices.map(c => ({
                id: c.id,
                text: c.text,
                imageUrl: c.imageUrl,
                order: c.order,
                // Reveal isCorrect ONLY if submitted
                isCorrect: isSubmitted ? c.isCorrect : undefined
            }))

            return {
                id: q.id,
                text: q.text,
                imageUrl: q.imageUrl,
                audioUrl: q.audioUrl,
                audioLimit: q.audioLimit,
                order: q.order,
                points: q.points,
                gradingType: q.gradingType,
                allowMultiple,
                // Reveal explanation ONLY if submitted
                explanation: isSubmitted ? q.explanation : undefined,
                choices: sanitizedChoices
            }
        })

        return {
            quiz: {
                ...quiz,
                questions
            },
            isSubmitted // Helpful to pass back
        }
    } catch (error) {
        console.error("Error fetching student quiz:", error)
        return { error: "Failed to fetch quiz" }
    }
}
