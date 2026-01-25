import React, { useState, useEffect } from 'react';
import { Calculator, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type ItemVariable } from '../../stores/useProjectStore';
import { evaluateFormula } from '../../utils/formulas';
import { cn } from "@/lib/utils";

interface FormulaEditorProps {
    formula: string;
    variables: ItemVariable[];
    currentQty?: number;
    unit?: string;
    onChange: (formula: string) => void;
}

export const FormulaEditor: React.FC<FormulaEditorProps> = ({ formula, variables, currentQty = 10, unit, onChange }) => {
    const [validationState, setValidationState] = useState<{ isValid: boolean; message?: string; result?: number | null }>({ isValid: true });

    // Validate formula on change
    useEffect(() => {
        if (!formula || !formula.trim()) {
            setValidationState({ isValid: true });
            return;
        }

        // Create a dummy context for validation
        // We use sensible defaults (e.g. 10) to show a hypothetical calculation
        // cast to any first to avoid TS issues with initial partial state, though we set qty immediately
        const context: { qty: number;[key: string]: number } = {
            qty: currentQty,
            Qty: currentQty,
        };

        // Add user-defined variables
        variables.forEach(v => {
            // Add both "Name" and "name" to be safe, though formula engine handles case mapping if implemented
            context[v.name] = 10;
        });

        const result = evaluateFormula(formula, context);

        if (result !== null) {
            setValidationState({ isValid: true, result });
        } else {
            setValidationState({ isValid: false, message: "Invalid syntax or unknown variable" });
        }
    }, [formula, variables]);

    // Insert variable at cursor position or append
    const handleInsertVar = (varName: string) => {
        // We use unbracketed insertion if it's a simple name, but bracketed is safer for spaces
        // Let's stick to bracketed for variables to be explicit
        const token = varName === 'qty' ? 'qty' : `[${varName}]`;
        onChange(formula + (formula ? ' ' : '') + token);
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-end mb-2">
                <Label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Calculator size={14} /> Formula
                </Label>
                {/* Validation Badge */}
                {formula && (
                    <div className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1",
                        validationState.isValid
                            ? "bg-green-100/10 text-green-600 dark:text-green-400"
                            : "bg-red-100/10 text-destructive"
                    )}>
                        {validationState.isValid ? (
                            <>
                                <CheckCircle2 size={10} />
                                <span>Result= {validationState.result?.toFixed(2)} {unit}</span>
                            </>
                        ) : (
                            <>
                                <AlertCircle size={10} />
                                <span>{validationState.message}</span>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="relative">
                <Textarea
                    value={formula}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="e.g. qty * [Height]"
                    className={cn(
                        "font-mono text-xs min-h-[60px]",
                        !validationState.isValid && formula && "border-destructive ring-destructive/20 focus-visible:ring-destructive/30"
                    )}
                />
            </div>

            <div className="text-[10px] text-muted-foreground">
                Qty is the measured value (length, area, etc).
            </div>

            {/* Variable Chips */}
            <div className="flex flex-wrap gap-1">
                <span
                    className="inline-flex items-center rounded-md border text-[10px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 px-1 py-0 h-5 cursor-pointer"
                    onClick={() => handleInsertVar('qty')}
                    title="Insert Base Quantity"
                >
                    qty
                </span>
                {variables.length > 0 && variables.map(v => (
                    <span
                        key={v.id}
                        className="inline-flex items-center rounded-md border text-[10px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 px-1 py-0 h-5 cursor-pointer"
                        onClick={() => handleInsertVar(v.name)}
                    >
                        {v.name}
                    </span>
                ))}
            </div>
        </div>
    );
};
