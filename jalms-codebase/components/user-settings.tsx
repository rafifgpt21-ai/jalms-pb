"use client"

import { useState } from "react"
import { LogOut, Settings, User, KeyRound, Pencil, Mail, Palette } from "lucide-react"
import { signOut } from "next-auth/react"

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ChangePasswordDialog } from "@/components/change-password-dialog"
import { NicknameDialog } from "@/components/user/nickname-dialog"
import { ChangeEmailDialog } from "@/components/user/change-email-dialog"
import { AppearanceDialog } from "@/components/user/appearance-dialog"

interface UserSettingsProps {
    email?: string | null
    name?: string | null
    nickname?: string | null
    image?: string | null
    side?: "top" | "bottom" | "left" | "right"
    align?: "start" | "center" | "end"
    triggerVariant?: "icon" | "card"
}

export function UserSettings({ email, name, nickname, image, side = "bottom", align = "end", triggerVariant = "icon" }: UserSettingsProps) {
    const [showLogoutDialog, setShowLogoutDialog] = useState(false)
    const [showPasswordDialog, setShowPasswordDialog] = useState(false)
    const [showAvatarDialog, setShowAvatarDialog] = useState(false)
    const [showNicknameDialog, setShowNicknameDialog] = useState(false)
    const [showEmailDialog, setShowEmailDialog] = useState(false)
    const [showAppearanceDialog, setShowAppearanceDialog] = useState(false)

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    {triggerVariant === "card" ? (
                        <button className="flex items-center gap-3 w-full p-2 hover:bg-white/10 dark:hover:bg-white/5 border border-transparent hover:border-white/10 rounded-lg transition-all duration-200 text-left outline-none backdrop-blur-sm">
                            <Avatar className="h-10 w-10 border border-border">
                                <AvatarImage src={image || undefined} alt={name || "User"} />
                                <AvatarFallback className="bg-orange-100 text-orange-600 font-semibold">
                                    {name?.[0] || "U"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className="truncate text-sm font-semibold text-foreground">
                                    {nickname || name || "User"}
                                </span>
                                <span className="text-xs text-gray-500 truncate">
                                    {email}
                                </span>
                            </div>
                        </button>
                    ) : (
                        <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 p-0" suppressHydrationWarning>
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={image || undefined} alt={name || "User"} />
                                <AvatarFallback>
                                    <Settings className="h-4 w-4 text-gray-500" />
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    )}
                </DropdownMenuTrigger>
                <DropdownMenuContent side={side} align={align} className="z-[110] w-56">
                    <DropdownMenuLabel className="py-2 text-sm font-normal tracking-normal text-popover-foreground">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={image || undefined} alt={name || "User"} />
                                <AvatarFallback>{name?.[0] || "U"}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{name || "User"}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {email}
                                </p>
                            </div>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowAvatarDialog(true)}>
                        <User className="h-4 w-4" />
                        <span>Customize Avatar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowAppearanceDialog(true)}>
                        <Palette className="h-4 w-4" />
                        <span>Appearance</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowNicknameDialog(true)}>
                        <Pencil className="h-4 w-4" />
                        <span>Edit Nickname</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowEmailDialog(true)}>
                        <Mail className="h-4 w-4" />
                        <span>Change Email</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowPasswordDialog(true)}>
                        <KeyRound className="h-4 w-4" />
                        <span>Change Password</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setShowLogoutDialog(true)}
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Sign out confirmation</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to sign out of your account? You will be redirected to the login page.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                await signOut({ redirect: false })
                                window.location.href = "/login"
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white border-red-600"
                        >
                            Sign Out
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <ChangePasswordDialog
                open={showPasswordDialog}
                onOpenChange={setShowPasswordDialog}
            />

            <NicknameDialog
                open={showNicknameDialog}
                onOpenChange={setShowNicknameDialog}
                currentNickname={nickname}
            />

            <ChangeEmailDialog
                open={showEmailDialog}
                onOpenChange={setShowEmailDialog}
                currentEmail={email}
            />

            <AppearanceDialog open={showAppearanceDialog} onOpenChange={setShowAppearanceDialog} />

            <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Customize Avatar</DialogTitle>
                        <DialogDescription>
                            Create your unique avatar.
                        </DialogDescription>
                    </DialogHeader>
                    <AvatarEditor onSaved={() => setShowAvatarDialog(false)} />
                </DialogContent>
            </Dialog>
        </>
    )
}

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AvatarEditor } from "@/components/user/avatar-editor"
