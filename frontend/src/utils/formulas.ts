/**
 * Formula Utilities
 * Handles slugification of variable names and safe evaluation of math formulas.
 */

// Basic math functions supported in formulas
const MATH_FUNCTIONS = {
    round: Math.round,
    roundup: Math.ceil,
    rounddown: Math.floor,
    floor: Math.floor,
    ceil: Math.ceil,
    abs: Math.abs,
    sqrt: Math.sqrt,
    pow: Math.pow,
    min: Math.min,
    max: Math.max,
};

/**
 * Generates a safe slug for a variable name.
 * e.g., "Wall Height" -> "Wall_Height"
 * "Waste %" -> "Waste_Percent"
 * "$ Cost" -> "Cost"
 */
export const slugifyVariableName = (name: string): string => {
    let slug = name
        .trim()
        .replace(/[%]/g, '_Percent') // Explicitly handle %
        .replace(/[$]/g, '')         // Remove currency symbols
        .replace(/[^a-zA-Z0-9_]/g, '_') // Replace non-alphanumeric with _
        .replace(/_+/g, '_')         // Collapse multiple underscores
        .replace(/^_|_$/g, '');      // Trim leading/trailing underscores

    // Valid JS identifiers cannot start with a digit
    if (/^[0-9]/.test(slug)) {
        slug = '_' + slug;
    }

    return slug;
};

/**
 * Extracts variable names from a formula string.
 * Looks for patterns like [Variable Name]
 */
export const extractVariables = (formula: string): string[] => {
    const regex = /\[([^\]]+)\]/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(formula)) !== null) {
        matches.push(match[1]);
    }
    return [...new Set(matches)]; // Unique
};

/**
 * Evaluates a formula with specific context values.
 */
export const evaluateFormula = (
    formula: string,
    context: { qty: number;[key: string]: number }
): number | null => {
    if (!formula || !formula.trim()) return null;

    try {
        let parsedFormula = formula;

        // 1. Prepare context with case-insensitive 'qty' and slugified names
        const evaluationContext: Record<string, number> = {};

        // Add all original context values
        Object.entries(context).forEach(([key, value]) => {
            evaluationContext[key] = value;

            // Also add slugified version so users can use [Wall Height] or Wall_Height
            const slug = slugifyVariableName(key);
            if (slug !== key) {
                evaluationContext[slug] = value;
            }

            // Also add case-insensitive 'qty' if it's there
            if (key.toLowerCase() === 'qty') {
                evaluationContext['qty'] = value;
                evaluationContext['Qty'] = value;
                evaluationContext['QTY'] = value;
            }
        });

        // 2. Replace Variables [Name] -> Value
        const variables = extractVariables(formula);
        for (const varName of variables) {
            let value = evaluationContext[varName];

            if (value === undefined) {
                // Try slugified version if exact match fails
                const slug = slugifyVariableName(varName);
                value = evaluationContext[slug];
            }

            if (value === undefined) {
                // console.warn(`Variable '${varName}' not found in context`);
                value = 0;
            }

            // Important: use a unique placeholder or handle carefully to avoid partial matches
            // Since we use brackets [Name], we can replace them safely.
            const escapedVarName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            parsedFormula = parsedFormula.replace(new RegExp(`\\[${escapedVarName}\\]`, 'g'), String(value));
        }

        // 3. Replace Math functions (SINGLE PASS to avoid Math.Math issues)
        // We match words that are math functions and NOT already preceded by "Math."
        const mathFuncs = Object.keys(MATH_FUNCTIONS).join('|');
        const mathRegex = new RegExp(`(?<!Math\\.)\\b(${mathFuncs})\\(`, 'gi');

        parsedFormula = parsedFormula.replace(mathRegex, (_, func) => {
            const lowerFunc = func.toLowerCase();
            if (lowerFunc === 'roundup') return 'Math.ceil(';
            if (lowerFunc === 'rounddown') return 'Math.floor(';
            return `Math.${lowerFunc}(`;
        });

        // 4. Security check
        if (/=|import|require|eval|window|document|alert|console/.test(parsedFormula)) {
            console.error("Formula contains potentially unsafe content:", parsedFormula);
            return null;
        }

        // 5. Create and execute function
        // Filter keys to ensure they are valid JS identifiers
        const validContextEntries = Object.entries(evaluationContext).filter(([key]) => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key));
        const contextKeys = validContextEntries.map(([k]) => k);
        const contextValues = validContextEntries.map(([, v]) => v);

        const func = new Function(...contextKeys, `return ${parsedFormula};`);
        const result = func(...contextValues);

        return typeof result === 'number' && !isNaN(result) ? result : null;

    } catch (e) {
        // console.error("Formula evaluation error:", e, formula);
        return null;
    }
};
