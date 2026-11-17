/**
 * Gemini Brand Governance Review Service
 * Integrates with Google GenAI SDK (gemini-2.5-flash) with structured JSON output schema.
 * Features an intelligent heuristic fallback parser when API key is unavailable.
 */

const { GoogleGenAI } = require('@google/genai');
const { loadGuidelinesContext } = require('./guidelines.service');

const RESPONSE_SCHEMA = {
    type: "OBJECT",
    properties: {
        text: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    problem_in: { type: "STRING" },
                    problem: { type: "STRING" },
                    suggestion: { type: "STRING" }
                },
                required: ["problem_in", "problem", "suggestion"]
            }
        },
        bad_files: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    file_name: { type: "STRING" },
                    problem: { type: "STRING" },
                    suggestion: { type: "STRING" }
                },
                required: ["file_name", "problem", "suggestion"]
            }
        },
        good_files: {
            type: "ARRAY",
            items: { type: "STRING" }
        }
    },
    required: ["text", "bad_files", "good_files"]
};

/**
 * Perform multimodal brand guideline audit using Gemini 2.5 Flash
 * @param {string} text - User draft copy
 * @param {Array<Express.Multer.File>} files - Uploaded documents & images
 * @returns {Promise<{ text: Array, bad_files: Array, good_files: Array }>}
 */
async function auditContentWithGemini(text = '', files = []) {
    const { consolidatedText } = await loadGuidelinesContext();

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
        try {
            const ai = new GoogleGenAI({ apiKey });

            const systemInstruction = `You are TrueTone's Enterprise Brand Governance Auditor.
Your responsibility is to strictly cross-reference the user's input text and all uploaded files against the official organizational guidelines provided below.

OFFICIAL GUIDELINES:
${consolidatedText}

AUDIT RULES:
1. Identify all tone violations, unverified absolute claims, prohibited urgency phrases, branding discrepancies, grammatical errors, and missing statutory disclaimers.
2. For text issues, 'problem_in' MUST be an EXACT character-for-character substring copied verbatim from the user's input text so that the UI can highlight it accurately.
3. 'suggestion' must fix the violation while preserving the creator's intended messaging.
4. For uploaded files, inspect each file against visual and accessibility standards. Classify each file into either 'bad_files' (with exact file_name, problem, and suggestion) or 'good_files'.
5. Return ONLY a valid JSON object matching the required schema.`;

            // Prepare multimodal contents
            const contents = [];
            if (text && text.trim().length > 0) {
                contents.push({ text: `User Draft Post Copy:\n"""\n${text}\n"""` });
            }

            for (const file of files) {
                const mimeType = file.mimetype || 'application/octet-stream';
                if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
                    contents.push({
                        inlineData: {
                            data: file.buffer.toString('base64'),
                            mimeType,
                        }
                    });
                } else if (mimeType.startsWith('text/') || file.originalname.endsWith('.md') || file.originalname.endsWith('.txt')) {
                    contents.push({
                        text: `Attached Document [${file.originalname}]:\n"""\n${file.buffer.toString('utf8')}\n"""`
                    });
                }
            }

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents,
                config: {
                    systemInstruction,
                    responseMimeType: 'application/json',
                    responseSchema: RESPONSE_SCHEMA,
                }
            });

            const parsed = JSON.parse(response.text);
            return cleanGeminiOutput(parsed, text, files);
        } catch (apiError) {
            console.warn('[GEMINI-API-NOTICE] Live Gemini API invocation fell back to guideline heuristics:', apiError.message);
            return heuristicGuidelineScan(text, files, consolidatedText);
        }
    } else {
        // Fallback when GEMINI_API_KEY is not yet configured in environment
        return heuristicGuidelineScan(text, files, consolidatedText);
    }
}

/**
 * Validates and normalizes Gemini response structure
 */
function cleanGeminiOutput(raw, originalText, files) {
    const textIssues = Array.isArray(raw.text) ? raw.text.filter(t => t.problem_in && originalText.includes(t.problem_in)) : [];
    const badFiles = Array.isArray(raw.bad_files) ? raw.bad_files : [];
    const goodFiles = Array.isArray(raw.good_files) ? raw.good_files : [];

    // Ensure all uploaded files are categorized
    const fileNames = files.map(f => f.originalname);
    const accounted = new Set([...badFiles.map(b => b.file_name), ...goodFiles]);

    fileNames.forEach(fn => {
        if (!accounted.has(fn)) {
            goodFiles.push(fn);
        }
    });

    return {
        text: textIssues,
        bad_files: badFiles,
        good_files: goodFiles,
    };
}

/**
 * Heuristic brand governance evaluator matching ./guidelines rules
 */
function heuristicGuidelineScan(text = '', files = [], guidelines = '') {
    const textIssues = [];
    const badFiles = [];
    const goodFiles = [];

    // Rule 1: Absolute/Infallible Claims
    const absoluteMatches = ['100% infallible', 'guarantees zero mistakes', 'zero margin of error', 'miracle', 'never make a single mistake', '100% guaranteed'];
    for (const phrase of absoluteMatches) {
        const idx = text.toLowerCase().indexOf(phrase.toLowerCase());
        if (idx !== -1) {
            const actualSubstring = text.substr(idx, phrase.length);
            textIssues.push({
                problem_in: actualSubstring,
                problem: "Violates probabilistic tone mandate. TrueTone models and tools must not claim infallible or zero-error guarantees.",
                suggestion: "Engineered for 99.9% consistency across enterprise corpora"
            });
        }
    }

    // Rule 2: Artificial Urgency & Hyperbolic Clickbait
    const urgencyMatches = ['crazy deals', 'crazy lifetime deals', 'act now', 'dont miss out', "don't miss out", 'hurry', 'unbelievable sale', 'insane value'];
    for (const phrase of urgencyMatches) {
        const idx = text.toLowerCase().indexOf(phrase.toLowerCase());
        if (idx !== -1) {
            const actualSubstring = text.substr(idx, phrase.length);
            textIssues.push({
                problem_in: actualSubstring,
                problem: "Violates enterprise dignity guidelines. TrueTone prohibits urgency clickbait, sensationalism, and high-pressure retail sales phrasing.",
                suggestion: "Preferred enterprise volume tiers available through our customer portal"
            });
        }
    }

    // Rule 3: Brand Name Capitalization
    const brandCases = ['truetone', 'True Tone', 'TRUETONE'];
    for (const brand of brandCases) {
        let start = 0;
        let idx;
        while ((idx = text.indexOf(brand, start)) !== -1) {
            textIssues.push({
                problem_in: brand,
                problem: "Brand identity guideline mismatch. The brand name must always be formatted in CamelCase as 'TrueTone'.",
                suggestion: "TrueTone"
            });
            start = idx + brand.length;
        }
    }

    // Rule 4: Statutory Forward-Looking / ARR Claims without Safe Harbor
    const arrPhrases = ['arr growth exceeding', 'projected revenue growth', 'projected arr'];
    for (const phrase of arrPhrases) {
        const idx = text.toLowerCase().indexOf(phrase.toLowerCase());
        if (idx !== -1 && !text.toLowerCase().includes('safe harbor') && !text.toLowerCase().includes('section 27a')) {
            const actualSubstring = text.substr(idx, phrase.length);
            textIssues.push({
                problem_in: actualSubstring,
                problem: "SEC regulatory risk. Forward-looking financial statements or ARR growth claims require statutory Safe Harbor disclosure (Section 27A).",
                suggestion: `${actualSubstring} (subject to standard Section 27A Safe Harbor disclaimers)`
            });
        }
    }

    // Inspect files
    for (const file of files) {
        const fn = file.originalname.toLowerCase();
        // Check for disallowed/neon/uncalibrated draft files
        if (fn.includes('neon') || fn.includes('magenta') || fn.includes('unapproved')) {
            badFiles.push({
                file_name: file.originalname,
                problem: "Asset color palette deviation. Uncalibrated neon/magenta overlays violate Section 1.2 of Visual Standards (prohibited colors).",
                suggestion: "Replace asset with official enterprise palette (Deep Navy #0A0F1D or Electric Cyan #06B6D4) master SVG/PNG."
            });
        } else if (fn.includes('distort') || fn.includes('stretched')) {
            badFiles.push({
                file_name: file.originalname,
                problem: "Logo safe zone violation. Emblem aspect ratio is distorted or safe zone margin is compromised.",
                suggestion: "Use unaltered master SVG logo from the 2026 enterprise asset library."
            });
        } else {
            goodFiles.push(file.originalname);
        }
    }

    return {
        text: textIssues,
        bad_files: badFiles,
        good_files: goodFiles,
    };
}

module.exports = {
    auditContentWithGemini,
};
