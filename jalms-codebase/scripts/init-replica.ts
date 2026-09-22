import { MongoClient } from "mongodb";

async function main() {
    const uri = "mongodb://localhost:27017/admin?directConnection=true";
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB.");

        const adminDb = client.db("admin");

        try {
            const status = await adminDb.command({ replSetGetStatus: 1 });
            console.log("Replica Set already initialized:", status.set);
        } catch (e) {
            console.log("Initiating Replica Set...");
            await adminDb.command({ replSetInitiate: { _id: "rs0", members: [{ _id: 0, host: "localhost:27017" }] } });
            console.log("✅ Replica Set 'rs0' initiated!");
        }

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        await client.close();
    }
}

main();
