// Compatibility entry point for the existing Server Actions. The public
// Prisma-shaped API is preserved so UI components and action signatures do not
// change, while the implementation is now backed by PocketBase.
//
// The legacy actions were written against generated Prisma delegate types.
// Keeping this boundary untyped prevents those generated types from leaking
// into the PocketBase adapter while the domain layer is migrated incrementally.
import { dbPocketBase } from "./db-pocketbase"

export const db: any = dbPocketBase
