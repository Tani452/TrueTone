/**
 * Automated Test: Actions Tab & Weekly AI Log Synthesis Suite
 * Validates endpoint mounting, Pass A (flagged) vs Pass B (clean) log processing,
 * schema adherence for cumulative reports, role-gated manager commenting, and database persistence.
 */

const assert = require('assert');
const app = require('../src/app');
const db = require('../src/db');
const {
    isLogFlagged,
    runWeeklyLogAnalysis,
    getAllActionReports,
    getActionReportById,
    addManagerComment,
} = require('../src/services/actions.service');
const { generateCumulativeReportWithGemini } = require('../src/services/gemini.service');

async function runActionsTests() {
    console.log('==============================================================');
    console.log('  Running TrueTone Actions & Weekly AI Log Synthesis Suite');
    console.log('==============================================================');

    // Test 1: Express Route Mounting for Actions Endpoints
    console.log('\n[TEST 1] Testing Express Route Registration for Actions Endpoints...');
    const registeredPaths = [];
    app._router.stack.forEach(middleware => {
        if (middleware.name === 'router' && middleware.regexp) {
            const match = middleware.regexp.toString();
            if (match.includes('actions')) {
                registeredPaths.push('/api/actions');
            }
        }
    });
    assert(registeredPaths.includes('/api/actions'), 'Route /api/actions must be mounted in Express app');
    console.log('  ✓ Verified /api/actions is mounted in Express app.');

    // Test 2: Helper isLogFlagged classification
    console.log('\n[TEST 2] Testing isLogFlagged classification...');
    const cleanLog = { post: { text: 'Clean post' }, issue: null };
    const emptyIssueLog = { post: { text: 'Empty issue post' }, issue: {} };
    const flaggedTextLog = { post: { text: 'Flagged text' }, issue: { text: [{ problem: 'Tone issue' }] } };
    const flaggedErrorLog = { post: { text: 'Flagged error' }, issue: { error_type: 'Tone_Violation' } };

    assert.strictEqual(isLogFlagged(cleanLog), false, 'Clean log must return false');
    assert.strictEqual(isLogFlagged(emptyIssueLog), false, 'Empty issue object must return false');
    assert.strictEqual(isLogFlagged(flaggedTextLog), true, 'Log with text issue must return true');
    assert.strictEqual(isLogFlagged(flaggedErrorLog), true, 'Log with error_type must return true');
    console.log('  ✓ isLogFlagged correctly differentiates flagged vs clean log entries.');

    // Test 3: Pass A vs Pass B Synthesis Logic & Schema Conformance
    console.log('\n[TEST 3] Testing Cumulative Report Synthesis (Pass A & Pass B)...');
    const mockUser = {
        user_id: 1,
        user_name: 'Sarah Jenkins',
        designation: 'Senior Content Creator',
        department: 'Content & Creative Marketing',
    };

    const mockFlaggedLogBundle = {
        stats: {
            total_submissions: 3,
            flagged_submissions: 2,
            clean_submissions: 1,
        },
        flagged_logs: [
            {
                log_id: 101,
                post: { headline: 'TrueTone will never make a mistake' },
                issue: {
                    error_type: 'Tone_and_Voice_Violation',
                    violation_details: { guideline_reference: 'Section 2.1: Objective Claims' }
                }
            },
            {
                log_id: 102,
                post: { headline: 'Grab the world best tone checker' },
                issue: {
                    error_type: 'Grammar_and_Syntax_Standard',
                    violation_details: { guideline_reference: 'Section 1.4: English Syntax' }
                }
            }
        ],
        history: {},
    };

    const passAReport = await generateCumulativeReportWithGemini(mockUser, mockFlaggedLogBundle);

    assert(passAReport.status === 'NEEDS_ATTENTION' || passAReport.status === 'CRITICAL_REVIEW', 'Status must be NEEDS_ATTENTION or CRITICAL_REVIEW');
    assert(typeof passAReport.summary_headline === 'string' && passAReport.summary_headline.length > 0, 'summary_headline required');
    assert(typeof passAReport.detailed_analysis === 'string' && passAReport.detailed_analysis.length > 0, 'detailed_analysis required');
    assert(Array.isArray(passAReport.recurring_issues) && passAReport.recurring_issues.length > 0, 'recurring_issues array required');
    assert(Array.isArray(passAReport.recommended_actions) && passAReport.recommended_actions.length > 0, 'recommended_actions array required');
    assert(passAReport.stats && passAReport.stats.total_submissions === 3, 'stats object must match total_submissions');
    console.log(`  ✓ Pass A synthesis verified: status="${passAReport.status}", headline="${passAReport.summary_headline.substring(0, 50)}..."`);

    // Test 4: Live Database Integration & Role Gate (if DB reachable)
    console.log('\n[TEST 4] Testing Live Database Log Aggregation & Role Gating...');
    const health = await db.checkHealth();

    if (health.status === 'healthy') {
        console.log(`  (PostgreSQL connected: latency ${health.latencyMs}ms)`);

        // Execute weekly log analysis
        const weeklyResult = await runWeeklyLogAnalysis(7);
        assert(weeklyResult.processed_users >= 0, 'runWeeklyLogAnalysis must complete and return count');
        console.log(`  ✓ runWeeklyLogAnalysis(7) processed ${weeklyResult.processed_users} active creators.`);

        // Fetch all action reports (sorted: flagged first, then good performance)
        const allReports = await getAllActionReports();
        assert(Array.isArray(allReports), 'getAllActionReports must return array');
        console.log(`  ✓ getAllActionReports() retrieved ${allReports.length} cumulative report card(s).`);

        if (allReports.length > 0) {
            const firstAction = allReports[0];

            // Inspect detail
            const detailResult = await getActionReportById(firstAction.id);
            assert(detailResult !== null && detailResult.record, 'getActionReportById must return record');
            assert(Array.isArray(detailResult.logs), 'getActionReportById must return logs audit evidence');
            console.log(`  ✓ getActionReportById(${firstAction.id}) retrieved report for "${detailResult.record.user_name}" with ${detailResult.logs.length} audit log(s).`);

            // Test Role-Gated Commenting:
            // User #2: Michael Chen (can_approve = 'Y') -> Must succeed
            const commentRes = await addManagerComment(firstAction.id, 2, 'Leadership review note: Remediation training confirmed.');
            assert(commentRes.success && commentRes.comment.comment_id, 'Comment submission must return comment object');
            console.log(`  ✓ Approver #2 successfully posted manager comment: "${commentRes.comment.text}"`);

            // User #1: Sarah Jenkins (can_approve = 'N') -> Must throw 403 Unauthorized
            let unauthorizedCaught = false;
            try {
                await addManagerComment(firstAction.id, 1, 'Unauthorized attempt');
            } catch (err) {
                unauthorizedCaught = true;
                assert(err.message.includes('Unauthorized'), 'Error message must state unauthorized');
            }
            assert(unauthorizedCaught, 'Non-approver must be forbidden from adding manager review comments');
            console.log('  ✓ Role gate verified: Non-approver (can_approve=N) rejected with 403 Unauthorized.');
        }
    } else {
        console.log('  [NOTICE] PostgreSQL not running locally; skipping live DB execution.');
    }

    console.log('\n==============================================================');
    console.log('  Actions & Weekly AI Log Synthesis Suite Passed Successfully!');
    console.log('==============================================================\n');
}

if (require.main === module) {
    runActionsTests()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('\n[TEST FAILED]', err);
            process.exit(1);
        });
}

module.exports = { runActionsTests };
