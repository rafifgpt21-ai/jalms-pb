"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

// Dynamically import the wrapper with SSR disabled
const PdfDownloadWrapper = dynamic(() => import("./pdf-download-wrapper"), {
    ssr: false,
    loading: () => (
        <Button disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading PDF...
        </Button>
    )
})

interface ReportCardDownloadButtonProps {
    student: any
    classData: any
    courses: any[]
}

export function ReportCardDownloadButton(props: ReportCardDownloadButtonProps) {
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    if (!isClient) {
        return (
            <Button disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading PDF...
            </Button>
        )
    }

    return <PdfDownloadWrapper {...props} />
}
