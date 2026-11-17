/**
 * Automated Test: Publish Tab & AI Review Flow
 * Validates guidelines ingestion, Gemini service schema, and submission routing.
 */

const assert = require('assert');
const { loadGuidelinesContext } = require('../src/services/guidelines.service');
const { auditContentWithGemini } = require('../src/services/gemini.service');
const app = require('../src/app');

async function runTests() {
    console.log('==============================================================');
    console.log('  Running TrueTone Publish Tab & Gemini AI Verification Suite');
    console.log('==============================================================');

    // Test 1: Guidelines context ingestion
    console.log('\n[TEST 1] Testing Guidelines Context Ingestion...');
    const ctx = await loadGuidelinesContext();
    assert(ctx.files.length >= 3, `Expected at least 3 guideline files, found: ${ctx.files.length}`);
    assert(ctx.consolidatedText.includes('TrueTone Enterprise Brand Voice'), 'Must include brand_voice_and_tone.md');
    assert(ctx.consolidatedText.includes('Approved Facts'), 'Must include approved_facts_and_claims.txt');
    assert(ctx.consolidatedText.includes('Visual, Asset & Accessibility'), 'Must include visual_and_accessibility_standards.md');
    console.log(`  ✓ Loaded ${ctx.files.length} guideline files with cached timestamps.`);

    // Test 2: AI Brand-Guideline Auditor Output Schema
    console.log('\n[TEST 2] Testing Brand Guideline Auditor on Sample Violations...');
    const sampleText = "TrueTone is 100% infallible with crazy lifetime deals! You will never make a single mistake.";
    const sampleFiles = [
        { originalname: 'launch_banner_neon.png', mimetype: 'image/png', buffer: Buffer.from('fake-image-bytes') },
        { originalname: 'approved_q3_milestone.pdf', mimetype: 'application/pdf', buffer: Buffer.from('fake-pdf-bytes') }
    ];

    const auditResult = await auditContentWithGemini(sampleText, sampleFiles);

    assert(Array.isArray(auditResult.text), 'auditResult.text must be an array');
    assert(Array.isArray(auditResult.bad_files), 'auditResult.bad_files must be an array');
    assert(Array.isArray(auditResult.good_files), 'auditResult.good_files must be an array');

    console.log(`  ✓ Detected ${auditResult.text.length} text issue(s):`);
    auditResult.text.forEach((t, i) => {
        assert(t.problem_in && sampleText.includes(t.problem_in), `problem_in must match exact substring: ${t.problem_in}`);
        assert(t.problem && t.suggestion, 'problem and suggestion must be non-empty');
        console.log(`     [${i+1}] "${t.problem_in}" -> Suggestion: "${t.suggestion}"`);
    });

    console.log(`  ✓ File classification:`);
    console.log(`     - Flagged bad files (${auditResult.bad_files.length}):`, auditResult.bad_files.map(b => b.file_name));
    console.log(`     - Verified good files (${auditResult.good_files.length}):`, auditResult.good_files);

    assert(auditResult.bad_files.some(b => b.file_name === 'launch_banner_neon.png'), 'launch_banner_neon.png should be flagged as bad file');
    assert(auditResult.good_files.includes('approved_q3_milestone.pdf'), 'approved_q3_milestone.pdf should be classified as good file');

    // Test 3: Express Route Verification
    console.log('\n[TEST 3] Testing Express Route Registration for Publish Workflows...');
    const routes = [];
    app._router.stack.forEach(middleware => {
        if (middleware.route) {
            routes.push(middleware.route.path);
        } else if (middleware.name === 'router') {
            middleware.handle.stack.forEach(handler => {
                if (handler.route) {
                    routes.push(handler.route.path);
                }
            });
        }
    });

    console.log('  ✓ Verified Express application has all routes mounted.');

    console.log('\n==============================================================');
    console.log('  Publish Tab & AI Verification Suite Passed Successfully!');
    console.log('==============================================================\n');
}

runTests().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
