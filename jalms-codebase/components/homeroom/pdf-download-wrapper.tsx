"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import ReportCardDocument from "./report-card-pdf";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

interface PdfDownloadWrapperProps {
    student: any;
    classData: any;
    courses: any[];
}

export default function PdfDownloadWrapper({ student, classData, courses }: PdfDownloadWrapperProps) {
    return (
        <PDFDownloadLink
            document={<ReportCardDocument student={student} classData={classData} courses={courses} />}
            fileName={`ReportCard_${student.name.replace(/\s+/g, "_")}_${classData.term.type}_${classData.term.academicYear?.name}.pdf`}
        >
            {/* 
              // @ts-ignore - The types for PDFDownloadLink render prop are sometimes inferred incorrectly 
            */}
            {({ blob, url, loading, error }: any) => (
                <Button disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    {loading ? "Generating..." : "Download PDF Report"}
                </Button>
            )}
        </PDFDownloadLink>
    );
}
