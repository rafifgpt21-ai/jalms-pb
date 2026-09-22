import { db } from "@/lib/db"
export { courseChatChannel, courseIdFromChatChannel } from "@/lib/course-chat.shared"

export async function getCourseChatAccess(courseId: string, userId: string) {
  return db.course.findFirst({
    where: {
      id: courseId,
      deletedAt: { isSet: false },
      OR: [
        { teacherId: userId },
        { studentIds: { has: userId } },
        {
          courseEnrollments: {
            some: {
              studentId: userId,
              OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }],
            },
          },
        },
      ],
    },
    select: { id: true, name: true, reportName: true, teacherId: true },
  })
}
