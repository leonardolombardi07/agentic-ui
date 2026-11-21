import { CheckIcon, ChevronDownIcon, EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { KnowledgeSession } from "@/lib/api/types/knowledge-base";

type ViewAsProps = {
	session: KnowledgeSession;
	isPending: boolean;
	onChange: (userId: string) => void;
};

/**
 * Prototype only: see the Knowledge Base as someone else, to check what each kind of user
 * gets. It goes away with the mock backend, when the signed-in user is the only one.
 */
export function ViewAs({ session, isPending, onChange }: ViewAsProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				disabled={isPending}
				render={<Button variant="outline" data-testid="kb-view-as" />}
			>
				<EyeIcon />
				<span className="hidden text-muted-foreground lg:inline">View as</span>
				{session.user.name.split(" ")[0]}
				<ChevronDownIcon className="text-muted-foreground" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-72">
				<DropdownMenuGroup>
					<DropdownMenuLabel>View as (prototype)</DropdownMenuLabel>
					{session.personas.map((persona) => (
						<DropdownMenuItem
							key={persona.id}
							className="h-auto items-start py-1.5"
							onClick={() => {
								if (persona.id !== session.user.id) onChange(persona.id);
							}}
							data-testid="kb-view-as-option"
							data-user-id={persona.id}
						>
							<CheckIcon
								className={
									persona.id === session.user.id ? "mt-0.5" : "invisible mt-0.5"
								}
							/>
							<span className="flex flex-col">
								<span>{persona.name}</span>
								<span className="text-xs text-muted-foreground">
									{persona.isSuperadmin
										? `${persona.title} - superadmin`
										: persona.title}
								</span>
							</span>
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
