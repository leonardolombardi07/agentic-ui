import { isValidElement, type ReactNode } from "react";

/**
 * The plain text of rendered markdown, e.g. a table cell's `**$1.2M**` link as
 * "$1.2M". Used for sorting, filtering and copying, where markup is noise.
 */
export function textOf(node: ReactNode): string {
	if (node === null || node === undefined || typeof node === "boolean") {
		return "";
	}
	if (typeof node === "string" || typeof node === "number") {
		return String(node);
	}
	if (Array.isArray(node)) return node.map(textOf).join("");
	if (isValidElement<{ children?: ReactNode }>(node)) {
		return textOf(node.props.children);
	}
	return "";
}
