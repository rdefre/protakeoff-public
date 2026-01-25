/**
 * Context Menu Component for right-click actions on canvas
 */
import React, { useEffect, useRef } from 'react';
import { Scissors, PlusCircle } from 'lucide-react';

interface ContextMenuItem {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
}

interface ContextMenuProps {
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        // Small delay to prevent immediate close from the triggering click
        setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }, 10);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    // Adjust position to keep menu on screen
    const adjustedStyle: React.CSSProperties = {
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 9999,
    };

    return (
        <div
            ref={menuRef}
            style={adjustedStyle}
            className="min-w-[160px] bg-popover text-popover-foreground border border-border rounded-lg shadow-lg py-1 animate-in fade-in-0 zoom-in-95 duration-100"
        >
            {items.map((item, index) => (
                <button
                    key={index}
                    onClick={() => {
                        if (!item.disabled) {
                            item.onClick();
                            onClose();
                        }
                    }}
                    disabled={item.disabled}
                    className={`
                        w-full px-3 py-2 text-sm text-left flex items-center gap-2
                        hover:bg-accent hover:text-accent-foreground
                        focus:bg-accent focus:text-accent-foreground focus:outline-none
                        disabled:opacity-50 disabled:pointer-events-none
                        transition-colors
                    `}
                >
                    {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                    {item.label}
                </button>
            ))}
        </div>
    );
};

// Helper to create markup-specific context menu items
export const getMarkupContextMenuItems = (
    markupId: string,
    onCutout?: (areaId: string) => void,
    onAddPoint?: () => void,
    canAddPoint: boolean = false
): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    if (canAddPoint && onAddPoint) {
        items.push({
            label: 'Add Point',
            icon: <PlusCircle className="w-4 h-4" />,
            onClick: onAddPoint,
        });
    }

    if (onCutout) {
        items.push({
            label: 'Cut Out Area',
            icon: <Scissors className="w-4 h-4" />,
            onClick: () => onCutout(markupId),
        });
    }

    return items;
};
