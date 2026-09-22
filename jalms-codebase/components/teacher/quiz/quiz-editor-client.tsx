"use client"

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core"
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { QuestionCard, type QuizEditorQuestion } from "@/components/teacher/quiz/question-card"
import { ExcelImportDialog } from "@/components/teacher/quiz/excel-import-dialog"
import { UpdateQuizDialog } from "@/components/teacher/quiz/update-quiz-dialog"
import { Button } from "@/components/ui/button"
import { reorderQuestions } from "@/lib/actions/quiz.actions"
import { richTextToPlainText } from "@/lib/rich-text"
import { ArrowLeft, FileQuestion, GripVertical, Plus } from "lucide-react"

interface QuizEditorClientProps {
    quiz: {
        id: string
        title: string
        description?: string | null
        randomizeChoices: boolean
        questions: QuizEditorQuestion[]
    }
}

export function QuizEditorClient({ quiz }: QuizEditorClientProps) {
    const [isAddingNew, setIsAddingNew] = useState(false)
    const [recentlyMovedQuestionId, setRecentlyMovedQuestionId] = useState<string | null>(null)
    const [isReordering, startReorder] = useTransition()
    const [questions, setOptimisticQuestions] = useOptimistic(
        quiz.questions || [],
        (_current, next: QuizEditorQuestion[]) => next,
    )
    const newQuestionRef = useRef<HTMLDivElement>(null)
    const moveAnimationTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const router = useRouter()
    const totalPoints = questions.reduce((sum, question) => sum + (question.points || 0), 0)
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    )

    useEffect(() => {
        if (isAddingNew) newQuestionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, [isAddingNew])

    useEffect(() => () => {
        if (moveAnimationTimer.current) clearTimeout(moveAnimationTimer.current)
    }, [])

    function startAddingQuestion() {
        setIsAddingNew(true)
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (!over || active.id === over.id) return

        const previousQuestions = questions
        const oldIndex = previousQuestions.findIndex((question) => question.id === active.id)
        const newIndex = previousQuestions.findIndex((question) => question.id === over.id)
        if (oldIndex < 0 || newIndex < 0) return

        const nextQuestions = arrayMove(previousQuestions, oldIndex, newIndex)
        startReorder(async () => {
            setOptimisticQuestions(nextQuestions)
            const result = await reorderQuestions(quiz.id, nextQuestions.map((question) => question.id))
            if ("error" in result && result.error) {
                toast.error(result.error)
                return
            }
            router.refresh()
        })
    }

    function handleMoveQuestion(questionId: string, direction: "up" | "down") {
        const oldIndex = questions.findIndex((question) => question.id === questionId)
        const newIndex = direction === "up" ? oldIndex - 1 : oldIndex + 1
        if (oldIndex < 0 || newIndex < 0 || newIndex >= questions.length) return

        const nextQuestions = arrayMove(questions, oldIndex, newIndex)
        if (moveAnimationTimer.current) clearTimeout(moveAnimationTimer.current)
        setRecentlyMovedQuestionId(questionId)
        moveAnimationTimer.current = setTimeout(() => setRecentlyMovedQuestionId(null), 420)
        startReorder(async () => {
            setOptimisticQuestions(nextQuestions)
            const result = await reorderQuestions(quiz.id, nextQuestions.map((question) => question.id))
            if ("error" in result && result.error) {
                toast.error(result.error)
                return
            }
            router.refresh()
        })
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{questions.length} {questions.length === 1 ? "question" : "questions"}</span>
                        <span aria-hidden="true"> · </span>
                        {totalPoints} points
                        <span aria-hidden="true"> · </span>
                        choices {quiz.randomizeChoices ? "shuffled" : "as written"}
                    </p>
                    {quiz.description && (
                        <p className="mt-1 max-w-[90ch] truncate text-xs text-muted-foreground">{quiz.description}</p>
                    )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" asChild className="hidden lg:inline-flex">
                        <Link href="/teacher/quiz-manager"><ArrowLeft className="size-4" />Library</Link>
                    </Button>
                    <UpdateQuizDialog quiz={quiz} trigger="button" />
                </div>
            </div>

            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_15rem]">
                <main className="min-w-0 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-sm font-semibold">Questions</h2>
                            <p className="text-xs text-muted-foreground">Open a question to edit it.</p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <ExcelImportDialog quizId={quiz.id} />
                            <Button size="sm" onClick={startAddingQuestion} disabled={isAddingNew}>
                                <Plus className="size-4" />Add question
                            </Button>
                        </div>
                    </div>

                    {questions.length === 0 && !isAddingNew && (
                        <div className="flex min-h-56 flex-col items-center justify-center rounded-md border border-dashed bg-muted/20 px-6 text-center">
                            <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary"><FileQuestion className="size-5" /></div>
                            <h3 className="text-sm font-semibold">Add your first question</h3>
                            <p className="mt-1 max-w-sm text-sm text-muted-foreground">Create it manually or import a prepared spreadsheet.</p>
                            <Button size="sm" className="mt-4" onClick={startAddingQuestion}><Plus className="size-4" />Add question</Button>
                        </div>
                    )}

                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={questions.map((question) => question.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-3">
                                {questions.map((question, index) => (
                                    <SortableQuestionCard
                                        key={question.id}
                                        quizId={quiz.id}
                                        question={question}
                                        index={index}
                                        totalQuestions={questions.length}
                                        disabled={isReordering}
                                        onMove={handleMoveQuestion}
                                        emphasized={recentlyMovedQuestionId === question.id}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>

                    {isAddingNew && (
                        <div ref={newQuestionRef} id="new-question" className="scroll-mt-3">
                            <QuestionCard quizId={quiz.id} questionNumber={questions.length + 1} onCancelNew={() => setIsAddingNew(false)} />
                        </div>
                    )}

                    {!isAddingNew && questions.length > 0 && (
                        <button type="button" onClick={startAddingQuestion} className="flex min-h-20 w-full items-center justify-center gap-2 rounded-md border border-dashed bg-muted/10 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
                            <Plus className="size-4" />Add another question
                        </button>
                    )}
                </main>

                <aside className="sticky top-0 hidden p-2 xl:block" aria-label="Question outline">
                    <div className="mb-2 flex items-center justify-between px-1">
                        <h2 className="text-sm font-semibold">Outline</h2>
                        <span className="text-xs tabular-nums text-muted-foreground">{questions.length}</span>
                    </div>
                    <nav className="max-h-[calc(100vh-14rem)] space-y-1 overflow-y-auto">
                        {questions.map((question, index) => (
                            <a key={question.id} href={`#question-${index + 1}`} className="flex items-start gap-2 rounded-md px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                                <span className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-muted font-semibold tabular-nums text-foreground">{index + 1}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="line-clamp-2 leading-4">{richTextToPlainText(question.text) || "Untitled question"}</span>
                                    <span className="mt-0.5 block text-[10px]">{question.points || 0} pts · {question.choices?.length || 0} choices</span>
                                </span>
                            </a>
                        ))}
                        {isAddingNew && <a href="#new-question" className="flex items-center gap-2 rounded-md bg-primary/10 px-2 py-2 text-xs font-medium text-primary"><Plus className="size-4" />New question</a>}
                    </nav>
                </aside>
            </div>
        </div>
    )
}

function SortableQuestionCard({
    quizId,
    question,
    index,
    totalQuestions,
    disabled,
    onMove,
    emphasized,
}: {
    quizId: string
    question: QuizEditorQuestion
    index: number
    totalQuestions: number
    disabled: boolean
    onMove: (questionId: string, direction: "up" | "down") => void
    emphasized: boolean
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: question.id,
        disabled,
    })
    const animatedTransform = transform
        ? { ...transform, scaleX: isDragging ? 1.01 : transform.scaleX, scaleY: isDragging ? 1.01 : transform.scaleY }
        : null

    return (
        <motion.div
            layout="position"
            animate={emphasized ? {
                scale: [1, 1.012, 1],
                filter: ["brightness(1)", "brightness(1.08)", "brightness(1)"],
            } : { scale: 1, filter: "brightness(1)" }}
            transition={{
                layout: { type: "spring", stiffness: 300, damping: 27, mass: 0.75 },
                scale: { duration: 0.38, ease: [0.2, 0.8, 0.2, 1] },
                filter: { duration: 0.38, ease: "easeOut" },
            }}
        >
            <div
                ref={setNodeRef}
                id={`question-${index + 1}`}
                style={{
                    transform: CSS.Transform.toString(animatedTransform),
                    transition: transition || "transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                }}
                className={`scroll-mt-3 transition-[box-shadow,opacity] duration-150 ${isDragging ? "relative z-20 opacity-80 shadow-lg" : ""}`}
            >
                <QuestionCard
                    quizId={quizId}
                    question={question}
                    questionNumber={index + 1}
                    canMoveUp={!disabled && index > 0}
                    canMoveDown={!disabled && index < totalQuestions - 1}
                    onMove={(direction) => onMove(question.id, direction)}
                    dragHandle={(
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            {...attributes}
                            {...listeners}
                            disabled={disabled}
                            className="touch-none cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                            aria-label={`Drag to reorder question ${index + 1}`}
                            title="Drag to reorder"
                        >
                            <GripVertical className="size-4" />
                        </Button>
                    )}
                />
            </div>
        </motion.div>
    )
}
