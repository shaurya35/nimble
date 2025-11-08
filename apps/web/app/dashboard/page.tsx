"use client"
import React from "react"
import AgentInterface from "@/components/agent/AgentInterface"
import { AppSidebar } from "@/components/app-sidebar"
import NotesInterface from "@/components/notes/NotesInterface"
import { SelectedNoteProvider } from "@/components/notes/selected-note-context"
import BreadcrumbNote from "@/components/notes/BreadcrumbNote"
import { Separator } from "@/components/ui/separator"
import { Command, GripVertical, GripHorizontal } from "lucide-react"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function Page() {
  const [mounted, setMounted] = React.useState(false)
  const [sidebarOpen, setSidebarOpen] = React.useState<boolean>(true)
  const [agentWidth, setAgentWidth] = React.useState<number>(25)
  const [notepadHeight, setNotepadHeight] = React.useState<number>(50)
  const [isResizing, setIsResizing] = React.useState(false)
  const [isResizingMobile, setIsResizingMobile] = React.useState(false)
  const [isDesktop, setIsDesktop] = React.useState(false)

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("appSidebarCollapsed")
      setSidebarOpen(raw != null ? raw !== "true" : true)
      
      const savedWidth = localStorage.getItem("agentPanelWidth")
      if (savedWidth) {
        setAgentWidth(parseFloat(savedWidth))
      }

      const savedMobileHeight = localStorage.getItem("notepadMobileHeight")
      if (savedMobileHeight) {
        setNotepadHeight(parseFloat(savedMobileHeight))
      }
    } catch {}
    setMounted(true)
    
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768)
    }
    checkDesktop()
    window.addEventListener("resize", checkDesktop)
    return () => window.removeEventListener("resize", checkDesktop)
  }, [])

  const handleSidebarOpenChange = (open: boolean) => {
    setSidebarOpen(open)
    try { localStorage.setItem("appSidebarCollapsed", String(!open)) } catch {}
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  const handleMobileMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingMobile(true)
  }

  React.useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else if (isResizingMobile) {
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
    } else {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (typeof window === "undefined") return
      const container = document.querySelector('[data-slot="sidebar-inset"]') as HTMLElement
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const containerWidth = containerRect.width
      const padding = 32
      const gap = 16
      const availableWidth = containerWidth - padding * 2 - gap
      
      const mouseX = e.clientX - containerRect.left - padding
      const newAgentWidthPercent = ((availableWidth - mouseX) / availableWidth) * 100
      
      const minWidth = 20
      const maxWidth = 60
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newAgentWidthPercent))
      
      setAgentWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  React.useEffect(() => {
    if (!isResizingMobile) return

    const handleMove = (clientY: number) => {
      if (typeof window === "undefined") return
      const container = document.querySelector('[data-slot="sidebar-inset"]') as HTMLElement
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      const containerHeight = containerRect.height
      const headerHeight = 56
      const padding = 16
      const gap = 16
      const availableHeight = containerHeight - headerHeight - padding * 2 - gap
      
      const mouseY = clientY - containerRect.top - headerHeight - padding
      const newNotepadHeightPercent = (mouseY / availableHeight) * 100
      
      const minHeight = 25
      const maxHeight = 75
      const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newNotepadHeightPercent))
      
      setNotepadHeight(clampedHeight)
    }

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientY)
      }
    }

    const handleEnd = () => {
      setIsResizingMobile(false)
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleEnd)
    window.addEventListener("touchmove", handleTouchMove, { passive: false })
    window.addEventListener("touchend", handleEnd)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleEnd)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleEnd)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizingMobile])

  React.useEffect(() => {
    if (!isResizing && agentWidth) {
      try {
        localStorage.setItem("agentPanelWidth", String(agentWidth))
      } catch {}
    }
  }, [isResizing, agentWidth])

  React.useEffect(() => {
    if (!isResizingMobile && notepadHeight) {
      try {
        localStorage.setItem("notepadMobileHeight", String(notepadHeight))
      } catch {}
    }
  }, [isResizingMobile, notepadHeight])

  if (!mounted) return null

  const notepadWidth = 100 - agentWidth

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={handleSidebarOpenChange}>
      <SelectedNoteProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <header className="flex h-14 md:h-16 shrink-0 items-center gap-1.5 md:gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 dark:bg-[#282c34] dark:border-b dark:border-[#4a5568]">
          <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-4">
            <SidebarTrigger className="-ml-1 dark:text-[#9cdcfe] dark:hover:text-[#4fc3f7]" />
            <Separator
              orientation="vertical"
              className="mr-1 md:mr-2 data-[orientation=vertical]:h-4 dark:bg-[#4a5568]"
            />
            <BreadcrumbNote />
          </div>
          <div className="hidden md:flex items-center gap-2 ml-auto px-4">
            <div className="inline-flex items-center gap-1.5 rounded-md border border-border/60 dark:border-[#4a5568] bg-secondary/50 dark:bg-[#3e4451] backdrop-blur-sm px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground dark:text-[#4fc3f7]">
              <Command className="h-3.5 w-3.5 dark:text-[#4fc3f7]" />
              <span>AI Agent</span>
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col md:flex-row p-2 md:p-4 pt-0 md:min-h-0 md:overflow-hidden overflow-hidden">
          {/* <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
          </div> */}
          <div 
            className="bg-muted/50 dark:bg-[#282c34] rounded-xl md:min-h-0 md:flex md:flex-col md:overflow-hidden flex flex-col overflow-hidden"
            style={{ 
              flex: isDesktop ? `0 0 ${notepadWidth}%` : `0 0 ${notepadHeight}%`,
              height: isDesktop ? 'auto' : `${notepadHeight}%`
            }}
          >
            <NotesInterface/>
          </div>
          <div 
            className={`md:hidden flex items-center justify-center h-1 cursor-row-resize transition-colors group relative z-10 ${isResizingMobile ? 'bg-border' : 'hover:bg-border/50'}`}
            onMouseDown={handleMobileMouseDown}
            onTouchStart={handleMobileMouseDown as any}
          >
            <div className={`flex items-center gap-1 transition-opacity ${isResizingMobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              <GripHorizontal className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div 
            className={`hidden md:flex items-center justify-center w-1 cursor-col-resize transition-colors group relative z-10 ${isResizing ? 'bg-border' : 'hover:bg-border/50'}`}
            onMouseDown={handleMouseDown}
          >
            <div className={`flex flex-col gap-1 transition-opacity ${isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div 
            className="bg-muted/50 dark:bg-[#282c34] rounded-xl w-full md:min-h-0 md:flex md:flex-col md:overflow-hidden md:max-h-full flex flex-col overflow-hidden"
            style={{ 
              flex: isDesktop ? `0 0 ${agentWidth}%` : `0 0 ${100 - notepadHeight}%`,
              height: isDesktop ? 'auto' : `${100 - notepadHeight}%`
            }}
          >
            <AgentInterface/>
          </div>
        </div>
        </SidebarInset>
      </SelectedNoteProvider>
    </SidebarProvider>
  )
}
