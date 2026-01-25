import React, { useState, useEffect, useMemo } from 'react';
import { FolderOpen, Package, Cloud, Loader2, Search } from 'lucide-react';
import { useProjectStore } from '../stores/useProjectStore';
import { filterTemplatesByCategory } from '../utils/templateService';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export const TemplatesView: React.FC = () => {
    const {
        templates,
        isLoadingTemplates,
        loadTemplates,
        selectedTemplateCategory,
        updateToolDefault,
        setActiveTool,
        setSidebarView
    } = useProjectStore();

    const [searchQuery, setSearchQuery] = useState('');

    // Load templates on mount if not loaded
    useEffect(() => {
        if (templates.length === 0) {
            loadTemplates();
        }
    }, [templates.length, loadTemplates]);

    // Filter templates by selected category and search
    const filteredTemplates = useMemo(() => {
        let result = filterTemplatesByCategory(templates, selectedTemplateCategory);

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(t =>
                t.name.toLowerCase().includes(query) ||
                t.description?.toLowerCase().includes(query) ||
                t.properties.name?.toLowerCase().includes(query)
            );
        }

        return result;
    }, [templates, selectedTemplateCategory, searchQuery]);

    // Handle applying a template
    const handleUseTemplate = (template: typeof templates[0]) => {
        // Apply all properties from template to tool defaults
        Object.entries(template.properties).forEach(([key, value]) => {
            // @ts-ignore
            updateToolDefault(template.toolType, { [key]: value });
        });
        setActiveTool(template.toolType);
        setSidebarView('properties');
    };

    return (
        <div className="p-6 space-y-4 max-w-6xl mx-auto h-full overflow-auto">
            {/* Header with Search */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                        {selectedTemplateCategory === 'All' ? 'All Templates' : selectedTemplateCategory}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
                    </p>
                </div>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-9"
                    />
                </div>
            </div>

            {/* Loading State */}
            {isLoadingTemplates && templates.length === 0 && (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            )}

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map(template => (
                    <Card key={template.id} className="relative group hover:border-primary/50 transition-colors">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start gap-2">
                                <CardTitle className="text-base leading-tight">{template.name}</CardTitle>
                                <div className="flex gap-1 flex-shrink-0">
                                    {/* Source Badge */}
                                    {template.source === 'bundled' ? (
                                        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-5">
                                            <Package size={10} />
                                            Built-in
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0 h-5">
                                            <Cloud size={10} />
                                            Cloud
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-1.5 mt-1.5 flex-wrap">
                                <Badge variant="outline" className="capitalize text-[10px] h-5">
                                    {template.toolType}
                                </Badge>
                                {template.properties.unit && (
                                    <Badge variant="secondary" className="text-[10px] h-5">
                                        {template.properties.unit}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="pb-2">
                            <CardDescription className="text-xs line-clamp-2 min-h-[2.5rem]">
                                {template.description || `${template.properties.variables?.length || 0} variables, ${template.properties.subItems?.length || 0} sub-items`}
                            </CardDescription>
                            {/* Formula Preview */}
                            {/* Sub-items Preview */}
                            {template.properties.subItems && template.properties.subItems.length > 0 && (
                                <div className="mt-2 space-y-1">
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Includes:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {template.properties.subItems.slice(0, 4).map((item, i) => (
                                            <Badge key={i} variant="secondary" className="text-[9px] h-4 px-1 py-0 font-normal border-transparent bg-secondary/50 text-secondary-foreground hover:bg-secondary/70">
                                                {item.name}
                                            </Badge>
                                        ))}
                                        {template.properties.subItems.length > 4 && (
                                            <span className="text-[9px] text-muted-foreground flex items-center">
                                                +{template.properties.subItems.length - 4} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="pt-2">
                            <Button
                                size="sm"
                                className="w-full h-8 text-xs"
                                onClick={() => handleUseTemplate(template)}
                            >
                                Use Template
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            {/* Empty State */}
            {filteredTemplates.length === 0 && !isLoadingTemplates && (
                <div className="text-center py-16 border border-dashed rounded-lg text-muted-foreground">
                    <FolderOpen className="mx-auto h-12 w-12 mb-3 opacity-50" />
                    {searchQuery ? (
                        <>
                            <p className="font-medium">No templates match "{searchQuery}"</p>
                            <p className="text-sm mt-1">Try a different search term</p>
                        </>
                    ) : selectedTemplateCategory !== 'All' ? (
                        <>
                            <p className="font-medium">No templates in "{selectedTemplateCategory}"</p>
                            <p className="text-sm mt-1">Templates will appear here when added to this category</p>
                        </>
                    ) : (
                        <>
                            <p className="font-medium">No templates available</p>
                            <p className="text-sm mt-1">Create templates from the Properties Panel</p>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
