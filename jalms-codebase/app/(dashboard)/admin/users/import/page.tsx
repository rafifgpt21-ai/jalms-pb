"use client"

import { useState } from "react"
// import { read, utils, writeFile, write } from "xlsx" // Lazy loaded
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspaceActions, WorkspacePage } from "@/components/workspace/workspace-page"

export default function ImportUsersPage() {
    const [data, setData] = useState<any[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const [uploadStatus, setUploadStatus] = useState<any>(null)
    const router = useRouter()

    const generateTemplate = async () => {
        const ExcelJS = await import("exceljs")
        const wb = new ExcelJS.Workbook()

        // Sheet 1: Template
        const wsTemplate = wb.addWorksheet("Template")
        wsTemplate.columns = [
            { header: "Name", key: "name", width: 20 },
            { header: "Email", key: "email", width: 25 },
            { header: "Roles", key: "roles", width: 35 },
            { header: "Password", key: "password", width: 15 },
            { header: "NIP", key: "nip", width: 15 },
            { header: "NIS", key: "nis", width: 15 },
            { header: "NISN", key: "nisn", width: 15 }
        ]

        wsTemplate.addRow({ name: "John Doe", email: "john@example.com", roles: "STUDENT", password: "", nip: "", nis: "12345", nisn: "0012345678" })
        wsTemplate.addRow({ name: "Jane Smith", email: "jane@example.com", roles: "SUBJECT_TEACHER", password: "", nip: "19870101", nis: "", nisn: "" })
        wsTemplate.addRow({ name: "", email: "", roles: "", password: "", nip: "", nis: "", nisn: "" }) // Empty row for user input

        // Sheet 2: Guide
        const wsGuide = wb.addWorksheet("Guide")
        wsGuide.columns = [
            { header: "Column", key: "col1", width: 20 },
            { header: "Description", key: "col2", width: 40 },
            { header: "Required", key: "col3", width: 25 }
        ]

        wsGuide.addRow({ col1: "Name", col2: "Full name of the user", col3: "Yes" })
        wsGuide.addRow({ col1: "Email", col2: "Unique email address", col3: "Yes" })
        wsGuide.addRow({ col1: "Roles", col2: "Comma-separated roles", col3: "No (Default: STUDENT)" })
        wsGuide.addRow({ col1: "Password", col2: "Initial password", col3: "Yes" })
        wsGuide.addRow({ col1: "NIP", col2: "Teacher Official ID", col3: "Yes (for Teachers)" })
        wsGuide.addRow({ col1: "NIS", col2: "Student School ID", col3: "Yes (for Students)" })
        wsGuide.addRow({ col1: "NISN", col2: "Student National ID", col3: "Yes/Optional (for Students)" })
        wsGuide.addRow([])
        wsGuide.addRow({ col1: "Duplicate Name Policy", col2: "Users with names that exactly match an existing user will be SKIPPED.", col3: "" })
        wsGuide.addRow([])
        wsGuide.addRow({ col1: "Multiple Roles", col2: "Description", col3: "" })
        wsGuide.addRow({ col1: "Format", col2: "You can assign multiple roles by separating them with commas.", col3: "" })
        wsGuide.addRow({ col1: "Example", col2: "SUBJECT_TEACHER, HOMEROOM_TEACHER", col3: "" })
        wsGuide.addRow([])
        wsGuide.addRow({ col1: "Valid Roles", col2: "Description", col3: "" })
        wsGuide.addRow({ col1: "ADMIN", col2: "Administrator with full access", col3: "" })
        wsGuide.addRow({ col1: "SUBJECT_TEACHER", col2: "Teacher assigned to subjects", col3: "" })
        wsGuide.addRow({ col1: "HOMEROOM_TEACHER", col2: "Teacher assigned to a class", col3: "" })
        wsGuide.addRow({ col1: "STUDENT", col2: "Student", col3: "" })
        wsGuide.addRow({ col1: "PARENT", col2: "Parent account", col3: "" })

        // Download file
        const buffer = await wb.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "user_import_template.xlsx"
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const ExcelJS = await import("exceljs")

        const reader = new FileReader()
        reader.onload = async (evt) => {
            const buffer = evt.target?.result
            if (!buffer) return

            const wb = new ExcelJS.Workbook()
            await wb.xlsx.load(buffer as ArrayBuffer)
            const ws = wb.worksheets[0] // Assume data is in the first sheet

            const jsonData: any[] = []

            const headers: any = {}
            ws.getRow(1).eachCell((cell, colNumber) => {
                headers[colNumber] = typeof cell.value === "string" ? cell.value : cell.text
            })

            ws.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return // Skip header

                const rowData: any = {}
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    rowData[headers[colNumber]] = cell.value
                })
                jsonData.push(rowData)
            })

            // Map keys to match API expectations (lowercase, specific names)
            const mappedData = jsonData.map((row: any) => ({
                name: row.Name || row.name,
                email: row.Email || row.email,
                roles: row.Roles || row.roles,
                password: row.Password || row.password,
                nip: row.NIP || row.nip,
                nis: row.NIS || row.nis,
                nisn: row.NISN || row.nisn || row.nisn
            }))

            setData(mappedData)
        }
        reader.readAsArrayBuffer(file)
    }

    const processImport = async () => {
        setIsUploading(true)
        try {
            const res = await fetch("/api/admin/users/import", {
                method: "POST",
                body: JSON.stringify({ users: data }),
            })
            const result = await res.json()
            setUploadStatus(result)
            if (result.success > 0) {
                router.refresh()
            }
        } catch (error) {
            console.error(error)
            setUploadStatus({ failed: data.length, errors: ["Network error"] })
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <WorkspacePage className="mx-auto max-w-4xl">
            <MobileHeaderSetter title="Import Users" subtitle="Upload a spreadsheet to create accounts in bulk." />
            <WorkspaceActions>
                <Button variant="outline" onClick={generateTemplate}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Download Template
                </Button>
            </WorkspaceActions>

            <Card>
                <CardHeader>
                    <CardTitle>Step 1: Upload Excel File</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center w-full">
                        <label htmlFor="dropzone-file" className="flex h-64 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/40 transition-colors hover:bg-muted/70">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-10 h-10 mb-3 text-gray-400" />
                                <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-gray-500">.XLSX or .CSV</p>
                            </div>
                            <input id="dropzone-file" type="file" className="hidden" accept=".xlsx, .csv" onChange={handleFileUpload} />
                        </label>
                    </div>
                </CardContent>
            </Card>

            {data.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Step 2: Preview & Process ({data.length} users)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="max-h-64 overflow-auto border rounded">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Roles</TableHead>
                                        <TableHead>NIP</TableHead>
                                        <TableHead>NIS</TableHead>
                                        <TableHead>NISN</TableHead>
                                        <TableHead>Password</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.slice(0, 10).map((row: any, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{row.name}</TableCell>
                                            <TableCell>{row.email}</TableCell>
                                            <TableCell>{row.roles}</TableCell>
                                            <TableCell>{row.nip}</TableCell>
                                            <TableCell>{row.nis}</TableCell>
                                            <TableCell>{row.nisn}</TableCell>
                                            <TableCell>******</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {data.length > 10 && <p className="text-xs text-center p-2 text-muted-foreground">...and {data.length - 10} more</p>}
                        </div>

                        {uploadStatus ? (
                            <div className={`p-4 rounded-md ${uploadStatus.failed === 0 ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
                                <div className="flex items-center gap-2 font-semibold">
                                    {uploadStatus.failed === 0 ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                                    Import Completed
                                </div>
                                <p className="text-sm mt-1">
                                    Successfully imported: {uploadStatus.success} <br />
                                    Failed: {uploadStatus.failed}
                                </p>
                                {uploadStatus.errors.length > 0 && (
                                    <ul className="list-disc list-inside text-xs mt-2 text-red-600">
                                        {uploadStatus.errors.slice(0, 5).map((e: string, i: number) => <li key={i}>{e}</li>)}
                                    </ul>
                                )}
                                <Button className="mt-4" onClick={() => router.push("/admin/users")}>Go to User List</Button>
                            </div>
                        ) : (
                            <Button onClick={processImport} disabled={isUploading} className="w-full">
                                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isUploading ? "Processing..." : "Process Import"}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}
        </WorkspacePage>
    )
}
