import { Suspense, type ComponentProps } from "react"
import { getCourses } from "@/lib/actions/course.actions"
import { getSemesters } from "@/lib/actions/academic-year.actions"
import { getUsers } from "@/lib/actions/user.actions"
import { getSubjects } from "@/lib/actions/subject.actions"
import { CourseList } from "@/components/admin/courses/course-list"
import { MobileHeaderSetter } from "@/components/mobile-header-setter"
import { WorkspacePage } from "@/components/workspace/workspace-page"
import { TablePanelSkeleton } from "@/components/navigation/route-skeletons"

interface CoursesPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

async function CoursesContent({ searchParams }: CoursesPageProps) {
    const params = await searchParams
    const showAll = params.showAll === "true"

    const [{ courses }, { terms }, { users: teachers }, { subjects }] = await Promise.all([
        getCourses({ showAll }),
        getSemesters(),
        getUsers({ role: "SUBJECT_TEACHER", limit: 100 }),
        getSubjects(),
    ])

    type Props = ComponentProps<typeof CourseList>
    return <CourseList
        courses={courses as Props["courses"]}
        teachers={teachers}
        terms={terms as Props["terms"]}
        subjects={subjects}
    />
}

export default function CoursesPage({ searchParams }: CoursesPageProps) {
    return (
        <WorkspacePage>
            <MobileHeaderSetter title="Courses" subtitle="Create, link, enroll, and maintain teaching workspaces." />
            <Suspense fallback={<TablePanelSkeleton />}>
                <CoursesContent searchParams={searchParams} />
            </Suspense>
        </WorkspacePage>
    )
}
