# ARSync Current Design System

Status: current implementation reference  
Updated: 2026-07-19<br>
Audience: agents and developers making UI changes, adding components, or creating pages

## 1. Purpose and authority

This document describes the design that is implemented now. Treat it as the primary UI reference before changing authenticated pages or introducing a new design element.

- `design.md` is the source of truth for current visual, interaction, responsive, and loading behavior.
- `redesign.md` records the broader redesign direction and unfinished product work. It is useful context, but it is not proof that a feature or primitive exists.
- The code remains authoritative when this document and the implementation differ. If a deliberate UI change alters a system-level rule, update this document in the same change.
- Generated PDFs, report cards, print views, and externally formatted exports are separate presentation systems. Do not automatically apply workspace styling to them.

## 2. Product and design philosophy

ARSync is a dense academic workspace, not a marketing site or a decorative dashboard. It should feel calm, direct, fast, and operational.

The governing principles are:

1. **Work first.** Give most of the viewport to useful content. Navigation and chrome should be compact and predictable.
2. **Context stays visible.** The rail answers which workspace or course is active. The section sidebar answers which tool inside that context is active. The top bar names the current page.
3. **Hierarchy comes from structure.** Use spacing, typography, borders, surface color, and alignment before using large shadows, oversized headings, gradients, or ornament.
4. **Solid layered surfaces.** The implemented workspace intentionally normalizes glass panels, excessive blur, giant radii, and heavy shadows into restrained cards and panels.
5. **Dense but touch-safe.** Prefer the smallest practical vertical footprint on operational screens. Desktop defaults are compact, while mobile controls retain at least 44px touch targets without automatically forcing every action onto its own row.
6. **Color has meaning.** Indigo is the main action and active-navigation accent. Semantic colors communicate status. Course color never carries identity alone.
7. **Perceived speed is part of the design.** Active states respond immediately, the retained shell never flashes stale content, and dynamic content appears through stable structural skeletons.
8. **Dark mode is first-class.** Every new surface and state must work in light, dark, and system themes.
9. **Accessibility is structural.** Use semantic controls, visible focus states, readable contrast, non-color identifiers, reduced-motion support, and useful loading semantics.

## 3. Brand and visual character

The product name is **Arsync** in app metadata and **ARSync** in internal design documentation. Existing logo assets live in `public/arsync.svg` and `public/arsyncLogo.svg`.

The visual character is:

- modern academic software;
- cool neutral surfaces with an indigo accent;
- compact, squared, and structured rather than soft or playful;
- restrained depth: thin borders and one-pixel shadows;
- information-rich without becoming visually noisy.

Avoid introducing a competing brand color or a new visual language for one page. Gradients may appear in legacy or specialized content, but they are not the default workspace surface treatment.

## 4. Typography

Typography is configured in `app/layout.tsx`.

- Body/UI font: **Inter**, exposed as `--font-sans`.
- Heading font: **Outfit**, exposed as `--font-heading`.
- Body rendering uses antialiasing and OpenType features `cv02`, `cv03`, `cv04`, and `cv11`.
- Default UI copy is usually `text-sm` (14px).
- Supporting copy is usually `text-xs` (12px) with `text-muted-foreground`.
- Table headings and compact labels use 11px semibold uppercase text with modest tracking.

Inside `.workspace-content`, global rules normalize headings:

| Element | Current size | Weight and treatment |
| --- | --- | --- |
| `h1` | 20px / 28px | 650, slight negative tracking |
| `h2` | 18px / 24px | 650, slight negative tracking |
| `h3` | 16px / 22.4px | normal workspace emphasis |

Do not use display-sized page titles in authenticated workspaces. A page title should not compete with the persistent workspace shell.

## 5. Color system

All general UI colors must use semantic tokens from `app/globals.css`, not one-off hardcoded light colors.

### Core semantic roles

| Token | Intended use |
| --- | --- |
| `background` / `foreground` | application background and primary text |
| `card` / `card-foreground` | panels, cards, tables, dialogs |
| `primary` / `primary-foreground` | principal actions and selected emphasis |
| `secondary` / `secondary-foreground` | secondary controls and quiet emphasis |
| `muted` / `muted-foreground` | subdued surfaces, metadata, placeholders |
| `accent` / `accent-foreground` | hover and selected control surfaces |
| `destructive` | destructive actions and severe errors |
| `border`, `input`, `ring` | structure, controls, and focus |

The light theme uses ice-white and slate neutrals with vibrant indigo. The dark theme uses deep navy surfaces with a lighter indigo for readable emphasis. The theme values are OKLCH tokens; extend the token system rather than copying raw values into components.

### Workspace-specific roles

| Token | Purpose |
| --- | --- |
| `--workspace-rail` | outer course/workspace rail |
| `--workspace-rail-foreground` | inactive rail content |
| `--workspace-rail-icon` | inactive rail icon tile |
| `--workspace-rail-divider` | rail separators |
| `--workspace-rail-active` | active course identity ring |
| `--workspace-sidebar` | contextual section sidebar |
| `--workspace-header` | retained top bar |
| `--workspace-canvas` | page canvas behind content |
| `--workspace-row-hover` | list and table hover surface |

### Status colors

Use `StatusBadge` from `components/ui/status-badge.tsx` for status labels. Its tones are:

- success: emerald;
- info: blue;
- warning: amber;
- danger: red;
- neutral: slate;
- accent/running: violet.

Do not invent a different mapping for common statuses such as Active, Draft, Pending, Missing, Archived, or Running.

## 6. Shape, borders, and depth

- Base radius: `0.5rem` (8px).
- Most controls and workspace panels use `rounded-md` or 8px.
- Workspace CSS deliberately reduces legacy `rounded-2xl` and `rounded-3xl` surfaces to the base radius.
- Cards and panels use a one-pixel semantic border.
- Default depth is `shadow-xs` or a one-pixel/two-pixel low-opacity shadow.
- Workspace CSS deliberately reduces `shadow-lg`, `shadow-xl`, and `shadow-2xl` to a restrained shadow.
- Nested glass effects are not part of the current direction. Backdrop blur inside workspace content is disabled by the shared stylesheet.

Use elevation only to explain layering, such as a popover, dialog, sticky element, or mobile overlay. Do not use heavy shadow as decoration.

## 7. Density, spacing, and sizing

The appearance system supports `compact` and `comfortable` density. The preference is cookie-backed, applied before hydration, and synchronized through `AppearanceProvider`.

### Desktop density tokens

| Token | Compact default | Comfortable |
| --- | ---: | ---: |
| Page padding | 12px | 16px |
| Section gap | 12px | 16px |
| Data row height | 36px | 42px |
| Control height | 32px | 36px |

### Mobile normalization

At widths below 768px:

- page padding is 8px;
- section gap is 10px;
- buttons, inputs, and select triggers have a minimum height of 44px;
- workspace action groups stack only when controls cannot remain readable in a shared row; a familiar icon-only action may stay inline when it retains a 44px target and an accessible name;
- page scrollbars are visually hidden while scrolling remains available;
- overscroll is contained inside the workspace content area.

Prefer the shared CSS variables and primitives over embedding large spacing values in individual pages. The workspace stylesheet also normalizes legacy `gap-6`, `gap-8`, and large padding classes.

### Operational density preference

Management, grading, attendance, and other repetitive work screens should expose the useful collection or workspace as high in the viewport as possible.

- First reduce structural height by merging related panels and removing redundant rows. Do not rely only on smaller text or cramped controls.
- Short metrics, immediate actions, search, filters, and result context should share one operational surface whenever they remain readable.
- Target one compact row for this operational surface on desktop. On mobile, target no more than two short rows: a metric/action strip and a search/filter row.
- Keep secondary context such as long descriptions collapsed by default when it is not required for the user's next decision.
- Preserve 44px mobile touch targets inside a compact grid; touch safety does not require a full-width button or a separate card.
- Avoid standalone statistic cards when the values fit in a divided strip. Every extra panel, gap, and border must earn its vertical cost.

## 8. Authenticated workspace anatomy

The authenticated application is built around `WorkspaceShell` in `components/navigation/workspace-shell.tsx`.

### Desktop: 1024px and wider

The screen is divided into:

1. a persistent 64px course/workspace rail;
2. a 240px contextual section sidebar, unless the user has collapsed it;
3. a flexible content column with a retained 56px top bar;
4. a single scrollable content region using the remaining height.

The browser body does not scroll while the workspace shell is present. Scrolling belongs to `.workspace-content` or a deliberately nested data region.

### Tablet: 768px to 1023px

- The 64px rail remains visible.
- The section sidebar is hidden by default and opens as an overlay from the left of the content area.
- The top bar exposes a section-menu control.
- Page content continues to occupy the remaining viewport.

### Mobile: below 768px

Mobile alternates between two full-screen states:

- **Section page:** content fills the viewport below the retained 56px top bar.
- **Navigator:** a 64px touch-safe rail plus the selected context's section list fills the screen.

The top-bar Menu control opens the Navigator. Choosing a course changes the section list without navigating. Choosing a section navigates and closes the Navigator. Ephemeral browser history makes native Back close the Navigator before leaving the page.

There is no active bottom-navigation architecture in the current workspace shell. Older bottom-navigation and sidebar components may still exist in the repository but are not the design reference for new work.

## 9. Public and authentication surfaces

The current login page in `app/(auth)/login/page.tsx` is intentionally more expressive than the authenticated workspace. It is a welcome surface, not an operational data screen.

At 1024px and wider it uses a split composition:

- a 47% deep-navy story/brand panel with restrained indigo and cyan atmosphere;
- a 53% light/dark form panel centered around a maximum 430px form;
- a large outer presentation frame on viewports that have room for it.

Below 1024px the story panel disappears and the sign-in form becomes the full-page focus. The mobile page retains generous horizontal padding and a clear Arsync wordmark.

Auth-specific rules:

- Outfit may be used at larger sizes for welcome messaging because this is outside `.workspace-content`.
- Indigo remains the primary action color; cyan is a supporting brand accent, not a second application action color.
- Auth inputs and the primary submit button are 48px high.
- Labels remain visible and fields use leading icons only as reinforcement.
- Password visibility uses an accessible named button.
- Authentication errors use an inline red panel with an `aria-live` region.
- Submission feedback may replace button content with concise pending text; it must not block the entire page with a route spinner.
- The login page supports light and dark presentation.

The login page's larger radius, atmospheric gradient, and stronger frame shadow are a scoped public/auth exception. Do not copy them into authenticated directories, forms, tables, or dashboards.

## 10. Navigation model

Navigation is context-first.

### Rail contexts

The rail can expose:

- Home;
- Messages;
- Homeroom, when authorized;
- Administration, when authorized;
- Teaching courses;
- Enrolled courses;
- Family, when authorized;
- profile/settings at the bottom.

Home is always the first rail destination. Messages, Homeroom, and Administration belong to the same top utility cluster directly beneath Home, with Administration ordered below Homeroom when both are available. Teaching and enrolled course groups follow after a divider; Family remains below the course groups when authorized.

Home is a routing action, not a standalone dashboard. It opens the highest-priority dashboard authorized for the current user. Daily academic work takes priority in this order: Teaching, Learning, Homeroom, Administration, then Family. `/home` remains redirect-only for compatibility with old bookmarks.

Teaching and enrolled courses are separate ordered groups and can be reordered. Course identity appears as a 40px mark.

### Section contexts

Teacher course sections:

- Overview;
- Announcements;
- Tasks;
- Materials;
- Task Summary;
- Attendance;
- Gradebook;
- Settings.

Student course sections:

- Overview;
- Announcements;
- Tasks;
- Materials;
- Grades;
- Attendance.

Administration and the Home context use the centralized configuration in `lib/navigation-config.ts`. Administration and Homeroom retain dedicated rail contexts and expose their menus only after their rail icons are selected. The Home section sidebar combines the authorized Teaching, Learning, and Family menus and separates each visible role group with a divider. Add or change shared destinations there rather than hardcoding a second navigation list.

Administration includes a **Miscellaneous** destination for shared settings that do not yet justify a dedicated management area. Keep its contents as clearly labeled independent panels rather than an unstructured catch-all form.

Detail routes keep their parent section active through prefix matching. A course remembers its last visited valid section and reopens there from the rail.

## 11. Instant navigation and perceived performance

These behaviors were established in the navigation and page-loading work completed on 2026-07-14 and 2026-07-15. They are non-negotiable design requirements.

### Immediate active state

- A clicked rail or section destination becomes visually active through local `pendingPath` state immediately.
- The rail context, section sidebar, and top-bar title render from the optimistic destination while the real route resolves.
- Do not derive clicked feedback exclusively from `usePathname()`. That waits for the navigation commit and reintroduces perceived latency.
- Route-backed tabs or context switches should follow the same optimistic pattern.

### No stale-page flash on mobile

Closing the mobile Navigator must never reveal the previous page for a frame. While `pendingPath` differs from the committed pathname, the retained shell replaces the old children with a destination-shaped structural skeleton in the same render that closes the menu.

The shell also suppresses old page-specific subtitles and header actions during this pending state. Future changes must preserve this ordering.

### Prefetching

- Use `next/link` for internal navigation.
- Important visible links explicitly allow prefetching.
- The shell prefetches high-priority role roots and sibling routes for the current context.
- Prefetch strategically; do not eagerly fetch an unbounded data set or every deep record link.

### Streaming and partial rendering

- Keep the retained shell, page framework, titles, actions, and static explanatory copy outside slow data boundaries.
- Put independent server-data sections behind localized React `Suspense` boundaries.
- Fetch independent datasets concurrently with `Promise.all`.
- Existing examples include Home destinations, admin Users/Classes/Courses, Homeroom, course overviews, Student Grades, and Learning Profile.
- Heavy client-only visualizations such as charts should be dynamically imported with a fixed-size loading fallback so their code does not block the initial frame.

### Performance review for new and redesigned pages

Loading speed is part of the page's acceptance criteria. A skeleton is temporary feedback, not permission for a slow data path.

- Before finishing a new page or a substantial redesign, inspect its critical render path for repeated authentication, duplicate fetches, sequential independent queries, unbounded collection reads, oversized relation includes, and unrelated work such as notifications or analytics.
- Render the useful static frame and primary actions immediately. Defer secondary data until after the page is usable when it does not affect the user's first decision.
- Select only fields used by the page, bound dashboard and preview collections with a meaningful limit, and add indexes for recurring filters and sort keys.
- Share request identity and memoize identical reads within a render. Run independent reads concurrently, but do not launch broad speculative prefetches that compete with the destination being opened.
- If a low-value widget is consistently responsible for a multi-second delay, simplify it, move it to a dedicated page, load it after interaction, or remove it. Do not preserve it by making the skeleton last longer.

Testing must be proportional to the change:

- Always run the relevant static checks and review the query shape when a page reads server data.
- Measure loading when a new or changed page introduces database queries, large or unknown datasets, third-party requests, heavy client code, or when the UI is observed remaining in a skeleton for too long.
- Profile the slow sections independently so one expensive query is not hidden inside a combined page timing. Compare before and after when addressing a reported regression.
- Use representative data and the roles or responsive layouts affected by the change. A focused page check is preferred over an exhaustive application-wide performance suite.
- Static copy changes, minor styling adjustments, and pages using an already-verified shared data path do not require dedicated performance profiling unless they show a regression.
- Never add artificial waits or optimize only the loading animation. Fix, defer, bound, or remove the work causing the delay.

### Loading presentation

- Do not use route-level progress bars, centered spinners, blank screens, or generic `Loading...` text.
- Use structural skeletons that match the final component's dimensions and layout.
- Match header presence, summary-cell count, action placement, responsive breakpoints, and desktop/mobile collection representation. A header-free page must not load through a skeleton with a content header.
- Keep shell navigation visible and interactive while content streams.
- Skeleton containers should use `aria-busy="true"` and a concise accessible label where appropriate.
- Do not add artificial delays to make a loading treatment visible.

The shared skeleton families are in `components/navigation/route-skeletons.tsx`:

| Skeleton | Intended destination |
| --- | --- |
| `DashboardRouteSkeleton` | dashboards, home-like pages, general fallback |
| `TableRouteSkeleton` / `TablePanelSkeleton` | directories, management lists, data tables |
| `GridRouteSkeleton` / `GridContentSkeleton` | course or homeroom collections |
| `CourseRouteSkeleton` | course overview and nested course tools |
| `TaskRouteSkeleton` | teacher task management list |
| `TaskGradingRouteSkeleton` | teacher task grading detail |

When creating a page with materially different final geometry, add a localized skeleton rather than forcing an inaccurate generic one. The optimistic shell mapping must select that destination-specific skeleton before the route commits. `TaskRouteSkeleton` and `TaskGradingRouteSkeleton` are reference implementations for compact management and detail pages.

## 12. Shared workspace primitives

Use the components in `components/workspace/workspace-page.tsx`:

- `WorkspacePage`: vertical page composition and shared section rhythm;
- `WorkspaceHeader`: optional page-level boundary for identity or controls that cannot fit in the retained top bar;
- `WorkspaceToolbar`: filters, search, view controls, and compact utilities;
- `WorkspaceActions`: page actions, right-aligned on desktop and stacked on mobile;
- `WorkspacePanel`: the standard bordered content surface.

### Retained top bar and content headers

These rules apply to authenticated workspace pages. Public/authentication surfaces and generated or exported documents keep their scoped presentation systems.

The retained top bar owns page identity by default. Use `MobileHeaderSetter` for the page or record title, concise subtitle/context, and the parent Back destination on detail routes.

- Do not repeat the same title, subtitle, identity icon tile, or mobile Back control inside page content.
- Use `WorkspaceHeader` only when it adds distinct identity, summary, or controls that the top bar cannot reasonably contain. It is optional, not the default first section.
- On mobile detail pages, Back belongs in the retained top bar. Do not add a second content-level Back button.
- On desktop detail pages, a visible Back action may sit beside Edit or the primary record action when that improves workflow clarity.

### Compact summary/action strips

When a page begins with short metrics or record metadata, combine them and their immediate action into one bordered `WorkspacePanel` instead of separate cards, a repeated content header, and an independent action row.

- On desktop, keep metrics on the left, search and filters in the middle, and the primary create/edit action at the far right when these elements share a strip.
- Put the desktop detail Back action beside Edit or the relevant primary action in the final action segment.
- On mobile, keep a small set of short summary cells in one row when readable. Prefer a 44px icon action in the final cell over adding a full-width action row; retain a visible label only when the icon or context is ambiguous.
- Integrate the search/filter toolbar into the same panel. It may occupy a second short row on mobile, but should share the summary row on a wide desktop.
- Do not show a standalone result count when it merely repeats the total, such as “6 of 6.” When filtering changes the count, integrate “shown / total” into the relevant metric or a purposeful compact badge.
- If a description immediately follows the strip, place its disclosure row inside the same surface and keep it collapsed by default on management and grading screens.
- A compact operational header should normally use one desktop row and no more than two mobile rows before the collection begins.
- Hide decorative icons before removing meaningful labels or values. Truncate secondary context deliberately and preserve accessible names.
- Mobile action segments and icon-only controls must retain 44px touch targets.
- If content length, accessibility, or localization makes the horizontal pattern unreadable, use a deliberate responsive alternative without reintroducing duplicated page identity.

Before creating a new primitive, check `components/ui` and `components/workspace`. Prefer extending a shared component with a semantic variant over copying a long class list into several pages.

## 13. Core UI primitives

### Icons

The interface uses Lucide icons. Keep the visual language consistent rather than mixing icon families.

- Standard inline and desktop navigation icons are usually 16px.
- Mobile section-navigation icons are 18px.
- Icon tiles commonly place a 16-18px glyph inside a 32-40px surface.
- Icon-only buttons require an accessible name and generally use the shared icon button sizes.
- Use icons to improve scanning, not as a substitute for the visible label of a primary action.

### Buttons

Use `Button` from `components/ui/button.tsx`.

- Default: primary action.
- Secondary: quieter filled action.
- Outline: neutral action on a surface.
- Ghost: compact chrome, row, or toolbar action.
- Destructive: deletion/archive-confirmation action where danger is intended.
- Link: text-level navigation, not a substitute for `next/link` routing.

Desktop heights are 28-36px depending on size; mobile global rules raise non-icon controls to at least 44px. Buttons use a subtle one-pixel active translation, not a large scale animation.

### Inputs and selects

- Use the shared `Input`, `Textarea`, `Select`, checkbox, radio, switch, and form primitives.
- Default desktop input height is 32px; mobile minimum is 44px.
- Use semantic focus rings and `aria-invalid` states already supplied by primitives.
- Labels must remain visible for forms; placeholder text is not a label.
- Do not use a basic `Select` for a library-backed relationship that can grow to many items or folders. Use a searchable picker with folder/category navigation, useful item metadata, a bounded scrolling result area, a clear selected-item summary, and a route to manage the source library.

### Cards and panels

- Use `WorkspacePanel` for workspace-native sections.
- Use `Card` and its subcomponents when header/content/footer composition is useful.
- Avoid placing multiple fully bordered cards inside another fully bordered card without a clear hierarchy.

### Badges

- Use `Badge` for categories, compact counts, or non-status labels.
- Use `StatusBadge` for lifecycle and operational status.
- Badge text is compact and should not contain long sentences.

### Tables

Use shared table primitives for structured collections.

- Tables sit in a rounded, bordered, horizontally scrollable container.
- Headers are sticky, muted, uppercase, and compact.
- Rows have subtle hover feedback and semantic selected state.
- Default cell height is approximately 36px.
- Identity or primary name belongs in the first meaningful column.
- Keep row actions compact and consistent, commonly in the rightmost column.
- On mobile, choose deliberate responsive columns, horizontal scrolling, or a dedicated compact card representation. Do not squeeze every desktop column into the viewport.

### Charts and data visualization

- Recharts is the current charting library.
- Use the semantic chart token palette from `app/globals.css` where practical.
- Charts should answer a specific academic or operational question and include readable labels or an adjacent textual/table representation.
- Heavy chart components are client-only boundaries and should be dynamically imported with a fixed-height skeleton.
- Never let chart JavaScript delay the page header, filters, or surrounding structure.
- Respect dark mode in axes, grids, tooltips, and labels; do not assume a white tooltip surface.

### Dialogs, menus, tooltips, and toasts

- Use the existing Radix-backed primitives.
- Dropdowns, submenus, selects, command lists, and popovers share one token-based `popover` surface: an 8px radius, semantic border, restrained elevation, compact spacing, and a short directional entrance. Do not restore hardcoded white/slate surfaces, glass blur, large radii, or decorative shadows in individual menus.
- Menu and select rows are 32px or taller on desktop and 44px on mobile. Keep item icons at 16px, use the shared highlighted state, and mark destructive items with the primitive's `destructive` variant.
- Use radio items for mutually exclusive choices, checkbox items for independent toggles, and visible indicators for the current choice. Icon-only menu triggers need a contextual accessible name.
- Floating content keeps at least 8px of viewport collision padding and should match or slightly exceed the trigger width when that helps scanning.
- Use dialogs for focused creation/editing and confirmation, not for full application pages.
- Use alert dialogs for destructive or irreversible confirmation.
- Tooltips support unfamiliar icons; they do not replace visible labels for primary actions.
- Use Sonner toasts for concise operation results. Do not use a toast as the only place an actionable validation error appears.

## 14. Course identity

Course identity resolution is implemented in `lib/course-identity.ts` and displayed through `CourseIdentityBadge` or the rail's course mark.

Resolution order:

1. custom image;
2. subject code;
3. course initials.

The mark combines this label/image with the linked class color or a deterministic fallback color. A custom image retains a class-colored ring. Tooltips and accessible labels include textual course, subject, class, and role context so color is never the only identifier.

Expanded course summaries in the section sidebar omit the course mark so longer course names have room for two lines. When a linked class has a color, the summary uses a subtle tint of that color; unlinked or colorless courses use the neutral card surface. This applies equally to teaching and enrolled course contexts.

Do not create a separate random course-color algorithm. Reuse `resolveCourseIdentity` for consistent labels and colors.

## 15. Page composition patterns

### Dashboard

Recommended order:

1. immediate page context or greeting;
2. a compact metric strip or summary cards;
3. Today / Needs Attention / Upcoming work;
4. recent activity or secondary information;
5. clear shortcuts to full tools.

Metrics should support decisions, not exist as decoration. Each async dashboard region should stream independently with a dimension-matched skeleton.

### Directory or management page

Recommended composition:

1. retained top-bar title and optional subtitle;
2. a compact operational strip combining optional metrics, search, filters, and create/import actions;
3. a full-width table or compact operational list;
4. pagination or a result summary near the collection when it adds information not already visible in the strip.

Do not add a content header solely to repeat the top-bar title or to hold an action that fits naturally in the summary strip or toolbar.

Do not split metrics, the toolbar, and the primary action into separate vertically stacked surfaces by default. On desktop, the primary action belongs at the far right of the combined strip. On mobile, keep search and its primary filter side by side when they fit at 360px; hide or relocate redundant result text instead of creating another row.

Search and filters that define a shareable view should be URL-backed. During a route-backed filter change, keep the stable toolbar visible and skeleton only the changing results when possible.

### Course overview

Recommended composition:

1. course identity, name, subject/class/teacher context, and a primary role-appropriate action;
2. a compact four-part summary strip;
3. upcoming work and announcements in a responsive two-column layout;
4. links into the dedicated section pages.

### Detail page

- Preserve the parent section's active navigation state.
- Put record identity and parent Back navigation in the retained top bar.
- Begin content with a compact metadata/action strip when the record has short facts such as due date, score, status, or lifecycle state.
- Keep desktop Back and Edit actions together in the strip's action segment; rely on the retained top-bar Back control on mobile.
- Keep optional descriptions collapsed and attach their disclosure row to the metadata surface when doing so removes an otherwise separate panel.
- Group related fields and records into a small number of clear panels.
- Keep critical save or submission actions reachable on long pages.
- Avoid the redundant sequence of content identity header, separate metric cards, and separate action row when one strip communicates the same information.

### Forms

- Group related fields under concise headings. Use supporting copy only when it changes the user's immediate decision; do not explain every field in the default layout.
- Consolidate longer guidance in one contextual Help popover or dialog. Keep validation, destructive consequences, empty-state recovery, and other critical warnings inline where action is required.
- Put common fields before advanced or exceptional options.
- Move advanced multi-select choices into a compact popover when showing every option would dominate the form.
- Show inline validation close to the field.
- Use optimistic success only when rollback/error handling is clear.
- For long forms, use a sticky action region rather than duplicating save buttons throughout the page.

### Homeroom and report cards

- Homeroom uses the same compact workspace language as management and grading pages: summary/search controls in one operational strip, a mobile card list, and a desktop table where comparison benefits from columns.
- Student rows expose Grades and Report as visible actions. Do not hide these primary homeroom tasks behind an overflow menu.
- The retained top bar owns record identity and Back navigation on class, student-grade, report-editor, and report-preview routes. Do not repeat breadcrumbs or large identity headers inside page content.
- The report editor groups read-only academic results, attendance, extracurriculars, achievements, personal development, and the homeroom note into restrained workspace panels. Its first panel contains report status and save/preview actions in no more than two mobile rows.
- PDF rendering remains a separate formal document system. The report card retains its legacy black-and-white, Times-based document design; workspace redesigns must not restyle the generated report. Load the PDF renderer only on the preview route and use a structural preview fallback rather than a spinner or blank screen.
- Principal names are admin-owned shared settings under Administration → Miscellaneous. Store one SMP principal for grades 7–9 and one SMA principal for grades 10–12. Resolve the appropriate name from the class's explicit `gradeLevel` on the server when a report is saved; published reports retain that saved name as their signature snapshot.
- Homeroom teachers may see the resolved principal in the report editor but must not be able to change the global principal there.

### Empty, error, and permission states

- Empty states should be concise inline panels with a direct next action when one exists.
- Errors should say what failed and what the user can do next.
- Permission states should explain access, not masquerade as missing data.
- Avoid large decorative illustrations that consume the operational viewport.

### Chat and full-height tools

Chat, schedule grids, gradebooks, and other full-height tools may own their internal scrolling. They still live inside the retained shell and must not create body-level scrolling or cover navigation unexpectedly.

## 16. Responsive design rules

Design and test mobile first, then verify tablet and desktop hierarchy.

- Below 768px: one-column content by default, 44px controls, and the Navigator/Page mobile model. Stack long or ambiguous action groups, but keep compact summary metrics, familiar icon actions, search, and a primary filter inline when they remain readable at 360px. Do not create a full-width action row by habit.
- At 768px (`md`): persistent rail, tablet section overlay, multi-column layouts where content supports them.
- At 1024px (`lg`): persistent section sidebar and denser desktop layouts.
- At 1280px (`xl`): use extra columns only when they improve scanning; do not stretch text or forms across the full width without reason.

Minimum review sizes for material UI work:

- 360x800;
- 390x844;
- 768x1024;
- 1024x768;
- 1366x768;
- 1440x900.

Watch specifically for clipped top-bar actions, nested scroll traps, tables wider than their container, skeleton/final-content height changes, and stale content during navigation.

## 17. Motion and feedback

- Default transitions are short, usually about 150ms for controls and color changes.
- Motion should explain state change, not delay it.
- Active navigation feedback must be synchronous with the user's action.
- Hover may slightly change color or elevation; avoid dramatic card lifts and springy movement in operational lists.
- Skeletons use a quiet pulse. They must not cause layout movement.
- `prefers-reduced-motion` globally reduces animation and transition durations to near zero.

Never add a timer solely to stage an animation, hold a loading screen, or make a transition feel cinematic.

## 18. Accessibility baseline

Every UI change should preserve or improve:

- semantic landmarks and heading order;
- native buttons and links for their intended behavior;
- keyboard access and visible focus rings;
- accessible names for icon-only controls;
- 44px mobile targets;
- adequate light/dark contrast;
- text or icon support when color communicates state;
- `aria-current` or equivalent active-state semantics where appropriate;
- `aria-busy` and useful labels for substantial loading regions;
- reduced-motion behavior;
- stable focus when dialogs, menus, and navigation overlays open or close.

Do not disable zoom beyond what is already configured without revisiting the root viewport policy. Do not hide essential instructions in tooltips or hover-only content.

## 19. Theme and appearance behavior

The UI supports System, Light, and Dark theme preferences plus Compact and Comfortable density.

- Preferences are applied by an inline root script before React hydrates, preventing a theme flash.
- `data-theme` and `data-density` live on the root `<html>` element.
- The `.dark` class and `color-scheme` reflect the resolved theme.
- Authenticated preferences are hydrated from the user's workspace preference.

New components must use semantic tokens and be visually reviewed in both themes. Avoid classes such as unconditional `bg-white`, `text-slate-900`, or translucent white borders unless the component also supplies a correct dark counterpart and is intentionally outside normalized workspace styling.

## 20. Implementation guidance for agents

Before creating or editing UI:

1. Identify the page's workspace context and parent navigation section.
2. Reuse the current shell and centralized navigation configuration.
3. Separate immediate structure from dynamic data.
4. Select or create a dimension-matched skeleton before wiring slow data.
5. Use semantic color, spacing, and shared primitives.
6. Verify mobile Navigator-to-page behavior and optimistic active state.
7. Test compact/comfortable density and light/dark themes.
8. Run TypeScript, targeted lint, and the production build in proportion to the change.

Prefer:

- server components for data and static structure;
- small client boundaries for interaction;
- Suspense around independent dynamic regions;
- dynamic import for genuinely heavy client-only modules;
- `next/link` and strategic prefetching for internal destinations;
- URL state for shareable filters and selections;
- existing action, dialog, table, badge, and form primitives.

Avoid:

- waiting for the server pathname before showing a clicked active state;
- showing previous-page content after a mobile navigation selection;
- full-page spinners, progress bars used as route loading, or centered loading text;
- random values in rendered UI;
- artificial delays;
- a second navigation architecture;
- oversized poster cards for operational collections;
- display-sized workspace headings;
- glassmorphism, excessive gradients, large radii, or deep shadows;
- hardcoded theme-specific colors when a semantic token exists;
- loading skeletons that have materially different dimensions from final content;
- importing a heavy chart/editor/PDF module into the initial client frame when it can be deferred.

## 21. Key source locations

| Area | Source |
| --- | --- |
| Global tokens and normalization | `app/globals.css` |
| Fonts, root theme bootstrap, metadata | `app/layout.tsx` |
| Public/auth visual treatment | `app/(auth)/login/page.tsx` |
| Appearance preferences | `components/appearance-provider.tsx` |
| Authenticated shell and optimistic navigation | `components/navigation/workspace-shell.tsx` |
| Navigation hierarchy and active matching | `lib/navigation-config.ts` |
| Course identity rules | `lib/course-identity.ts` |
| Workspace composition primitives | `components/workspace/workspace-page.tsx` |
| Route and content skeletons | `components/navigation/route-skeletons.tsx` |
| General controls | `components/ui/*` |
| Dashboard loading examples | `components/admin/dashboard`, `components/teacher/dashboard`, `components/student/dashboard` |
| Historical redesign direction | `redesign.md` |

## 22. Definition of done for UI changes

A UI change is ready when:

- it fits the current workspace hierarchy and visual language;
- active and pressed feedback is immediate;
- static structure appears without waiting for unrelated data;
- loading is local, structural, and layout-stable;
- the skeleton matches the final page's header presence, summary/action geometry, responsive breakpoints, and collection representation;
- mobile navigation does not expose stale page content;
- mobile targets and layouts are usable at 360px width;
- desktop density remains efficient;
- operational headers use the minimum practical number of rows: normally one on desktop and no more than two on mobile;
- light, dark, compact, and comfortable modes remain coherent;
- keyboard focus and accessible names are intact;
- the retained top bar and page content do not duplicate titles, subtitles, identity tiles, or mobile Back controls;
- related summary metadata and immediate actions use a compact shared strip when the content remains readable;
- redundant result counts, standalone metric cards, and avoidable full-width mobile action rows have been removed;
- no artificial delay, route spinner, or new navigation duplication was introduced;
- relevant TypeScript, lint, and build checks pass;
- this file is updated if the change modifies a system-level design rule.


## Agent Memory & Dynamic Updates
- **Preference Tracking:** Whenever you learn a new explicit user preference, coding standard, design rule, or workflow constraint during our session, **proactively update this `design.md` file** to reflect it.
- **Maintain Scannability:** Keep updates concise, well-formatted, and placed under the appropriate section of this document.
