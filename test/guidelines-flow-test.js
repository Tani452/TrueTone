/**
 * Automated Test: Guidelines Tab & AI Knowledge Base Service
 * Validates guidelines listing, path traversal prevention, candidate validation,
 * staged persistence, and past publish reverse-engineering extraction.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
    listGuidelinesFiles,
    getGuidelineFile,
    stageCandidateFiles,
    commitStagedFiles,
    discardStagedFiles,
    appendPastPublishesData,
} = require('../src/services/guidelines.service');
const {
    validateCandidateGuidelinesWithGemini,
    extractPastPublishesWithGemini,
} = require('../src/services/gemini.service');

async function runGuidelinesTests() {
    console.log('==============================================================');
    console.log('  Running TrueTone Guidelines Knowledge Base Verification');
    console.log('==============================================================');

    // Test 1: List existing guideline files
    console.log('\n[TEST 1] Testing listGuidelinesFiles()...');
    const files = await listGuidelinesFiles();
    assert(files.length >= 3, `Expected at least 3 guideline files, found: ${files.length}`);
    const names = files.map(f => f.name);
    assert(names.includes('brand_voice_and_tone.md'), 'Must list brand_voice_and_tone.md');
    assert(names.includes('approved_facts_and_claims.txt'), 'Must list approved_facts_and_claims.txt');
    assert(names.includes('visual_and_accessibility_standards.md'), 'Must list visual_and_accessibility_standards.md');
    console.log(`  ✓ Found ${files.length} active guideline files in ./guidelines`);

    // Test 2: Read specific guideline file safely
    console.log('\n[TEST 2] Testing getGuidelineFile() with path traversal safety...');
    const fileData = await getGuidelineFile('../../../guidelines/brand_voice_and_tone.md'); // path traversal attempt
    assert(fileData.name === 'brand_voice_and_tone.md', 'path.basename must sanitize filename');
    assert(fileData.content.includes('TrueTone Enterprise Brand Voice'), 'Content must match');
    console.log(`  ✓ Read ${fileData.name} (${fileData.size} bytes) with sanitized path traversal.`);

    // Test 3: Validate candidate files with Gemini AI / Heuristic
    console.log('\n[TEST 3] Testing candidate guideline validation...');
    const validCandidate = [
        {
            originalname: '2026_partner_pricing_policy.md',
            buffer: Buffer.from('# Partner Pricing Policy\nAll multi-year subscriptions receive 15% volume tiering.'),
            size: 80,
        }
    ];

    const validReport = await validateCandidateGuidelinesWithGemini(validCandidate, 'Existing Guidelines');
    assert(validReport.is_valid === true, 'Candidate style policy should be valid');
    assert(validReport.summary && validReport.summary.length > 0, 'Summary must be provided');
    console.log(`  ✓ Valid candidate approved: "${validReport.summary}"`);

    const invalidCandidate = [
        {
            originalname: 'bad_contradiction.txt',
            buffer: Buffer.from('Policy update: TrueTone is now 100% infallible and guarantees zero errors.'),
            size: 78,
        }
    ];
    const invalidReport = await validateCandidateGuidelinesWithGemini(invalidCandidate, 'Existing Guidelines');
    assert(invalidReport.is_valid === false, 'Contradictory policy must be rejected');
    assert(invalidReport.incompatible_files.includes('bad_contradiction.txt'), 'Must list rejected filename');
    console.log(`  ✓ Incompatible candidate rejected: "${invalidReport.incompatible_reason}"`);

    // Test 4: Staging and Commitment Workflow
    console.log('\n[TEST 4] Testing staging and commit workflow...');
    const testFile = [
        {
            originalname: 'unit_test_temp_guideline.md',
            buffer: Buffer.from('# Unit Test Guideline\nFor automated test purposes only.'),
            size: 55,
        }
    ];

    const staged = await stageCandidateFiles(testFile);
    assert(staged.stagingId, 'Must produce stagingId');
    console.log(`  ✓ Staged candidate in temporary session: ${staged.stagingId}`);

    const saved = await commitStagedFiles(staged.stagingId);
    assert(saved.includes('unit_test_temp_guideline.md'), 'Must commit file to ./guidelines');

    // Verify it exists in ./guidelines
    const createdPath = path.resolve(__dirname, '../guidelines/unit_test_temp_guideline.md');
    assert(fs.existsSync(createdPath), 'File must exist in ./guidelines after commit');

    // Clean up unit test file
    fs.unlinkSync(createdPath);
    console.log(`  ✓ Successfully committed and cleaned up test guideline file.`);

    // Test 5: Extract Past Publishes and Append to past_data_from_reviews.md
    console.log('\n[TEST 5] Testing extractPastPublishesWithGemini() & append...');
    const pastPublishes = [
        {
            originalname: 'past_post_nov26.txt',
            buffer: Buffer.from('TrueTone announces sub-10ms GIN indexing benchmarks on 10M records. Safe Harbor disclaimers apply.'),
            size: 110,
        }
    ];

    const extractedMarkdown = await extractPastPublishesWithGemini(pastPublishes);
    assert(extractedMarkdown.includes('Brand Tone & Voice Characteristics'), 'Must include Section 1');
    assert(extractedMarkdown.includes('Verified Facts, Metrics & Data Types'), 'Must include Section 4');

    const appendRes = await appendPastPublishesData(extractedMarkdown, ['past_post_nov26.txt']);
    assert(appendRes.target_file === 'past_data_from_reviews.md', 'Target file must be past_data_from_reviews.md');

    const targetPath = path.resolve(__dirname, '../guidelines/past_data_from_reviews.md');
    assert(fs.existsSync(targetPath), 'past_data_from_reviews.md must exist');
    const content = fs.readFileSync(targetPath, 'utf8');
    assert(content.includes('Extraction Batch'), 'Must include timestamped batch header');
    assert(content.includes('past_post_nov26.txt'), 'Must record source filenames');
    console.log(`  ✓ Extracted insights successfully appended to ./guidelines/${appendRes.target_file} (${appendRes.size} bytes).`);

    console.log('\n==============================================================');
    console.log('  Guidelines Knowledge Base Suite Passed Successfully!');
    console.log('==============================================================\n');
}

runGuidelinesTests().catch(err => {
    console.error('Guidelines test failure:', err);
    process.exit(1);
});
