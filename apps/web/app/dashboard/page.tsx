"use client"
import React from "react"
import AgentInterface from "@/components/agent/AgentInterface"
import { AppSidebar } from "@/components/app-sidebar"
import NotesInterface from "@/components/notes/NotesInterface"
import { SelectedNoteProvider } from "@/components/notes/selected-note-context"
import BreadcrumbNote from "@/components/notes/BreadcrumbNote"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export default function Page() {
  const [mounted, setMounted] = React.useState(false)
  const [sidebarOpen, setSidebarOpen] = React.useState<boolean>(true)

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("appSidebarCollapsed")
      setSidebarOpen(raw != null ? raw !== "true" : true)
    } catch {}
    setMounted(true)
  }, [])

  const handleSidebarOpenChange = (open: boolean) => {
    setSidebarOpen(open)
    try { localStorage.setItem("appSidebarCollapsed", String(!open)) } catch {}
  }

  if (!mounted) return null

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={handleSidebarOpenChange}>
      <SelectedNoteProvider>
        <AppSidebar />
        <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <BreadcrumbNote />
          </div>
        </header>
        <div className="flex flex-1 flex-row gap-4 p-4 pt-0">
          {/* <div className="grid auto-rows-min gap-4 md:grid-cols-3">
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
            <div className="bg-muted/50 aspect-video rounded-xl" />
          </div> */}
          <div className="bg-muted/50 min-h-screen flex-1 rounded-xl md:min-h-min" >
            <NotesInterface/>
          </div>
          <div className="bg-muted/50 max-h-screen rounded-xl md:min-h-min w-[30%]">
            <AgentInterface/>
          </div>
        </div>
        </SidebarInset>
      </SelectedNoteProvider>
    </SidebarProvider>
  )
}
