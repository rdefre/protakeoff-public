import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, ChevronUp, ChevronDown, Loader2, File, Files, BrainCircuit } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProjectStore } from '@/stores/useProjectStore';
import type { PageSearchResult, SearchHitQuad, IndexSearchResult } from '@/types/search';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface SearchPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [scope, setScope] = useState<'page' | 'document'>('document');
    const [useSmartSearch, setUseSmartSearch] = useState(false);

    // Standard results
    const [results, setResults] = useState<PageSearchResult[]>([]);
    // Smart results
    const [smartResults, setSmartResults] = useState<string[]>([]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isSearching, setIsSearching] = useState(false);
    const [totalHits, setTotalHits] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const {
        currentProject,
        currentPageId,
        setCurrentPageId,
        setSearchHighlights,
        clearSearchHighlights,
    } = useProjectStore();

    // Focus input when panel opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Clear highlights when closing
    useEffect(() => {
        if (!isOpen) {
            clearSearchHighlights();
            setQuery('');
            setResults([]);
            setSmartResults([]);
            setTotalHits(0);
        }
    }, [isOpen, clearSearchHighlights]);

    const calculateTotalHits = (searchResults: PageSearchResult[]) => {
        return searchResults.reduce((sum, r) => sum + r.hits.length, 0);
    };

    const handleSearch = useCallback(async () => {
        const pdf = currentProject?.pdfs?.[0];
        if (!query.trim() || !pdf) {
            setResults([]);
            setSmartResults([]);
            setTotalHits(0);
            clearSearchHighlights();
            return;
        }

        setIsSearching(true);
        try {
            if (useSmartSearch) {
                // Smart Search (Kreuzberg / Index)
                const result = await invoke<IndexSearchResult>('search_index', {
                    docId: pdf.id,
                    query: query.trim()
                });
                setSmartResults(result.matches);
                setTotalHits(result.matches.length);
                setResults([]); // Clear standard results
                clearSearchHighlights();
            } else {
                // Standard Search (MuPDF)
                setSmartResults([]); // Clear smart results
                let searchResults: PageSearchResult[] = [];

                if (scope === 'document') {
                    searchResults = await invoke<PageSearchResult[]>('search_document', {
                        id: pdf.id,
                        query: query.trim(),
                    });
                } else {
                    if (currentPageId) {
                        const parts = currentPageId.split(':');
                        if (parts.length >= 2) {
                            const pageIdx = parseInt(parts[1], 10);
                            if (!isNaN(pageIdx)) {
                                const hits = await invoke<SearchHitQuad[]>('search_page', {
                                    id: pdf.id,
                                    pageIdx: pageIdx,
                                    query: query.trim(),
                                });
                                if (hits.length > 0) {
                                    searchResults = [{ page_idx: pageIdx, hits }];
                                }
                            }
                        }
                    }
                }

                setResults(searchResults);
                const total = calculateTotalHits(searchResults);
                setTotalHits(total);

                // If we have results, highlight the first one
                if (total > 0) {
                    if (scope === 'document') {
                        navigateToResult(searchResults, 0);
                    } else {
                        setSearchHighlights(searchResults[0].hits);
                    }
                } else {
                    clearSearchHighlights();
                }
            }
            setCurrentIndex(0);

        } catch (error) {
            console.error('Search failed:', error);
            setResults([]);
            setSmartResults([]);
            setTotalHits(0);
            clearSearchHighlights();
        } finally {
            setIsSearching(false);
        }
    }, [query, scope, useSmartSearch, currentProject, currentPageId, clearSearchHighlights]);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim()) {
                handleSearch();
            } else {
                setResults([]);
                setSmartResults([]);
                setTotalHits(0);
                clearSearchHighlights();
                setIsSearching(false);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [query, scope, useSmartSearch]);

    const navigateToResult = useCallback((searchResults: PageSearchResult[], globalIndex: number) => {
        if (searchResults.length === 0) return;

        const pdf = currentProject?.pdfs?.[0];
        if (!pdf) return;

        // Find which page and hit index
        let hitCounter = 0;
        for (const pageResult of searchResults) {
            for (let i = 0; i < pageResult.hits.length; i++) {
                if (hitCounter === globalIndex) {
                    const pageId = `${pdf.id}:${pageResult.page_idx}`;
                    console.log('[SearchPanel] Navigating to result:', { globalIndex, pageId, hitsOnPage: pageResult.hits.length });

                    if (pageId !== currentPageId) {
                        setCurrentPageId(pageId);
                    }
                    setSearchHighlights(pageResult.hits);
                    return;
                }
                hitCounter++;
            }
        }
    }, [currentProject, currentPageId, setCurrentPageId, setSearchHighlights]);

    const goNext = useCallback(() => {
        if (totalHits === 0) return;
        const next = (currentIndex + 1) % totalHits;
        setCurrentIndex(next);

        if (!useSmartSearch) {
            navigateToResult(results, next);
        }
    }, [currentIndex, totalHits, results, useSmartSearch, navigateToResult]);

    const goPrev = useCallback(() => {
        if (totalHits === 0) return;
        const prev = (currentIndex - 1 + totalHits) % totalHits;
        setCurrentIndex(prev);

        if (!useSmartSearch) {
            navigateToResult(results, prev);
        }
    }, [currentIndex, totalHits, results, useSmartSearch, navigateToResult]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                goPrev();
            } else if (totalHits > 0 && (results.length > 0 || smartResults.length > 0)) {
                goNext();
            } else {
                handleSearch();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    }, [handleSearch, goNext, goPrev, onClose, totalHits, results.length, smartResults.length]);

    const handleClose = useCallback(() => {
        setQuery('');
        setResults([]);
        setSmartResults([]);
        setTotalHits(0);
        setCurrentIndex(0);
        clearSearchHighlights();
        onClose();
    }, [onClose, clearSearchHighlights]);

    const handleSmartResultClick = async (idx: number) => {
        setCurrentIndex(idx);
        // Strip validation formatting or HTML if any (simple approach: use raw query if match is snippet)
        // Actually, match is the text snippet. We can try searching for it.
        // Clean HTML tags from match string


        try {
            // Shadow search to find coordinates
            const pdf = currentProject?.pdfs?.[0];
            if (!pdf) return;

            // We search for the *exact phrase* if possible, or just the query if the snippet is too long/fuzzy.
            // Let's try the query first if it's highlighted, otherwise the snippet.
            // Usually the user wants to jump to the 'query' occurrence within this snippet.
            // But Kreuzberg snippets might be context.
            // Let's search for the *Query* string again using standard search, but we need to find the Nth occurrence?
            // Standard search returns ALL occurrences.
            // Smart search returns snippets. They don't map 1:1 easily.
            // FALLBACK STRATEGY: Run standard search for the QUERY.
            // Filter/Find the one that matches this index? No, indexes might differ.
            // BEST EFFORT: Run standard search for the QUERY. Navigate to the first one available?
            // Or better: Search for the WHOLE snippet text? (Might fail if OCR is slightly diff).

            // Let's rely on standard search for the QUERY string.
            // If the user used Smart Search, they might have typos.
            // If they typed "fan", and Smart Search found "fams" (fuzzy), standard search for "fan" returns nothing.
            // This is the tradeoff. 
            // If we can't find coords, we can't zoom.
            // We'll try searching for the cleaned snippet text (first 20-30 chars?)

            const searchResults = await invoke<PageSearchResult[]>('search_document', {
                id: pdf.id,
                query: query.trim(), // Try original query first
            });

            if (searchResults.length > 0) {
                // Heuristic: If we have multiple smart results, maybe we can map them to standard results?
                // It's hard to correlate.
                // Just jumping to the *first* standard occurrence is better than nothing.
                // Or if we clicked the 3rd smart result, try jumping to the 3rd standard result?
                let totalStandard = 0;
                searchResults.forEach(p => totalStandard += p.hits.length);

                // Modulo index safety
                const targetIdx = idx % totalStandard;
                navigateToResult(searchResults, targetIdx);
            } else {
                toast.error("Could not locate on page (Fuzzy match)");
            }

        } catch (e) {
            console.error("Smart navigation failed", e);
        }
    };



    if (!isOpen) return null;

    return (
        <div className="flex flex-col relative">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg shadow-sm animate-in fade-in zoom-in-95 duration-200">
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                {/* Scope Toggle */}
                <div className="flex bg-muted rounded-md p-0.5 mr-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={!useSmartSearch && scope === 'page' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-6 w-6 rounded-sm"
                                onClick={() => { setScope('page'); setUseSmartSearch(false); }}
                            >
                                <File className="h-3 w-3" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Current Page</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={!useSmartSearch && scope === 'document' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-6 w-6 rounded-sm"
                                onClick={() => { setScope('document'); setUseSmartSearch(false); }}
                            >
                                <Files className="h-3 w-3" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>All Pages</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={useSmartSearch ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-6 w-6 rounded-sm text-primary"
                                onClick={() => setUseSmartSearch(true)}
                            >
                                <BrainCircuit className="h-3 w-3" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Smart Search (OCR/Fuzzy)</TooltipContent>
                    </Tooltip>
                </div>

                <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={useSmartSearch ? "Smart search..." : (scope === 'document' ? "Search document..." : "Search page...")}
                    className="h-7 w-48 border-0 bg-transparent focus-visible:ring-0 px-1 text-sm placeholder:text-muted-foreground/50"
                />

                {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => handleSearch()}
                        disabled={!query.trim()}
                    >
                        <Search className="h-3 w-3" />
                    </Button>
                )}

                {!isSearching && totalHits === 0 && results.length === 0 && smartResults.length === 0 && query.trim() && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap px-1">
                        No results
                    </span>
                )}

                {(totalHits > 0) && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums min-w-[3rem] text-center">
                        {currentIndex + 1} / {totalHits}
                    </span>
                )}

                <div className="flex gap-0.5 border-l border-border pl-1 ml-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-6 w-6", totalHits === 0 && "opacity-50")}
                        onClick={goPrev}
                        disabled={totalHits === 0}
                    >
                        <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("h-6 w-6", totalHits === 0 && "opacity-50")}
                        onClick={goNext}
                        disabled={totalHits === 0}
                    >
                        <ChevronDown className="h-3 w-3" />
                    </Button>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-1"
                    onClick={handleClose}
                >
                    <X className="h-3 w-3" />
                </Button>
            </div>

            {/* Smart Results Dropdown */}
            {useSmartSearch && smartResults.length > 0 && (
                <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-[300px] overflow-y-auto w-full p-2 space-y-1 z-50">
                    {smartResults.map((match, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "text-xs p-2 rounded cursor-pointer hover:bg-accent",
                                idx === currentIndex && "bg-accent/50 ring-1 ring-primary/20"
                            )}
                            onClick={() => handleSmartResultClick(idx)}
                        >
                            <span className="font-mono text-muted-foreground mr-2">#{idx + 1}</span>
                            <span dangerouslySetInnerHTML={{
                                __html: match.replace(
                                    new RegExp(`(${query})`, 'gi'),
                                    '<span class="bg-yellow-200/40 text-foreground font-semibold">$1</span>'
                                )
                            }} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SearchPanel;
