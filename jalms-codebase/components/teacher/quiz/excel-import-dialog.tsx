"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { bulkCreateQuestions } from "@/lib/actions/quiz.actions"
import { toast } from "sonner"
import { Loader2, Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface ExcelImportDialogProps {
    quizId: string
}

export function ExcelImportDialog({ quizId }: ExcelImportDialogProps) {
    const [open, setOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [isPending, startTransition] = useTransition()
    const [parsedQuestions, setParsedQuestions] = useState<any[]>([])
    const [invalidCount, setInvalidCount] = useState(0)
    const [isParsing, setIsParsing] = useState(false)
    const router = useRouter()

    const parseExcelFile = async (selectedFile: File) => {
        setIsParsing(true)
        setParsedQuestions([])
        setInvalidCount(0)

        try {
            const ExcelJS = await import("exceljs")
            const reader = new FileReader()

            reader.onload = async (e) => {
                const data = e.target?.result
                if (!data) return

                const workbook = new ExcelJS.Workbook()
                await workbook.xlsx.load(data as ArrayBuffer)
                const worksheet = workbook.worksheets[0]

                if (!worksheet) {
                    toast.error("No worksheet found in file")
                    setIsParsing(false)
                    return
                }

                const jsonData: any[][] = []
                worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                    const rowData: any[] = []
                    for (let i = 1; i <= Math.max(8, row.cellCount); i++) {
                        const cell = row.getCell(i)
                        rowData.push(typeof cell.value === "string" ? cell.value : cell.text)
                    }
                    jsonData.push(rowData)
                })

                const questions: Array<{
                    text: string
                    order: number
                    choices: Array<{ text: string; isCorrect: boolean; order: number }>
                }> = []
                let invalidRows = 0

                const startRow = (typeof jsonData[0]?.[0] === 'string' && String(jsonData[0][0]).toLowerCase().includes('question')) ? 1 : 0

                for (let i = startRow; i < jsonData.length; i++) {
                    const row = jsonData[i]
                    const questionText = row[0]

                    if (!questionText || String(questionText).trim() === "") {
                        invalidRows++
                        continue
                    }

                    const choicesRaw = row.slice(1, 7).filter(c => c !== undefined && c !== null && String(c).trim() !== "")
                    const correctAnswerRaw = row[7]

                    if (choicesRaw.length < 2) {
                        invalidRows++
                        continue
                    }

                    let correctIndex = -1
                    if (typeof correctAnswerRaw === 'number') {
                        correctIndex = correctAnswerRaw - 1
                    } else if (typeof correctAnswerRaw === 'string') {
                        correctIndex = choicesRaw.findIndex(c => String(c).trim().toLowerCase() === String(correctAnswerRaw).trim().toLowerCase())
                        if (correctIndex === -1 && /^\d$/.test(String(correctAnswerRaw))) {
                            correctIndex = parseInt(String(correctAnswerRaw)) - 1
                        }
                    }

                    if (correctIndex < 0 || correctIndex >= choicesRaw.length) {
                        correctIndex = 0
                    }

                    const choices = choicesRaw.map((text, idx) => ({
                        text: String(text),
                        isCorrect: idx === correctIndex,
                        order: idx
                    }))

                    questions.push({
                        text: String(questionText),
                        order: i,
                        choices
                    })
                }

                setParsedQuestions(questions)
                setInvalidCount(invalidRows)
                setIsParsing(false)

                if (questions.length === 0) {
                    toast.error("No valid questions found in file")
                }
            }

            reader.readAsArrayBuffer(selectedFile)

        } catch (error) {
            console.error("Parse error:", error)
            toast.error("Failed to parse Excel file")
            setIsParsing(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0]
            setFile(selectedFile)
            parseExcelFile(selectedFile)
        } else {
            setFile(null)
            setParsedQuestions([])
            setInvalidCount(0)
        }
    }

    const handleDownloadTemplate = async () => {
        try {
            const ExcelJS = await import("exceljs")
            const workbook = new ExcelJS.Workbook()

            // Guide Sheet
            const guideSheet = workbook.addWorksheet("Guide")
            guideSheet.columns = [{ width: 100 }]

            guideSheet.addRow(["Excel Import Guide"])
            const titleCell = guideSheet.getCell('A1')
            titleCell.font = { bold: true, size: 16 }
            guideSheet.addRow([""])

            guideSheet.addRow(["Instructions:"])
            guideSheet.getCell('A3').font = { bold: true, size: 12 }

            guideSheet.addRow(["1. Go to the 'Template' sheet to start adding your questions."])
            guideSheet.addRow(["2. DO NOT change the column headers in the 'Template' sheet."])
            guideSheet.addRow(["3. Question Text (Column A): The text of the question. (Required)"])
            guideSheet.addRow(["4. Choices (Columns B - G): Provide between 2 and 6 choices per question. Leave unused choice columns blank."])
            guideSheet.addRow(["5. Correct Answer (Column H): Enter the exact text of the correct choice, OR enter a number from 1 to 6 corresponding to the choice number."])
            guideSheet.addRow([""])
            guideSheet.addRow(["Note: Rows without question text or with less than 2 choices will be skipped."])
            guideSheet.getCell('A10').font = { italic: true, color: { argb: 'FFFF0000' } }

            // Template Sheet
            const templateSheet = workbook.addWorksheet("Template")
            templateSheet.columns = [
                { header: "Question Text", key: "question", width: 40 },
                { header: "Choice 1", key: "c1", width: 25 },
                { header: "Choice 2", key: "c2", width: 25 },
                { header: "Choice 3", key: "c3", width: 25 },
                { header: "Choice 4", key: "c4", width: 25 },
                { header: "Choice 5", key: "c5", width: 25 },
                { header: "Choice 6", key: "c6", width: 25 },
                { header: "Correct Answer (1-6 or Exact Text)", key: "correct", width: 35 }
            ]

            // Style Header
            templateSheet.getRow(1).font = { bold: true }
            templateSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } }

            // Add Examples
            templateSheet.addRow({
                question: "What is the capital of France?",
                c1: "London",
                c2: "Berlin",
                c3: "Paris",
                c4: "Madrid",
                c5: "",
                c6: "",
                correct: "Paris"
            })

            templateSheet.addRow({
                question: "Which of these are primary colors?",
                c1: "Red",
                c2: "Green",
                c3: "Blue",
                c4: "Yellow",
                c5: "",
                c6: "",
                correct: 1 // Red
            })

            const buffer = await workbook.xlsx.writeBuffer()
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `quiz_import_template.xlsx`
            a.click()
            window.URL.revokeObjectURL(url)

        } catch (error) {
            console.error(error)
            toast.error("Failed to generate template")
        }
    }

    const handleImport = async () => {
        if (parsedQuestions.length === 0) {
            toast.error("No valid questions to import")
            return
        }

        startTransition(async () => {
            const result = await bulkCreateQuestions(quizId, parsedQuestions as any)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success(`Imported ${parsedQuestions.length} questions successfully`)
                setOpen(false)
                setFile(null)
                setParsedQuestions([])
                setInvalidCount(0)
                router.refresh()
            }
        })
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val)
            if (!val) {
                setFile(null)
                setParsedQuestions([])
                setInvalidCount(0)
            }
        }}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Import from Excel
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Import Questions</DialogTitle>
                    <DialogDescription>
                        Upload an Excel file (.xlsx) to bulk import questions.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    {/* Template Section */}
                    <div className="flex flex-col gap-2 p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1 text-sm">
                                <p className="font-medium flex items-center gap-2">
                                    <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                                    Need a template?
                                </p>
                                <p className="text-muted-foreground pr-4">
                                    Download our template file. It includes a guide and example questions to help you format your data correctly.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownloadTemplate}
                                className="shrink-0 mt-1"
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Template
                            </Button>
                        </div>
                    </div>

                    {/* Upload Section */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Upload File</Label>
                            <Input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileChange}
                                className="cursor-pointer file:cursor-pointer"
                            />
                        </div>

                        {/* Parsing Status / Summary */}
                        {isParsing ? (
                            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground p-4 border rounded-md border-dashed">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Analyzing file...
                            </div>
                        ) : file && (
                            <div className="p-4 border border-dashed rounded-md space-y-3 bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-800">
                                <h4 className="text-sm font-medium">File Content Summary</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-500 font-medium">
                                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                                        <span>{parsedQuestions.length} Valid Questions</span>
                                    </div>
                                    {invalidCount > 0 && (
                                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 font-medium">
                                            <AlertCircle className="h-4 w-4 shrink-0" />
                                            <span>{invalidCount} Skipped Row{invalidCount > 1 ? 's' : ''}</span>
                                        </div>
                                    )}
                                </div>
                                {invalidCount > 0 && (
                                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                                        Rows missing a question text or having fewer than 2 choices are considered invalid and will be skipped.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        onClick={handleImport}
                        disabled={isPending || parsedQuestions.length === 0 || isParsing}
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Import Questions
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
