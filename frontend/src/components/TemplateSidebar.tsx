import React, { useEffect, useMemo } from 'react';
import { Folder, FolderOpen, RefreshCw, Loader2 } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { getTemplateCategories } from '../utils/templateService';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Template category sidebar - shows in the main sidebar panel
 */
export const TemplateSidebar: React.FC = () => {

    // Get everything from store separately to ensure we see values
    const templates = useProjectStore(state => state.templates);
    const isLoadingTemplates = useProjectStore(state => state.isLoadingTemplates);
    const loadTemplates = useProjectStore(state => state.loadTemplates);
    const selectedTemplateCategory = useProjectStore(state => state.selectedTemplateCategory);
    const setSelectedTemplateCategory = useProjectStore(state => state.setSelectedTemplateCategory);



    // Load templates on mount if empty
    // Load templates on mount if empty
    useEffect(() => {
        if (templates.length === 0 && !isLoadingTemplates) {
            loadTemplates();
        }
    }, [templates.length, isLoadingTemplates, loadTemplates]);

    // Get unique categories for UI
    const categories = useMemo(() => getTemplateCategories(templates), [templates]);

    // Count templates per category
    const categoryCount = useMemo(() => {
        const counts: Record<string, number> = { 'All': templates.length };
        for (const t of templates) {
            const cat = t.category || 'General';
            counts[cat] = (counts[cat] || 0) + 1;
        }
        return counts;
    }, [templates]);

    return (
        <div className="flex flex-col w-full h-full min-h-[300px] p-2 space-y-2 bg-sidebar">

            {/* 2. Controls */}
            <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs justify-start gap-2 border-dashed"
                onClick={() => {
                    loadTemplates();
                }}
                disabled={isLoadingTemplates}
            >
                {isLoadingTemplates ? (
                    <Loader2 size={12} className="animate-spin" />
                ) : (
                    <RefreshCw size={12} />
                )}
                {isLoadingTemplates ? 'Syncing...' : 'Sync Cloud Templates'}
            </Button>

            <div className="h-px bg-sidebar-border w-full my-1" />

            {/* 3. Categories List */}
            <div className="flex-1 flex flex-col gap-0.5 overflow-visible">
                {categories.length > 0 ? (
                    categories.map(cat => (
                        <Button
                            key={cat}
                            variant={selectedTemplateCategory === cat ? "secondary" : "ghost"}
                            className={cn(
                                "w-full h-8 justify-start gap-2 text-xs px-2 transition-all",
                                selectedTemplateCategory === cat
                                    ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => {
                                setSelectedTemplateCategory(cat);
                            }}
                        >
                            {selectedTemplateCategory === cat ? (
                                <FolderOpen size={14} className="text-primary" />
                            ) : (
                                <Folder size={14} />
                            )}
                            <span className="flex-1 text-left truncate">{cat}</span>
                            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-mono border-muted">
                                {categoryCount[cat] || 0}
                            </Badge>
                        </Button>
                    ))
                ) : (
                    <div className="text-center py-8 text-muted-foreground text-xs italic">
                        No categories found
                    </div>
                )}
            </div>

            {/* 4. Footer Stats */}
            <div className="pt-4 border-t border-sidebar-border mt-2">
                <div className="flex justify-between items-center text-[9px] uppercase tracking-tighter text-muted-foreground/60 px-1">
                    <span>Built-in: {templates.filter(t => t.source === 'bundled').length}</span>
                    <span>Cloud: {templates.filter(t => t.source === 'remote').length}</span>
                </div>
            </div>
        </div>
    );
};
