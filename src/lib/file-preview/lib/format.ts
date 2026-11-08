export const KB = 1024;
export const MB = 1024 * KB;

export function formatBytes(bytes: number): string {
	if (!Number.isFinite(bytes) || bytes < 0) return "—";
	if (bytes < KB) return `${bytes} B`;
	if (bytes < MB) return `${Math.round(bytes / KB)} KB`;
	const mb = bytes / MB;
	return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export const extensionOf = (name: string) => {
	const dot = name.lastIndexOf(".");
	return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
};
