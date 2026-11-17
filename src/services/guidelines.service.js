/**
 * Guidelines Service
 * Manages the server-side ./guidelines directory, file listing, content inspection,
 * staging workflow for candidate uploads, and appending past publish extractions.
 */

const fs = require('fs');
const path = require('path');

const GUIDELINES_DIR = path.resolve(__dirname, '../../guidelines');
const STAGING_DIR = path.resolve(__dirname, '../../uploads/staging');

// Ensure directories exist on startup
if (!fs.existsSync(GUIDELINES_DIR)) {
    fs.mkdirSync(GUIDELINES_DIR, { recursive: true });
}
if (!fs.existsSync(STAGING_DIR)) {
    fs.mkdirSync(STAGING_DIR, { recursive: true });
}

let cache = {
    mtimeMap: {},
    consolidatedText: '',
    structuredRules: [],
    lastChecked: 0,
};

/**
 * Loads all brand guideline files from ./guidelines with timestamp invalidation
 */
async function loadGuidelinesContext() {
    if (!fs.existsSync(GUIDELINES_DIR)) {
        fs.mkdirSync(GUIDELINES_DIR, { recursive: true });
    }

    const files = fs.readdirSync(GUIDELINES_DIR);
    const validExtensions = ['.md', '.txt', '.json', '.pdf', '.doc', '.docx'];
    const guidelineFiles = files.filter(f => validExtensions.includes(path.extname(f).toLowerCase()));

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
        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            combined += `\n--- BEGIN GUIDELINE DOCUMENT: ${file} ---\n${content}\n--- END GUIDELINE DOCUMENT: ${file} ---\n`;
            rules.push({ filename: file, content });
        } catch (e) {
            combined += `\n--- ATTACHED GUIDELINE ASSET: ${file} (Binary/PDF) ---\n`;
        }
    }

    cache.consolidatedText = combined;
    cache.structuredRules = rules;

    return {
        consolidatedText: combined,
        structuredRules: rules,
        files: guidelineFiles,
    };
}

/**
 * List all active files inside ./guidelines
 */
async function listGuidelinesFiles() {
    if (!fs.existsSync(GUIDELINES_DIR)) {
        fs.mkdirSync(GUIDELINES_DIR, { recursive: true });
    }

    const fileNames = fs.readdirSync(GUIDELINES_DIR);
    const result = [];

    for (const name of fileNames) {
        const fullPath = path.join(GUIDELINES_DIR, name);
        try {
            const stat = fs.statSync(fullPath);
            if (stat.isFile()) {
                result.push({
                    name,
                    size: stat.size,
                    updated_at: stat.mtime,
                    extension: path.extname(name).toLowerCase(),
                });
            }
        } catch (e) {
            // Ignore missing/locked
        }
    }

    // Sort alphabetically with core standards first
    result.sort((a, b) => a.name.localeCompare(b.name));
    return result;
}

/**
 * Read specific guideline file with strict path traversal prevention
 */
async function getGuidelineFile(fileName) {
    const safeName = path.basename(fileName);
    const fullPath = path.join(GUIDELINES_DIR, safeName);

    if (!fs.existsSync(fullPath)) {
        throw new Error(`Guideline file not found: ${safeName}`);
    }

    const stat = fs.statSync(fullPath);
    let content = '';

    try {
        content = fs.readFileSync(fullPath, 'utf8');
    } catch (e) {
        content = `[Binary / PDF file: ${safeName} (${stat.size} bytes)]`;
    }

    return {
        name: safeName,
        size: stat.size,
        updated_at: stat.mtime,
        content,
    };
}

/**
 * Stage candidate guideline files temporarily while user reviews confirmation dialog
 */
async function stageCandidateFiles(files = []) {
    const stagingId = `stage_${Date.now()}_${Math.round(Math.random() * 1e6)}`;
    const targetDir = path.join(STAGING_DIR, stagingId);
    fs.mkdirSync(targetDir, { recursive: true });

    const stagedFiles = [];
    for (const file of files) {
        const safeName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = path.join(targetDir, safeName);
        fs.writeFileSync(filePath, file.buffer);
        stagedFiles.push({
            original_name: file.originalname,
            staged_name: safeName,
            size: file.size,
            path: filePath,
        });
    }

    return {
        stagingId,
        files: stagedFiles,
    };
}

/**
 * Commit staged files directly into ./guidelines
 */
async function commitStagedFiles(stagingId) {
    const targetDir = path.join(STAGING_DIR, path.basename(stagingId));
    if (!fs.existsSync(targetDir)) {
        throw new Error(`Staging session expired or not found: ${stagingId}`);
    }

    const stagedNames = fs.readdirSync(targetDir);
    const savedFiles = [];

    for (const name of stagedNames) {
        const sourcePath = path.join(targetDir, name);
        const destPath = path.join(GUIDELINES_DIR, name);
        fs.copyFileSync(sourcePath, destPath);
        fs.unlinkSync(sourcePath);
        savedFiles.push(name);
    }

    // Clean up staging directory
    try {
        fs.rmdirSync(targetDir);
    } catch (e) {}

    // Invalidate memory cache so publish_tab picks up new rules immediately
    cache.consolidatedText = '';

    return savedFiles;
}

/**
 * Discard staged temporary files when user clicks Cancel
 */
async function discardStagedFiles(stagingId) {
    if (!stagingId) return;
    const targetDir = path.join(STAGING_DIR, path.basename(stagingId));
    if (fs.existsSync(targetDir)) {
        const files = fs.readdirSync(targetDir);
        for (const file of files) {
            fs.unlinkSync(path.join(targetDir, file));
        }
        try {
            fs.rmdirSync(targetDir);
        } catch (e) {}
    }
}

/**
 * Append or create extracted patterns in ./guidelines/past_data_from_reviews.md
 */
async function appendPastPublishesData(extractedMarkdown, sourceFilenames = []) {
    const targetFile = 'past_data_from_reviews.md';
    const targetPath = path.join(GUIDELINES_DIR, targetFile);

    const exists = fs.existsSync(targetPath);
    const timestampStr = new Date().toISOString();

    let contentToAppend = '';

    if (!exists) {
        contentToAppend = `# Extracted Guidelines & Data from Past Publishes\n\n` +
            `This document contains empirical brand voice rules, terminology standards, and verified facts extracted from approved historical publications by TrueTone AI.\n\n` +
            `---\n## Extraction Batch — ${timestampStr}\n` +
            `**Source Files:** ${sourceFilenames.join(', ')}\n\n` +
            `${extractedMarkdown.trim()}\n`;
    } else {
        contentToAppend = `\n\n---\n## Extraction Batch — ${timestampStr}\n` +
            `**Source Files:** ${sourceFilenames.join(', ')}\n\n` +
            `${extractedMarkdown.trim()}\n`;
    }

    fs.appendFileSync(targetPath, contentToAppend, 'utf8');

    // Invalidate memory cache
    cache.consolidatedText = '';

    return {
        target_file: targetFile,
        size: fs.statSync(targetPath).size,
        updated_at: new Date(),
    };
}

module.exports = {
    loadGuidelinesContext,
    listGuidelinesFiles,
    getGuidelineFile,
    stageCandidateFiles,
    commitStagedFiles,
    discardStagedFiles,
    appendPastPublishesData,
};
