import {
    AcademicDomain,
    AssignmentType,
    AttendanceStatus,
    ClassColor,
    ClassEnrollmentSource,
    ContentStatus,
    CourseEnrollmentMode,
    CourseEnrollmentSource,
    CourseRoleContext,
    GradeLevel,
    PrismaClient,
    QuizGradingType,
    Role,
    SemesterType,
    ThemePreference,
    UiDensity,
} from "@prisma/client"
import bcrypt from "bcryptjs"
import { DEMO_MATERIAL_LINKS, getDemoMaterialLink } from "../lib/demo-material-links"

const prisma = new PrismaClient()

/**
 * Demo ini sengaja berpusat pada dua orang:
 * - Ibu Maya, guru Biologi sekaligus wali kelas XI IPA 1
 * - Raka, salah satu siswa di kelasnya
 *
 * Guru dan teman sekelas pendukung hanya ada agar kedua akun terasa seperti
 * akun sekolah sungguhan. Semua tanggal relatif terhadap hari seed dijalankan,
 * sehingga semester selalu terlihat sekitar 75% selesai.
 */
const DEMO_PASSWORD = process.env.DEMO_PASSWORD
if (!DEMO_PASSWORD) throw new Error("DEMO_PASSWORD wajib diisi di environment lokal.")
const now = new Date()
const currentDay = now.getDay()
const schoolDay = currentDay === 0 ? 1 : currentDay

function atDay(offset: number, hour = 15, minute = 0) {
    const value = new Date(now)
    value.setDate(value.getDate() + offset)
    value.setHours(hour, minute, 0, 0)
    return value
}

function dayInPast(dayOfWeek: number, weeksAgo: number, hour = 9) {
    const value = new Date(now)
    const daysSince = (value.getDay() - dayOfWeek + 7) % 7
    value.setDate(value.getDate() - daysSince - weeksAgo * 7)
    value.setHours(hour, 0, 0, 0)
    return value
}

function slugify(value: string) {
    return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "")
}

function academicYearName(date: Date) {
    return `${date.getFullYear()}/${date.getFullYear() + 1}`
}

const subjects = [
    { code: "BIO", name: "Biologi", domain: AcademicDomain.SCIENCE_TECHNOLOGY, teacher: "Maya Kusumawardani, S.Pd.", teacherEmail: "guru@demo.jalms.id", topics: ["Sel dan organel", "Transport membran", "Jaringan tumbuhan", "Sistem gerak", "Sistem peredaran darah", "Sistem pencernaan", "Sistem pernapasan"] },
    { code: "MAT", name: "Matematika Wajib", domain: AcademicDomain.SCIENCE_TECHNOLOGY, teacher: "Andi Prasetyo, S.Pd.", teacherEmail: "andi.prasetyo@jalms.id", topics: ["Komposisi fungsi", "Fungsi invers", "Lingkaran", "Statistika", "Peluang bersyarat", "Regresi linear", "Pemodelan data"] },
    { code: "BIN", name: "Bahasa Indonesia", domain: AcademicDomain.LANGUAGE_COMMUNICATION, teacher: "Ratih Wulandari, M.Pd.", teacherEmail: "ratih.wulandari@jalms.id", topics: ["Teks argumentasi", "Struktur berita", "Cerpen", "Resensi", "Proposal", "Karya ilmiah", "Presentasi akademik"] },
    { code: "BIG", name: "Bahasa Inggris", domain: AcademicDomain.LANGUAGE_COMMUNICATION, teacher: "Kevin Wijaya, S.Pd.", teacherEmail: "kevin.wijaya@jalms.id", topics: ["Giving opinions", "Analytical exposition", "Narrative text", "Passive voice", "Formal email", "News item", "Presentation skills"] },
    { code: "SEJ", name: "Sejarah Indonesia", domain: AcademicDomain.SOCIAL_HUMANITIES, teacher: "Dimas Nugroho, S.Hum.", teacherEmail: "dimas.nugroho@jalms.id", topics: ["Kolonialisme", "Pergerakan nasional", "Pendudukan Jepang", "Proklamasi", "Revolusi fisik", "Demokrasi liberal", "Orde Baru"] },
    { code: "PPK", name: "Pendidikan Pancasila", domain: AcademicDomain.SPIRITUALITY_ETHICS, teacher: "Nurul Hidayati, S.Pd.", teacherEmail: "nurul.hidayati@jalms.id", topics: ["Nilai Pancasila", "Konstitusi", "Hak dan kewajiban", "Demokrasi", "Bhinneka Tunggal Ika", "Wawasan Nusantara", "Etika digital"] },
    { code: "PJK", name: "PJOK", domain: AcademicDomain.PHYSICAL_EDUCATION, teacher: "Arief Setiawan, S.Or.", teacherEmail: "arief.setiawan@jalms.id", topics: ["Kebugaran jasmani", "Bola voli", "Atletik", "Bola basket", "Pola hidup sehat", "Senam lantai", "Pertolongan pertama"] },
    { code: "SBD", name: "Seni Budaya", domain: AcademicDomain.ARTS_CREATIVITY, teacher: "Larasati Putri, S.Sn.", teacherEmail: "larasati.putri@jalms.id", topics: ["Unsur rupa", "Kritik seni", "Ilustrasi", "Seni grafis", "Pameran", "Portofolio", "Kurasi karya"] },
] as const

const focusClassStudents = [
    "Raka Aditya Pratama", "Alya Putri Ramadhani", "Bagas Mahendra", "Citra Lestari",
    "Daffa Rizky Maulana", "Farah Nabila", "Galang Arya Saputra", "Hana Safitri",
    "Ilham Fadillah", "Jasmine Maharani", "Keanu Abimanyu", "Laila Nur Azizah",
    "Muhammad Rafli", "Nadya Khairunnisa", "Oscar Pranata", "Putri Azzahra",
    "Qinan Alfarezi", "Rania Oktaviani", "Satria Bintang", "Talitha Zahra",
    "Umar Faruq", "Vania Cahyani", "Wildan Akbar", "Yasmin Aurelia",
] as const

const secondClassStudents = [
    "Adinda Permata", "Bima Adinata", "Cheryl Anindya", "Fikri Ramadhan",
    "Ghea Maharani", "Haikal Firdaus", "Intan Puspita", "Joshua Hartono",
    "Kezia Natalia", "Lukman Hakim", "Mutiara Salsabila", "Naufal Alamsyah",
] as const

const taskStages = [
    { label: "Cek pemahaman awal", offset: -91, maxPoints: 100, type: AssignmentType.SUBMISSION },
    { label: "Latihan konsep", offset: -72, maxPoints: 100, type: AssignmentType.SUBMISSION },
    { label: "Kuis formatif 1", offset: -55, maxPoints: 100, type: AssignmentType.QUIZ },
    { label: "Analisis studi kasus", offset: -39, maxPoints: 100, type: AssignmentType.SUBMISSION },
    { label: "Penilaian Tengah Semester", offset: -24, maxPoints: 100, type: AssignmentType.SUBMISSION },
    { label: "Proyek kolaboratif — tahap 1", offset: -9, maxPoints: 100, type: AssignmentType.SUBMISSION },
    { label: "Refleksi pembelajaran pekan ini", offset: 3, maxPoints: 20, type: AssignmentType.SUBMISSION },
] as const

const scheduleSlots = [
    [{ day: schoolDay, period: 2 }, { day: (schoolDay + 3) % 7 || 1, period: 1 }],
    [{ day: schoolDay, period: 4 }, { day: (schoolDay + 2) % 7 || 2, period: 3 }],
    [{ day: (schoolDay + 1) % 7 || 1, period: 1 }],
    [{ day: (schoolDay + 1) % 7 || 1, period: 3 }],
    [{ day: (schoolDay + 2) % 7 || 2, period: 1 }],
    [{ day: (schoolDay + 2) % 7 || 2, period: 4 }],
    [{ day: (schoolDay + 3) % 7 || 3, period: 3 }],
    [{ day: (schoolDay + 4) % 7 || 4, period: 2 }],
] as const

async function clearDatabase() {
    console.log("Cleaning existing application data...")
    await prisma.courseChatMessage.deleteMany()
    await prisma.courseAnnouncement.deleteMany()
    await prisma.courseNavigationState.deleteMany()
    await prisma.userWorkspacePreference.deleteMany()
    await prisma.academicRolloverItem.deleteMany()
    await prisma.academicRollover.deleteMany()
    await prisma.managementAuditLog.deleteMany()
    await prisma.reportCard.deleteMany()
    await prisma.attendance.deleteMany()
    await prisma.submission.deleteMany()
    await prisma.materialAssignment.deleteMany()
    await prisma.schedule.deleteMany()
    await prisma.courseEnrollment.deleteMany()
    await prisma.enrollment.deleteMany()
    await prisma.assignment.deleteMany()
    await prisma.quizChoice.deleteMany()
    await prisma.quizQuestion.deleteMany()
    await prisma.quiz.deleteMany()
    await prisma.quizFolder.deleteMany()
    await prisma.material.deleteMany()
    await prisma.materialFolder.deleteMany()
    await prisma.course.deleteMany()
    await prisma.subject.deleteMany()
    await prisma.message.deleteMany()
    await prisma.conversation.deleteMany()
    await prisma.class.deleteMany()
    await prisma.term.deleteMany()
    await prisma.academicYear.deleteMany()
    await prisma.systemConfig.deleteMany()
    await prisma.user.deleteMany()
}

function focalScore(subjectIndex: number, taskIndex: number) {
    const scores = [84, 88, 82, 90, 86, 91]
    return Math.max(76, Math.min(96, scores[taskIndex] + ((subjectIndex % 3) - 1) * 2))
}

function supportingScore(studentIndex: number, subjectIndex: number, taskIndex: number) {
    return 70 + ((studentIndex * 7 + subjectIndex * 5 + taskIndex * 3) % 27)
}

function seededWrittenResponse(topic: string, studentIndex: number, taskIndex: number) {
    const observations = [
        "Saya memahami konsep dasarnya dan sudah mencatat hubungan antarbagian yang dibahas di kelas.",
        "Dari latihan ini saya belajar memilih langkah penyelesaian yang lebih teratur dan memeriksa kembali hasilnya.",
        "Contoh yang diberikan di kelas membantu saya membedakan konsep yang sebelumnya terlihat mirip.",
        "Menurut saya, inti studi kasus ini adalah menggunakan bukti sebelum menarik kesimpulan.",
        "Saya mengerjakan soal dari bagian yang paling saya pahami, lalu kembali ke bagian yang perlu dianalisis lebih teliti.",
        "Dalam kelompok, saya membantu merangkum hasil diskusi dan memastikan pembagian tugas sudah tercatat.",
    ]
    const nextSteps = [
        "Saya masih perlu mengulang istilah kunci sebelum asesmen berikutnya.",
        "Bagian yang akan saya pelajari lagi adalah penerapan konsep pada contoh yang berbeda.",
        "Saya ingin memperbaiki cara menjelaskan alasan agar jawaban lebih runtut.",
    ]
    return `<p><strong>${topic}</strong> — ${observations[taskIndex % observations.length]}</p><p>${nextSteps[studentIndex % nextSteps.length]}</p>`
}

type SeedQuizQuestion = { id: string; points: number; choices: Array<{ id: string; isCorrect: boolean }> }

function seededQuizAttempt(questions: SeedQuizQuestion[], studentIndex: number) {
    const answers: Record<string, string | string[]> = {}
    let earnedPoints = 0
    let totalPoints = 0
    for (const [questionIndex, question] of questions.entries()) {
        const correctIds = question.choices.filter((choice) => choice.isCorrect).map((choice) => choice.id)
        const wrongId = question.choices.find((choice) => !choice.isCorrect)?.id
        const shouldMiss = studentIndex === 0 ? questionIndex === 4 : (studentIndex + questionIndex) % 5 === 0
        totalPoints += question.points
        if (!shouldMiss && correctIds.length > 0) {
            answers[question.id] = correctIds.length === 1 ? correctIds[0] : correctIds
            earnedPoints += question.points
        } else if (wrongId) {
            answers[question.id] = correctIds.length > 1 ? [wrongId] : wrongId
        }
    }
    return { answers, grade: totalPoints > 0 ? Math.round(earnedPoints / totalPoints * 100) : 0 }
}

function attendanceStatus(studentIndex: number, subjectIndex: number, sessionIndex: number) {
    if ((studentIndex * 3 + subjectIndex + sessionIndex) % 43 === 0) return { status: AttendanceStatus.ABSENT, excuseReason: null }
    if ((studentIndex + subjectIndex * 2 + sessionIndex) % 37 === 0) {
        return { status: AttendanceStatus.EXCUSED, excuseReason: sessionIndex % 2 === 0 ? "Sakit, surat orang tua sudah diterima" : "Izin kegiatan keluarga" }
    }
    return { status: AttendanceStatus.PRESENT, excuseReason: null }
}

async function createQuizLibrary(teacherId: string) {
    const folder = await prisma.quizFolder.create({ data: { name: "Biologi XI — Semester Berjalan", color: "emerald", teacherId } })

    type QuestionSeed = {
        text: string
        explanation: string
        points: number
        gradingType?: QuizGradingType
        choices: ReadonlyArray<readonly [string, boolean]>
    }

    async function addQuestions(quizId: string, questions: QuestionSeed[]) {
        for (const [questionIndex, question] of questions.entries()) {
            const created = await prisma.quizQuestion.create({ data: {
                text: question.text, explanation: question.explanation, order: questionIndex, points: question.points,
                gradingType: question.gradingType ?? QuizGradingType.ALL_OR_NOTHING, quizId,
            } })
            await prisma.quizChoice.createMany({
                data: question.choices.map(([text, isCorrect], order) => ({ text, isCorrect, order, questionId: created.id })),
            })
        }
    }

    const cellQuiz = await prisma.quiz.create({
        data: { title: "Kuis Formatif 1 — Struktur dan Fungsi Sel", description: "Kuis individu, 15 menit. Pilih jawaban paling tepat berdasarkan materi sel dan transport membran.", teacherId, folderId: folder.id, randomizeChoices: true },
    })
    await addQuestions(cellQuiz.id, [
        { text: "Organel yang berperan utama menghasilkan ATP adalah …", explanation: "Mitokondria menjalankan respirasi seluler dan menghasilkan ATP.", points: 15, choices: [["Mitokondria", true], ["Ribosom", false], ["Lisosom", false], ["Badan Golgi", false]] },
        { text: "Perpindahan air melalui membran semipermeabel disebut …", explanation: "Osmosis adalah difusi air mengikuti gradien potensial air.", points: 15, choices: [["Osmosis", true], ["Endositosis", false], ["Transpor aktif", false], ["Eksositosis", false]] },
        { text: "Struktur yang dimiliki sel tumbuhan tetapi tidak dimiliki sel hewan adalah …", explanation: "Dinding sel memberi bentuk dan perlindungan tambahan pada sel tumbuhan.", points: 15, choices: [["Dinding sel", true], ["Membran sel", false], ["Sitoplasma", false], ["Mitokondria", false]] },
        { text: "Sel darah merah ditempatkan dalam larutan hipotonik. Perubahan yang paling mungkin terjadi adalah …", explanation: "Air masuk ke dalam sel melalui osmosis sehingga sel membengkak dan dapat mengalami lisis.", points: 15, choices: [["Sel membengkak karena air masuk", true], ["Sel mengerut karena air keluar", false], ["Ukuran sel tidak berubah", false], ["Sel aktif memompa seluruh air keluar", false]] },
        { text: "Pilih dua komponen yang terdapat pada membran sel.", explanation: "Membran sel terutama tersusun atas bilayer fosfolipid dan berbagai protein membran.", points: 20, gradingType: QuizGradingType.RIGHT_MINUS_WRONG, choices: [["Fosfolipid", true], ["Protein membran", true], ["Selulosa", false], ["Pati", false]] },
        { text: "Fungsi utama ribosom adalah …", explanation: "Ribosom menjadi tempat perakitan asam amino menjadi protein.", points: 20, choices: [["Sintesis protein", true], ["Menghasilkan energi", false], ["Mencerna zat asing", false], ["Menyimpan materi genetik", false]] },
    ])
    const cellQuizQuestions = await prisma.quizQuestion.findMany({
        where: { quizId: cellQuiz.id }, orderBy: { order: "asc" },
        select: { id: true, points: true, choices: { select: { id: true, isCorrect: true }, orderBy: { order: "asc" } } },
    })

    const demoQuiz = await prisma.quiz.create({
        data: {
            title: "Kuis Formatif 2 — Sistem Pernapasan Manusia",
            description: "Kuis individu, estimasi 12 menit. Terdiri dari 8 soal pilihan tunggal dan pilihan jamak. Nilai serta pembahasan ditampilkan setelah dikirim.",
            teacherId, folderId: folder.id, randomizeChoices: true,
        },
    })
    await addQuestions(demoQuiz.id, [
        { text: "Fungsi utama rongga hidung dalam proses pernapasan adalah …", explanation: "Rongga hidung menyaring partikel serta membantu menghangatkan dan melembapkan udara sebelum masuk ke saluran berikutnya.", points: 10, choices: [["Menyaring, menghangatkan, dan melembapkan udara", true], ["Melakukan pertukaran oksigen dengan karbon dioksida", false], ["Mengatur gerak diafragma", false], ["Mengikat oksigen ke hemoglobin", false]] },
        { text: "Pertukaran gas antara udara dan darah terutama terjadi pada bagian …", explanation: "Alveolus berdinding sangat tipis dan dikelilingi kapiler sehingga sesuai untuk difusi gas.", points: 10, choices: [["Alveolus", true], ["Trakea", false], ["Laring", false], ["Bronkus", false]] },
        { text: "Saat inspirasi normal, diafragma akan …", explanation: "Diafragma berkontraksi dan mendatar sehingga volume rongga dada meningkat dan udara masuk.", points: 10, choices: [["Berkontraksi dan bergerak ke bawah", true], ["Relaksasi dan melengkung ke atas", false], ["Berkontraksi dan memperkecil rongga dada", false], ["Tidak mengalami perubahan", false]] },
        { text: "Urutan jalannya udara yang tepat setelah melewati rongga hidung adalah …", explanation: "Udara bergerak melalui faring, laring, trakea, bronkus, bronkiolus, kemudian mencapai alveolus.", points: 10, choices: [["Faring → laring → trakea → bronkus → bronkiolus → alveolus", true], ["Laring → faring → bronkus → trakea → alveolus", false], ["Faring → trakea → laring → bronkiolus → bronkus", false], ["Trakea → faring → laring → bronkus → alveolus", false]] },
        { text: "Setelah berlari, frekuensi napas meningkat terutama karena …", explanation: "Aktivitas otot meningkatkan kebutuhan oksigen dan produksi karbon dioksida sehingga pusat pernapasan menaikkan ventilasi.", points: 15, choices: [["Kebutuhan oksigen dan kadar karbon dioksida meningkat", true], ["Suhu tubuh turun secara mendadak", false], ["Jumlah alveolus bertambah", false], ["Tekanan darah selalu menurun", false]] },
        { text: "Pilih semua mekanisme yang membantu melindungi saluran pernapasan dari partikel asing.", explanation: "Mukus menangkap partikel, silia mendorongnya keluar, dan refleks batuk membantu membersihkan saluran pernapasan.", points: 15, gradingType: QuizGradingType.RIGHT_MINUS_WRONG, choices: [["Mukus menangkap debu", true], ["Silia menggerakkan kotoran ke arah faring", true], ["Refleks batuk membantu mengeluarkan iritan", true], ["Alveolus memproduksi sel darah merah", false]] },
        { text: "Kerusakan dinding alveolus akibat kebiasaan merokok dapat menyebabkan …", explanation: "Pada emfisema, elastisitas dan luas permukaan alveolus berkurang sehingga pertukaran gas menjadi kurang efektif.", points: 15, choices: [["Emfisema dan penurunan efisiensi pertukaran gas", true], ["Peningkatan permanen luas permukaan alveolus", false], ["Produksi oksigen di paru-paru", false], ["Penebalan otot diafragma tanpa gangguan lain", false]] },
        { text: "Seorang siswa memiliki volume tidal 500 mL dan bernapas 16 kali per menit. Volume udara yang keluar-masuk per menit adalah …", explanation: "Ventilasi per menit = volume tidal × frekuensi napas = 500 mL × 16 = 8.000 mL atau 8 liter.", points: 15, choices: [["8 liter per menit", true], ["0,8 liter per menit", false], ["16 liter per menit", false], ["80 liter per menit", false]] },
    ])

    const examQuiz = await prisma.quiz.create({
        data: { title: "Bank Soal PTS Biologi XI", description: "Draf bank soal untuk materi sel, jaringan, dan sistem gerak.", teacherId, folderId: folder.id, randomizeChoices: true },
    })
    await addQuestions(examQuiz.id, [
        { text: "Pernyataan yang paling tepat mengenai sifat selektif permeabel membran sel adalah …", explanation: "Bilayer fosfolipid dan protein transpor membuat membran mampu mengatur jenis serta jumlah zat yang melintas.", points: 25, choices: [["Membran mengatur zat yang melintas melalui bilayer dan protein transpor", true], ["Semua zat melintas dengan kecepatan yang sama", false], ["Hanya air yang dapat melewati membran", false], ["Membran tidak dipengaruhi ukuran maupun muatan zat", false]] },
        { text: "Jaringan yang berfungsi mengangkut hasil fotosintesis adalah …", explanation: "Floem mengangkut hasil fotosintesis dari organ sumber menuju organ yang membutuhkan atau menyimpan.", points: 25, choices: [["Floem", true], ["Xilem", false], ["Epidermis", false], ["Meristem apikal", false]] },
        { text: "Pasangan yang tepat antara komponen darah dan fungsinya adalah …", explanation: "Eritrosit mengandung hemoglobin yang berperan mengangkut sebagian besar oksigen.", points: 25, choices: [["Eritrosit — mengangkut oksigen", true], ["Trombosit — menghasilkan antibodi", false], ["Plasma — melakukan fagositosis", false], ["Leukosit — membekukan darah", false]] },
        { text: "Sendi yang memungkinkan gerakan satu arah seperti pada siku adalah …", explanation: "Sendi engsel memungkinkan gerak terutama pada satu bidang, seperti siku dan lutut.", points: 25, choices: [["Sendi engsel", true], ["Sendi peluru", false], ["Sendi putar", false], ["Sendi pelana", false]] },
    ])
    return { cellQuiz, cellQuizQuestions, demoQuiz }
}

async function createBiologyMaterials(teacherId: string, courseIds: string[]) {
    const folder = await prisma.materialFolder.create({ data: { name: "Biologi XI — Materi Semester", color: "emerald", teacherId } })
    const materials = [
        { title: "Peta Konsep: Struktur dan Fungsi Sel", description: "Ringkasan visual organel, fungsi, dan perbedaan sel hewan dengan sel tumbuhan. Gunakan sebagai panduan belajar sebelum kuis.", linkUrl: getDemoMaterialLink("Peta Konsep: Struktur dan Fungsi Sel"), uploadedAt: atDay(-88, 19) },
        { title: "Panduan Praktikum Pengamatan Sel", description: "Langkah kerja, tabel pengamatan, aturan keselamatan laboratorium, dan rubrik laporan praktikum.", linkUrl: getDemoMaterialLink("Panduan Praktikum Pengamatan Sel"), uploadedAt: atDay(-63, 20) },
        { title: "Video Pengayaan: Transport Membran", description: "Materi pengayaan tentang difusi, osmosis, transpor aktif, endositosis, dan eksositosis.", linkUrl: getDemoMaterialLink("Video Pengayaan: Transport Membran"), uploadedAt: atDay(-46, 16) },
        { title: "Kisi-kisi Penilaian Tengah Semester", description: "Cakupan kompetensi, bentuk soal, dan contoh indikator. Tidak memuat kunci jawaban.", linkUrl: getDemoMaterialLink("Kisi-kisi Penilaian Tengah Semester"), uploadedAt: atDay(-31, 14) },
        { title: "Template Laporan Proyek Sistem Organ", description: "Template kerja kelompok untuk proyek akhir. Setiap kelompok mengisi pembagian peran dan logbook mingguan.", linkUrl: getDemoMaterialLink("Template Laporan Proyek Sistem Organ"), uploadedAt: atDay(-6, 18) },
    ]
    for (const item of materials) {
        const material = await prisma.material.create({ data: { ...item, teacherId, folderId: folder.id, courseId: courseIds[0], materialType: "LINK" } })
        await prisma.materialAssignment.createMany({ data: courseIds.map((courseId) => ({ materialId: material.id, courseId, assignedAt: item.uploadedAt })) })
    }
}

async function main() {
    console.log("Starting focused, late-semester JALMS demo seed...")
    await clearDatabase()
    const password = await bcrypt.hash(DEMO_PASSWORD, 10)
    const termStart = atDay(-105, 0)
    const termEnd = atDay(35, 23, 59)
    const previousTermStart = atDay(-285, 0)
    const previousTermEnd = atDay(-140, 23, 59)

    const previousAcademicYear = await prisma.academicYear.create({
        data: { name: `${termStart.getFullYear() - 1}/${termStart.getFullYear()}`, startDate: previousTermStart, endDate: atDay(-120, 23, 59), isActive: false },
    })
    const academicYear = await prisma.academicYear.create({ data: { name: academicYearName(termStart), startDate: termStart, endDate: termEnd, isActive: true } })
    const previousTerm = await prisma.term.create({ data: { type: SemesterType.EVEN, startDate: previousTermStart, endDate: previousTermEnd, academicYearId: previousAcademicYear.id, isActive: false } })
    const activeTerm = await prisma.term.create({ data: { type: SemesterType.ODD, startDate: termStart, endDate: termEnd, academicYearId: academicYear.id, isActive: true } })

    const admin = await prisma.user.create({ data: { name: "Admin Demo JALMS", nickname: "Admin", email: "admin@demo.jalms.id", password, roles: [Role.ADMIN], isActive: true, lastLoginAt: atDay(-1, 8), conversationIds: [], enrolledCourseIds: [] } })
    const focusTeacher = await prisma.user.create({ data: {
        name: subjects[0].teacher, nickname: "Bu Maya", email: subjects[0].teacherEmail, password,
        roles: [Role.SUBJECT_TEACHER, Role.HOMEROOM_TEACHER], nip: "198905172014022003", isActive: true,
        lastLoginAt: atDay(0, 6, 45), avatarConfig: { style: "notionists", seed: "maya-kusumawardani" }, conversationIds: [], enrolledCourseIds: [],
    } })
    const teachers = [focusTeacher]
    for (const [index, subject] of subjects.slice(1).entries()) {
        teachers.push(await prisma.user.create({ data: {
            name: subject.teacher, email: subject.teacherEmail, password, roles: [Role.SUBJECT_TEACHER],
            nip: `198${index + 2}0817201501${String(index + 12).padStart(3, "0")}`, isActive: true,
            lastLoginAt: atDay(-(index % 4), 7, 10), avatarConfig: { style: "notionists", seed: slugify(subject.teacher) }, conversationIds: [], enrolledCourseIds: [],
        } }))
    }

    const dbSubjects = []
    for (const subject of subjects) {
        dbSubjects.push(await prisma.subject.create({ data: {
            name: subject.name, code: subject.code, reportName: subject.name,
            description: `${subject.name} kelas XI sesuai alur tujuan pembelajaran semester berjalan.`, academicDomains: [subject.domain],
        } }))
    }
    await prisma.systemConfig.createMany({ data: [
        { id: "grading_scale", value: [{ grade: "A", min: 90, max: 100 }, { grade: "B", min: 80, max: 89 }, { grade: "C", min: 70, max: 79 }, { grade: "D", min: 60, max: 69 }, { grade: "E", min: 0, max: 59 }] },
        { id: "school_principals", value: { SMP: "", SMA: "Drs. H. Bambang Setiawan, M.Pd." } },
        { id: "principal_name", value: { name: "Drs. H. Bambang Setiawan, M.Pd." } },
        { id: "school_info", value: { name: "SMA Nusantara Mandiri", npsn: "20604571", address: "Jl. Pendidikan No. 18, Tangerang Selatan, Banten", phone: "(021) 745-2180", email: "info@smanusantaramandiri.sch.id" } },
    ] })

    const focusClass = await prisma.class.create({ data: { name: "XI IPA 1", gradeLevel: GradeLevel.GRADE_11, color: ClassColor.EMERALD, termId: activeTerm.id, homeroomTeacherId: focusTeacher.id } })
    const previousClass = await prisma.class.create({ data: { name: "X IPA 1", gradeLevel: GradeLevel.GRADE_10, color: ClassColor.BLUE, termId: previousTerm.id, homeroomTeacherId: focusTeacher.id } })
    const secondClass = await prisma.class.create({ data: { name: "XI IPA 2", gradeLevel: GradeLevel.GRADE_11, color: ClassColor.TEAL, termId: activeTerm.id } })

    const focusStudents = []
    for (const [index, name] of focusClassStudents.entries()) {
        const isFocus = index === 0
        focusStudents.push(await prisma.user.create({ data: {
            name, nickname: isFocus ? "Raka" : name.split(" ")[0], email: isFocus ? "siswa@demo.jalms.id" : `${slugify(name)}@siswa.jalms.id`, password,
            roles: [Role.STUDENT], nis: `2411${String(index + 1).padStart(4, "0")}`, nisn: `00871${String(index + 1).padStart(5, "0")}`,
            officialId: `2411${String(index + 1).padStart(4, "0")}`, isActive: true, lastLoginAt: isFocus ? atDay(0, 6, 52) : atDay(-(index % 8), 18),
            avatarConfig: { style: "adventurer", seed: slugify(name) }, conversationIds: [], enrolledCourseIds: [],
        } }))
    }
    const focusStudent = focusStudents[0]
    const secondStudents = []
    for (const [index, name] of secondClassStudents.entries()) {
        secondStudents.push(await prisma.user.create({ data: {
            name, nickname: name.split(" ")[0], email: `${slugify(name)}.ipa2@siswa.jalms.id`, password,
            roles: [Role.STUDENT], nis: `2412${String(index + 1).padStart(4, "0")}`, nisn: `00872${String(index + 1).padStart(5, "0")}`,
            isActive: true, lastLoginAt: atDay(-(index % 9), 17), avatarConfig: { style: "adventurer", seed: slugify(name) }, conversationIds: [], enrolledCourseIds: [],
        } }))
    }
    await prisma.enrollment.createMany({ data: [
        ...focusStudents.map((student) => ({ studentId: student.id, classId: focusClass.id, source: ClassEnrollmentSource.IMPORT, createdById: admin.id })),
        ...secondStudents.map((student) => ({ studentId: student.id, classId: secondClass.id, source: ClassEnrollmentSource.IMPORT, createdById: admin.id })),
        { studentId: focusStudent.id, classId: previousClass.id, source: ClassEnrollmentSource.ROLLOVER, createdById: admin.id },
    ] })

    const { cellQuiz, cellQuizQuestions, demoQuiz } = await createQuizLibrary(focusTeacher.id)
    const activeCourseIds: string[] = []
    const focalGrades: Array<{ subject: string; score: number; grade: string; competency: string }> = []

    for (const [subjectIndex, subject] of subjects.entries()) {
        const teacher = teachers[subjectIndex]
        const course = await prisma.course.create({ data: {
            name: `${subject.name} · XI IPA 1`, reportName: subject.name, subjectId: dbSubjects[subjectIndex].id, classId: focusClass.id,
            termId: activeTerm.id, teacherId: teacher.id, studentIds: focusStudents.map((student) => student.id),
            attendancePoolScore: subjectIndex === 0 ? 10 : 5, enrollmentMode: CourseEnrollmentMode.CLASS_SYNC, lastEnrollmentSyncAt: atDay(-2, 5),
            competencyRules: [
                { grade: "A", min: 90, max: 100, description: `Sangat menguasai kompetensi ${subject.name} serta mampu menerapkannya secara mandiri.` },
                { grade: "B", min: 80, max: 89, description: `Menguasai kompetensi utama ${subject.name} dengan baik dan konsisten.` },
                { grade: "C", min: 70, max: 79, description: `Menguasai kompetensi dasar ${subject.name}, tetapi masih perlu meningkatkan ketelitian.` },
                { grade: "D", min: 60, max: 69, description: `Memerlukan bimbingan pada beberapa kompetensi utama ${subject.name}.` },
                { grade: "E", min: 0, max: 59, description: `Memerlukan pendampingan intensif dan program remedial ${subject.name}.` },
            ],
        } })
        activeCourseIds.push(course.id)
        await prisma.courseEnrollment.createMany({ data: focusStudents.map((student) => ({ courseId: course.id, studentId: student.id, source: CourseEnrollmentSource.CLASS_SYNC, sourceClassId: focusClass.id, createdById: admin.id })) })
        await prisma.schedule.createMany({ data: scheduleSlots[subjectIndex].map((slot) => ({ dayOfWeek: slot.day, period: slot.period, courseId: course.id })) })

        let focusEarned = 0
        for (const [taskIndex, stage] of taskStages.entries()) {
            const latePenalty = taskIndex === 3 ? 10 : 0
            const assignmentType = subjectIndex === 0 && taskIndex === 2 ? AssignmentType.QUIZ : AssignmentType.SUBMISSION
            const assignment = await prisma.assignment.create({ data: {
                title: `${stage.label}: ${subject.topics[taskIndex]}`,
                description: taskIndex === taskStages.length - 1
                    ? `Tuliskan pemahaman utama, satu bagian yang masih membingungkan, dan rencana belajar berikutnya untuk topik ${subject.topics[taskIndex]}.`
                    : `Selesaikan berdasarkan pembelajaran ${subject.topics[taskIndex]}. Baca rubrik, gunakan sumber yang dicantumkan, dan periksa kembali sebelum mengirim.`,
                dueDate: atDay(stage.offset, taskIndex % 2 === 0 ? 20 : 15, taskIndex % 2 === 0 ? 0 : 30), type: assignmentType,
                maxPoints: stage.maxPoints, latePenalty, academicDomains: [subject.domain], courseId: course.id,
                showGradeAfterSubmission: taskIndex !== 4, status: ContentStatus.PUBLISHED,
                quizId: subjectIndex === 0 && taskIndex === 2 ? cellQuiz.id : undefined,
            } })
            if (stage.offset < 0) {
                const submissions = []
                for (const [studentIndex, student] of focusStudents.entries()) {
                    const focalMissing = studentIndex === 0 && subjectIndex === 3 && taskIndex === 5
                    const peerMissing = studentIndex > 0 && taskIndex >= 4 && (studentIndex + subjectIndex + taskIndex) % 17 === 0
                    if (focalMissing || peerMissing) continue
                    const isLate = (studentIndex === 0 && subjectIndex === 1 && taskIndex === 3) || ((studentIndex + subjectIndex + taskIndex) % 19 === 0)
                    const awaitingGrade = taskIndex === 5 && (studentIndex + subjectIndex) % 11 === 0 && studentIndex !== 0
                    const quizAttempt = assignmentType === AssignmentType.QUIZ ? seededQuizAttempt(cellQuizQuestions, studentIndex) : null
                    const grade = quizAttempt?.grade ?? (studentIndex === 0 ? focalScore(subjectIndex, taskIndex) : supportingScore(studentIndex, subjectIndex, taskIndex))
                    submissions.push({
                        assignmentId: assignment.id, studentId: student.id, grade: awaitingGrade ? null : grade,
                        feedback: awaitingGrade ? null : grade >= 90 ? "Analisis sangat kuat dan bukti pendukung relevan. Pertahankan kedalaman penalarannya." : grade >= 80 ? "Pemahaman sudah baik. Perjelas alasan pada bagian kesimpulan dan cek kembali istilah kunci." : "Konsep dasar sudah terlihat. Tinjau kembali catatan kelas dan lengkapi pembahasan yang masih singkat.",
                        submittedAt: atDay(stage.offset + (isLate ? 1 : -1), isLate ? 8 : 19, 20),
                        submissionUrl: assignmentType === AssignmentType.SUBMISSION ? seededWrittenResponse(subject.topics[taskIndex], studentIndex, taskIndex) : JSON.stringify(quizAttempt?.answers ?? {}),
                        link: studentIndex === 0 && taskIndex === 5 ? "https://docs.google.com/document/d/demo-portofolio-raka" : null,
                    })
                    if (studentIndex === 0) {
                        focusEarned += isLate && latePenalty > 0 ? Math.round(grade * (1 - latePenalty / 100)) : grade
                    }
                }
                if (submissions.length > 0) await prisma.submission.createMany({ data: submissions })
            }
        }

        const primarySlot = scheduleSlots[subjectIndex][0]
        const attendanceRows = []
        for (let sessionIndex = 13; sessionIndex >= 0; sessionIndex--) {
            const sessionDate = dayInPast(primarySlot.day, sessionIndex, primarySlot.period < 3 ? 8 : 11)
            for (const [studentIndex, student] of focusStudents.entries()) {
                let record = attendanceStatus(studentIndex, subjectIndex, sessionIndex)
                if (studentIndex === 0) {
                    if (subjectIndex === 0 && sessionIndex === 7) record = { status: AttendanceStatus.EXCUSED, excuseReason: "Sakit demam, surat orang tua sudah diterima" }
                    else if (subjectIndex === 1 && sessionIndex === 4) record = { status: AttendanceStatus.ABSENT, excuseReason: null }
                    else record = { status: AttendanceStatus.PRESENT, excuseReason: null }
                }
                attendanceRows.push({ date: sessionDate, status: record.status, excuseReason: record.excuseReason, topic: sessionIndex === 0 ? `${subject.topics[6]} — pembahasan dan latihan terarah` : subject.topics[(13 - sessionIndex) % subject.topics.length], period: primarySlot.period, courseId: course.id, studentId: student.id })
            }
        }
        await prisma.attendance.createMany({ data: attendanceRows })

        const allPublishedPoints = taskStages.reduce((sum, stage) => sum + stage.maxPoints, 0)
        const currentScore = Math.round((focusEarned + (subjectIndex === 0 ? 9 : 5)) / (allPublishedPoints + (subjectIndex === 0 ? 10 : 5)) * 100)
        focalGrades.push({ subject: subject.name, score: currentScore, grade: currentScore >= 90 ? "A" : currentScore >= 80 ? "B" : "C", competency: currentScore >= 88 ? `Sangat baik dalam memahami dan menerapkan konsep utama ${subject.name}.` : `Menguasai kompetensi utama ${subject.name} dengan baik; terus tingkatkan ketelitian dan konsistensi.` })

        await prisma.courseAnnouncement.createMany({ data: [
            { courseId: course.id, authorId: teacher.id, title: `Rencana belajar ${subject.topics[6]}`, body: `Pekan ini kita menuntaskan ${subject.topics[6]}. Baca materi sebelum kelas, catat dua pertanyaan, dan siapkan hasil pekerjaan kelompok untuk sesi umpan balik.`, isPinned: true, status: ContentStatus.PUBLISHED, publishedAt: atDay(-4, 17), createdAt: atDay(-4, 17), updatedAt: atDay(-4, 17) },
            { courseId: course.id, authorId: teacher.id, title: "Pengingat refleksi mingguan", body: "Refleksi dibuka sampai tiga hari ke depan. Jawaban singkat boleh, tetapi harus spesifik dan menunjukkan apa yang benar-benar dipahami.", isPinned: false, status: ContentStatus.PUBLISHED, publishedAt: atDay(-1, 18), createdAt: atDay(-1, 18), updatedAt: atDay(-1, 18) },
        ] })
        const supportMaterialTitle = `Ringkasan ${subject.topics[6]}` as keyof typeof DEMO_MATERIAL_LINKS
        const supportMaterial = await prisma.material.create({ data: { title: supportMaterialTitle, description: `Ringkasan konsep dan pertanyaan panduan untuk ${subject.topics[6]}.`, linkUrl: getDemoMaterialLink(supportMaterialTitle), materialType: "LINK", teacherId: teacher.id, courseId: course.id, uploadedAt: atDay(-5, 16) } })
        await prisma.materialAssignment.create({ data: { materialId: supportMaterial.id, courseId: course.id, assignedAt: atDay(-5, 16) } })
        await prisma.courseChatMessage.createMany({ data: subjectIndex === 0 ? [
            { courseId: course.id, senderId: focusTeacher.id, content: "Selamat sore, teman-teman. Untuk praktikum besok, tiap kelompok cukup membawa satu bawang merah dan tisu.", createdAt: atDay(-3, 16, 12) },
            { courseId: course.id, senderId: focusStudents[7].id, content: "Bu, apakah lembar pengamatannya dicetak per kelompok?", createdAt: atDay(-3, 16, 18) },
            { courseId: course.id, senderId: focusTeacher.id, content: "Betul, satu lembar per kelompok. Saya juga sediakan beberapa cadangan di laboratorium.", createdAt: atDay(-3, 16, 23) },
            { courseId: course.id, senderId: focusStudent.id, content: "Baik, Bu. Kelompok 2 sudah membagi tugas untuk alat dan bahan.", createdAt: atDay(-3, 16, 31) },
            { courseId: course.id, senderId: focusTeacher.id, content: "Terima kasih, Raka. Jangan lupa foto hasil pengamatan untuk dilampirkan di laporan.", createdAt: atDay(-3, 16, 36) },
            { courseId: course.id, senderId: focusStudents[12].id, content: "Siap, Bu. Sampai besok di lab.", createdAt: atDay(-3, 16, 40) },
        ] : [
            { courseId: course.id, senderId: teacher.id, content: `Materi ${subject.topics[6]} dan panduan tugas sudah saya unggah. Silakan tulis pertanyaan di sini jika ada bagian yang belum jelas.`, createdAt: atDay(-2, 16) },
            { courseId: course.id, senderId: focusStudent.id, content: "Baik, terima kasih. Materinya sudah bisa saya buka.", createdAt: atDay(-2, 16, 14) },
        ] })
    }

    await prisma.assignment.create({ data: {
        title: "Kuis Formatif 2 — Sistem Pernapasan Manusia",
        description: "<p><strong>Petunjuk pengerjaan</strong></p><ul><li>Kerjakan secara mandiri dalam waktu sekitar 12 menit.</li><li>Terdapat 8 soal; satu soal meminta lebih dari satu jawaban.</li><li>Periksa kembali jawaban sebelum menekan tombol kirim.</li><li>Nilai dan pembahasan akan langsung ditampilkan setelah kuis dikirim.</li></ul><p>Kuis tetap terbuka sampai batas waktu yang tercantum.</p>",
        dueDate: atDay(6, 20), type: AssignmentType.QUIZ, maxPoints: 100, latePenalty: 0,
        academicDomains: [AcademicDomain.SCIENCE_TECHNOLOGY], courseId: activeCourseIds[0], quizId: demoQuiz.id,
        showGradeAfterSubmission: true, status: ContentStatus.PUBLISHED,
    } })
    await prisma.courseAnnouncement.create({ data: {
        courseId: activeCourseIds[0], authorId: focusTeacher.id, title: "Kuis sistem pernapasan sudah dibuka",
        body: "Kuis formatif terdiri dari 8 soal dan dapat dikerjakan sampai enam hari ke depan. Siapkan waktu sekitar 12 menit dan pastikan koneksi stabil sebelum mulai.",
        isPinned: true, status: ContentStatus.PUBLISHED, publishedAt: atDay(0, 7, 15), createdAt: atDay(0, 7, 15), updatedAt: atDay(0, 7, 15),
    } })

    const secondBiology = await prisma.course.create({ data: {
        name: "Biologi · XI IPA 2", reportName: "Biologi", subjectId: dbSubjects[0].id, classId: secondClass.id,
        termId: activeTerm.id, teacherId: focusTeacher.id, studentIds: secondStudents.map((student) => student.id), attendancePoolScore: 10,
        enrollmentMode: CourseEnrollmentMode.CLASS_SYNC, lastEnrollmentSyncAt: atDay(-2, 5),
    } })
    await prisma.courseEnrollment.createMany({ data: secondStudents.map((student) => ({ courseId: secondBiology.id, studentId: student.id, source: CourseEnrollmentSource.CLASS_SYNC, sourceClassId: secondClass.id, createdById: admin.id })) })
    await prisma.schedule.createMany({ data: [{ dayOfWeek: schoolDay, period: 5, courseId: secondBiology.id }, { dayOfWeek: (schoolDay + 2) % 7 || 2, period: 2, courseId: secondBiology.id }] })
    for (const [taskIndex, stage] of taskStages.entries()) {
        const assignment = await prisma.assignment.create({ data: { title: `${stage.label}: ${subjects[0].topics[taskIndex]}`, description: `Tugas Biologi XI IPA 2 tentang ${subjects[0].topics[taskIndex]}.`, dueDate: atDay(stage.offset + 1, 20), type: stage.type, maxPoints: stage.maxPoints, academicDomains: [AcademicDomain.SCIENCE_TECHNOLOGY], courseId: secondBiology.id, quizId: taskIndex === 2 ? cellQuiz.id : undefined, status: ContentStatus.PUBLISHED } })
        if (stage.offset < 0) await prisma.submission.createMany({ data: secondStudents.filter((_, index) => (index + taskIndex) % 13 !== 0).map((student, index) => {
            const quizAttempt = stage.type === AssignmentType.QUIZ ? seededQuizAttempt(cellQuizQuestions, index + 30) : null
            return { assignmentId: assignment.id, studentId: student.id, grade: quizAttempt?.grade ?? supportingScore(index, 0, taskIndex), feedback: "Pemahaman baik. Periksa kembali penggunaan istilah ilmiah.", submissionUrl: stage.type === AssignmentType.SUBMISSION ? seededWrittenResponse(subjects[0].topics[taskIndex], index + 30, taskIndex) : JSON.stringify(quizAttempt?.answers ?? {}), submittedAt: atDay(stage.offset, 19) }
        }) })
    }
    const secondAttendance = []
    for (let sessionIndex = 13; sessionIndex >= 0; sessionIndex--) {
        for (const [studentIndex, student] of secondStudents.entries()) {
            const record = attendanceStatus(studentIndex + 30, 0, sessionIndex)
            secondAttendance.push({ date: dayInPast(schoolDay, sessionIndex, 13), status: record.status, excuseReason: record.excuseReason, topic: subjects[0].topics[(13 - sessionIndex) % subjects[0].topics.length], period: 5, courseId: secondBiology.id, studentId: student.id })
        }
    }
    await prisma.attendance.createMany({ data: secondAttendance })
    const secondMaterial = await prisma.material.create({ data: {
        title: "Lembar Kerja Praktikum Sel — XI IPA 2", description: "Lembar observasi dan rubrik praktikum untuk pertemuan laboratorium pekan ini.",
        linkUrl: getDemoMaterialLink("Lembar Kerja Praktikum Sel — XI IPA 2"), materialType: "LINK", teacherId: focusTeacher.id, courseId: secondBiology.id, uploadedAt: atDay(-5, 16),
    } })
    await prisma.materialAssignment.create({ data: { materialId: secondMaterial.id, courseId: secondBiology.id, assignedAt: atDay(-5, 16) } })
    await createBiologyMaterials(focusTeacher.id, [activeCourseIds[0], secondBiology.id])
    await prisma.courseAnnouncement.createMany({ data: [
        { courseId: secondBiology.id, authorId: focusTeacher.id, title: "Persiapan praktikum pengamatan sel", body: "Baca kembali prosedur keselamatan laboratorium dan pastikan pembagian peran kelompok sudah disepakati sebelum kelas dimulai.", isPinned: true, status: ContentStatus.PUBLISHED, publishedAt: atDay(-3, 17), createdAt: atDay(-3, 17), updatedAt: atDay(-3, 17) },
        { courseId: secondBiology.id, authorId: focusTeacher.id, title: "Catatan setelah latihan", body: "Sebagian besar sudah memahami fungsi organel. Kita akan mengulang perbedaan difusi dan osmosis selama sepuluh menit pada pertemuan berikutnya.", isPinned: false, status: ContentStatus.PUBLISHED, publishedAt: atDay(-1, 17), createdAt: atDay(-1, 17), updatedAt: atDay(-1, 17) },
    ] })
    await prisma.courseChatMessage.createMany({ data: [
        { courseId: secondBiology.id, senderId: focusTeacher.id, content: "Lembar kerja praktikum sudah tersedia di Materials. Satu lembar digunakan untuk satu kelompok.", createdAt: atDay(-2, 15, 30) },
        { courseId: secondBiology.id, senderId: secondStudents[2].id, content: "Baik, Bu. Kelompok kami sudah mengunduh dan membaca langkah kerjanya.", createdAt: atDay(-2, 15, 44) },
    ] })
    await prisma.courseAnnouncement.create({ data: {
        courseId: activeCourseIds[0], authorId: focusTeacher.id, title: "Draf: pembagian kelompok proyek akhir",
        body: "Daftar kelompok dan topik proyek akan diumumkan setelah konfirmasi peminjaman laboratorium.", isPinned: false,
        status: ContentStatus.DRAFT, publishedAt: null, createdAt: atDay(-1, 19), updatedAt: atDay(-1, 19),
    } })

    const previousCourseIds: string[] = []
    for (const [subjectIndex, subject] of subjects.entries()) {
        const course = await prisma.course.create({ data: { name: `${subject.name} · X IPA 1`, reportName: subject.name, subjectId: dbSubjects[subjectIndex].id, classId: previousClass.id, termId: previousTerm.id, teacherId: teachers[subjectIndex].id, studentIds: [focusStudent.id], attendancePoolScore: 5, enrollmentMode: CourseEnrollmentMode.CLASS_SEEDED } })
        previousCourseIds.push(course.id)
        await prisma.courseEnrollment.create({ data: { courseId: course.id, studentId: focusStudent.id, source: CourseEnrollmentSource.ROLLOVER, sourceClassId: previousClass.id, createdById: admin.id } })
        for (let taskIndex = 0; taskIndex < 4; taskIndex++) {
            const assignment = await prisma.assignment.create({ data: { title: `Penilaian ${taskIndex + 1}: ${subject.topics[taskIndex]}`, description: `Arsip penilaian semester sebelumnya untuk ${subject.name}.`, dueDate: atDay(-250 + taskIndex * 24, 15), type: AssignmentType.SUBMISSION, maxPoints: 100, academicDomains: [subject.domain], courseId: course.id, status: ContentStatus.ARCHIVED } })
            await prisma.submission.create({ data: { assignmentId: assignment.id, studentId: focusStudent.id, grade: 78 + subjectIndex + taskIndex * 2, feedback: "Arsip hasil belajar semester sebelumnya.", submissionUrl: seededWrittenResponse(subject.topics[taskIndex], 0, taskIndex), submittedAt: atDay(-251 + taskIndex * 24, 19) } })
        }
        await prisma.attendance.createMany({ data: Array.from({ length: 10 }, (_, index) => ({ date: atDay(-270 + index * 10, 8), status: index === subjectIndex ? AttendanceStatus.EXCUSED : AttendanceStatus.PRESENT, excuseReason: index === subjectIndex ? "Sakit" : null, topic: subject.topics[index % subject.topics.length], period: 1, courseId: course.id, studentId: focusStudent.id })) })
    }

    await prisma.user.update({ where: { id: focusStudent.id }, data: { enrolledCourseIds: [...activeCourseIds, ...previousCourseIds] } })
    for (const student of focusStudents.slice(1)) await prisma.user.update({ where: { id: student.id }, data: { enrolledCourseIds: activeCourseIds } })
    for (const student of secondStudents) await prisma.user.update({ where: { id: student.id }, data: { enrolledCourseIds: [secondBiology.id] } })

    await prisma.userWorkspacePreference.createMany({ data: [
        { userId: focusTeacher.id, density: UiDensity.COMPACT, theme: ThemePreference.SYSTEM, channelSidebarCollapsed: false, teachingCourseOrder: [activeCourseIds[0], secondBiology.id], enrolledCourseOrder: [] },
        { userId: focusStudent.id, density: UiDensity.COMFORTABLE, theme: ThemePreference.SYSTEM, channelSidebarCollapsed: false, teachingCourseOrder: [], enrolledCourseOrder: activeCourseIds },
    ] })
    await prisma.courseNavigationState.createMany({ data: activeCourseIds.flatMap((courseId, index) => [
        { userId: focusStudent.id, courseId, roleContext: CourseRoleContext.STUDENT, lastSectionKey: index === 0 ? "tasks" : "overview", lastSeenAnnouncementAt: atDay(-3, 7), lastSeenChatAt: atDay(-3, 16, 20) },
        ...(index === 0 ? [{ userId: focusTeacher.id, courseId, roleContext: CourseRoleContext.TEACHER, lastSectionKey: "gradebook", lastSeenAnnouncementAt: atDay(0, 6), lastSeenChatAt: atDay(-3, 17) }] : []),
    ]) })

    await prisma.reportCard.create({ data: {
        studentId: focusStudent.id, classId: focusClass.id, termId: activeTerm.id, courseGrades: focalGrades,
        extracurriculars: [{ activity: "Karya Ilmiah Remaja", predicate: "B", note: "Aktif dalam diskusi dan konsisten menyelesaikan logbook penelitian kelompok." }, { activity: "Futsal", predicate: "B", note: "Menunjukkan sportivitas dan kerja sama tim yang baik." }],
        achievements: [{ name: "Finalis Lomba Poster Sains Tingkat Kota", note: "Menyusun visualisasi edukasi tentang mikroplastik bersama tim kelas." }],
        development: [{ activity: "P5 — Gaya Hidup Berkelanjutan", note: "Mampu mengolah data audit sampah kelas dan menyampaikan rekomendasi yang realistis." }, { activity: "Kepemimpinan", note: "Mulai berani membagi tugas dan memandu diskusi kelompok; perlu lebih konsisten melakukan tindak lanjut." }],
        attendance: { sick: 1, excused: 0, alpha: 1 },
        homeroomTeacherNote: "Raka menunjukkan perkembangan yang baik, terutama pada kemampuan analisis dan kerja kelompok. Pertahankan konsistensi belajar menjelang asesmen akhir, serta segera tuntaskan satu tugas Bahasa Inggris yang masih tertinggal.",
        principalName: "Drs. H. Bambang Setiawan, M.Pd.", date: atDay(0, 7), published: false,
    } })
    await prisma.reportCard.create({ data: {
        studentId: focusStudent.id, classId: previousClass.id, termId: previousTerm.id,
        courseGrades: subjects.map((subject, index) => ({ subject: subject.name, score: 81 + index, grade: "B", competency: `Menguasai kompetensi semester sebelumnya pada ${subject.name} dengan baik.` })),
        extracurriculars: [{ activity: "Karya Ilmiah Remaja", predicate: "B", note: "Aktif mengikuti latihan dan presentasi internal." }], achievements: [],
        development: [{ activity: "P5 — Kearifan Lokal", note: "Bekerja sama dengan baik dalam dokumentasi proyek." }], attendance: { sick: 2, excused: 1, alpha: 0 },
        homeroomTeacherNote: "Terus tingkatkan keberanian menyampaikan pendapat dan pertahankan kebiasaan belajar yang teratur.", principalName: "Drs. H. Bambang Setiawan, M.Pd.", date: previousTermEnd, published: true,
    } })
    await prisma.managementAuditLog.createMany({ data: [
        { actorId: admin.id, entityType: "Class", entityId: focusClass.id, action: "CREATE", after: { name: focusClass.name, studentCount: focusStudents.length }, metadata: { source: "demo_seed" }, createdAt: termStart },
        { actorId: admin.id, entityType: "Course", entityId: activeCourseIds[0], action: "SYNC_ENROLLMENTS", after: { studentCount: focusStudents.length }, metadata: { sourceClass: focusClass.name }, createdAt: atDay(-2, 5) },
    ] })

    console.log(`
Focused demo seed complete.
------------------------------------------------------------
Scenario      : approximately 75% through the active semester
Focus teacher : ${focusTeacher.name}
Teacher login : ${focusTeacher.email}
Focus student : ${focusStudent.name}
Student login : ${focusStudent.email}
Admin login   : ${admin.email}
Password      : ${DEMO_PASSWORD}
Class         : ${focusClass.name} (${focusStudents.length} students)
Student load  : ${activeCourseIds.length} active courses + previous-term history
Teacher load  : 2 Biology classes, quiz/material libraries, live activity
------------------------------------------------------------
`)
}

main().catch((error) => {
    console.error("Seed failed:", error)
    process.exitCode = 1
}).finally(async () => {
    await prisma.$disconnect()
})
