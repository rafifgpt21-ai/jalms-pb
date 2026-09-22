"use client"

import { useState, useEffect } from "react"
import { getCourseCompetencySettings, updateCourseCompetencySettings } from "@/lib/actions/course.actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Save, RotateCcw } from "lucide-react"

export function CourseCompetencySettings({ courseId }: { courseId: string }) {
    const [rules, setRules] = useState<any[]>([])
    const [defaults, setDefaults] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadSettings()
    }, [courseId])

    async function loadSettings() {
        setLoading(true)
        const res = await getCourseCompetencySettings(courseId)
        if (res.error) {
            toast.error(res.error)
        } else {
            console.log("Settings loaded:", res)
            // If checking defaults
            if (res.systemDefaults && Array.isArray(res.systemDefaults)) {
                setDefaults(res.systemDefaults as any[])
            }

            // If course has rules, use them. Else use defaults.
            if (res.competencyRules && Array.isArray(res.competencyRules) && res.competencyRules.length > 0) {
                setRules(res.competencyRules as any[])
            } else if (res.systemDefaults && Array.isArray(res.systemDefaults)) {
                // Initialize with defaults but empty descriptions if logic prefers
                // User said "defaults will be set by admin", so likely pre-fill
                setRules((res.systemDefaults as any[]).map((d: any) => ({ ...d, description: "" })))
            }
        }
        setLoading(false)
    }

    const handleChange = (index: number, description: string) => {
        const newRules = [...rules]
        newRules[index] = { ...newRules[index], description }
        setRules(newRules)
    }

    const handleReset = () => {
        if (confirm("Are you sure you want to reset to system defaults? This will clear your custom descriptions.")) {
            setRules(defaults.map((d: any) => ({ ...d, description: "" })))
        }
    }

    async function onSave() {
        setSaving(true)
        const res = await updateCourseCompetencySettings(courseId, rules)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success("Competency rules updated successfully")
        }
        setSaving(false)
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Competency Descriptions</CardTitle>
                <CardDescription>
                    Define the competency description for each grade range. This text will appear on the student's report card based on their final grade.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleReset}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset Defaults
                    </Button>
                </div>

                <div className="grid gap-6">
                    {rules.map((rule, index) => (
                        <div key={index} className="space-y-2 border p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-lg">{rule.grade}</span>
                                <span className="text-sm text-muted-foreground bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded">
                                    Range: {rule.min} - {rule.max}
                                </span>
                            </div>
                            <div className="space-y-1">
                                <Label>Description</Label>
                                <Textarea
                                    placeholder={`Enter description for students getting ${rule.grade}... (e.g. "Menunjukkan penguasaan yang sangat baik...")`}
                                    value={rule.description || ""}
                                    onChange={(e) => handleChange(index, e.target.value)}
                                    className="min-h-[80px]"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Example: "Menunjukkan penguasaan yang sangat baik dalam..."
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <Button onClick={onSave} disabled={saving}>
                        {saving && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                        {!saving && <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
