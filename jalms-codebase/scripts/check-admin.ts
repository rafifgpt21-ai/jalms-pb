
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
    const admin = await prisma.user.findUnique({
        where: { email: "admin@jalms.com" }
    })

    if (admin) {
        console.log("✅ Admin exists: admin@jalms.com")
    } else {
        throw new Error("Admin not found. Run the local admin seed with SEED_ADMIN_PASSWORD.")
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
