import React from 'react';
import { FolderOpen, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useProjectStore } from '../../stores/useProjectStore';

interface ProjectInfo {
    id: string;
    name: string;
}

export const ProjectsView: React.FC = () => {
    const projects = useProjectStore(state => state.projects);
    const currentProject = useProjectStore(state => state.currentProject);
    const loadProject = useProjectStore(state => state.loadProject);
    const deleteProject = useProjectStore(state => state.deleteProject);

    const [projectToDelete, setProjectToDelete] = React.useState<ProjectInfo | null>(null);

    const confirmDelete = async () => {
        if (projectToDelete) {
            try {
                await deleteProject(projectToDelete.id);
                toast.success(`Project "${projectToDelete.name}" deleted`);
            } catch (err) {
                toast.error(`Failed to delete project: ${err}`);
            } finally {
                setProjectToDelete(null);
            }
        }
    };

    return (
        <>
            <div className="p-2 space-y-1">
                {projects?.map((proj) => (
                    <div
                        key={proj.id}
                        className={cn(
                            "group flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors text-sm",
                            currentProject?.id === proj.id
                                ? "bg-accent text-accent-foreground"
                                : "text-muted-foreground hover:bg-muted"
                        )}
                        onClick={() => loadProject(proj.id)}
                    >
                        <div className="flex items-center gap-2 overflow-hidden">
                            <FolderOpen size={14} />
                            <span className="truncate">{proj.name}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                                e.stopPropagation();
                                setProjectToDelete({ id: proj.id, name: proj.name });
                            }}
                        >
                            <Trash2 size={12} />
                        </Button>
                    </div>
                ))}
                {(!projects || projects.length === 0) && (
                    <div className="text-muted-foreground text-xs text-center mt-8">
                        No projects found.
                    </div>
                )}
            </div>

            <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Project</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{projectToDelete?.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
