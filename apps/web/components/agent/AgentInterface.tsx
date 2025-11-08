"use client"

import * as React from "react"
import { Play, Loader2, Clipboard, Check, Sparkles, Wand2, ListTodo, NotebookPen, Trash2, Zap, Command, Bot } from "lucide-react"
import { useSelectedNote } from "@/components/notes/selected-note-context"
import { getNotes } from "@/services/localstorage"

type RunStatus = "queued" | "running" | "success" | "error"

type Run = {
    id: string
    command: string
    status: RunStatus
    createdAt: string
    output: string
}

function useSelectedNoteData(){
    const { selectedNoteId } = useSelectedNote()
    const notes = getNotes()
    const note = notes.find(n => String(n.id) === String(selectedNoteId))
    return note
}

function formatOutput(kind: string, text: string, title: string){
    const body = text || ""
    if(!body.trim()) return "No content in the current note."
    const lines = body.split(/\r?\n/)
    const cleaned = lines
        .map(l => l.replace(/^[-*>\s]+/, "").trim())
        .filter(l => l.length > 0)
    switch(kind){
        case "summarize":
            return `Summary of ${title || "Untitled"}:\n` + cleaned.slice(0,5).join(" ")
        case "bullets":
            return [title ? `• ${title}` : null, ...cleaned.slice(0,8).map(l => `• ${l}`)].filter(Boolean).join("\n")
        case "tasks":
            return cleaned
                .map(l => l.match(/(todo|task|action|next)/i) ? `- [ ] ${l}` : `- [ ] ${l}`)
                .filter(Boolean)
                .slice(0,10)
                .join("\n") || "No tasks detected."
        default:
            return body
    }
}

export default function AgentInterface(){
    const note = useSelectedNoteData()
    const [command, setCommand] = React.useState("")
    const [runs, setRuns] = React.useState<Run[]>([])
    const [copiedId, setCopiedId] = React.useState<string | null>(null)

    const enqueue = (cmd: string, kind?: string) => {
        const id = String(Date.now())
        const createdAt = new Date().toISOString()
        const next: Run = { id, command: cmd, status: "running", createdAt, output: "" }
        setRuns(prev => [next, ...prev])
        setTimeout(() => {
            const output = formatOutput(kind || inferKind(cmd), note?.content || "", note?.title || "")
            setRuns(prev => prev.map(r => r.id === id ? { ...r, status: "success", output } : r))
        }, 800)
    }

    const inferKind = (cmd: string) => {
        const c = cmd.toLowerCase()
        if (c.includes("bullet")) return "bullets"
        if (c.includes("task") || c.includes("todo")) return "tasks"
        return "summarize"
    }

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!command.trim()) return
        enqueue(command.trim())
        setCommand("")
    }

    const copyOutput = async (id: string, text: string) => {
        try{ await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(()=>setCopiedId(null), 1000) } catch {}
    }

    return (
        <div className="h-full w-full flex flex-col bg-background dark:bg-[#282c34] overflow-hidden border-l border-border/50 dark:border-[#4a5568]">
            {/* Header */}
            <div className="flex items-center justify-between px-3 md:px-5 py-2.5 md:py-3.5 border-b border-border/50 dark:border-[#4a5568] dark:bg-[#2c313c]">
                <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                    <div className="relative flex-shrink-0">
                        <div className="relative inline-flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-lg dark:bg-[#3e4451] border dark:border-[#4a5568]">
                            <Bot className="h-4 w-4 md:h-4.5 md:w-4.5 text-primary dark:text-[#4fc3f7]" />
                        </div>
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="font-semibold text-sm md:text-[15px] leading-tight tracking-tight text-foreground dark:text-[#d4d4d4]">AI Agent</h2>
                        <p className="text-[10px] md:text-[11px] text-muted-foreground/80 dark:text-[#9cdcfe] mt-0.5 leading-tight truncate">
                            {note ? (note.title || "Untitled") : "No note selected"}
                        </p>
                    </div>
                </div>
                {runs.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setRuns([])}
                        className="inline-flex items-center gap-1 md:gap-1.5 rounded-md border border-border/60 dark:border-[#4a5568] bg-background/80 dark:bg-[#3e4451] px-2 md:px-2.5 py-1 md:py-1.5 text-[10px] md:text-[11px] font-medium transition-all hover:bg-muted/80 dark:hover:bg-[#4a5568] hover:border-border dark:hover:border-[#4a5568] active:scale-95 flex-shrink-0 dark:text-[#9cdcfe] dark:hover:text-[#f48771]"
                        title="Clear history"
                    >
                        <Trash2 className="h-3 w-3" />
                        <span className="hidden sm:inline">Clear</span>
                    </button>
                )}
            </div>

            {/* Command Input Section */}
            <div className="px-3 md:px-5 py-2.5 md:py-3.5 border-b border-border/50 dark:border-[#4a5568] dark:bg-[#282c34]">
                <form onSubmit={onSubmit} className="space-y-2 md:space-y-3">
                    <div className="relative group">
                        <div className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 text-primary/70 dark:text-[#4fc3f7]/70 group-focus-within:text-primary dark:group-focus-within:text-[#4fc3f7] transition-colors z-10">
                            <Command className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        </div>
                        <input
                            value={command}
                            onChange={(e)=>setCommand(e.target.value)}
                            placeholder="Ask anything or use quick actions..."
                            className="w-full pl-9 md:pl-10 pr-16 md:pr-20 py-1.5 md:py-2 rounded-lg border border-border/60 dark:border-[#4a5568] bg-input dark:bg-[#3e4451] text-xs md:text-sm placeholder:text-muted-foreground/60 dark:placeholder:text-[#828997] dark:text-[#d4d4d4] focus:outline-none focus:ring-2 focus:ring-primary/30 dark:focus:ring-[#4fc3f7]/40 focus:border-primary/50 dark:focus:border-[#4fc3f7] transition-all"
                        />
                        <button 
                            type="submit" 
                            disabled={!command.trim()}
                            className="absolute right-1 md:right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 md:gap-1.5 rounded-md bg-primary text-primary-foreground px-2 md:px-2.5 py-1 md:py-1.5 text-[10px] md:text-[11px] font-medium transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary shadow-sm"
                        >
                            <Play className="h-2.5 w-2.5 md:h-3 md:w-3" />
                            <span className="hidden sm:inline">Run</span>
                        </button>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1 md:gap-1.5">
                        <span className="text-[10px] md:text-[11px] text-muted-foreground/70 dark:text-[#9cdcfe] font-medium mr-0.5">Quick:</span>
                        <QuickAction icon={Sparkles} label="Summarize" onClick={()=>enqueue("Summarize note", "summarize")} />
                        <QuickAction icon={Wand2} label="Bullets" onClick={()=>enqueue("Make bullets", "bullets")} />
                        <QuickAction icon={ListTodo} label="Tasks" onClick={()=>enqueue("Extract tasks", "tasks")} />
                    </div>
                </form>
            </div>

            {/* Results Section - Scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto px-3 md:px-5 py-3 md:py-4 space-y-2 md:space-y-3 [scrollbar-width:thin] [scrollbar-color:oklch(var(--muted))_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent">
                {runs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-16 px-4">
                        <div className="relative mb-5">
                            <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full" />
                            <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/60 to-muted/40 border border-border/40">
                                <Bot className="h-10 w-10 text-muted-foreground/60" />
                            </div>
                        </div>
                        <h3 className="font-medium text-sm mb-1.5 text-foreground/90 dark:text-[#d4d4d4]">Ready to assist</h3>
                        <p className="text-xs text-muted-foreground/70 dark:text-[#9cdcfe] max-w-[200px] leading-relaxed">
                            Type a command or use quick actions to get started
                        </p>
                    </div>
                ) : runs.map(run => (
                    <RunCard 
                        key={run.id} 
                        run={run} 
                        onCopy={() => copyOutput(run.id, run.output)}
                        copied={copiedId === run.id}
                    />
                ))}
            </div>
        </div>
    )
}

function QuickAction({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }){
    return (
        <button 
            onClick={onClick} 
            className="inline-flex items-center gap-1 md:gap-1.5 rounded-md border border-border/60 dark:border-[#4a5568] bg-secondary/50 dark:bg-[#3e4451] px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-[11px] font-medium transition-all hover:bg-secondary dark:hover:bg-[#4a5568] hover:border-border dark:hover:border-[#4fc3f7] active:scale-95 dark:text-[#9cdcfe] dark:hover:text-[#4fc3f7]"
        >
            <Icon className="h-2.5 w-2.5 md:h-3 md:w-3" />
            {label}
        </button>
    )
}

function RunCard({ run, onCopy, copied }: { run: Run, onCopy: () => void, copied: boolean }){
    return (
        <div className="group/run rounded-lg border border-border/60 dark:border-[#4a5568] bg-card dark:bg-[#2c313c] transition-all hover:border-border/80 dark:hover:border-[#4fc3f7]/50">
            {/* Header */}
            <div className="flex items-center justify-between px-2.5 md:px-3.5 py-2 md:py-2.5 border-b border-border/40 dark:border-[#4a5568] dark:bg-[#3e4451]/20 gap-2">
                <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0">
                    <div className="inline-flex items-center rounded-md bg-secondary/30 dark:bg-[#3e4451] border border-border/50 dark:border-[#4a5568] px-1.5 md:px-2 py-0.5 md:py-1 min-w-0">
                        <span className="text-[10px] md:text-[11px] font-medium text-foreground/90 dark:text-[#d4d4d4] truncate max-w-[100px] md:max-w-[140px]">{run.command}</span>
                    </div>
                    {run.status === "success" && (
                        <span className="inline-flex items-center gap-1 md:gap-1.5 text-[10px] md:text-[11px] whitespace-nowrap">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-[#a5d6a7] flex-shrink-0" />
                            <span className="font-medium text-emerald-600 dark:text-[#a5d6a7] hidden sm:inline">Done</span>
                        </span>
                    )}
                </div>
                {run.status === "success" && (
                    <button 
                        onClick={onCopy}
                        className="inline-flex items-center gap-1 md:gap-1.5 rounded-md border border-border/60 dark:border-[#4a5568] bg-secondary/30 dark:bg-[#3e4451] px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-[11px] font-medium transition-all hover:bg-secondary dark:hover:bg-[#4a5568] active:scale-95 flex-shrink-0"
                    >
                        {copied ? (
                            <>
                                <Check className="h-2.5 w-2.5 md:h-3 md:w-3 text-emerald-500 dark:text-[#a5d6a7]" />
                                <span className="hidden sm:inline dark:text-[#a5d6a7]">Copied</span>
                            </>
                        ) : (
                            <>
                                <Clipboard className="h-2.5 w-2.5 md:h-3 md:w-3 dark:text-[#9cdcfe]" />
                                <span className="hidden sm:inline dark:text-[#9cdcfe]">Copy</span>
                            </>
                        )}
                    </button>
                )}
            </div>
            
            {/* Content */}
            <div className="px-2.5 md:px-3.5 py-2 md:py-3">
                {run.status === "running" ? (
                    <div className="relative overflow-hidden rounded-md dark:bg-[#2c313c]/50 min-h-[120px]">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#4fc3f7]/10 to-transparent" style={{ animation: 'shimmer 2s infinite' }}></div>
                        <div className="relative flex items-center justify-center h-full">
                            <div className="absolute inset-0 bg-[#4fc3f7]/20 blur-xl rounded-full animate-pulse"></div>
                        </div>
                    </div>
                ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <pre className="whitespace-pre-wrap font-sans text-[10px] md:text-xs leading-relaxed text-foreground/90 dark:text-[#d4d4d4] bg-transparent p-0 m-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            {run.output}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    )
}