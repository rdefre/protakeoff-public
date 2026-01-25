import React from 'react';
import {
    Ruler,
    Settings,
    Sun,
    Moon,
    Monitor,
    User,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface SidebarSettingsProps {
    theme: string | undefined;
    setTheme: (theme: string) => void;
    measurementSystem: 'imperial' | 'metric';
    setMeasurementSystem: (system: 'imperial' | 'metric') => void;
    onAccountClick: () => void;
}

export const SidebarSettings: React.FC<SidebarSettingsProps> = ({
    theme,
    setTheme,
    measurementSystem,
    setMeasurementSystem,
    onAccountClick,
}) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Settings size={20} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" className="w-56">
                <DropdownMenuLabel>Settings</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <div className="flex items-center gap-2">
                            <Ruler className="h-4 w-4" />
                            <span>Units: {measurementSystem === 'metric' ? 'Metric' : 'Imperial'}</span>
                        </div>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        <DropdownMenuRadioGroup
                            value={measurementSystem}
                            onValueChange={(val) => setMeasurementSystem(val as 'imperial' | 'metric')}
                        >
                            <DropdownMenuRadioItem value="imperial">Imperial (ft, in)</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="metric">Metric (m, cm)</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <div className="flex items-center gap-2">
                            {theme === 'dark' ? <Moon className="h-4 w-4" /> : theme === 'light' ? <Sun className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                            <span>Theme: {theme ? theme.charAt(0).toUpperCase() + theme.slice(1) : 'System'}</span>
                        </div>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => setTheme("light")}>
                            <Sun className="mr-2 h-4 w-4" />
                            <span>Light</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("dark")}>
                            <Moon className="mr-2 h-4 w-4" />
                            <span>Dark</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("system")}>
                            <Monitor className="mr-2 h-4 w-4" />
                            <span>System</span>
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onAccountClick}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Account & License</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
