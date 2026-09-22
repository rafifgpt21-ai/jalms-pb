import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

async function generateTemplate() {
    const data = [
        { name: "John Doe", email: "john@example.com", password: "", roles: "Student" },
        { name: "Jane Smith", email: "jane@example.com", password: "", roles: "Teacher, Subject_Teacher" },
        { name: "Admin User", email: "admin2@example.com", password: "", roles: "Admin" }
    ];

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Users");

    ws.columns = [
        { header: "Name", key: "name", width: 20 },
        { header: "Email", key: "email", width: 25 },
        { header: "Password", key: "password", width: 15 },
        { header: "Roles", key: "roles", width: 35 }
    ];

    data.forEach(user => {
        ws.addRow(user);
    });

    const publicDir = path.join(process.cwd(), "public");

    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir);
    }

    const buffer = await wb.xlsx.writeBuffer();
    fs.writeFileSync(path.join(publicDir, "users_template.xlsx"), Buffer.from(buffer));
    console.log("Template created!");
}

generateTemplate().catch(console.error);
