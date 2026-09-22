"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUser } from "@/lib/actions/user.actions";

const preferenceSchema = z.object({
  density: z.enum(["compact", "comfortable"]),
  theme: z.enum(["system", "light", "dark"]),
  channelSidebarCollapsed: z.boolean().optional(),
});

export type WorkspacePreferenceValue = z.infer<typeof preferenceSchema> & {
  teachingCourseOrder: string[];
  enrolledCourseOrder: string[];
};

const DEFAULT_WORKSPACE_PREFERENCE: WorkspacePreferenceValue = {
  density: "compact",
  theme: "system",
  channelSidebarCollapsed: false,
  teachingCourseOrder: [],
  enrolledCourseOrder: [],
};

export async function getWorkspacePreference(explicitUserId?: string): Promise<WorkspacePreferenceValue> {
  const userId = explicitUserId || (await getUser())?.id;
  if (!userId) return DEFAULT_WORKSPACE_PREFERENCE;

  try {
    const preference = await db.userWorkspacePreference.findUnique({
      where: { userId },
    });
    if (!preference) return DEFAULT_WORKSPACE_PREFERENCE;
    return {
      density: preference.density === "COMFORTABLE" ? "comfortable" : "compact",
      theme:
        preference.theme.toLowerCase() as WorkspacePreferenceValue["theme"],
      channelSidebarCollapsed: preference.channelSidebarCollapsed,
      teachingCourseOrder: preference.teachingCourseOrder,
      enrolledCourseOrder: preference.enrolledCourseOrder,
    };
  } catch (error) {
    console.error("Failed to load workspace preference", error);
    return DEFAULT_WORKSPACE_PREFERENCE;
  }
}

export async function updateWorkspacePreference(
  input: z.input<typeof preferenceSchema>,
) {
  const user = await getUser();
  if (!user?.id) return { error: "Unauthorized" };

  const parsed = preferenceSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid appearance preference" };

  const data = {
    density:
      parsed.data.density === "comfortable"
        ? ("COMFORTABLE" as const)
        : ("COMPACT" as const),
    theme: parsed.data.theme.toUpperCase() as "SYSTEM" | "LIGHT" | "DARK",
    ...(parsed.data.channelSidebarCollapsed !== undefined
      ? { channelSidebarCollapsed: parsed.data.channelSidebarCollapsed }
      : {}),
  };

  await db.userWorkspacePreference.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      density: data.density,
      theme: data.theme,
      channelSidebarCollapsed: parsed.data.channelSidebarCollapsed ?? false,
      teachingCourseOrder: [],
      enrolledCourseOrder: [],
    },
    update: data,
  });

  const cookieStore = await cookies();
  cookieStore.set("arsync-density", parsed.data.density, {
    path: "/",
    maxAge: 31_536_000,
    sameSite: "lax",
  });
  cookieStore.set("arsync-theme", parsed.data.theme, {
    path: "/",
    maxAge: 31_536_000,
    sameSite: "lax",
  });
  if (parsed.data.channelSidebarCollapsed !== undefined) {
    cookieStore.set(
      "arsync-channels",
      parsed.data.channelSidebarCollapsed ? "collapsed" : "expanded",
      {
        path: "/",
        maxAge: 31_536_000,
        sameSite: "lax",
      },
    );
  }

  return { success: true };
}

export async function reorderCourses(
  roleContext: "teacher" | "student",
  orderedCourseIds: string[],
) {
  const user = await getUser();
  if (!user?.id) return { error: "Unauthorized" };
  if (new Set(orderedCourseIds).size !== orderedCourseIds.length)
    return { error: "Duplicate courses are not allowed" };

  const authorizedCourses = await db.course.findMany({
    where:
      roleContext === "teacher"
        ? { teacherId: user.id, deletedAt: { isSet: false } }
        : { OR: [{ studentIds: { has: user.id } }, { courseEnrollments: { some: { studentId: user.id, OR: [{ deletedAt: null }, { deletedAt: { isSet: false } }] } } }], deletedAt: { isSet: false } },
    select: { id: true },
  });
  const authorizedIds = new Set(authorizedCourses.map((course) => course.id));
  if (orderedCourseIds.some((id) => !authorizedIds.has(id)))
    return { error: "Course order contains an unauthorized course" };

  const field =
    roleContext === "teacher" ? "teachingCourseOrder" : "enrolledCourseOrder";
  await db.userWorkspacePreference.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      teachingCourseOrder: roleContext === "teacher" ? orderedCourseIds : [],
      enrolledCourseOrder: roleContext === "student" ? orderedCourseIds : [],
    },
    update: { [field]: orderedCourseIds },
  });
  return { success: true };
}

export async function rememberCourseSection(courseId: string, roleContext: "teacher" | "student", sectionKey: string) {
  const user = await getUser();
  if (!user?.id) return { error: "Unauthorized" };
  const role = roleContext === "teacher" ? "TEACHER" : "STUDENT";
  await db.courseNavigationState.upsert({
    where: { userId_courseId_roleContext: { userId: user.id, courseId, roleContext: role } },
    create: { userId: user.id, courseId, roleContext: role, lastSectionKey: sectionKey },
    update: { lastSectionKey: sectionKey },
  });
  return { success: true };
}
