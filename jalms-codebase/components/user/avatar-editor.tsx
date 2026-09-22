"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { createAvatar } from "@dicebear/core"
import { funEmoji } from "@dicebear/collection"
import imageCompression from "browser-image-compression"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Loader2, RefreshCw, Save, Upload, Image as ImageIcon, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { useLocalUpload } from "@/hooks/use-local-upload"

import { updateUserAvatar } from "@/lib/actions/user.actions"
import { useRouter } from "next/navigation"

type AvatarConfig = {
    seed: string
    eyes?: string[]
    mouth?: string[]
    backgroundColor?: string[]
    scale?: number
    translateX?: number
    translateY?: number
}

const defaultOptions: AvatarConfig = {
    seed: "jalms",
    eyes: ["plain"],
    mouth: ["plain"],
    backgroundColor: ["b6e3f4"],
    scale: 100,
    translateX: 0,
    translateY: 0,
}

export function AvatarEditor({ initialConfig, onSaved }: { initialConfig?: any, onSaved?: () => void }) {
    const [mode, setMode] = useState<"generate" | "upload">("generate")
    const [config, setConfig] = useState<AvatarConfig>(initialConfig || defaultOptions)

    const { startUpload, isUploading } = useLocalUpload()

    // Upload State
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

    const imageRef = useRef<HTMLImageElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const avatarSvg = useMemo(() => {
        return createAvatar(funEmoji, {
            ...config,
            size: 128,
        } as any).toString()
    }, [config])

    const handleGenerateSave = async () => {
        setIsLoading(true)
        try {
            const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(avatarSvg)}`
            const result = await updateUserAvatar(config, dataUri)

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Avatar updated successfully")
                router.refresh()
                onSaved?.()
            }
        } catch (error) {
            toast.error("Failed to update avatar")
        } finally {
            setIsLoading(false)
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (e) => {
                setImageSrc(e.target?.result as string)
                setPosition({ x: 0, y: 0 })
                setZoom(1)
            }
            reader.readAsDataURL(file)
        }
    }

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true)
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
        setDragStart({
            x: clientX - position.x,
            y: clientY - position.y
        })
    }

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging) return

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY

        setPosition({
            x: clientX - dragStart.x,
            y: clientY - dragStart.y
        })
    }

    const handleMouseUp = () => {
        setIsDragging(false)
    }

    const handleUploadSave = async () => {
        if (!imageSrc || !imageRef.current) return

        setIsLoading(true)
        try {
            // Create canvas for cropping
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            const size = 256 // Output size reduced to 256x256
            canvas.width = size
            canvas.height = size

            if (!ctx) throw new Error("No canvas context")

            // Wait for image to be fully loaded
            const img = imageRef.current

            const ratio = size / 256;

            ctx.fillStyle = '#FFFFFF'
            ctx.fillRect(0, 0, size, size)

            // Center the context
            ctx.translate(size / 2, size / 2)

            // Apply similar transforms
            ctx.translate(position.x * ratio, position.y * ratio)
            ctx.scale(zoom * ratio, zoom * ratio)

            ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)

            // Convert to blob (WEBP)
            const blob = await new Promise<Blob | null>(resolve =>
                canvas.toBlob(resolve, 'image/webp', 0.8)
            )

            if (!blob) throw new Error("Failed to create blob")

            const file = new File([blob], "avatar.webp", { type: "image/webp" })

            // Compress image
            const options = {
                maxSizeMB: 0.1, // 100KB Limit
                maxWidthOrHeight: 256,
                useWebWorker: true,
                fileType: "image/webp"
            }

            let uploadFile = file
            try {
                const compressedFile = await imageCompression(file, options)
                uploadFile = compressedFile
            } catch (error) {
                console.error("Compression failed:", error)
                // Fallback to original file if compression fails
            }

            const uploaded = await startUpload([uploadFile], "avatar")

            if (!uploaded || !uploaded[0]) throw new Error("Upload failed")

            const publicUrl = uploaded[0].url

            // Update User Profile
            const result = await updateUserAvatar(null, publicUrl)

            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Avatar uploaded successfully")
                router.refresh()
                onSaved?.()
            }

        } catch (error) {
            console.error(error)
            toast.error("Failed to upload avatar")
        } finally {
            setIsLoading(false)
        }
    }

    const randomize = () => {
        const eyesOptions = getOptions("eyes")
        const mouthOptions = getOptions("mouth")
        const bgOptions = getOptions("backgroundColor")

        setConfig(prev => ({
            ...prev,
            seed: Math.random().toString(36).substring(7),
            eyes: [eyesOptions[Math.floor(Math.random() * eyesOptions.length)]],
            mouth: [mouthOptions[Math.floor(Math.random() * mouthOptions.length)]],
            backgroundColor: [bgOptions[Math.floor(Math.random() * bgOptions.length)]],
        }))
    }

    const updateConfig = (key: keyof AvatarConfig, value: any) => {
        setConfig(prev => ({
            ...prev,
            [key]: (key === 'scale' || key === 'translateX' || key === 'translateY') ? value : [value]
        }))
    }

    // Helper to generate options for select inputs
    const getOptions = (key: string) => {
        const options: Record<string, string[]> = {
            eyes: ["sad", "tearDrop", "pissed", "cute", "wink", "wink2", "plain", "glasses", "closed", "love", "stars", "shades", "closed2", "crying", "sleepClose"],
            mouth: ["plain", "lilSmile", "sad", "shy", "cute", "wideSmile", "shout", "smileTeeth", "smileLol", "pissed", "drip", "tongueOut", "kissHeart", "sick", "faceMask"],
            backgroundColor: ["fcbc34", "d84be5", "d9915b", "f6d594", "059ff2", "71cf62", "b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf"],
        }
        return options[key] || []
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Avatar Editor</CardTitle>
                <CardDescription>Choose how you want to appear.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="generate">Generate Avatar</TabsTrigger>
                        <TabsTrigger value="upload">Upload Photo</TabsTrigger>
                    </TabsList>

                    <TabsContent value="generate" className="space-y-6">
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div
                                className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/10"
                                dangerouslySetInnerHTML={{ __html: avatarSvg }}
                            />
                            <Button variant="outline" size="sm" onClick={randomize}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Randomize
                            </Button>
                        </div>

                        <Tabs defaultValue="face" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="face">Face</TabsTrigger>
                                <TabsTrigger value="background">Background</TabsTrigger>
                                <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
                            </TabsList>

                            <TabsContent value="face" className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label>Eyes</Label>
                                    <Select onValueChange={(v) => updateConfig("eyes", v)} value={config.eyes?.[0] || ""}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select eyes" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {getOptions("eyes").map(opt => (
                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Mouth</Label>
                                    <Select onValueChange={(v) => updateConfig("mouth", v)} value={config.mouth?.[0] || ""}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select mouth" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {getOptions("mouth").map(opt => (
                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </TabsContent>

                            <TabsContent value="background" className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label>Background Color</Label>
                                    <div className="grid grid-cols-6 gap-2">
                                        {getOptions("backgroundColor").map(color => (
                                            <button
                                                key={color}
                                                className={`w-8 h-8 rounded-full border-2 ${config.backgroundColor?.[0] === color ? 'border-primary' : 'border-transparent'}`}
                                                style={{ backgroundColor: `#${color}` }}
                                                onClick={() => updateConfig("backgroundColor", color)}
                                                aria-label={`Select color ${color}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="adjustments" className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label>Scale</Label>
                                        <span className="text-sm text-muted-foreground">{config.scale || 100}%</span>
                                    </div>
                                    <Slider
                                        defaultValue={[config.scale || 100]}
                                        max={200}
                                        step={10}
                                        onValueChange={(vals) => updateConfig("scale", vals[0])}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label>Horizontal Position (X)</Label>
                                        <span className="text-sm text-muted-foreground">{config.translateX || 0}%</span>
                                    </div>
                                    <Slider
                                        defaultValue={[config.translateX || 0]}
                                        min={-100}
                                        max={100}
                                        step={5}
                                        onValueChange={(vals) => updateConfig("translateX", vals[0])}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label>Vertical Position (Y)</Label>
                                        <span className="text-sm text-muted-foreground">{config.translateY || 0}%</span>
                                    </div>
                                    <Slider
                                        defaultValue={[config.translateY || 0]}
                                        min={-100}
                                        max={100}
                                        step={5}
                                        onValueChange={(vals) => updateConfig("translateY", vals[0])}
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </TabsContent>

                    <TabsContent value="upload" className="space-y-6">
                        {!imageSrc ? (
                            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg border-muted-foreground/25 space-y-4">
                                <div className="p-4 bg-muted rounded-full">
                                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-medium">Upload a photo</h3>
                                    <p className="text-sm text-muted-foreground">Drag and drop or click to upload</p>
                                </div>
                                <Button onClick={() => fileInputRef.current?.click()}>
                                    Choose File
                                </Button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="flex flex-col items-center gap-4">
                                    <div
                                        className="relative w-64 h-64 border-4 border-primary/10 rounded-full overflow-hidden touch-none"
                                        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                                        onMouseDown={handleMouseDown}
                                        onMouseMove={handleMouseMove}
                                        onMouseUp={handleMouseUp}
                                        onMouseLeave={handleMouseUp}
                                        onTouchStart={handleMouseDown}
                                        onTouchMove={handleMouseMove}
                                        onTouchEnd={handleMouseUp}
                                    >
                                        <img
                                            ref={imageRef}
                                            src={imageSrc}
                                            alt="Upload preview"
                                            className="absolute max-w-none origin-center pointer-events-none select-none"
                                            style={{
                                                top: '50%',
                                                left: '50%',
                                                transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) scale(${zoom})`
                                            }}
                                            draggable={false}
                                        />
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Drag to reposition
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label>Zoom</Label>
                                        <Button variant="ghost" size="sm" onClick={() => { setZoom(1); setPosition({ x: 0, y: 0 }) }}>
                                            <RotateCcw className="w-3 h-3 mr-1" /> Reset
                                        </Button>
                                    </div>
                                    <Slider
                                        value={[zoom]}
                                        min={0.1}
                                        max={3}
                                        step={0.1}
                                        onValueChange={(vals) => setZoom(vals[0])}
                                    />
                                </div>

                                <div className="flex justify-center">
                                    <Button variant="outline" onClick={() => setImageSrc(null)}>
                                        Choose Different Image
                                    </Button>
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button onClick={mode === 'generate' ? handleGenerateSave : handleUploadSave} disabled={isLoading}>
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <Save className="w-4 h-4 mr-2" />
                    Save Avatar
                </Button>
            </CardFooter>
        </Card>
    )
}
