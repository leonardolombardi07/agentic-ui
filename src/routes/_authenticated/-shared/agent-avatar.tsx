import { cn } from "cn";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Agent } from "@/lib/api/types/agent";

type AgentAvatarProps = {
	agent: Pick<Agent, "avatarUrl" | "color">;
	className?: string;
};

/**
 * The agent's image, or a plain circle in its color. Decorative: the name is always
 * rendered next to it, so it's hidden from screen readers.
 */
export function AgentAvatar({ agent, className }: AgentAvatarProps) {
	return (
		<Avatar aria-hidden className={cn("size-6", className)}>
			{agent.avatarUrl ? <AvatarImage src={agent.avatarUrl} alt="" /> : null}
			{/* Also covers a slow or broken image, so the circle never shows up empty. */}
			<AvatarFallback style={{ backgroundColor: agent.color }} />
		</Avatar>
	);
}
