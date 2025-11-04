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
			<div className="font-sans p-4 text-sm text-muted-foreground">
				Select a note from the sidebar to view and edit.
			</div>
		);
	}

	return (
		<div className="font-sans p-6 space-y-4">
			<input
				className="w-full bg-transparent text-2xl font-semibold outline-none placeholder:text-neutral-400"
				placeholder="Untitled"
				value={title}
				onChange={(e) => setTitle(e.target.value)}
			/>
			<textarea
				className="w-full min-h-[60vh] bg-transparent outline-none resize-none text-sm whitespace-pre-wrap"
				placeholder="Start writing..."
				value={content}
				onChange={(e) => setContent(e.target.value)}
			/>
		</div>
	)
}