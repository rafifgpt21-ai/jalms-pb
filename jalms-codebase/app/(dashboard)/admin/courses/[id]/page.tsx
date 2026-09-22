import { notFound } from "next/navigation"
import { getCourse } from "@/lib/actions/course.actions"
import { CourseStudentList } from "@/components/admin/courses/course-student-list"
import { AddCourseStudentModal } from "@/components/admin/courses/add-course-student-modal"
import { AddClassToCourseModal } from "@/components/admin/courses/add-class-to-course-modal"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspaceActions, WorkspaceHeader, WorkspacePage } from "@/components/workspace/workspace-page"

interface CourseWorkspacePageProps {
    params: {
        id: string
    }
}

export default async function CourseWorkspacePage({ params }: CourseWorkspacePageProps) {
    const { id } = await params
    const { course, error } = await getCourse(id)

    if (!course || error) {
        notFound()
    }

    const students = course.students

    return (
        <WorkspacePage>
            <MobileHeaderSetter
                title={course.name}
                subtitle={`${course.term.academicYear.name} - ${course.term.type === "ODD" ? "Odd" : "Even"}`}
                backLink="/admin/courses"
            />
            <WorkspaceHeader>
                <h2 className="sr-only text-xl font-semibold md:not-sr-only">Enrolled Students</h2>
                <WorkspaceActions className="max-md:grid max-md:grid-cols-2">
                    <AddClassToCourseModal courseId={id} />
                    <AddCourseStudentModal courseId={id} />
                </WorkspaceActions>
            </WorkspaceHeader>

            <CourseStudentList students={students} courseId={id} />
        </WorkspacePage>
    )
}
