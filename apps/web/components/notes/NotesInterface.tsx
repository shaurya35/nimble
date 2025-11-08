"use client"

import { useSelectedNote } from "@/components/notes/selected-note-context";
import { getNotes, updateNote } from "@/services/localstorage";
import * as React from "react";

export default function NotesInterface(){
	const { selectedNoteId } = useSelectedNote();
	const allNotes = getNotes();
	const selected = allNotes.find(n => String(n.id) === String(selectedNoteId));

	const [title, setTitle] = React.useState<string>(selected?.title ?? "");
	const [content, setContent] = React.useState<string>(selected?.content ?? "");

	React.useEffect(() => {
		setTitle(selected?.title ?? "");
		setContent(selected?.content ?? "");
	}, [selectedNoteId]);

	React.useEffect(() => {
		if (!selected) return;
		const handle = setTimeout(() => {
			const updated = {
				...selected,
				title,
				content,
				updatedAt: new Date().toISOString(),
			};
			updateNote(String(selected.id), updated);
			try { window.dispatchEvent(new CustomEvent("nimble:notes-changed")); } catch {}
		}, 500);
		return () => clearTimeout(handle);
	}, [title, content, selectedNoteId]);

	if (!selected) {
		return (
			<div className="font-sans h-full flex items-center justify-center p-4 text-xs md:text-sm text-muted-foreground dark:text-[#9cdcfe] text-center">
				Select a note from the sidebar to view and edit.
			</div>
		);
	}

	return (
		<div className="font-sans h-full flex flex-col p-3 md:p-6">
			<input
				className="w-full bg-transparent text-xl md:text-2xl font-semibold outline-none placeholder:text-neutral-400 dark:placeholder:text-[#828997] mb-3 md:mb-4 flex-shrink-0 dark:text-[#d4d4d4]"
				placeholder="Untitled"
				value={title}
				onChange={(e) => setTitle(e.target.value)}
			/>
			<textarea
				className="w-full flex-1 bg-transparent outline-none resize-none text-xs md:text-sm whitespace-pre-wrap overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden placeholder:text-neutral-400 dark:placeholder:text-[#828997] dark:text-[#d4d4d4]"
				placeholder="Start writing..."
				value={content}
				onChange={(e) => setContent(e.target.value)}
			/>
		</div>
	)
}