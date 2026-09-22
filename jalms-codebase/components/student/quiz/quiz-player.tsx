"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
    AlertCircle,
    Check,
    CheckCircle2,
    Circle,
    FileQuestion,
    Loader2,
    Play,
    Send,
    Volume2,
    XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { getStudentQuiz } from "@/lib/actions/quiz.actions"
import { submitQuizAttempt } from "@/lib/actions/student.actions"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RichTextContent } from "@/components/ui/editor"
import { cn } from "@/lib/utils"

interface QuizPlayerProps {
    quizId: string
    assignmentId: string
    initialAnswers?: Record<string, string | string[]>
    isReadOnly?: boolean
    showGradeAfterSubmission?: boolean
}

interface Question {
    id: string
    text: string
    imageUrl?: string
    audioUrl?: string
    audioLimit?: number
    choices: Choice[]
    order: number
    points: number
    gradingType: "ALL_OR_NOTHING" | "RIGHT_MINUS_WRONG"
    allowMultiple: boolean
    explanation?: string
}

interface Choice {
    id: string
    text: string
    imageUrl?: string
    order: number
    isCorrect?: boolean
}

export function QuizPlayer({ quizId, assignmentId, initialAnswers, isReadOnly = false, showGradeAfterSubmission = true }: QuizPlayerProps) {
    const router = useRouter()
    const [questions, setQuestions] = useState<Question[]>([])
    const [loading, setLoading] = useState(true)
    const [answers, setAnswers] = useState<Record<string, string | string[]>>(initialAnswers || {})
    const [isPending, startTransition] = useTransition()
    const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false)
    const [unansweredCount, setUnansweredCount] = useState(0)

    useEffect(() => {
        let active = true

        async function loadQuiz() {
            setLoading(true)
            const result = await getStudentQuiz(quizId, assignmentId)
            if (!active) return
            if (result.quiz) setQuestions(result.quiz.questions as Question[])
            else toast.error(result.error || "Failed to load quiz")
            setLoading(false)
        }

        void loadQuiz()
        return () => { active = false }
    }, [assignmentId, quizId])

    function hasAnswer(questionId: string) {
        const answer = answers[questionId]
        return Boolean(answer && (!Array.isArray(answer) || answer.length > 0))
    }

    function handleAnswer(questionId: string, choiceId: string, allowMultiple: boolean) {
        if (isReadOnly) return
        setAnswers((currentAnswers) => {
            const current = currentAnswers[questionId]
            if (!allowMultiple) return { ...currentAnswers, [questionId]: choiceId }

            const values = Array.isArray(current) ? current : current ? [current] : []
            return {
                ...currentAnswers,
                [questionId]: values.includes(choiceId) ? values.filter((id) => id !== choiceId) : [...values, choiceId],
            }
        })
    }

    function isSelected(questionId: string, choiceId: string) {
        const answer = answers[questionId]
        return Array.isArray(answer) ? answer.includes(choiceId) : answer === choiceId
    }

    function prepareSubmit() {
        const unanswered = questions.filter((question) => !hasAnswer(question.id)).length
        setUnansweredCount(unanswered)
        setIsSubmitDialogOpen(true)
    }

    function confirmSubmit() {
        setIsSubmitDialogOpen(false)
        startTransition(async () => {
            const result = await submitQuizAttempt(assignmentId, answers)
            if ("success" in result && result.success) {
                toast.success(showGradeAfterSubmission ? `Quiz submitted · Grade: ${result.grade}` : "Quiz submitted")
                router.refresh()
            } else {
                toast.error("error" in result ? result.error : "Failed to submit quiz")
            }
        })
    }

    if (loading) return <QuizPlayerSkeleton />

    if (questions.length === 0) {
        return (
            <div className="flex min-h-44 flex-col items-center justify-center rounded-md border border-dashed bg-muted/20 px-6 text-center">
                <FileQuestion className="size-7 text-muted-foreground/60" />
                <p className="mt-2 text-sm font-medium">This quiz has no questions</p>
                <p className="mt-1 text-xs text-muted-foreground">Ask your teacher to check the quiz setup.</p>
            </div>
        )
    }

    const answeredCount = questions.filter((question) => hasAnswer(question.id)).length
    const completion = Math.round((answeredCount / questions.length) * 100)

    return (
        <div className="space-y-4">
            <section className="sticky top-0 z-20 rounded-md border bg-card/95 p-3 shadow-xs backdrop-blur-sm" aria-label="Quiz progress">
                <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            {isReadOnly ? <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" /> : <FileQuestion className="size-4 text-primary" />}
                            <p className="text-sm font-semibold">{isReadOnly ? "Quiz review" : "Quiz in progress"}</p>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {isReadOnly ? "Your submitted answers are shown below." : `${answeredCount} of ${questions.length} answered`}
                        </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{isReadOnly ? `${questions.length} questions` : `${completion}%`}</span>
                </div>
                {!isReadOnly && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Quiz completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion}>
                        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${completion}%` }} />
                    </div>
                )}
                <nav className="mt-3 flex gap-1.5 overflow-x-auto pb-0.5 xl:hidden" aria-label="Jump to a question">
                    {questions.map((question, index) => <QuestionNavLink key={question.id} index={index} answered={hasAnswer(question.id)} />)}
                </nav>
            </section>

            <div className="grid items-start gap-4 xl:grid-cols-[12rem_minmax(0,1fr)]">
                <aside className="sticky top-24 hidden rounded-md border bg-card p-3 xl:block" aria-label="Question navigator">
                    <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Questions</p>
                        <Badge variant="secondary">{answeredCount}/{questions.length}</Badge>
                    </div>
                    <nav className="grid grid-cols-5 gap-1.5">
                        {questions.map((question, index) => <QuestionNavLink key={question.id} index={index} answered={hasAnswer(question.id)} />)}
                    </nav>
                    {!isReadOnly && (
                        <div className="mt-3 space-y-1.5 border-t pt-3 text-[11px] text-muted-foreground">
                            <p className="flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-primary" />Answered</p>
                            <p className="flex items-center gap-1.5"><Circle className="size-3.5" />Not answered</p>
                        </div>
                    )}
                </aside>

                <main className="min-w-0 space-y-3">
                    {questions.map((question, index) => (
                        <QuestionPanel
                            key={question.id}
                            question={question}
                            index={index}
                            totalQuestions={questions.length}
                            quizId={quizId}
                            selected={(choiceId) => isSelected(question.id, choiceId)}
                            onAnswer={(choiceId) => handleAnswer(question.id, choiceId, question.allowMultiple)}
                            isReadOnly={isReadOnly}
                            showGradeAfterSubmission={showGradeAfterSubmission}
                        />
                    ))}
                </main>
            </div>

            <footer className="sticky bottom-0 z-20 flex flex-col gap-3 rounded-md border bg-card/95 p-3 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
                {isReadOnly ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />Submission complete</div>
                ) : (
                    <div>
                        <p className="text-sm font-medium">{answeredCount === questions.length ? "All questions answered" : `${questions.length - answeredCount} unanswered`}</p>
                        <p className="text-xs text-muted-foreground">Review your choices before submitting.</p>
                    </div>
                )}
                {!isReadOnly && (
                    <Button onClick={prepareSubmit} disabled={isPending} className="w-full sm:w-auto">
                        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                        Submit quiz
                    </Button>
                )}
            </footer>

            <AlertDialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Submit this quiz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {unansweredCount > 0
                                ? `You still have ${unansweredCount} unanswered ${unansweredCount === 1 ? "question" : "questions"}. You can submit anyway, but you cannot change answers afterward.`
                                : "Your answers cannot be changed after submission."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep reviewing</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmSubmit}>Submit quiz</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

function QuestionNavLink({ index, answered }: { index: number; answered: boolean }) {
    return (
        <a
            href={`#quiz-question-${index + 1}`}
            className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-md border text-xs font-semibold tabular-nums transition-colors hover:border-primary/50 hover:text-primary",
                answered ? "border-primary/30 bg-primary/10 text-primary" : "bg-background text-muted-foreground",
            )}
            aria-label={`Go to question ${index + 1}${answered ? ", answered" : ", not answered"}`}
        >
            {index + 1}
        </a>
    )
}

function QuestionPanel({ question, index, totalQuestions, quizId, selected, onAnswer, isReadOnly, showGradeAfterSubmission }: {
    question: Question
    index: number
    totalQuestions: number
    quizId: string
    selected: (choiceId: string) => boolean
    onAnswer: (choiceId: string) => void
    isReadOnly: boolean
    showGradeAfterSubmission: boolean
}) {
    return (
        <article id={`quiz-question-${index + 1}`} className="scroll-mt-28 overflow-hidden rounded-md border bg-card">
            <header className="flex items-center gap-3 border-b bg-muted/25 px-3 py-2.5 sm:px-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">{index + 1}</span>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">Question {index + 1} of {totalQuestions}</p>
                    <p className="text-[11px] text-muted-foreground">{question.allowMultiple ? "Select all that apply" : "Select one answer"}</p>
                </div>
                <Badge variant="secondary">{question.points} {question.points === 1 ? "pt" : "pts"}</Badge>
            </header>

            <div className="space-y-4 p-3 sm:p-4">
                <RichTextContent
                    value={question.text}
                    ariaLabel={`Question ${index + 1}`}
                    className="text-base font-semibold leading-6"
                />

                {question.imageUrl && (
                    <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-md border bg-muted">
                        <Image src={question.imageUrl} alt={`Illustration for question ${index + 1}`} fill sizes="(max-width: 768px) 100vw, 768px" className="object-contain" />
                    </div>
                )}

                {question.audioUrl && <AudioPlayer src={question.audioUrl} limit={question.audioLimit || 0} quizId={quizId} questionId={question.id} isReadOnly={isReadOnly} />}

                <div role="group" aria-label={`Answers for question ${index + 1}`} className="grid gap-2">
                    {question.choices.map((choice, choiceIndex) => {
                        const isChoiceSelected = selected(choice.id)
                        const isCorrect = Boolean(choice.isCorrect)
                        const showCorrect = isReadOnly && showGradeAfterSubmission && isCorrect
                        const showIncorrect = isReadOnly && showGradeAfterSubmission && isChoiceSelected && !isCorrect

                        return (
                            <button
                                type="button"
                                key={choice.id}
                                onClick={() => onAnswer(choice.id)}
                                disabled={isReadOnly}
                                aria-pressed={isChoiceSelected}
                                className={cn(
                                    "flex min-h-12 w-full items-start gap-3 rounded-md border bg-background p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    !isReadOnly && !isChoiceSelected && "hover:border-primary/35 hover:bg-muted/30",
                                    !isReadOnly && isChoiceSelected && "border-primary bg-primary/5",
                                    isReadOnly && !showCorrect && !showIncorrect && !isChoiceSelected && "opacity-60",
                                    isReadOnly && isChoiceSelected && !showGradeAfterSubmission && "border-primary bg-primary/5",
                                    showCorrect && "border-emerald-500 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30",
                                    showIncorrect && "border-destructive bg-destructive/5",
                                )}
                            >
                                <span className={cn(
                                    "mt-0.5 flex size-6 shrink-0 items-center justify-center border text-xs font-semibold",
                                    question.allowMultiple ? "rounded-sm" : "rounded-full",
                                    isChoiceSelected ? "border-primary bg-primary text-primary-foreground" : "border-input text-muted-foreground",
                                    showCorrect && "border-emerald-600 bg-emerald-600 text-white",
                                    showIncorrect && "border-destructive bg-destructive text-white",
                                )}>
                                    {isChoiceSelected ? <Check className="size-3.5" /> : String.fromCharCode(65 + choiceIndex)}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm leading-5">{choice.text}</span>
                                    {choice.imageUrl && (
                                        <span className="relative mt-2 block aspect-video w-full max-w-sm overflow-hidden rounded-md border bg-muted">
                                            <Image src={choice.imageUrl} alt={`Illustration for choice ${String.fromCharCode(65 + choiceIndex)}`} fill sizes="(max-width: 768px) 100vw, 384px" className="object-contain" />
                                        </span>
                                    )}
                                </span>
                                {showCorrect && <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label="Correct answer" />}
                                {showIncorrect && <XCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-label="Incorrect selection" />}
                            </button>
                        )
                    })}
                </div>

                {isReadOnly && showGradeAfterSubmission && question.explanation && (
                    <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50/60 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        <div><p className="font-semibold">Answer explanation</p><p className="mt-1 leading-5">{question.explanation}</p></div>
                    </div>
                )}
            </div>
        </article>
    )
}

function QuizPlayerSkeleton() {
    return (
        <div className="space-y-3" aria-busy="true" aria-label="Loading quiz">
            <div className="rounded-md border p-3"><div className="h-4 w-32 animate-pulse rounded bg-muted" /><div className="mt-3 h-1.5 animate-pulse rounded bg-muted" /></div>
            {[0, 1].map((item) => (
                <div key={item} className="rounded-md border p-4">
                    <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="mt-5 space-y-2">{[0, 1, 2, 3].map((choice) => <div key={choice} className="h-12 animate-pulse rounded-md bg-muted/70" />)}</div>
                </div>
            ))}
        </div>
    )
}

function AudioPlayer({ src, limit, quizId, questionId, isReadOnly }: { src: string; limit: number; quizId: string; questionId: string; isReadOnly: boolean }) {
    const audioRef = useRef<HTMLAudioElement>(null)
    const [plays, setPlays] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [progress, setProgress] = useState(0)
    const storageKey = `quiz-audio-${quizId}-${questionId}-plays`

    useEffect(() => {
        // Playback limits persist across reloads for the current browser.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPlays(parseInt(localStorage.getItem(storageKey) || "0"))
    }, [storageKey])

    useEffect(() => {
        const audio = audioRef.current
        if (!audio) return
        const updateProgress = () => setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0)
        audio.addEventListener("timeupdate", updateProgress)
        return () => audio.removeEventListener("timeupdate", updateProgress)
    }, [])

    if (isReadOnly) {
        return (
            <div className="max-w-md rounded-md border bg-muted/25 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Volume2 className="size-4 text-primary" />Audio clip</div>
                <audio controls className="h-9 w-full" src={src} />
            </div>
        )
    }

    const remaining = limit > 0 ? Math.max(0, limit - plays) : null
    const limitReached = remaining === 0

    async function playAudio() {
        if (isPlaying || limitReached || !audioRef.current) return
        audioRef.current.currentTime = 0
        try {
            await audioRef.current.play()
            setIsPlaying(true)
        } catch {
            toast.error("Audio could not be played")
        }
    }

    function handleEnded() {
        setIsPlaying(false)
        setProgress(0)
        const nextPlays = plays + 1
        setPlays(nextPlays)
        localStorage.setItem(storageKey, String(nextPlays))
    }

    return (
        <div className="max-w-md rounded-md border bg-muted/25 p-3">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary"><Volume2 className="size-4" /></span>
                    <div><p className="text-sm font-medium">Audio clip</p><p className="text-[11px] text-muted-foreground">Playback cannot be paused or scrubbed</p></div>
                </div>
                {remaining !== null && <Badge variant={limitReached ? "destructive" : "secondary"}>{remaining} {remaining === 1 ? "play" : "plays"} left</Badge>}
            </div>
            <audio ref={audioRef} className="hidden" src={src} onEnded={handleEnded} />
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Audio progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
                <div className="h-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
            </div>
            <Button type="button" size="sm" variant="outline" onClick={playAudio} disabled={isPlaying || limitReached} className="mt-3 w-full">
                {isPlaying ? <Loader2 className="size-4 animate-spin" /> : limitReached ? <XCircle className="size-4" /> : <Play className="size-4" />}
                {isPlaying ? "Playing…" : limitReached ? "Playback limit reached" : "Play audio"}
            </Button>
        </div>
    )
}
