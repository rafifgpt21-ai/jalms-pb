import { notFound } from "next/navigation"
import { db as prisma } from "@/lib/db"
import { getEnrolledStudents } from "@/lib/actions/enrollment.actions"
import { StudentList } from "@/components/admin/classes/student-list"
import { AddStudentModal } from "@/components/admin/classes/add-student-modal"
import { AddClassToClassModal } from "@/components/admin/classes/add-class-to-class-modal"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspaceActions, WorkspaceHeader, WorkspacePage } from "@/components/workspace/workspace-page"
import { educationStage, gradeLevelLabel } from "@/lib/grade-level"

interface ClassWorkspacePageProps {
    params: {
        id: string
    }
}

export default async function ClassWorkspacePage({ params }: ClassWorkspacePageProps) {
    const { id } = await params

    const classData = await prisma.class.findUnique({
        where: { id },
        include: {
            term: {
                include: { academicYear: true }
            },
            homeroomTeacher: true
        }
    })

    if (!classData) {
        notFound()
    }

    const { students, error } = await getEnrolledStudents(id)

    if (error) {
        return <div className="p-6 text-red-500">Error loading students: {error}</div>
    }

    return (
        <WorkspacePage>
            <MobileHeaderSetter
                title={classData.name}
                subtitle={`${gradeLevelLabel(classData.gradeLevel)}${classData.gradeLevel ? ` · ${educationStage(classData.gradeLevel)}` : ""} · ${classData.term.academicYear.name} - ${classData.term.type === "ODD" ? "Odd" : "Even"}`}
                backLink="/admin/classes"
            />
            <WorkspaceHeader>
                <h2 className="sr-only text-xl font-semibold md:not-sr-only">Enrolled Students</h2>
                <WorkspaceActions className="max-md:grid max-md:grid-cols-2">
                    <AddClassToClassModal classId={id} />
                    <AddStudentModal classId={id} />
                </WorkspaceActions>
            </WorkspaceHeader>

            <StudentList classId={id} students={students || []} />
        </WorkspacePage>
    )
}
