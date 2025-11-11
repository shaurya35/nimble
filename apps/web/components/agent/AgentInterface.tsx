"use client"

import * as React from "react"
import { Play, Loader2, Clipboard, Check, Sparkles, Wand2, ListTodo, NotebookPen, Trash2, Zap, Command, Bot, Eye, EyeOff, Key, Pencil, X, Sunrise, Lightbulb, Target, BookOpen, Coffee, TrendingUp, Brain, Rocket, Search, BarChart3, Link2, FileText, GitBranch, Sparkles as SparklesIcon, BookOpen as BookOpenIcon, RefreshCw, CheckSquare, KeyRound } from "lucide-react"
import { useSelectedNote } from "@/components/notes/selected-note-context"
import { getNotes, getFolders } from "@/services/localstorage"

type RunStatus = "queued" | "running" | "success" | "error"

type Run = {
    id: string
    command: string
    status: RunStatus
    createdAt: string
    output: string
}

// WebSocket server URL - adjust for production
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"

// API Key - get from localStorage or environment variable
const getApiKey = (): string => {
    if (typeof window === "undefined") return ""
    // Check localStorage first, then env variable
    const stored = localStorage.getItem("gemini_api_key")
    if (stored) return stored
    return process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""
}

// Model configuration
const DEFAULT_MODEL = "gemini-2.5-flash"
const DEFAULT_CONFIG = {
    temperature: 0.3,
    maxTokens: 4000
}

function useSelectedNoteData(){
    const { selectedNoteId } = useSelectedNote()
    const notes = getNotes()
    const note = notes.find(n => String(n.id) === String(selectedNoteId))
    return note
}

export default function AgentInterface({ apiKey: propApiKey = "", hasApiKey: propHasApiKey = false }: { apiKey?: string, hasApiKey?: boolean } = {}){
    const note = useSelectedNoteData()
    const [command, setCommand] = React.useState("")
    const [runs, setRuns] = React.useState<Run[]>([])
    const [copiedId, setCopiedId] = React.useState<string | null>(null)
    const [hasApiKey, setHasApiKey] = React.useState<boolean>(propHasApiKey)
    const actualApiKey = propApiKey || getApiKey()
    const wsRef = React.useRef<WebSocket | null>(null)
    const reconnectTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
    const pendingQueriesRef = React.useRef<Map<string, { resolve: (response: any) => void, reject: (error: any) => void }>>(new Map())

    // Interactive prompt suggestions - clickable AI requests (general queries, no notes needed) - Best 3
    const promptSuggestions = [
        { icon: Sunrise, text: "Morning boost", prompt: "Give me a motivational quote to start my day", isGeneral: true },
        { icon: Zap, text: "Productivity hack", prompt: "Share a quick productivity tip I can use today", isGeneral: true },
        { icon: BookOpen, text: "Quote of the day", prompt: "Give me an inspiring quote of the day", isGeneral: true },
    ]

    // Quick actions for knowledge base queries (needs notes) - Best 3
    const quickActions = [
        { icon: RefreshCw, text: "Catch me up", prompt: "Give me a brief summary of all my notes and tasks to catch me up on what I've been working on", isGeneral: false },
        { icon: CheckSquare, text: "Find action items", prompt: "Scan through all my notes and pull out a checklist of to-dos, action items, and next steps that I need to complete", isGeneral: false },
        { icon: BarChart3, text: "What's important?", prompt: "Review all my notes and tell me what are the most important topics, deadlines, or action items I should focus on", isGeneral: false },
    ]

    // Sync API key from props
    React.useEffect(() => {
        setHasApiKey(propHasApiKey)
    }, [propHasApiKey])

    // Initialize persistent WebSocket connection
    React.useEffect(() => {
        const connectWebSocket = () => {
            // Don't connect if no API key
            const apiKey = actualApiKey || getApiKey()
            if (!apiKey) {
                return
            }

            // Close existing connection if any
            if (wsRef.current) {
                wsRef.current.close()
            }

            try {
                const ws = new WebSocket(WS_URL)
                wsRef.current = ws

                ws.onopen = () => {
                    console.log("WebSocket connected")
                    // Clear any reconnect timeout
                    if (reconnectTimeoutRef.current) {
                        clearTimeout(reconnectTimeoutRef.current)
                        reconnectTimeoutRef.current = null
                    }
                }

                ws.onmessage = (event) => {
                    try {
                        const response = JSON.parse(event.data.toString())
                        
                        // Check if this is a response to a pending query
                        if (response.queryId && pendingQueriesRef.current.has(response.queryId)) {
                            const { resolve } = pendingQueriesRef.current.get(response.queryId)!
                            pendingQueriesRef.current.delete(response.queryId)
                            resolve(response)
                            return
                        }

                        // Fallback: handle response without queryId (backward compatibility)
                        // This shouldn't happen with the new implementation, but handle it gracefully
                        console.warn("Received response without queryId")
                    } catch (error) {
                        console.error("Failed to parse WebSocket message:", error)
                    }
                }

                ws.onerror = (error) => {
                    console.error("WebSocket error:", error)
                }

                ws.onclose = () => {
                    console.log("WebSocket disconnected")
                    wsRef.current = null
                    
                    // Attempt to reconnect after 3 seconds (only if we have an API key)
                    const apiKey = actualApiKey || getApiKey()
                    if (apiKey) {
                        reconnectTimeoutRef.current = setTimeout(() => {
                            connectWebSocket()
                        }, 3000)
                    }
                }
            } catch (error) {
                console.error("Failed to create WebSocket connection:", error)
            }
        }

        // Connect on mount
        connectWebSocket()

        // Cleanup on unmount
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current)
            }
            if (wsRef.current) {
                wsRef.current.close()
                wsRef.current = null
            }
            pendingQueriesRef.current.clear()
        }
    }, [actualApiKey])

    const enqueue = async (cmd: string) => {
        // Use API key from props or get from storage
        const apiKey = actualApiKey || getApiKey()
        if (!apiKey) {
            setHasApiKey(false)
            return
        }

        const id = String(Date.now())
        const createdAt = new Date().toISOString()
        const next: Run = { id, command: cmd, status: "running", createdAt, output: "" }
        setRuns(prev => [next, ...prev])

        // Determine if this is a general query (doesn't need notes) or knowledge base query
        const isGeneralQuery = !cmd.toLowerCase().includes("my notes") && 
                               !cmd.toLowerCase().includes("my folders") &&
                               !cmd.toLowerCase().includes("in my notes") &&
                               !cmd.toLowerCase().includes("from my notes") &&
                               !cmd.toLowerCase().includes("summarize") &&
                               !cmd.toLowerCase().includes("find") &&
                               !cmd.toLowerCase().includes("analyze") &&
                               (cmd.toLowerCase().includes("quote") ||
                                cmd.toLowerCase().includes("motivation") ||
                                cmd.toLowerCase().includes("wisdom") ||
                                cmd.toLowerCase().includes("productivity tip") ||
                                cmd.toLowerCase().includes("creative") ||
                                cmd.toLowerCase().includes("learning insight") ||
                                cmd.toLowerCase().includes("tip"))

        // Get notes and folders from localStorage (only for knowledge base queries)
        const notes = isGeneralQuery ? [] : getNotes()
        const folders = isGeneralQuery ? [] : getFolders()

        // Use higher temperature for general queries (more creative/varied) vs knowledge base queries (more deterministic)
        const config = isGeneralQuery 
            ? { temperature: 0.9, maxTokens: 4000 } // Higher temperature for varied, creative responses
            : DEFAULT_CONFIG // Lower temperature for accurate knowledge base queries

        // Get conversation history (last 5 successful general queries for variety)
        const recentGeneralQueries = runs
            .filter(r => {
                if (r.status !== "success") return false
                const cmdLower = r.command.toLowerCase()
                return cmdLower.includes("quote") || cmdLower.includes("motivation") || cmdLower.includes("productivity tip")
            })
            .slice(0, 5)
            .map(r => ({ command: r.command, response: r.output }))

        // Send query via persistent WebSocket connection
        try {
            const ws = wsRef.current

            // Wait for connection if not ready
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                // Wait up to 5 seconds for connection
                let attempts = 0
                while ((!ws || ws.readyState !== WebSocket.OPEN) && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100))
                    attempts++
                }

                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    setRuns(prev => prev.map(r => r.id === id ? { 
                        ...r, 
                        status: "error", 
                        output: "WebSocket not connected. Please wait a moment and try again." 
                    } : r))
                    return
                }
            }

            // Create promise for this query
            const queryPromise = new Promise<any>((resolve, reject) => {
                pendingQueriesRef.current.set(id, { resolve, reject })

                // Timeout after 60 seconds
                setTimeout(() => {
                    if (pendingQueriesRef.current.has(id)) {
                        pendingQueriesRef.current.delete(id)
                        reject(new Error("Request timeout: No response received within 60 seconds."))
                    }
                }, 60000)
            })

            // Send query message
            const message = {
                queryId: id,
                message: cmd,
                apiKey: apiKey,
                model: DEFAULT_MODEL,
                config: config,
                operationType: "query" as const,
                notes: isGeneralQuery ? "" : JSON.stringify(notes),
                folders: isGeneralQuery ? "" : JSON.stringify(folders),
                conversationHistory: isGeneralQuery ? recentGeneralQueries : []
            }
            ws.send(JSON.stringify(message))

            // Handle response
            try {
                const response = await queryPromise
                
                if (response.success && response.type === "query") {
                    // Success - update run with response
                    setRuns(prev => prev.map(r => r.id === id ? { 
                        ...r, 
                        status: "success", 
                        output: response.response || "No response received" 
                    } : r))
                } else if (response.error) {
                    // Error - update run with error
                    setRuns(prev => prev.map(r => r.id === id ? { 
                        ...r, 
                        status: "error", 
                        output: `Error: ${response.error}` 
                    } : r))
                    if (response.error.includes("API key") || response.error.includes("apiKey")) {
                        setHasApiKey(false)
                    }
                } else {
                    // Unknown response format
                    setRuns(prev => prev.map(r => r.id === id ? { 
                        ...r, 
                        status: "error", 
                        output: `Unexpected response format: ${JSON.stringify(response)}` 
                    } : r))
                }
            } catch (error) {
                setRuns(prev => prev.map(r => r.id === id ? { 
                    ...r, 
                    status: "error", 
                    output: error instanceof Error ? error.message : String(error)
                } : r))
            }

        } catch (error) {
            setRuns(prev => prev.map(r => r.id === id ? { 
                ...r, 
                status: "error", 
                output: `Failed to send query: ${error instanceof Error ? error.message : String(error)}` 
            } : r))
        }
    }

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!command.trim()) return
        if (!hasApiKey) {
            setRuns(prev => [{
                id: String(Date.now()),
                command: command.trim(),
                status: "error",
                createdAt: new Date().toISOString(),
                output: "Error: API key not configured. Please set your Gemini API key in localStorage with key 'gemini_api_key' or set NEXT_PUBLIC_GEMINI_API_KEY environment variable.\n\nTo set it, open browser console and run:\nlocalStorage.setItem('gemini_api_key', 'YOUR_API_KEY_HERE')"
            }, ...prev])
            return
        }
        enqueue(command.trim())
        setCommand("")
    }

    const copyOutput = async (id: string, text: string) => {
        try{ await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(()=>setCopiedId(null), 1000) } catch {}
    }

    return (
        <div className="h-full w-full flex flex-col bg-background dark:bg-[#282c34] overflow-hidden border-l border-border/50 dark:border-[#4a5568]">
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
                                placeholder={hasApiKey ? "Ask anything or use quick actions..." : "Set API key below to use AI"}
                                disabled={!hasApiKey}
                                className="w-full pl-9 md:pl-10 pr-16 md:pr-20 py-1.5 md:py-2 rounded-lg border border-border/60 dark:border-[#4a5568] bg-input dark:bg-[#3e4451] text-xs md:text-sm placeholder:text-muted-foreground/60 dark:placeholder:text-[#828997] dark:text-[#d4d4d4] focus:outline-none focus:ring-2 focus:ring-primary/30 dark:focus:ring-[#4fc3f7]/40 focus:border-primary/50 dark:focus:border-[#4fc3f7] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <button 
                                type="submit" 
                                disabled={!command.trim() || !hasApiKey}
                                className="absolute right-1 md:right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 md:gap-1.5 rounded-md bg-primary text-primary-foreground px-2 md:px-2.5 py-1 md:py-1.5 text-[10px] md:text-[11px] font-medium transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary shadow-sm"
                            >
                                <Play className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                <span className="hidden sm:inline">Run</span>
                            </button>
                        </div>
                    
                    {/* Quick Actions & Prompts Section */}
                    {hasApiKey && (
                        <div className="flex flex-col gap-2.5">
                            {/* General Prompts - Inspiration & Daily Boost */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5">
                                    <SparklesIcon className="h-3 w-3 text-muted-foreground/70 dark:text-[#9cdcfe]" />
                                    <span className="text-[10px] md:text-[11px] text-muted-foreground/70 dark:text-[#9cdcfe] font-medium">Daily Boost</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1 md:gap-1.5">
                                    {promptSuggestions.map((suggestion, idx) => {
                                        const Icon = suggestion.icon
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    enqueue(suggestion.prompt)
                                                }}
                                                className="inline-flex items-center gap-1 md:gap-1.5 rounded-md border border-border/60 dark:border-[#4a5568] bg-secondary/50 dark:bg-[#3e4451] px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-[11px] font-medium transition-all hover:bg-secondary dark:hover:bg-[#4a5568] hover:border-border dark:hover:border-[#4fc3f7] active:scale-95 dark:text-[#9cdcfe] dark:hover:text-[#4fc3f7]"
                                                title={suggestion.prompt}
                                            >
                                                <Icon className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                                <span>{suggestion.text}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                            
                            {/* Knowledge Base Quick Actions - Your Notes */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5">
                                    <BookOpenIcon className="h-3 w-3 text-muted-foreground/70 dark:text-[#9cdcfe]" />
                                    <span className="text-[10px] md:text-[11px] text-muted-foreground/70 dark:text-[#9cdcfe] font-medium">Your Notes</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1 md:gap-1.5">
                                    {quickActions.map((action, idx) => {
                                        const Icon = action.icon
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    enqueue(action.prompt)
                                                }}
                                                className="inline-flex items-center gap-1 md:gap-1.5 rounded-md border border-border/60 dark:border-[#4a5568] bg-secondary/50 dark:bg-[#3e4451] px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-[11px] font-medium transition-all hover:bg-secondary dark:hover:bg-[#4a5568] hover:border-border dark:hover:border-[#4fc3f7] active:scale-95 dark:text-[#9cdcfe] dark:hover:text-[#4fc3f7]"
                                                title={action.prompt}
                                            >
                                                <Icon className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                                <span>{action.text}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                    {!hasApiKey && (
                        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-border/60 dark:border-[#4a5568] bg-secondary/30 dark:bg-[#3e4451]/50">
                            <KeyRound className="h-3.5 w-3.5 text-muted-foreground/70 dark:text-[#9cdcfe] shrink-0" />
                            <p className="text-[10px] md:text-[11px] text-muted-foreground/70 dark:text-[#9cdcfe]">
                                Set your API key in the header to unlock AI-powered insights
                            </p>
                        </div>
                    )}
                </form>
            </div>

            {/* Results Section - Scrollable */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {/* Results Header with Clear Button */}
                {runs.length > 0 && (
                    <div className="flex items-center justify-between px-3 md:px-5 py-2 border-b border-border/40 dark:border-[#4a5568]/50">
                        <span className="text-[10px] md:text-[11px] text-muted-foreground/70 dark:text-[#9cdcfe] font-medium">
                            {runs.length} {runs.length === 1 ? 'conversation' : 'conversations'}
                        </span>
                        <button
                            type="button"
                            onClick={() => setRuns([])}
                            className="inline-flex items-center gap-1 md:gap-1.5 rounded-md border border-border/60 dark:border-[#4a5568] bg-secondary/30 dark:bg-[#3e4451]/50 hover:bg-secondary/50 dark:hover:bg-[#4a5568] hover:border-border dark:hover:border-[#f48771]/50 active:scale-95 transition-all group px-1.5 md:px-2 py-0.5 md:py-1"
                            title="Clear history"
                        >
                            <Trash2 className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground/70 dark:text-[#9cdcfe] group-hover:text-foreground dark:group-hover:text-[#f48771] transition-colors" />
                            <span className="text-[10px] md:text-[11px] font-medium text-muted-foreground/70 dark:text-[#9cdcfe] group-hover:text-foreground dark:group-hover:text-[#f48771] transition-colors hidden sm:inline">Clear</span>
                        </button>
                    </div>
                )}
                <div className="flex-1 min-h-0 overflow-y-auto px-3 md:px-5 py-3 md:py-4 space-y-2 md:space-y-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
        </div>
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
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-[#a5d6a7] shrink-0" />
                            <span className="font-medium text-emerald-600 dark:text-[#a5d6a7] hidden sm:inline">Done</span>
                        </span>
                    )}
                    {run.status === "error" && (
                        <span className="inline-flex items-center gap-1 md:gap-1.5 text-[10px] md:text-[11px] whitespace-nowrap">
                            <div className="h-1.5 w-1.5 rounded-full bg-red-500 dark:bg-red-400 shrink-0" />
                            <span className="font-medium text-red-600 dark:text-red-400 hidden sm:inline">Error</span>
                        </span>
                    )}
                </div>
                {(run.status === "success" || run.status === "error") && (
                    <button 
                        onClick={onCopy}
                        className="inline-flex items-center gap-1 md:gap-1.5 rounded-md border border-border/60 dark:border-[#4a5568] bg-secondary/30 dark:bg-[#3e4451] px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-[11px] font-medium transition-all hover:bg-secondary dark:hover:bg-[#4a5568] active:scale-95 shrink-0"
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
                ) : run.status === "error" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                        <pre className="whitespace-pre-wrap font-sans text-[10px] md:text-xs leading-relaxed text-red-600 dark:text-red-400 bg-transparent p-0 m-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                            {run.output}
                        </pre>
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