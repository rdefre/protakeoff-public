
import { useCallback } from 'react';
import * as PIXI from 'pixi.js';
import type { CanvasHookProps, Point } from './types';
import { useProjectStore, type Markup, type ToolType } from '../../stores/useProjectStore';
import { drawShape, drawDashedLine } from '../../utils/canvas';
import { getAggregatedLegendItems } from '../../utils/legend';
import { calculatePolygonArea, calculatePolygonCentroid } from '../../utils/measurement';
import { formatArchitectural } from '../../utils/units';
import { pointInPolygon } from '../../utils/geometry';

export const useMarkupRenderer = ({ refs }: CanvasHookProps) => {
    const { labelCacheRef, graphicsCacheRef, markupsContainerRef, labelsLayerRef, themeRef } = refs;

    // Helper to render measurement badge (optimized with caching)
    const renderMeasurementBadge = (p1: Point, p2: Point, text: string, name: string | undefined, zoom: number, isDark: boolean, cacheKey: string) => {
        // ... (rest of function remains same, just removing g param)
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        const textColor = isDark ? '#ffffff' : '#000000';
        const borderColor = isDark ? 0xffffff : 0x000000;
        const effectiveZoom = Math.max(0.5, Math.min(zoom, 2.0));
        const fontSize = 12 / effectiveZoom;
        const fullText = name ? `${text}\n${name}` : text;

        let badgeText = labelCacheRef.current.get(cacheKey);

        if (!badgeText || badgeText.destroyed) {
            badgeText = new PIXI.Text({
                text: fullText,
                style: {
                    fontFamily: 'Arial',
                    fontSize: fontSize * 2,
                    fill: textColor,
                    fontWeight: 'normal',
                    stroke: { color: borderColor, width: 2 / effectiveZoom },
                    align: 'center',
                }
            });
            badgeText.resolution = 4;
            labelCacheRef.current.set(cacheKey, badgeText);
        } else {
            badgeText.text = fullText;
            (badgeText.style as any).fontSize = fontSize * 2;
            (badgeText.style as any).stroke = { color: borderColor, width: 2 / effectiveZoom };
            (badgeText.style as any).fill = textColor;
        }

        badgeText.scale.set(0.5);
        badgeText.anchor.set(0.5);
        badgeText.position.set(midX, midY);
        badgeText.zIndex = 500; // Render above graphics fills
        badgeText.visible = true; // Ensure visibility after being hidden by toggle

        if (!badgeText.parent && labelsLayerRef.current) {
            labelsLayerRef.current.addChild(badgeText);
        }
    };



    const updateMarkupGraphics = useCallback((m: Markup, isSelected: boolean, selectedIndices: number[] | undefined, selectedShapeIndices: number[] | undefined, allMarkups: Markup[]) => {
        if (!markupsContainerRef.current) return;
        let g = graphicsCacheRef.current.get(m.id);

        // Create if not exists
        if (!g || g.destroyed) {
            g = new PIXI.Graphics();
            g.cursor = 'pointer';
            g.interactive = true; // Essential for hit testing
            g.zIndex = 10; // Default
            markupsContainerRef.current.addChild(g);
            graphicsCacheRef.current.set(m.id, g);
        } else {
            g.clear();
            // CLEAR children for legend to avoid leaking text objects
            if (m.type === 'legend') {
                g.removeChildren();
            }
        }

        // Set zIndex
        if (m.type === 'legend') g.zIndex = 1000; // Legend on top
        else if (m.type === 'area') g.zIndex = 5;
        else g.zIndex = 10;

        // Visibility check
        const isHidden = !!(m.properties as any).hidden;
        g.visible = !isHidden;
        if (isHidden) {
            g.clear();
            // Hide associated labels if any
            m.paths.forEach((_, idx) => {
                const cacheKey = `${m.id}-${idx}`;
                const badge = labelCacheRef.current.get(cacheKey);
                if (badge) badge.visible = false;
            });
            return;
        }

        // Hide stale labels (visibility reset)
        // Explicitly hide all possible labels for this markup ID first.
        // This ensures that if 'showLabel' is toggled off, any existing badge is hidden.
        m.paths.forEach((_, idx) => {
            const cacheKey = `${m.id}-${idx}`;
            const badge = labelCacheRef.current.get(cacheKey);
            if (badge) badge.visible = false;
        });
        // Also check for ruler/special labels
        const rulerBadge = labelCacheRef.current.get(`${m.id}-ruler`);
        if (rulerBadge) rulerBadge.visible = false;

        // Note labels sweep
        m.paths.forEach((_, idx) => {
            const noteCacheKey = `${m.id}-note-${idx}`;
            const noteBadge = labelCacheRef.current.get(noteCacheKey);
            if (noteBadge) noteBadge.visible = false;
        });

        // Hide legend cached labels
        ['title', 'names', 'vals'].forEach(suffix => {
            const badge = labelCacheRef.current.get(`${m.id}-${suffix}`);
            if (badge) badge.visible = false;
        });

        // Common Styles
        const props = m.properties;
        const colorStr = (props as any).color;
        const color = new PIXI.Color(colorStr || 0x000000).toNumber();
        const alpha = (props as any).alpha ?? 0.4; // Default to semi-transparent so plans are visible
        const isDark = themeRef.current === 'dark';

        if (m.type === 'linear' || m.type === 'segment' || m.type === 'draw') {
        }
        const baseLineWidth = (props as any).lineWidth ?? (props as any).thickness ?? 2;
        const containerScale = markupsContainerRef.current.parent?.scale.x || 1;
        const zoom = containerScale;
        const lineWidth = baseLineWidth / zoom;
        const selectionStrokeWidth = 3 / zoom;
        const dashLen = 8 / zoom;
        const gapLen = 6 / zoom;

        // --- DRAWING LOGIC ---
        if (m.type === 'count') {
            const shape = (props as any).shape || 'circle';
            const sizeProp = (props as any).size || 10;
            const size = sizeProp / zoom; // Scale size based on zoom (fixed screen size)

            m.paths.forEach((path, pathIdx) => {
                const isPathSelected = !selectedShapeIndices || selectedShapeIndices.length === 0 || selectedShapeIndices.includes(pathIdx);
                if (!isPathSelected) return;

                path.forEach((p, idx) => {
                    const pointSelected = isSelected && (!selectedIndices || selectedIndices.includes(idx));

                    drawShape(g!, p.x, p.y, shape, size, color, false);

                    if (pointSelected) {
                        const borderSize = size;
                        if (shape === 'square') {
                            g!.rect(p.x - borderSize, p.y - borderSize, borderSize * 2, borderSize * 2);
                        } else if (shape === 'triangle') {
                            const h = borderSize * Math.sqrt(3);
                            g!.poly([p.x, p.y - h / 1.5, p.x - borderSize, p.y + h / 2, p.x + borderSize, p.y + h / 2]);
                        } else {
                            g!.circle(p.x, p.y, borderSize);
                        }
                        g!.stroke({ width: 2 / zoom, color: isDark ? 0xffffff : 0x000000 });
                    }
                });
            });
        }
        else if (m.type === 'legend') {
            if (m.paths.length > 0 && m.paths[0].length >= 4) {
                const p = m.paths[0];
                g!.moveTo(p[0].x, p[0].y);
                g!.lineTo(p[1].x, p[1].y);
                g!.lineTo(p[2].x, p[2].y);
                g!.lineTo(p[3].x, p[3].y);
                g!.closePath();
                const bgColor = isDark ? 0x000000 : 0xffffff;
                const borderColor = isSelected ? 0x2563eb : (isDark ? 0xffffff : 0x000000);
                const textColor = isDark ? '#ffffff' : '#000000';
                const swatchBorder = isDark ? 0xffffff : 0x000000;

                g!.fill({ color: bgColor, alpha: 0.9 });
                g!.stroke({ width: 1 / zoom, color: borderColor });

                const x = p[0].x + 10;
                let y = p[0].y + 10;

                if ((props as any).showTitle !== false) {
                    const titleCacheKey = `${m.id}-title`;
                    let titleText = labelCacheRef.current.get(titleCacheKey) as PIXI.Text;
                    const baseFontSize = (props as any).fontSize || 16;

                    if (!titleText || titleText.destroyed) {
                        titleText = new PIXI.Text({
                            text: (props as any).title || 'Legend',
                            style: {
                                fill: textColor,
                                fontSize: baseFontSize * 2, // 2x for quality
                                fontWeight: 'bold',
                                fontFamily: 'Arial'
                            }
                        });
                        titleText.resolution = 4; // High resolution
                        labelCacheRef.current.set(titleCacheKey, titleText);
                        if (labelsLayerRef.current) labelsLayerRef.current.addChild(titleText);
                    } else {
                        titleText.text = (props as any).title || 'Legend';
                        (titleText.style as any).fill = textColor;
                        (titleText.style as any).fontSize = baseFontSize * 2;
                    }
                    titleText.scale.set(0.5);
                    titleText.position.set(x, y);
                    titleText.visible = true;
                    titleText.zIndex = 1001;
                    y += (titleText.height + 10);
                }

                const store = useProjectStore.getState();
                const currentPageId = store.currentPageId || 'default';
                const pageScale = store.getPageScale(currentPageId);
                const pixelsPerFoot = pageScale.pixelsPerFoot;
                const items = getAggregatedLegendItems(allMarkups, pixelsPerFoot);
                const legendBottom = p[2].y - 10;
                const legendWidth = p[2].x - p[0].x;

                // Group names and quantities into single text blocks for performance and alignment
                const nameLines: string[] = [];
                const quantityLines: string[] = [];
                const swatchYPositions: number[] = [];

                items.forEach(item => {
                    if (y + 15 > legendBottom) return;
                    // Draw swatches
                    g!.rect(x, y - 8, 10, 10).fill({ color: item.color }).stroke({ width: 0.5, color: swatchBorder, alpha: 0.5 });
                    nameLines.push(item.name);
                    quantityLines.push(item.quantity);
                    swatchYPositions.push(y);
                    y += 15;
                });

                if (nameLines.length > 0) {
                    const namesCacheKey = `${m.id}-names`;
                    const valsCacheKey = `${m.id}-vals`;
                    let namesText = labelCacheRef.current.get(namesCacheKey) as PIXI.Text;
                    let valsText = labelCacheRef.current.get(valsCacheKey) as PIXI.Text;

                    const listStyle = {
                        fill: textColor,
                        fontSize: 20, // 2x the original 10 for quality
                        fontFamily: 'Arial',
                        lineHeight: 30, // 2x the 15 step
                    };

                    if (!namesText || namesText.destroyed) {
                        namesText = new PIXI.Text({ text: nameLines.join('\n'), style: listStyle });
                        namesText.resolution = 4;
                        labelCacheRef.current.set(namesCacheKey, namesText);
                        if (labelsLayerRef.current) labelsLayerRef.current.addChild(namesText);
                    } else {
                        namesText.text = nameLines.join('\n');
                        Object.assign(namesText.style, listStyle);
                    }

                    if (!valsText || valsText.destroyed) {
                        valsText = new PIXI.Text({ text: quantityLines.join('\n'), style: { ...listStyle, fontWeight: 'bold', align: 'right' } });
                        valsText.resolution = 4;
                        valsText.anchor.set(1, 0);
                        labelCacheRef.current.set(valsCacheKey, valsText);
                        if (labelsLayerRef.current) labelsLayerRef.current.addChild(valsText);
                    } else {
                        valsText.text = quantityLines.join('\n');
                        Object.assign(valsText.style, { ...listStyle, fontWeight: 'bold', align: 'right' });
                        valsText.anchor.set(1, 0);
                    }

                    namesText.scale.set(0.5);
                    valsText.scale.set(0.5);

                    const firstY = swatchYPositions[0];
                    namesText.position.set(x + 15, firstY - 8);
                    valsText.position.set(p[0].x + legendWidth - 10, firstY - 8);

                    namesText.visible = true;
                    valsText.visible = true;
                    namesText.zIndex = 1001;
                    valsText.zIndex = 1001;
                }

                if (isSelected) {
                    const handleSize = 6 / zoom;
                    const hColor = 0x2563eb;
                    const bounds = { x: p[0].x, y: p[0].y, w: p[2].x - p[0].x, h: p[2].y - p[0].y };
                    const handles = [
                        { cx: bounds.x, cy: bounds.y }, { cx: bounds.x + bounds.w / 2, cy: bounds.y },
                        { cx: bounds.x + bounds.w, cy: bounds.y }, { cx: bounds.x + bounds.w, cy: bounds.y + bounds.h / 2 },
                        { cx: bounds.x + bounds.w, cy: bounds.y + bounds.h }, { cx: bounds.x + bounds.w / 2, cy: bounds.y + bounds.h },
                        { cx: bounds.x, cy: bounds.y + bounds.h }, { cx: bounds.x, cy: bounds.y + bounds.h / 2 },
                    ];
                    handles.forEach(h => {
                        g!.rect(h.cx - handleSize / 2, h.cy - handleSize / 2, handleSize, handleSize)
                            .fill({ color: hColor })
                            .stroke({ width: 0.5 / zoom, color: 0xffffff });
                    });
                }
            }
        }
        else if (m.type === 'area' || m.type === 'highlight') {
            const holeIndices = (props as any).holeIndices || [];
            if (m.paths.length > 0) {
                // Fills - Render each additive island independently
                const additivePaths = m.paths.filter((_, i) => i === 0 || !holeIndices.includes(i));
                const holePaths = m.paths.filter((_, i) => i > 0 && holeIndices.includes(i));

                // Fills - PixiJS v8 pattern: draw shape, fill, draw hole, cut()
                additivePaths.forEach(outerPath => {
                    if (outerPath.length < 3) return;

                    // Draw and fill the outer shape first
                    g!.poly(outerPath);
                    g!.fill({ color: color, alpha: alpha });

                    // Then draw each hole and cut it out (only if hole is inside this outer shape)
                    holePaths.forEach(hPath => {
                        if (hPath.length < 3) return;
                        // Check if hole is inside this outer shape (use first point as sample)
                        if (!pointInPolygon(hPath[0], outerPath)) return;
                        g!.poly(hPath);
                        g!.cut();
                    });
                });

                // Strokes & Selected Highlight
                m.paths.forEach((path, pathIdx) => {
                    if (path.length < 3) return;
                    const isPathSelected = isSelected && (!selectedShapeIndices || selectedShapeIndices.length === 0 || selectedShapeIndices.includes(pathIdx));

                    if (isPathSelected) {
                        g!.poly(path).stroke({ width: selectionStrokeWidth, color: 0xdc2626 });
                        for (let i = 0; i < path.length; i++) {
                            const pNext = path[(i + 1) % path.length];
                            if (pNext) drawDashedLine(g!, path[i], pNext, 0xffffff, selectionStrokeWidth, dashLen, gapLen);
                        }
                    } else {
                        // Regular border
                        g!.poly(path).stroke({ width: lineWidth, color: color, alpha: 0.8 });
                    }
                });
            }

            // Labels only for area tool (highlight excluded per rendering rules)
            const showLabel = m.type === 'area' && (props as any).showLabel !== false;
            if (showLabel) {
                const store = useProjectStore.getState();
                const pageId = store.currentPageId || 'default';
                const scale = store.getPageScale(pageId);

                const holeIndices = (props as any).holeIndices || [];

                m.paths.forEach((path, pathIdx) => {
                    if (holeIndices.includes(pathIdx)) return; // Skip cutouts
                    if (path.length < 3) return;

                    // Accuracy Fix: Determine if this specific island has any cutouts
                    const hasHoles = m.paths.some((h, hIdx) =>
                        holeIndices.includes(hIdx) && h.length > 0 && pointInPolygon(h[0], path)
                    );

                    let pos: Point;
                    if (hasHoles) {
                        // Positioning: Near first vertex with offset to avoid handle overlap
                        const offset = 15 / zoom;
                        pos = { x: path[0].x + offset, y: path[0].y + offset };
                    } else {
                        pos = calculatePolygonCentroid(path);
                    }

                    const areaPx = calculatePolygonArea(path);
                    let label = "";
                    if (scale && scale.pixelsPerFoot) {
                        const sqFt = areaPx / (scale.pixelsPerFoot * scale.pixelsPerFoot);
                        label = `${sqFt.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} sq ft`;
                    } else {
                        label = `${Math.round(areaPx)} px²`;
                    }
                    const cacheKey = `${m.id}-${pathIdx}`;
                    renderMeasurementBadge(pos, pos, label, (props as any).name || '', zoom, isDark, cacheKey);
                });
            }

            if (isSelected) {
                const V_SIZE = 3 / zoom;
                const handleSize = 6 / zoom;
                const hColor = 0x2563eb;

                if (m.type === 'highlight' && m.paths.length > 0 && m.paths[0].length >= 4) {
                    const p = m.paths[0];
                    const minX = Math.min(...p.map(pt => pt.x)), maxX = Math.max(...p.map(pt => pt.x));
                    const minY = Math.min(...p.map(pt => pt.y)), maxY = Math.max(...p.map(pt => pt.y));
                    const bounds = { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
                    const handles = [
                        { cx: bounds.x, cy: bounds.y }, { cx: bounds.x + bounds.w / 2, cy: bounds.y },
                        { cx: bounds.x + bounds.w, cy: bounds.y }, { cx: bounds.x + bounds.w, cy: bounds.y + bounds.h / 2 },
                        { cx: bounds.x + bounds.w, cy: bounds.y + bounds.h }, { cx: bounds.x + bounds.w / 2, cy: bounds.y + bounds.h },
                        { cx: bounds.x, cy: bounds.y + bounds.h }, { cx: bounds.x, cy: bounds.y + bounds.h / 2 },
                    ];
                    handles.forEach(h => {
                        g!.rect(h.cx - handleSize / 2, h.cy - handleSize / 2, handleSize, handleSize)
                            .fill({ color: hColor })
                            .stroke({ width: 0.5 / zoom, color: 0xffffff });
                    });
                } else {
                    m.paths.forEach((path, pathIdx) => {
                        const isPathSelected = !selectedShapeIndices || selectedShapeIndices.length === 0 || selectedShapeIndices.includes(pathIdx);
                        if (!isPathSelected) return;
                        path.forEach((p, ptIdx) => {
                            const isPointSelected = !selectedIndices || selectedIndices.includes(ptIdx);
                            g!.circle(p.x, p.y, V_SIZE)
                                .fill({ color: 0xffffff })
                                .stroke({ width: 1 / zoom, color: isPointSelected ? 0xdc2626 : 0x000000 });
                        });
                    });
                }
            }
        }
        else {
            // Linear, Segment, Draw
            m.paths.forEach((path, pathIdx) => {
                if (path.length < 2) return;
                const isPathSelected = isSelected && (!selectedShapeIndices || selectedShapeIndices.length === 0 || selectedShapeIndices.includes(pathIdx));

                if (isPathSelected) {
                    if (m.type === 'draw') {
                        // Draw type: theme-aware border like count points (black/white)
                        const borderWidth = (baseLineWidth + 4) / zoom;
                        const borderColor = isDark ? 0xffffff : 0x000000;

                        // Draw border first (underneath)
                        g!.moveTo(path[0].x, path[0].y);
                        for (let i = 1; i < path.length; i++) g!.lineTo(path[i].x, path[i].y);
                        g!.stroke({ width: borderWidth, color: borderColor, alpha: 0.9, cap: 'round', join: 'round' });

                        // Draw colored line on top
                        g!.moveTo(path[0].x, path[0].y);
                        for (let i = 1; i < path.length; i++) g!.lineTo(path[i].x, path[i].y);
                        g!.stroke({ width: lineWidth, color: color, alpha: 1, cap: 'round', join: 'round' });
                    } else {
                        // Linear/Segment: Red + dashed white selection pattern
                        g!.moveTo(path[0].x, path[0].y);
                        for (let i = 1; i < path.length; i++) g!.lineTo(path[i].x, path[i].y);
                        g!.stroke({ width: selectionStrokeWidth, color: 0xdc2626, cap: 'round', join: 'round' });
                        for (let i = 0; i < path.length - 1; i++) {
                            drawDashedLine(g!, path[i], path[i + 1], 0xffffff, selectionStrokeWidth, dashLen, gapLen);
                        }
                    }
                } else {
                    g!.moveTo(path[0].x, path[0].y);
                    for (let i = 1; i < path.length; i++) g!.lineTo(path[i].x, path[i].y);
                    g!.stroke({ width: lineWidth, color: color, alpha: 0.8, cap: 'round', join: 'round' });
                }
            });

            if (m.type === 'ruler') {
                m.paths.forEach((path) => {
                    if (path.length >= 2) {
                        const p1 = path[0];
                        const p2 = path[path.length - 1];
                        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                        const store = useProjectStore.getState();
                        const pageId = store.currentPageId || 'default';
                        const scale = store.getPageScale(pageId);
                        let label = "";
                        if (scale && scale.pixelsPerFoot) {
                            const feet = dist / scale.pixelsPerFoot;
                            label = formatArchitectural(feet);
                        } else {
                            label = `${Math.round(dist)} px`;
                        }
                        const cacheKey = `${m.id}-ruler`;
                        renderMeasurementBadge(p1, p2, label, undefined, zoom, isDark, cacheKey);
                    }
                });
            }

            // Note: Arrow rendering with text
            if (m.type === 'note') {
                m.paths.forEach((path, pathIdx) => {
                    if (path.length >= 2) {
                        const p1 = path[0];
                        const p2 = path[path.length - 1];

                        // Calculate arrow direction
                        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                        const arrowSize = 10 / zoom;
                        const arrowAngle = Math.PI / 6; // 30 degrees

                        // Draw arrowhead at the start point (pointing towards p1, wings towards p2)
                        const a1x = p1.x + arrowSize * Math.cos(angle - arrowAngle);
                        const a1y = p1.y + arrowSize * Math.sin(angle - arrowAngle);
                        const a2x = p1.x + arrowSize * Math.cos(angle + arrowAngle);
                        const a2y = p1.y + arrowSize * Math.sin(angle + arrowAngle);

                        g!.moveTo(a1x, a1y);
                        g!.lineTo(p1.x, p1.y);
                        g!.lineTo(a2x, a2y);
                        g!.stroke({ width: lineWidth, color: color, alpha: 0.9, cap: 'round', join: 'round' });

                        // Render note text if available
                        const noteText = (props as any).text;
                        if (noteText && noteText.trim()) {
                            const baseFontSize = (props as any).fontSize || 14;
                            // Hybrid Scaling: Scale with world when zooming in, but keep minimum screen size when zooming out.
                            const minScreenFontSize = 10;
                            const worldFontSize = Math.max(baseFontSize, minScreenFontSize / zoom);

                            const textColor = isDark ? '#ffffff' : '#000000';
                            const borderColor = isDark ? 0xffffff : 0x000000;
                            const cacheKey = `${m.id}-note-${pathIdx}`;

                            let noteLabel = labelCacheRef.current.get(cacheKey) as PIXI.Text;

                            if (!noteLabel || noteLabel.destroyed) {
                                noteLabel = new PIXI.Text(noteText, {
                                    fontFamily: 'Arial',
                                    fontSize: worldFontSize * 2,
                                    fill: textColor,
                                    fontWeight: 'normal',
                                    stroke: { color: borderColor, width: 1, join: 'round' }
                                });
                                noteLabel.resolution = 4;
                                labelCacheRef.current.set(cacheKey, noteLabel);
                                if (labelsLayerRef.current) labelsLayerRef.current.addChild(noteLabel);
                            } else {
                                noteLabel.text = noteText;
                                (noteLabel.style as any).fontSize = worldFontSize * 2;
                                (noteLabel.style as any).fill = textColor;
                                (noteLabel.style as any).stroke = { color: borderColor, width: 1, join: 'round' };
                                (noteLabel.style as any).fontWeight = 'normal';
                            }

                            noteLabel.scale.set(0.5);
                            noteLabel.anchor.set(0, 0.5);
                            // Position text slightly offset from the arrow endpoint
                            const offset = 15 / zoom;
                            noteLabel.position.set(p2.x + offset * Math.cos(angle), p2.y + offset * Math.sin(angle));
                            noteLabel.zIndex = 500;
                            noteLabel.visible = true;
                        }
                    }
                });
            }

            if (isSelected && m.type !== 'draw') {
                const V_SIZE = 3 / zoom;
                m.paths.forEach((path, pathIdx) => {
                    const isPathSelected = !selectedShapeIndices || selectedShapeIndices.length === 0 || selectedShapeIndices.includes(pathIdx);
                    if (!isPathSelected) return;
                    path.forEach((p, ptIdx) => {
                        const isPointSelected = !selectedIndices || selectedIndices.includes(ptIdx);
                        g!.circle(p.x, p.y, V_SIZE)
                            .fill({ color: 0xffffff })
                            .stroke({ width: 1 / zoom, color: isPointSelected ? 0xdc2626 : 0x000000 });
                    });
                });
            }
        }
    }, [graphicsCacheRef, markupsContainerRef, labelCacheRef, themeRef]);

    const renderCurrentDrawing = useCallback((g: PIXI.Graphics, points: Point[], tool: string) => {
        g.clear();
        if (points.length === 0) return;

        const currentDefaults = useProjectStore.getState().toolDefaults;
        const defaults = currentDefaults[tool as ToolType] || { color: '#000000' };
        const color = (defaults as any).color || '#000000';

        if (tool === 'count') {
            // Count previews... usually just cursor logic handles this
        } else if (tool === 'area' || tool === 'highlight') {
            if (points.length < 2) return;

            g.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
            if (points.length > 2) g.closePath();

            g.fill({ color: color, alpha: 0.3 });

            for (let i = 0; i < points.length - 1; i++) {
                drawDashedLine(g, points[i], points[i + 1], color, 1, 4, 4);
            }
            if (points.length > 2) {
                drawDashedLine(g, points[points.length - 1], points[0], color, 1, 4, 4);
            }
            for (let i = 0; i < points.length - 1; i++) {
                const p = points[i];
                g.circle(p.x, p.y, 2).fill('white').stroke({ width: 1, color: 'black' });
            }
        } else if (tool === 'draw') {
            const thickness = (defaults as any).thickness || 2;
            g.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                g.lineTo(points[i].x, points[i].y);
            }
            g.stroke({ width: thickness, color: color, alpha: 0.8, cap: 'round', join: 'round' });
        } else {
            // Linear / Segment
            for (let i = 0; i < points.length - 1; i++) {
                drawDashedLine(g, points[i], points[i + 1], color, 1, 4, 4);
            }
            for (let i = 0; i < points.length - 1; i++) {
                const p = points[i];
                g.circle(p.x, p.y, 1.5).fill('white').stroke({ width: 0.5, color: 'black' });
            }
        }
    }, [themeRef]); // Add other deps if needed

    return { updateMarkupGraphics, renderCurrentDrawing };
};
