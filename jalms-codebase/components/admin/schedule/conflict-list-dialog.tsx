import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle } from "lucide-react"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const PERIODS = ["Morning", "1", "2", "3", "4", "5", "6", "Night"] // Approximate mapping based on usage

interface ConflictEvent {
    studentName: string
    courseName: string
    day: number
    period: number
}

interface ConflictListDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    conflicts: ConflictEvent[]
}

export function ConflictListDialog({ open, onOpenChange, conflicts }: ConflictListDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl w-full max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-5 w-5" />
                        Schedule Conflicts Detected
                    </DialogTitle>
                    <DialogDescription>
                        The following students have conflicting classes. Please resolve these conflicts before proceeding.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="flex-1 border rounded-md h-[400px]">
                    <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                            <TableRow>
                                <TableHead>Student Name</TableHead>
                                <TableHead>Conflicting Course</TableHead>
                                <TableHead>Day</TableHead>
                                <TableHead>Period</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {conflicts.map((conflict, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{conflict.studentName}</TableCell>
                                    <TableCell>{conflict.courseName}</TableCell>
                                    <TableCell>{DAYS[conflict.day] || conflict.day}</TableCell>
                                    <TableCell>Period {conflict.period}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Keywords
                    </Button>
                    <Button onClick={() => onOpenChange(false)}>
                        Understood
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
