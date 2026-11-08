import * as React from "react";

/** A `blob:` URL for `blob`, revoked when the blob changes or the component unmounts. */
export function useObjectUrl(blob: Blob): string | undefined {
	const [url, setUrl] = React.useState<string>();
	React.useEffect(() => {
		const u = URL.createObjectURL(blob);
		setUrl(u);
		return () => URL.revokeObjectURL(u);
	}, [blob]);
	return url;
}
