import { TooltipProvider } from "@/components/ui/tooltip";
import { ActivityBar } from "./ActivityBar";
import { MainArea } from "./MainArea";
import { Modals } from "./modals";
import { SidePanel } from "./SidePanel";

export function AppShell() {
	return (
		<TooltipProvider>
			<div className="flex h-dvh overflow-hidden bg-background text-foreground">
				<ActivityBar />
				<SidePanel />
				<MainArea />
			</div>
			<Modals />
		</TooltipProvider>
	);
}
