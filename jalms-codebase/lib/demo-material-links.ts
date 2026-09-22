export const DEMO_MATERIAL_LINKS = {
    "Ringkasan Sistem pernapasan": "https://openstax.org/books/anatomy-and-physiology-2e/pages/22-chapter-review",
    "Ringkasan Pemodelan data": "https://www.khanacademy.org/math/statistics-probability/describing-relationships-quantitative-data/regression-library/v/introduction-to-residuals-and-least-squares-regression",
    "Ringkasan Presentasi akademik": "https://www.sydney.edu.au/students/study-skills/oral-presentations/structure-presentation.html",
    "Ringkasan Presentation skills": "https://learnenglish.britishcouncil.org/sites/podcasts/files/LearnEnglish-Listening-B2-A-design-presentation.pdf",
    "Ringkasan Orde Baru": "https://repositori.kemendikdasmen.go.id/14095/",
    "Ringkasan Etika digital": "https://www.unesco.org/en/articles/global-citizenship-education-digital-age-teacher-guidelines",
    "Ringkasan Pertolongan pertama": "https://www.redcross.org/take-a-class/first-aid/performing-first-aid/first-aid-steps",
    "Ringkasan Kurasi karya": "https://australian.museum/learn/teachers/history-learning-resources/classroomexhibition/",
    "Lembar Kerja Praktikum Sel — XI IPA 2": "https://gtac.edu.au/wp-content/uploads/2014/10/Cells-online-07-Red-Onion-Cells-2.pdf",
    "Peta Konsep: Struktur dan Fungsi Sel": "https://openstax.org/books/biology-2e/pages/4-3-eukaryotic-cells",
    "Panduan Praktikum Pengamatan Sel": "https://www.teachengineering.org/activities/view/rice-2544-cell-structures-fluorescent-dyes-activity",
    "Video Pengayaan: Transport Membran": "https://www.youtube.com/watch?v=ysOA1gl5Yxc",
    "Kisi-kisi Penilaian Tengah Semester": "https://repositori.kemendikdasmen.go.id/8903/1/KISI-KISI%20USBN-SMA-IPA-Biologi-K2006.pdf",
    "Template Laporan Proyek Sistem Organ": "https://www.nsw.gov.au/education-and-training/nesa/curriculum/science/science-7-10-2018/research-project-report",
} as const

export function getDemoMaterialLink(title: keyof typeof DEMO_MATERIAL_LINKS) {
    return DEMO_MATERIAL_LINKS[title]
}
