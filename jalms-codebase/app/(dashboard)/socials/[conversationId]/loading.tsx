import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }} className="flex items-center gap-3 p-4 border-b bg-background/95 sticky top-0 z-10">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-3 w-[100px]" />
                </div>
            </div>

            {/* Messages Area - Simulate a few messages */}
            <div className="flex-1 p-4 space-y-4">
                {/* Received message */}
                <div className="flex w-full justify-start">
                    <Skeleton className="h-10 w-[60%] rounded-2xl rounded-bl-none" />
                </div>

                {/* Sent message */}
                <div className="flex w-full justify-end">
                    <Skeleton className="h-16 w-[70%] rounded-2xl rounded-br-none" />
                </div>

                {/* Received message */}
                <div className="flex w-full justify-start">
                    <Skeleton className="h-8 w-[40%] rounded-2xl rounded-bl-none" />
                </div>

                {/* Sent message */}
                <div className="flex w-full justify-end">
                    <Skeleton className="h-12 w-[50%] rounded-2xl rounded-br-none" />
                </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-background flex gap-2">
                <Skeleton className="flex-1 h-10 rounded-full" />
                <Skeleton className="h-10 w-10 rounded-full" />
            </div>
        </div>
    );
}
