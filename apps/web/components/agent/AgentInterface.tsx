"use client"

import * as React from "react"
import { Play, Loader2, Clipboard, Check, Sparkles, Wand2, ListTodo, NotebookPen, Trash2 } from "lucide-react"
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
        <div className="group h-full w-full font-sans text-sm relative">
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="inline-flex h-6 w-6 items-center justify-center rounded-md border">
                        <NotebookPen className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-medium">Agent</span>
                    {/* <span className="text-muted-foreground">for current note</span> */}
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-muted-foreground transition-all group-hover:pr-2">
                        {note ? note.title || "Untitled" : "No note selected"}
                    </div>
                    {runs.length > 0 && (
                        <button
                            type="button"
                            title="Clear history"
                            aria-label="Clear history"
                            onClick={() => setRuns([])}
                            className="inline-flex items-center gap-1 rounded-md border bg-background/90 px-2 py-1 text-xs opacity-0 shadow-sm backdrop-blur transition-all hover:bg-muted group-hover:opacity-100 group-hover:w-auto w-0 overflow-hidden"
                        >
                            <Trash2 className="h-3.5 w-3.5" /> Clear
                        </button>
                    )}
                </div>
            </div>

            <div className="px-4">
                <form onSubmit={onSubmit} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
                    <input
                        value={command}
                        onChange={(e)=>setCommand(e.target.value)}
                        placeholder="Type a command (e.g., Summarize, Make bullets, Extract tasks)"
                        className="flex-1 bg-transparent outline-none"
                    />
                    <button type="submit" className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-muted">
                        <Play className="h-3.5 w-3.5" /> Run
                    </button>
                </form>

                <div className="mt-2 flex flex-wrap gap-2">
                    <QuickAction icon={Sparkles} label="Summarize" onClick={()=>enqueue("Summarize note", "summarize")} />
                    <QuickAction icon={Wand2} label="Make bullets" onClick={()=>enqueue("Make bullets", "bullets")} />
                    <QuickAction icon={ListTodo} label="Extract tasks" onClick={()=>enqueue("Extract tasks", "tasks")} />
                </div>
            </div>

            <div className="mt-4 space-y-3 px-4 pb-4">
                {runs.length === 0 ? (
                    <div className="text-muted-foreground">No runs yet. Use the actions above to get started.</div>
                ) : runs.map(run => (
                    <div key={run.id} className="rounded-md border">
                        <div className="flex items-center justify-between border-b px-3 py-2">
                            <div className="flex items-center gap-2">
                                <span className="rounded bg-muted px-1.5 py-0.5">{run.command}</span>
                                {run.status === "running" && <span className="inline-flex items-center gap-1 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> running</span>}
                                {run.status === "success" && <span className="text-emerald-500">done</span>}
                            </div>
                            {run.status === "success" && (
                                <button onClick={()=>copyOutput(run.id, run.output)} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-muted">
                                    {copiedId === run.id ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />} Copy
                                </button>
                            )}
                        </div>
                        <div className="max-h-64 overflow-auto px-3 py-2">
                            {run.status === "running" ? (
                                <div className="text-muted-foreground">Working…</div>
                            ) : (
                                <pre className="whitespace-pre-wrap leading-relaxed font-sans text-sm">{run.output}</pre>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function QuickAction({ icon: Icon, label, onClick }: { icon: any, label: string, onClick: () => void }){
    return (
        <button onClick={onClick} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-muted">
            <Icon className="h-3.5 w-3.5" /> {label}
        </button>
    )
}