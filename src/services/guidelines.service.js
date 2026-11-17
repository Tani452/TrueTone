/**
 * Guidelines Service
 * Dynamically ingests all brand guideline documents from ./guidelines directory
 * Caches in memory with file modification timestamp invalidation.
 */

const fs = require('fs');
const path = require('path');

const GUIDELINES_DIR = path.resolve(__dirname, '../../guidelines');

let cache = {
    mtimeMap: {},
    consolidatedText: '',
    structuredRules: [],
    lastChecked: 0,
};

/**
 * Loads all brand guideline files from ./guidelines with smart timestamp caching
 * @returns {Promise<{ consolidatedText: string, structuredRules: Array, files: string[] }>}
 */
async function loadGuidelinesContext() {
    if (!fs.existsSync(GUIDELINES_DIR)) {
        fs.mkdirSync(GUIDELINES_DIR, { recursive: true });
    }

    const files = fs.readdirSync(GUIDELINES_DIR);
    const validExtensions = ['.md', '.txt', '.json'];
    const guidelineFiles = files.filter(f => validExtensions.includes(path.extname(f).toLowerCase()));

    // Check if any file modified since last read
    let needsReload = Object.keys(cache.mtimeMap).length !== guidelineFiles.length;

    for (const file of guidelineFiles) {
        const fullPath = path.join(GUIDELINES_DIR, file);
        const stat = fs.statSync(fullPath);
        if (cache.mtimeMap[file] !== stat.mtimeMs) {
            needsReload = true;
            cache.mtimeMap[file] = stat.mtimeMs;
        }
    }

    if (!needsReload && cache.consolidatedText) {
        return {
            consolidatedText: cache.consolidatedText,
            structuredRules: cache.structuredRules,
            files: guidelineFiles,
        };
    }

    let combined = '';
    const rules = [];

    for (const file of guidelineFiles) {
        const fullPath = path.join(GUIDELINES_DIR, file);
        const content = fs.readFileSync(fullPath, 'utf8');
        combined += `\n--- BEGIN GUIDELINE DOCUMENT: ${file} ---\n${content}\n--- END GUIDELINE DOCUMENT: ${file} ---\n`;
        rules.push({ filename: file, content });
    }

    cache.consolidatedText = combined;
    cache.structuredRules = rules;

    return {
        consolidatedText: combined,
        structuredRules: rules,
        files: guidelineFiles,
    };
}

module.exports = {
    loadGuidelinesContext,
};
