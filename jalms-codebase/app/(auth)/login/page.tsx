"use client"

import { useActionState, useState } from "react"
import { AlertCircle, ArrowRight, BookOpen, Check, Eye, EyeOff, GraduationCap, LoaderCircle, LockKeyhole, Mail, RefreshCw, ShieldCheck, Users } from "lucide-react"
import { authenticate } from "@/lib/actions/auth.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const workspaceBenefits = [
  { icon: BookOpen, title: "Teach with clarity", description: "Courses, materials, attendance, and grading stay connected." },
  { icon: GraduationCap, title: "Learn with focus", description: "Students see the work, schedule, and progress that matter today." },
  { icon: Users, title: "Run one school workspace", description: "Academic and administrative teams work from the same source." },
]

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-xl bg-cyan-400/12 ring-1 ring-cyan-300/20">
        <RefreshCw aria-hidden className="size-[22px] text-cyan-400" strokeWidth={2.25} />
      </span>
      <span>
        <span className="block font-heading text-xl font-semibold tracking-[-0.045em]">Arsync</span>
        <span className="block text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">School workspace</span>
      </span>
    </div>
  )
}

export default function LoginPage() {
  const [errorMessage, dispatch, isPending] = useActionState(authenticate, undefined)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  return (
    <main className="min-h-dvh bg-slate-100 p-0 text-slate-950 dark:bg-neutral-950 dark:text-white sm:p-4 lg:p-6">
      <div className="mx-auto grid min-h-dvh max-w-[1540px] overflow-hidden border-white/70 bg-white shadow-2xl shadow-slate-950/10 dark:border-white/10 dark:bg-neutral-900 sm:min-h-[calc(100dvh-2rem)] sm:rounded-[28px] sm:border lg:min-h-[calc(100dvh-3rem)] lg:grid-cols-[47%_53%]">
        <section className="relative hidden overflow-hidden bg-[#0d1634] text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
          <div aria-hidden className="absolute inset-0">
            <div className="absolute inset-0 bg-[linear-gradient(145deg,#162859_0%,#101a3d_52%,#091126_100%)]" />
            <div className="absolute -right-32 -top-40 size-[34rem] rounded-full bg-indigo-500/25 blur-3xl" />
            <div className="absolute -bottom-52 -left-40 size-[38rem] rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.16)_1px,transparent_1px)] [background-size:48px_48px]" />
          </div>

          <div className="relative z-10"><Brand /></div>

          <div className="relative z-10 max-w-xl py-10">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-medium text-cyan-200">
              <ShieldCheck className="size-3.5" /> One secure place for the school day
            </div>
            <h1 className="max-w-lg font-heading text-[3.25rem] font-semibold leading-[1.02] tracking-[-0.045em] xl:text-6xl">Keep teaching and learning moving.</h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">A focused workspace for every role—from the first class of the day to the last report.</p>

            <div className="mt-10 grid gap-3">
              {workspaceBenefits.map(({ icon: Icon, title, description }) => (
                <div key={title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-3 rounded-xl border border-white/10 bg-white/[0.055] p-3.5">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-white/10 text-cyan-200"><Icon className="size-[18px]" /></span>
                  <span><span className="block text-sm font-semibold">{title}</span><span className="mt-0.5 block text-xs leading-5 text-slate-300">{description}</span></span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between gap-4 text-xs text-slate-400">
            <span>ARSync academic workspace</span>
            <span className="flex items-center gap-1.5"><Check className="size-3.5 text-cyan-300" /> Role-aware access</span>
          </div>
        </section>

        <section className="relative flex min-w-0 flex-col bg-background">
          <div className="flex items-center justify-between border-b px-5 py-4 lg:hidden">
            <Brand />
            <span className="rounded-full border bg-muted/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">Secure sign in</span>
          </div>

          <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10 lg:px-14 xl:px-20">
            <div className="w-full max-w-[430px]">
              <div className="mb-8">
                <div className="mb-7 hidden lg:block"><Brand /></div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Welcome back</p>
                <h2 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.035em] sm:text-[2.5rem] sm:leading-tight">Sign in to continue</h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Use the account provided by your school. You’ll be taken directly to the right workspace for your role.</p>
              </div>

              <form action={dispatch} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@school.edu" required autoComplete="email" autoFocus aria-invalid={Boolean(errorMessage)} className="h-12 rounded-xl bg-muted/35 pl-11 pr-4 shadow-none focus-visible:bg-background" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <span className="text-xs text-muted-foreground">School-managed account</span>
                  </div>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="password" name="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" aria-invalid={Boolean(errorMessage)} className="h-12 rounded-xl bg-muted/35 pl-11 pr-12 shadow-none focus-visible:bg-background [&::-ms-clear]:hidden [&::-ms-reveal]:hidden" />
                    <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-0.5 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:right-1 sm:size-10">
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div aria-live="polite" aria-atomic="true">
                  {errorMessage && (
                    <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-3.5 py-3 text-sm text-destructive">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" /><span>{errorMessage}</span>
                    </div>
                  )}
                </div>

                <Button type="submit" size="lg" disabled={isPending} className="h-12 w-full rounded-xl text-sm font-semibold shadow-sm">
                  {isPending ? <><LoaderCircle className="size-4 animate-spin" /> Signing in…</> : <>Continue to Arsync <ArrowRight className="size-4" /></>}
                </Button>
              </form>

              <div className="mt-7 border-t pt-5 text-center text-xs leading-5 text-muted-foreground">
                Trouble signing in? Contact your school administrator to reset or activate your account.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 border-t px-5 py-4 text-[11px] text-muted-foreground sm:px-10 lg:px-14 xl:px-20">
            <span>Protected school access</span>
            <span>Arsync · Academic workspace</span>
          </div>
        </section>
      </div>
    </main>
  )
}
