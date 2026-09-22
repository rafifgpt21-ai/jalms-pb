# ARSync Workspace Redesign

Status: implementation in progress  
Updated: 2026-07-14

## Product direction

ARSync will become a dense, modern academic workspace. Courses behave as Discord-inspired spaces: a course rail selects a course, a contextual section list exposes its tools, and the remaining screen belongs to productive content. The redesign applies to every authenticated page while preserving generated PDF and print layouts.

The interface uses solid layered surfaces, subtle borders, restrained shadows, compact typography, sticky toolbars, and full-width tables. Operational collections use rows rather than poster cards. Compact density is the default; Comfortable density and System/Light/Dark appearance are synchronized per user.

## Navigation

Desktop uses a persistent course rail, collapsible section sidebar, compact context header, and full remaining content area. The rail contains Home, Messages, Teaching courses, Enrolled courses, authorized Admin/Homeroom/Family spaces, and profile settings. Teaching and Enrolled courses are independently draggable and synchronized across devices.

Teacher course sections are Overview, Announcements, Tasks, Materials, Task Summary, Attendance, Gradebook, and Settings. Student sections are Overview, Announcements, Tasks, Materials, Grades, and Attendance. Detail pages keep their parent section active. `Ctrl/Cmd+K` opens a quick switcher.

Mobile alternates between two full-screen states:

- Course Navigator: a narrow course rail plus the selected course's section list.
- Section Page: the selected page occupies the full viewport.

A top-right “Back to courses and sections” control opens the Navigator. Selecting a course updates the section list; selecting a section navigates and closes it. Opening the Navigator adds ephemeral history state so native Back closes it before leaving the page. There is no bottom navigation or partial navigation drawer.

## Course identity

Course identity resolves in this order:

1. Custom image
2. Three-letter subject code on the linked class color
3. Subject code on a deterministic neutral color
4. Course initials on the class color
5. Course initials on a deterministic course color

Subject codes are unique, exactly three uppercase letters. Class colors are administrator-managed values from an accessible palette. A custom image replaces the code tile but retains a class-color ring. Text labels and tooltips always expose subject and class so color is never the only identifier.

Owning teachers can upload, crop, replace, and remove their course image. Administrators can manage every image and all structural subject/class links. Upload authorization verifies course ownership; old provider files are removed only after a successful database update and only when no other rolled-over course references the same upload key.

## Productive workspace system

Shared primitives include `WorkspacePage`, `WorkspaceHeader`, `WorkspaceToolbar`, `WorkspacePanel`, `WorkspaceList`, `DataTableShell`, `MetricStrip`, `DetailInspector`, and `StickyActionBar`.

Compact defaults use 16px desktop page padding, 12px mobile padding, 12–16px section gaps, 32px desktop controls, 36–40px data rows, and 48px headers. Comfortable mode increases spacing without changing hierarchy. Mobile controls remain at least 44px.

Dashboards prioritize Today, Needs Attention, Upcoming, Recent Activity, and Continue Working. Tasks, materials, users, classes, and courses use compact sortable rows. Gradebook, task summary, schedules, and attendance use full-width tables with sticky headers and identity columns. Long forms use grouped sections and sticky save actions. Empty states are concise inline panels rather than large decorative blocks.

## Academic management UX

### Unified setup workspace

Subjects, Classes, and Courses share an active-term context while keeping their existing deep URLs. Search, filters, sorting, pagination, and selection are URL-backed. Direct links connect subjects to courses, classes to courses, and class/course rosters. Directories support multi-select, bulk actions, compact/comfortable density, archived views, restore, and a quick side inspector.

Class columns include color, name, term, homeroom teacher, student count, linked course count, synchronization health, status, and actions. Course columns include identity, name, subject, class, teacher, term, enrollment mode, student count, identity completeness, synchronization health, and status.

### Fast class setup

- Quick Create supports class name, term, color, optional homeroom teacher, and Create Another.
- Bulk Create accepts multiple class names with shared term, automatic color suggestions, per-row overrides, and duplicate validation.
- Rollover copies selected class structures to another term with editable names, colors, homeroom mappings, and optional rosters.

Class detail contains Overview, Students, Linked Courses, Combined Schedule, and Change History. Roster tools add/import students, copy a roster from another class, move selected students, and compare membership against linked synchronized courses. Changing a class color previews all affected course identities. An established class cannot change terms; rollover preserves history.

### Fast course setup

- Quick Create selects subject, class, teacher, inferred term, enrollment behavior, and a suggested editable name with live identity preview.
- Course Matrix Builder uses classes as rows and subjects as columns, with default teachers, cell overrides, duplicate detection, and bulk preview.
- Advanced Course supports general or cross-class courses where subject/class links remain optional.

Course detail contains Overview, Students, Setup and Identity, Teaching Content, Schedule, and Change History. Structural changes preview identity changes, student additions/removals, schedule conflicts, and retained academic data before applying.

### Enrollment modes

Each course chooses one mode:

- Manual: class supplies identity/metadata; membership is managed explicitly.
- Seeded from Class: current class members are copied once, then membership remains manual.
- Synchronized with Class: course membership continuously mirrors the active class roster and direct course enrollment is disabled.

Changing class or mode requires an impact preview. Synchronization never performs destructive removals when unresolved schedule conflicts exist. Invalid courses remain selected after bulk operations with actionable errors.

### Archive and restore

Archive replaces misleading delete behavior. Class archive previews students, linked courses, schedules, and reports, then requires reassigning, unlinking, or archiving dependent courses. Course archive preserves tasks, submissions, materials, grades, attendance, and announcements while removing the course from active navigation and preventing new activity. Archived records have a Restore workflow; restoration never silently reactivates dependencies.

### Full selectable rollover

A resumable wizard selects source/target terms, class and course mappings, then optionally copies rosters, homeroom assignments, competency rules, attendance-pool configuration, material links, schedules, assignments as drafts, associated quizzes, selected announcements as drafts, and custom image references.

Submissions, grades, attendance records, report cards, messages, and read state never copy. Draft assignments have no due date until reviewed. Rollover is idempotent, records per-item results, and can retry failed items without duplicating successful work.

## Database redesign

Add enums for class colors, density, theme, course role context, enrollment mode/source, content publication status, and rollover status.

Extend Subject with a unique normalized three-letter code and timestamps. Extend Class with required accessible color and timestamps. Extend Course with subject/class indexes, custom image URL/key, enrollment mode, synchronization metadata, timestamps, announcements, and navigation state.

Replace the raw course `studentIds` array with `CourseEnrollment`, uniquely keyed by course/student and recording source (`LEGACY`, `MANUAL`, `CLASS_SEED`, `CLASS_SYNC`, `IMPORT`, or `ROLLOVER`), source class, actor, timestamps, and soft deletion. Extend class Enrollment with source, actor, timestamps, soft deletion, and a unique class/student key.

Add `UserWorkspacePreference` for density, theme, collapsed sidebar, and ordered Teaching/Enrolled course IDs. Add `CourseNavigationState` for last section and announcement read state. Add `CourseAnnouncement`, resumable rollover job/item models, and a structural management audit log.

Assignments and announcements gain Draft/Published/Archived status. Assignment due date becomes optional for drafts; student queries expose only published content.

## Migration

1. Back up and audit the database.
2. Add nullable compatibility fields and new collections.
3. Normalize subject codes and deterministically resolve collisions with a review report.
4. Assign deterministic accessible colors to existing classes.
5. Repair only unambiguous same-term missing class links and report the rest.
6. Backfill CourseEnrollment from `studentIds`, classifying linked-class members as class seeded and others as legacy.
7. Deduplicate class enrollments.
8. Dual-write legacy and normalized course enrollment temporarily.
9. Verify membership counts and hashes for every course.
10. Switch reads to CourseEnrollment and remove legacy storage only after validation.

## Delivery order

1. Workspace tokens, preferences, and shared primitives.
2. Schema compatibility and migration tooling.
3. Unified desktop/tablet/mobile navigation shell.
4. Subject, Class, and Course directories/details and identity management.
5. Bulk creation, matrix builder, enrollment modes, archive/restore, and rollover.
6. Course Overview, announcements, progress, custom images, and ordering.
7. Remaining authenticated pages and final responsive/accessibility pass.

Each slice ends with type checking, build validation, and interactive previews at 360×800, 390×844, 768×1024, 1024×768, 1366×768, and 1440×900.

## Completion criteria

- No routine authenticated screen uses poster cards, display-sized headings, nested glass panels, or excessive page margins.
- Course identity remains understandable without color alone.
- Course order and preferences survive reload and another device.
- Simple, bulk, and matrix course creation store subject/class links correctly.
- Manual, seeded, and synchronized enrollment modes are tested, auditable, and recoverable.
- Archive/restore and rollover never copy or destroy student academic outcomes unexpectedly.
- Mobile provides a full-screen Navigator → Section selection → full-screen page flow.
- No shell-level N+1 queries or random progress values remain.
- `npx tsc --noEmit`, automated tests, and `npm run build` pass.

