import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type {
    ReportAchievement,
    ReportAttendanceSummary,
    ReportClassData,
    ReportCourseResult,
    ReportDevelopment,
    ReportExtracurricular,
    ReportStudent,
} from '@/lib/report-card';

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Times-Roman',
        fontSize: 10,
        color: '#000',
        lineHeight: 1.3
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 30,
        textTransform: 'uppercase',
        fontStyle: 'italic'
    },
    headerSubtitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
        textTransform: 'uppercase'
    },
    infoContainer: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        fontSize: 9
    },
    infoColumn: {
        width: '45%',
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 2,
    },
    infoLabel: {
        width: 100,
        fontWeight: 'bold',
        fontStyle: 'italic',
    },
    infoSeparator: {
        width: 10,
        textAlign: 'center'
    },
    infoValue: {
        flex: 1,
        fontWeight: 'bold'
    },

    // Section Headers
    sectionHeader: {
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 15,
        marginBottom: 8,
    },

    // Table Styles
    table: {
        display: 'flex',
        width: 'auto',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderStyle: 'solid',
        borderColor: '#000',
        marginBottom: 20
    },
    tableHeader: {
        margin: 'auto',
        flexDirection: 'row',
        minHeight: 25,
        borderBottomWidth: 1,
        borderTopWidth: 1,
        borderColor: '#000',
    },
    tableRow: {
        margin: 'auto',
        flexDirection: 'row',
        minHeight: 25,
        borderBottomWidth: 1,
        borderColor: '#000',
    },
    // Column Styles - NOW VIEW STYLES
    // Note: justifyContent: 'center' does vertical alignment. 
    // padding is kept on View to spacing from border.

    // Academic Table Columns
    colNo: { width: '5%', borderRightWidth: 1, padding: 2, justifyContent: 'center' },
    colSubject: { width: '30%', borderRightWidth: 1, padding: 2, justifyContent: 'center' },
    colScore: { width: '15%', borderRightWidth: 1, padding: 2, justifyContent: 'center' },
    colDesc: { width: '50%', borderRightWidth: 0, padding: 2, justifyContent: 'center' },

    // Extras
    colExtraNo: { width: '5%', borderRightWidth: 1, padding: 2, justifyContent: 'center' },
    colExtraActivity: { width: '30%', borderRightWidth: 1, padding: 2, justifyContent: 'center' },
    colExtraPred: { width: '15%', borderRightWidth: 1, padding: 2, justifyContent: 'center' },
    colExtraDesc: { width: '50%', borderRightWidth: 0, padding: 2, justifyContent: 'center' },

    // Attendance
    colAttNo: { width: '5%', borderRightWidth: 1, padding: 2, justifyContent: 'center' },
    colAttDesc: { width: '50%', borderRightWidth: 1, padding: 2, justifyContent: 'center' },
    colAttCount: { width: '45%', borderRightWidth: 0, padding: 2, justifyContent: 'center' },

    // Wrapper for inner text to handle horizontal alignment
    cellTextCenter: { textAlign: 'center', width: '100%' },
    cellTextLeft: { textAlign: 'left', width: '100%' },
    cellTextDesc: { textAlign: 'left', width: '100%' },

    noteBox: {
        borderWidth: 1,
        borderColor: '#000',
        padding: 8,
        minHeight: 60,
        marginBottom: 10,
        fontSize: 9
    },

    // ... rest of styles
    footerNotes: {
        fontSize: 8,
        marginTop: 20,
        marginBottom: 30
    },

    signatureSection: {
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    signatureBlock: {
        width: '35%',
    },
    signatureSpace: {
        height: 60,
    },
    signatureName: {
        // textDecoration: 'underline', // PDF shows bold name
        fontWeight: 'bold',
        marginBottom: 2
    },
    signatureRole: {
        fontSize: 9,
    },
    dateLine: {
        marginBottom: 5,
        fontSize: 10
    }
});

interface ReportCardDocumentProps {
    student: ReportStudent
    classData: ReportClassData
    courses: ReportCourseResult[]
    extracurriculars?: ReportExtracurricular[]
    achievements?: ReportAchievement[]
    development?: ReportDevelopment[]
    attendance?: ReportAttendanceSummary
    note?: string
    principalName?: string
    publishedDate?: Date
}

// Header Component for reuse
const HeaderSection = ({ student, classData }: { student: ReportStudent, classData: ReportClassData }) => (
    <View>
        <Text style={styles.headerTitle}>STUDENT REPORT</Text>
        <View style={styles.infoContainer}>
            <View style={styles.infoColumn}>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{"Student's Name"}</Text>
                    <Text style={styles.infoSeparator}>:</Text>
                    <Text style={styles.infoValue}>{student.name}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>NIS</Text>
                    <Text style={styles.infoSeparator}>:</Text>
                    <Text style={styles.infoValue}>{student.nis || student.officialId || '-'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>NISN</Text>
                    <Text style={styles.infoSeparator}>:</Text>
                    <Text style={styles.infoValue}>{student.nisn || '-'}</Text>
                </View>
            </View>
            <View style={styles.infoColumn}>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Class</Text>
                    <Text style={styles.infoSeparator}>:</Text>
                    <Text style={styles.infoValue}>{classData.name}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Semester</Text>
                    <Text style={styles.infoSeparator}>:</Text>
                    <Text style={styles.infoValue}>{classData.term.type === 'ODD' ? '1st' : '2nd'}</Text>
                </View>
                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Academic Year</Text>
                    <Text style={styles.infoSeparator}>:</Text>
                    <Text style={styles.infoValue}>{classData.term.academicYear?.name}</Text>
                </View>
            </View>
        </View>
        <View style={{ borderBottomWidth: 1, borderColor: '#000', marginBottom: 15 }} />
    </View>
);

export const ReportCardDocument = ({
    student,
    classData,
    courses,
    extracurriculars = [],
    achievements = [],
    development = [],
    attendance = { sick: 0, excused: 0, alpha: 0 },
    note = "",
    principalName = ".........................",
    publishedDate = new Date()
}: ReportCardDocumentProps) => {

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    // Calculate Totals
    const totalScore = courses.reduce((acc, c) => acc + (c.grade || 0), 0)
    const avgScore = courses.length > 0 ? Math.round(totalScore / courses.length) : 0

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header Page 1 */}
                <HeaderSection student={student} classData={classData} />

                <Text style={[styles.headerSubtitle, { marginBottom: 20 }]}>LAPORAN HASIL BELAJAR</Text>

                {/* A. Laporan Akademik */}
                <Text style={styles.sectionHeader}>A. Laporan Akademik</Text>
                <View style={styles.table}>
                    <View style={styles.tableHeader} fixed>
                        <View style={styles.colNo}><Text style={[styles.cellTextCenter, { fontWeight: 'bold' }]}>No</Text></View>
                        <View style={styles.colSubject}><Text style={[styles.cellTextLeft, { fontWeight: 'bold' }]}>Mata Pelajaran</Text></View>
                        <View style={styles.colScore}><Text style={[styles.cellTextCenter, { fontWeight: 'bold' }]}>Nilai Akhir</Text></View>
                        <View style={styles.colDesc}><Text style={[styles.cellTextLeft, { fontWeight: 'bold' }]}>Capaian Kompetensi</Text></View>
                    </View>

                    {courses.map((course, i) => (
                        <View key={i} style={styles.tableRow} wrap={false}>
                            <View style={styles.colNo}><Text style={styles.cellTextCenter}>{i + 1}</Text></View>
                            <View style={styles.colSubject}><Text style={styles.cellTextLeft}>{course.name}</Text></View>
                            <View style={styles.colScore}><Text style={styles.cellTextCenter}>{course.grade}</Text></View>
                            <View style={styles.colDesc}><Text style={styles.cellTextDesc}>{course.competency || "-"}</Text></View>
                        </View>
                    ))}

                    {/* Total & Average Rows */}
                    <View style={styles.tableRow}>
                        <View style={{ ...styles.colNo, width: '35%', borderRightWidth: 1, justifyContent: 'center' }}>
                            <Text style={{ ...styles.cellTextCenter, fontWeight: 'bold' }}>Total Nilai</Text>
                        </View>
                        <View style={{ ...styles.colScore, width: '15%', borderRightWidth: 1, justifyContent: 'center' }}>
                            <Text style={{ ...styles.cellTextCenter, fontWeight: 'bold' }}>{totalScore}</Text>
                        </View>
                        <View style={{ ...styles.colDesc, width: '50%', borderRightWidth: 0, justifyContent: 'center' }}></View>
                    </View>
                    <View style={styles.tableRow}>
                        <View style={{ ...styles.colNo, width: '35%', borderRightWidth: 1, justifyContent: 'center' }}>
                            <Text style={{ ...styles.cellTextCenter, fontWeight: 'bold' }}>Rata - Rata Nilai</Text>
                        </View>
                        <View style={{ ...styles.colScore, width: '15%', borderRightWidth: 1, justifyContent: 'center' }}>
                            <Text style={{ ...styles.cellTextCenter, fontWeight: 'bold' }}>{avgScore}</Text>
                        </View>
                        <View style={{ ...styles.colDesc, width: '50%', borderRightWidth: 0, justifyContent: 'center' }}></View>
                    </View>
                </View>

                {/* B. Ekstrakurikuler */}
                <Text style={styles.sectionHeader}>B. Ekstrakurikuler</Text>
                <View style={styles.table}>
                    <View style={styles.tableHeader} fixed>
                        <View style={styles.colExtraNo}><Text style={[styles.cellTextCenter, { fontWeight: 'bold' }]}>No</Text></View>
                        <View style={styles.colExtraActivity}><Text style={[styles.cellTextLeft, { fontWeight: 'bold' }]}>Kegiatan</Text></View>
                        <View style={styles.colExtraPred}><Text style={[styles.cellTextCenter, { fontWeight: 'bold' }]}>Predikat</Text></View>
                        <View style={{ ...styles.colExtraDesc, borderRightWidth: 0 }}><Text style={[styles.cellTextLeft, { fontWeight: 'bold' }]}>Catatan</Text></View>
                    </View>
                    {extracurriculars.length > 0 ? extracurriculars.map((ex, i) => (
                        <View key={i} style={styles.tableRow} wrap={false}>
                            <View style={styles.colExtraNo}><Text style={styles.cellTextCenter}>{i + 1}</Text></View>
                            <View style={styles.colExtraActivity}><Text style={styles.cellTextLeft}>{ex.activity}</Text></View>
                            <View style={styles.colExtraPred}><Text style={styles.cellTextCenter}>{ex.predicate}</Text></View>
                            <View style={{ ...styles.colExtraDesc, borderRightWidth: 0 }}><Text style={styles.cellTextLeft}>{ex.note}</Text></View>
                        </View>
                    )) : (
                        <View style={styles.tableRow}>
                            <View style={styles.colExtraNo}><Text style={styles.cellTextCenter}>1</Text></View>
                            <View style={styles.colExtraActivity}><Text style={styles.cellTextCenter}>-</Text></View>
                            <View style={styles.colExtraPred}><Text style={styles.cellTextCenter}>-</Text></View>
                            <View style={{ ...styles.colExtraDesc, borderRightWidth: 0 }}><Text style={styles.cellTextCenter}>-</Text></View>
                        </View>
                    )}
                </View>

                {/* C. Pencapaian Prestasi */}
                <Text style={styles.sectionHeader}>C. Pencapaian Prestasi</Text>
                <View style={styles.table}>
                    <View style={styles.tableHeader} fixed>
                        <View style={styles.colExtraNo}><Text style={[styles.cellTextCenter, { fontWeight: 'bold' }]}>No</Text></View>
                        <View style={styles.colExtraActivity}><Text style={[styles.cellTextLeft, { fontWeight: 'bold' }]}>Prestasi</Text></View>
                        <View style={{ ...styles.colExtraDesc, width: '65%', borderRightWidth: 0 }}><Text style={[styles.cellTextLeft, { fontWeight: 'bold' }]}>Catatan</Text></View>
                    </View>
                    {achievements.length > 0 ? achievements.map((ach, i) => (
                        <View key={i} style={styles.tableRow} wrap={false}>
                            <View style={styles.colExtraNo}><Text style={styles.cellTextCenter}>{i + 1}</Text></View>
                            <View style={styles.colExtraActivity}><Text style={styles.cellTextLeft}>{ach.name}</Text></View>
                            <View style={{ ...styles.colExtraDesc, width: '65%', borderRightWidth: 0 }}><Text style={styles.cellTextLeft}>{ach.note}</Text></View>
                        </View>
                    )) : (
                        <View style={styles.tableRow}>
                            <View style={styles.colExtraNo}><Text style={styles.cellTextCenter}>1</Text></View>
                            <View style={styles.colExtraActivity}><Text style={styles.cellTextCenter}>-</Text></View>
                            <View style={{ ...styles.colExtraDesc, width: '65%', borderRightWidth: 0 }}><Text style={styles.cellTextCenter}>-</Text></View>
                        </View>
                    )}
                </View>

                {/* D. Pengembangan Diri */}
                <Text style={styles.sectionHeader}>D. Pengembangan Diri</Text>
                <View style={styles.table}>
                    <View style={styles.tableHeader} fixed>
                        <View style={styles.colExtraNo}><Text style={[styles.cellTextCenter, { fontWeight: 'bold' }]}>No</Text></View>
                        <View style={styles.colExtraActivity}><Text style={[styles.cellTextLeft, { fontWeight: 'bold' }]}>Kegiatan</Text></View>
                        <View style={{ ...styles.colExtraDesc, width: '65%', borderRightWidth: 0 }}><Text style={[styles.cellTextLeft, { fontWeight: 'bold' }]}>Catatan</Text></View>
                    </View>
                    {development.length > 0 ? development.map((dev, i) => (
                        <View key={i} style={styles.tableRow} wrap={false}>
                            <View style={styles.colExtraNo}><Text style={styles.cellTextCenter}>{i + 1}</Text></View>
                            <View style={styles.colExtraActivity}><Text style={styles.cellTextLeft}>{dev.activity}</Text></View>
                            <View style={{ ...styles.colExtraDesc, width: '65%', borderRightWidth: 0 }}><Text style={styles.cellTextLeft}>{dev.note}</Text></View>
                        </View>
                    )) : (
                        <View style={styles.tableRow}>
                            <View style={styles.colExtraNo}><Text style={styles.cellTextCenter}>1</Text></View>
                            <View style={styles.colExtraActivity}><Text style={styles.cellTextCenter}>-</Text></View>
                            <View style={{ ...styles.colExtraDesc, width: '65%', borderRightWidth: 0 }}><Text style={styles.cellTextCenter}>-</Text></View>
                        </View>
                    )}
                </View>

                {/* E. Kehadiran */}
                <View wrap={false}>
                    <Text style={styles.sectionHeader}>E. Kehadiran</Text>
                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <View style={styles.colAttNo}><Text style={[styles.cellTextCenter, { fontWeight: 'bold' }]}>No</Text></View>
                            <View style={styles.colAttDesc}><Text style={[styles.cellTextLeft, { fontWeight: 'bold' }]}>Keterangan</Text></View>
                            <View style={{ ...styles.colAttCount, borderRightWidth: 0 }}><Text style={[styles.cellTextCenter, { fontWeight: 'bold' }]}>Jumlah</Text></View>
                        </View>
                        <View style={styles.tableRow} wrap={false}>
                            <View style={styles.colAttNo}><Text style={styles.cellTextCenter}>1</Text></View>
                            <View style={styles.colAttDesc}><Text style={styles.cellTextLeft}>Sakit</Text></View>
                            <View style={{ ...styles.colAttCount, borderRightWidth: 0 }}><Text style={styles.cellTextCenter}>{attendance.sick || '-'}</Text></View>
                        </View>
                        <View style={styles.tableRow} wrap={false}>
                            <View style={styles.colAttNo}><Text style={styles.cellTextCenter}>2</Text></View>
                            <View style={styles.colAttDesc}><Text style={styles.cellTextLeft}>Izin</Text></View>
                            <View style={{ ...styles.colAttCount, borderRightWidth: 0 }}><Text style={styles.cellTextCenter}>{attendance.excused || '-'}</Text></View>
                        </View>
                        <View style={styles.tableRow} wrap={false}>
                            <View style={styles.colAttNo}><Text style={styles.cellTextCenter}>3</Text></View>
                            <View style={styles.colAttDesc}><Text style={styles.cellTextLeft}>Tanpa Keterangan</Text></View>
                            <View style={{ ...styles.colAttCount, borderRightWidth: 0 }}><Text style={styles.cellTextCenter}>{attendance.alpha || '-'}</Text></View>
                        </View>
                    </View>
                </View>

                {/* FORCE BREAK TO NEW PAGE FOR SIGNATURES */}
                <View break />

                {/* Header Page 2 (Signatures) */}
                <HeaderSection student={student} classData={classData} />

                {/* F. Catatan Wali Kelas */}
                <Text style={styles.sectionHeader}>F. Catatan Wali Kelas</Text>
                <View style={styles.noteBox}>
                    <Text>{note || "-"}</Text>
                </View>

                {/* G. Catatan Orangtua */}
                <Text style={styles.sectionHeader}>G. Catatan Orangtua</Text>
                <View style={{ ...styles.noteBox, minHeight: 60 }}>
                    <Text>{""}</Text>
                </View>

                {/* Footer Notes */}
                <View style={styles.footerNotes}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Catatan :</Text>
                    <Text>1. Nilai yang tertulis di buku rapor siswa bersifat sementara, nilai tetap akan dikeluarkan pada saat kelulusan.</Text>
                    <Text>2. Orang tua wajib mengembalikan buku raport siswa ini setelah mengisi kotak di atas.</Text>
                    <Text>3. Orang tua harus mengembalikan buku raport siswa ini paling lambat Maret 2026.</Text>
                </View>

                <View break={false}>
                    <View style={styles.signatureSection}>
                        <View style={styles.signatureBlock}>
                            <Text style={{ marginTop: 20 }}>Orang Tua/Wali</Text>
                            <View style={styles.signatureSpace} />
                            <Text style={styles.signatureName}>............................</Text>
                        </View>

                        <View style={styles.signatureBlock}>
                            <Text style={{ marginBottom: 5 }}>Tangerang Selatan, {formatDate(publishedDate)}</Text>
                            <Text>Wali Kelas</Text>
                            <View style={styles.signatureSpace} />
                            <Text style={styles.signatureName}>{classData.homeroomTeacher?.name}</Text>
                        </View>
                    </View>

                    <View style={{ alignItems: 'center', marginTop: 10 }}>
                        <Text>Mengetahui,</Text>
                        <Text>Kepala Sekolah</Text>
                        <View style={styles.signatureSpace} />
                        <Text style={styles.signatureName}>{principalName}</Text>
                    </View>
                </View>

            </Page>
        </Document>
    )
};

export default ReportCardDocument;
