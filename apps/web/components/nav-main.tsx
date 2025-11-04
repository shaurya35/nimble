"use client";

import * as React from "react";
import { ChevronRight, Plus, Trash2, type LucideIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
  onSelectNote,
  onAddNote,
  onDeleteFolder,
  onStartPickIcon,
  pickingFolderId,
  pickingPosition,
  iconOptions,
  onPickIcon,
  onCancelPick,
  addingNoteForFolderId,
  newNoteTitle,
  onStartAddNote,
  onChangeNewNoteTitle,
  onConfirmAddNote,
  onCancelAddNote,
  onDeleteNote,
  addMode,
  newFolderName,
  onStartAdd,
  onChangeNewName,
  onConfirmAdd,
  onCancelAdd,
}: {
  items: {
    id?: string | null;
    title: string;
    url?: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      id: string;
      title: string;
      url?: string;
    }[];
  }[];
  onSelectNote?: (noteId: string) => void;
  onAddNote?: (folderId: string | null) => void;
  onDeleteFolder?: (folderId: string) => void;
  onStartPickIcon?: (folderId: string, pos: { x: number; y: number }) => void;
  pickingFolderId?: string | null;
  pickingPosition?: { x: number; y: number } | null;
  iconOptions?: { key: string; Icon: LucideIcon }[];
  onPickIcon?: (folderId: string, key: string) => void;
  onCancelPick?: () => void;
  addingNoteForFolderId?: string | null;
  newNoteTitle?: string;
  onStartAddNote?: (folderId: string | null) => void;
  onChangeNewNoteTitle?: (value: string) => void;
  onConfirmAddNote?: () => void;
  onCancelAddNote?: () => void;
  onDeleteNote?: (noteId: string) => void;
  addMode?: boolean;
  newFolderName?: string;
  onStartAdd?: () => void;
  onChangeNewName?: (value: string) => void;
  onConfirmAdd?: () => void;
  onCancelAdd?: () => void;
}) {
  const [openById, setOpenById] = React.useState<Record<string, boolean>>({});
  const OPEN_KEY = "folderOpenState";

  const readOpenMap = React.useCallback((): Record<string, boolean> => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(OPEN_KEY);
      const v = raw ? JSON.parse(raw) : {};
      return typeof v === "object" && v ? v : {};
    } catch {
      return {};
    }
  }, []);

  const writeOpenMap = React.useCallback((map: Record<string, boolean>) => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(OPEN_KEY, JSON.stringify(map)); } catch {}
  }, []);
  const folderInputRef = React.useRef<HTMLInputElement | null>(null);
  const noteInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setOpenById((prev) => {
      const stored = readOpenMap();
      const next = { ...stored, ...prev } as Record<string, boolean>;
      for (const it of items as any[]) {
        const id = String(it.id ?? it.title);
        if (!(id in next)) next[id] = !!it.isActive;
      }
      writeOpenMap(next);
      return next;
    });
  }, [items, readOpenMap, writeOpenMap]);

  React.useEffect(() => {
    if (addingNoteForFolderId == null) return;
    const id = String(addingNoteForFolderId);
    setOpenById((prev) => {
      const next = { ...prev, [id]: true };
      writeOpenMap(next);
      return next;
    });
  }, [addingNoteForFolderId, writeOpenMap]);

  React.useEffect(() => {
    const handleClickAway = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (addMode) {
        if (folderInputRef.current && !folderInputRef.current.contains(target)) {
          if (!newFolderName || newFolderName.trim() === "") {
            onCancelAdd?.();
          }
        }
      }
      if (addingNoteForFolderId != null) {
        if (noteInputRef.current && !noteInputRef.current.contains(target)) {
          if (!newNoteTitle || newNoteTitle.trim() === "") {
            onCancelAddNote?.();
          }
        }
      }
    };
    document.addEventListener("mousedown", handleClickAway);
    document.addEventListener("touchstart", handleClickAway);
    return () => {
      document.removeEventListener("mousedown", handleClickAway);
      document.removeEventListener("touchstart", handleClickAway);
    };
  }, [addMode, newFolderName, addingNoteForFolderId, newNoteTitle, onCancelAdd, onCancelAddNote]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <p>Folders</p>
        <button type="button" className="cursor-pointer" onClick={onStartAdd}>
          <Plus size={14} />
        </button>
      </SidebarGroupLabel>
      <SidebarMenu className="overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => (
          <Collapsible
            key={String((item as any).id ?? item.title)}
            asChild
            open={openById[String((item as any).id ?? item.title)]}
            onOpenChange={(val) => {
              const id = String((item as any).id ?? item.title);
              setOpenById((prev) => {
                const next = { ...prev, [id]: val };
                writeOpenMap(next);
                return next;
              });
            }}
            className="group/collapsible"
          >
            <SidebarMenuItem className="group/item">
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title} className="cursor-pointer relative pr-16 group-data-[collapsible=icon]:pr-0">
                  <span
                    role="button"
                    tabIndex={0}
                    className="inline-flex items-center justify-center w-4 h-4"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      onStartPickIcon?.(String((item as any).id), { x: rect.left, y: rect.bottom + 4 }); 
                    }}
                    onKeyDown={(e) => { 
                      if (e.key === 'Enter' || e.key === ' ') {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        onStartPickIcon?.(String((item as any).id), { x: rect.left, y: rect.bottom + 4 });
                      }
                    }}
                    title="Change icon"
                    aria-label="Change icon"
                  >
                    {item.icon && <item.icon />}
                  </span>
                  <span className="ml-2 block w-full overflow-hidden text-ellipsis whitespace-nowrap">{item.title}</span>
                  <div className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 transition-opacity group-hover/item:opacity-100 group-data-[collapsible=icon]:hidden">
                    {typeof (item as any).id !== 'undefined' && (item as any).id !== "" && (
                      <span
                        role="button"
                        tabIndex={0}
                        className="pointer-events-auto cursor-pointer p-1 rounded hover:bg-muted"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFolder?.(String((item as any).id));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') onDeleteFolder?.(String((item as any).id));
                        }}
                        aria-label="Delete folder"
                        title="Delete folder"
                      >
                        <Trash2 size={14} />
                      </span>
                    )}
                    <span
                      role="button"
                      tabIndex={0}
                      className="pointer-events-auto cursor-pointer p-1 rounded hover:bg-muted"
                      onClick={(e) => {
                        e.stopPropagation();
                        const fid = ((item as any).id ?? null) as any;
                        if (onStartAddNote) onStartAddNote(fid);
                        else onAddNote?.(fid);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          const fid = ((item as any).id ?? null) as any;
                          if (onStartAddNote) onStartAddNote(fid);
                          else onAddNote?.(fid);
                        }
                      }}
                      aria-label="Add note"
                      title="Add note"
                    >
                      <Plus size={14} />
                    </span>
                  </div>
                  <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.id ?? subItem.title}>
                      <SidebarMenuSubButton asChild className="cursor-pointer w-full">
                        <button
                          type="button"
                          className="w-full text-left relative pr-8 group/sub"
                          onClick={() => onSelectNote?.(subItem.id)}
                        >
                          <span className="block w-full overflow-hidden text-ellipsis whitespace-nowrap">{subItem.title}</span>
                          <span
                            role="button"
                            tabIndex={0}
                            title="Delete note"
                            aria-label="Delete note"
                            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/sub:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteNote?.(subItem.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') onDeleteNote?.(subItem.id);
                            }}
                          >
                            <Trash2 size={14} />
                          </span>
                        </button>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                  {addingNoteForFolderId === (item as any).id && (
                    <SidebarMenuSubItem>
                      <div className="px-2 py-0.5">
                        <input
                          autoFocus
                          ref={noteInputRef}
                          value={newNoteTitle}
                          onChange={(e) => onChangeNewNoteTitle?.(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') onConfirmAddNote?.();
                            if (e.key === 'Escape') onCancelAddNote?.();
                          }}
                          placeholder="New note title"
                          className="w-full bg-transparent outline-none text-sm"
                        />
                      </div>
                    </SidebarMenuSubItem>
                  )}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
        {addMode && (
          <SidebarMenuItem>
            <div className="px-2 py-1.5">
              <input
                autoFocus
              ref={folderInputRef}
                value={newFolderName}
                onChange={(e) => onChangeNewName?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onConfirmAdd?.();
                  if (e.key === 'Escape') onCancelAdd?.();
                }}
                placeholder="New folder name"
                className="w-full bg-transparent outline-none text-sm"
              />
            </div>
          </SidebarMenuItem>
        )}
      </SidebarMenu>
      {pickingFolderId && iconOptions && pickingPosition && (
        <>
          <div className="fixed inset-0 z-40" onClick={onCancelPick} />
          <div className="fixed z-50 grid grid-cols-6 gap-1 rounded-md border bg-background p-2 shadow-md" style={{ left: pickingPosition.x, top: pickingPosition.y }}>
            {iconOptions.map(({ key, Icon }) => (
              <span
                key={key}
                role="button"
                tabIndex={0}
                className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted cursor-pointer"
                title={key}
                onClick={() => onPickIcon?.(pickingFolderId, key)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onPickIcon?.(pickingFolderId, key); }}
              >
                <Icon size={14} />
              </span>
            ))}
          </div>
        </>
      )}
    </SidebarGroup>
  );
}
