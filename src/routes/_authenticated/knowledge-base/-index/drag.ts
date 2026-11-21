import { type DragEvent, useRef, useState } from "react";
import type { UploadEntry } from "@/lib/api/types/knowledge-base";

/** Marks a drag that carries a Knowledge Base file or folder; the data is its id. */
export const NODE_DRAG_TYPE = "application/x-knowledge-node";

type DropTargetOptions = {
	disabled?: boolean;
	/** A file or folder of the Knowledge Base was dropped (a move). */
	onDropNode?: (nodeId: string) => void;
	/** Files or folders from the computer were dropped (an upload). */
	onDropFiles?: (entries: UploadEntry[]) => void;
};

/**
 * Makes an element a drop target for moves, uploads or both. Spread `dropProps` on it and
 * style it with `isOver`.
 *
 * Targets nest (a folder row inside the folder area), so a target that accepts a drag stops
 * the event: the innermost one wins and the outer one stops showing as hovered.
 */
export function useDropTarget({
	disabled = false,
	onDropNode,
	onDropFiles,
}: DropTargetOptions) {
	const [isOver, setIsOver] = useState(false);
	/* Enter and leave also fire for every child, so only the balance tells if the drag is inside. */
	const depth = useRef(0);

	function accepts(event: DragEvent): boolean {
		if (disabled) return false;
		const types = event.dataTransfer.types;
		return (
			(Boolean(onDropNode) && types.includes(NODE_DRAG_TYPE)) ||
			(Boolean(onDropFiles) && types.includes("Files"))
		);
	}

	const dropProps = {
		onDragEnter(event: DragEvent) {
			if (!accepts(event)) return;
			event.preventDefault();
			event.stopPropagation();
			depth.current += 1;
			setIsOver(true);
		},
		onDragOver(event: DragEvent) {
			if (!accepts(event)) return;
			// Without this the browser refuses the drop.
			event.preventDefault();
			event.stopPropagation();
			event.dataTransfer.dropEffect = event.dataTransfer.types.includes(
				NODE_DRAG_TYPE,
			)
				? "move"
				: "copy";
		},
		onDragLeave(event: DragEvent) {
			if (!accepts(event)) return;
			event.stopPropagation();
			depth.current = Math.max(0, depth.current - 1);
			if (depth.current === 0) setIsOver(false);
		},
		onDrop(event: DragEvent) {
			if (!accepts(event)) return;
			event.preventDefault();
			event.stopPropagation();
			depth.current = 0;
			setIsOver(false);
			const nodeId = event.dataTransfer.getData(NODE_DRAG_TYPE);
			if (nodeId) {
				onDropNode?.(nodeId);
				return;
			}
			if (onDropFiles) {
				void readDroppedFiles(event.dataTransfer).then((entries) => {
					if (entries.length > 0) onDropFiles(entries);
				});
			}
		},
	};

	return { isOver, dropProps };
}

/**
 * The files of a drop, walking into dropped folders. Call it synchronously from the drop
 * handler: the browser empties the DataTransfer as soon as the handler returns, so the
 * entries are taken before the first `await`. Empty folders are skipped.
 */
export async function readDroppedFiles(
	dataTransfer: DataTransfer,
): Promise<UploadEntry[]> {
	const roots: FileSystemEntry[] = [];
	for (const item of dataTransfer.items) {
		const entry = item.kind === "file" ? item.webkitGetAsEntry() : null;
		if (entry) roots.push(entry);
	}
	// Browsers without the entries API still give the plain files.
	if (roots.length === 0) return entriesOfFiles(dataTransfer.files);

	const entries: UploadEntry[] = [];
	async function walk(entry: FileSystemEntry, path: string[]) {
		if (isFileEntry(entry)) {
			const file = await new Promise<File>((resolve, reject) =>
				entry.file(resolve, reject),
			);
			entries.push({ name: file.name, size: file.size, path, file });
			return;
		}
		if (!isDirectoryEntry(entry)) return;
		const reader = entry.createReader();
		// readEntries returns the folder in batches; an empty batch means it is done.
		for (;;) {
			const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
				reader.readEntries(resolve, reject),
			);
			if (batch.length === 0) break;
			for (const child of batch) await walk(child, [...path, entry.name]);
		}
	}
	for (const root of roots) await walk(root, []);
	return entries;
}

function isFileEntry(entry: FileSystemEntry): entry is FileSystemFileEntry {
	return entry.isFile;
}

function isDirectoryEntry(
	entry: FileSystemEntry,
): entry is FileSystemDirectoryEntry {
	return entry.isDirectory;
}

/** The files of a file input. A folder input gives each file's folders in `webkitRelativePath`. */
export function entriesOfFiles(files: FileList | null): UploadEntry[] {
	return [...(files ?? [])].map((file) => ({
		name: file.name,
		size: file.size,
		path: file.webkitRelativePath.split("/").slice(0, -1).filter(Boolean),
		file,
	}));
}
