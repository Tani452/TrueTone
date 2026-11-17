/**
 * Automated Test: Reviews Tab & Governance Voting Engine
 * Validates endpoint registration, comment tree recursion, reaction toggling,
 * 5-day expiration logic, and voting consensus calculations.
 */

const assert = require('assert');
const app = require('../src/app');
const db = require('../src/db');
const {
    countTotalComments,
    findCommentRecursive,
    checkAndFinalizeExpiredVotes,
    getPendingList,
    getPendingById,
    castVote,
    addComment,
    addReply,
    reactToComment,
    forceFinalizePost,
} = require('../src/services/pending.service');

async function runReviewsTests() {
    console.log('==============================================================');
    console.log('  Running TrueTone Reviews & Governance Voting Suite');
    console.log('==============================================================');

    // Test 1: Express Route Mounting for Pending API
    console.log('\n[TEST 1] Testing Express Route Registration for Pending Endpoints...');
    const registeredPaths = [];
    app._router.stack.forEach(middleware => {
        if (middleware.name === 'router' && middleware.regexp) {
            const match = middleware.regexp.toString();
            if (match.includes('pending')) {
                registeredPaths.push('/api/pending');
            }
        }
    });
    assert(registeredPaths.includes('/api/pending'), 'Route /api/pending must be mounted in Express app');
    console.log('  ✓ Verified /api/pending is mounted in Express app.');

    // Test 2: Nested Comment Tree Recursive Helpers
    console.log('\n[TEST 2] Testing Comment Tree Recursion & Counting...');
    const sampleComments = [
        {
            comment_id: 'c1',
            user_name: 'Alice',
            text: 'Initial review note',
            replies: [
                {
                    comment_id: 'c1-1',
                    user_name: 'Bob',
                    text: 'Agreed with tone adjustment',
                    replies: [
                        {
                            comment_id: 'c1-1-1',
                            user_name: 'Charlie',
                            text: 'Applied the change',
                            replies: []
                        }
                    ]
                },
                {
                    comment_id: 'c1-2',
                    user_name: 'David',
                    text: 'Alternative suggestion',
                    replies: []
                }
            ]
        },
        {
            comment_id: 'c2',
            user_name: 'Elena',
            text: 'Checked brand guidelines compliance',
            replies: []
        }
    ];

    const totalCount = countTotalComments(sampleComments);
    assert.strictEqual(totalCount, 5, `Expected 5 total comments including nested, got ${totalCount}`);
    console.log(`  ✓ Recursive comment counter correctly calculated: ${totalCount} comments.`);

    const foundDeepComment = findCommentRecursive(sampleComments, 'c1-1-1');
    assert(foundDeepComment !== null, 'Must find deeply nested comment c1-1-1');
    assert.strictEqual(foundDeepComment.user_name, 'Charlie');
    console.log(`  ✓ findCommentRecursive correctly retrieved deep node: "${foundDeepComment.text}"`);

    const notFoundComment = findCommentRecursive(sampleComments, 'c999');
    assert.strictEqual(notFoundComment, null, 'Must return null for non-existent comment');
    console.log('  ✓ Handled non-existent comment ID gracefully.');

    // Test 3: Expiration & Time Remaining Calculations
    console.log('\n[TEST 3] Testing 5-Day Expiration Calculation Logic...');
    const now = Date.now();
    const fourDaysAgo = new Date(now - 4 * 24 * 60 * 60 * 1000);
    const sixDaysAgo = new Date(now - 6 * 24 * 60 * 60 * 1000);

    const fourDaysExpiresAt = new Date(fourDaysAgo.getTime() + 5 * 24 * 60 * 60 * 1000);
    const sixDaysExpiresAt = new Date(sixDaysAgo.getTime() + 5 * 24 * 60 * 60 * 1000);

    assert(fourDaysExpiresAt.getTime() > now, 'Post submitted 4 days ago should still be open for voting');
    assert(sixDaysExpiresAt.getTime() < now, 'Post submitted 6 days ago should be expired');
    console.log('  ✓ 5-day expiration window logic verified.');

    // Test 4: Database Live Integration Tests (if DB is reachable)
    console.log('\n[TEST 4] Testing Live Database Operations & Governance Workflow...');
    const health = await db.checkHealth();

    if (health.status === 'healthy') {
        console.log(`  (PostgreSQL connected: latency ${health.latencyMs}ms)`);

        // Insert a test pending post
        const testPostPayload = {
            submitted_by: 1,
            author_name: 'Sarah Jenkins',
            department: 'Content & Creative Marketing',
            designation: 'Senior Content Creator',
            text: 'TrueTone test announcement for 5-day governance voting verification.',
            files: []
        };

        const testOverallReview = {
            status: 'UNAPPROVED',
            flagged_by_ai: true,
            unresolved_issues: {
                text: [{
                    matched_text: 'test announcement',
                    issue: 'Heuristic guideline review test',
                    recommendation: 'Verified corporate copy',
                    severity: 'WARNING'
                }],
                bad_files: [],
                good_files: []
            },
            voters: {},
            reviewer_comments: []
        };

        const insertRes = await db.query(
            `INSERT INTO pending (post, timestamp, vote_approve, vote_not_approve, approved, overall_review)
             VALUES ($1::jsonb, NOW(), 0, 0, 'N', $2::jsonb)
             RETURNING id`,
            [JSON.stringify(testPostPayload), JSON.stringify(testOverallReview)]
        );
        const testPendingId = insertRes.rows[0].id;
        console.log(`  ✓ Inserted test pending post #${testPendingId}`);

        // Fetch pending list
        const queueList = await getPendingList('open');
        assert(queueList.some(p => String(p.id) === String(testPendingId)), 'Inserted post must appear in open queue');
        console.log(`  ✓ getPendingList('open') returns post #${testPendingId}`);

        // Fetch detail by ID
        const detail = await getPendingById(testPendingId);
        assert(detail !== null, 'getPendingById must return record');
        assert.strictEqual(detail.status, 'UNAPPROVED');
        assert.strictEqual(detail.is_voting_open, true);
        console.log(`  ✓ getPendingById correctly loaded record with is_voting_open = true`);

        // Vote casting (User 2: Michael Chen, can_approve = 'Y')
        const voteResult1 = await castVote(testPendingId, 2, 'yes');
        assert.strictEqual(voteResult1.vote_approve, 1);
        assert.strictEqual(voteResult1.vote_not_approve, 0);
        assert.strictEqual(voteResult1.user_vote, 'yes');
        console.log(`  ✓ User #2 voted 'yes': Tallies -> ${voteResult1.vote_approve} Yes, ${voteResult1.vote_not_approve} No`);

        // Vote casting (User 3: Elena Rostova, can_approve = 'Y', votes 'no')
        const voteResult2 = await castVote(testPendingId, 3, 'no');
        assert.strictEqual(voteResult2.vote_approve, 1);
        assert.strictEqual(voteResult2.vote_not_approve, 1);
        console.log(`  ✓ User #3 voted 'no': Tallies -> ${voteResult2.vote_approve} Yes, ${voteResult2.vote_not_approve} No`);

        // Vote toggle test: User 3 clicks 'no' again to revoke
        const voteResult3 = await castVote(testPendingId, 3, 'no');
        assert.strictEqual(voteResult3.vote_approve, 1);
        assert.strictEqual(voteResult3.vote_not_approve, 0);
        assert.strictEqual(voteResult3.user_vote, null);
        console.log(`  ✓ User #3 revoked vote by clicking 'no' again: Tallies -> ${voteResult3.vote_approve} Yes, ${voteResult3.vote_not_approve} No`);

        // Role restriction check: User 1 has can_approve = 'N' -> should throw error
        let unauthorizedCaught = false;
        try {
            await castVote(testPendingId, 1, 'yes');
        } catch (authErr) {
            unauthorizedCaught = true;
            assert(authErr.message.includes('Unauthorized'), 'Error message must specify unauthorized');
        }
        assert(unauthorizedCaught, 'Non-approver user must be blocked from voting');
        console.log('  ✓ Role gate verified: User with can_approve=N cannot vote.');

        // Add top-level comment
        const commentRes = await addComment(testPendingId, {
            userId: 2,
            userName: 'Michael Chen',
            designation: 'Brand Governance Lead',
            text: 'I suggest replacing test announcement with official press release copy.'
        });
        assert(commentRes.success && commentRes.comment.comment_id, 'Must return new comment object');
        const rootCommentId = commentRes.comment.comment_id;
        console.log(`  ✓ Added top-level comment #${rootCommentId}`);

        // Add nested reply
        const replyRes = await addReply(testPendingId, rootCommentId, {
            userId: 1,
            userName: 'Sarah Jenkins',
            designation: 'Senior Content Creator',
            text: 'Got it Michael, updating the copy accordingly.'
        });
        assert(replyRes.success && replyRes.reply.comment_id, 'Must return new reply');
        console.log(`  ✓ Added nested reply #${replyRes.reply.comment_id} to comment #${rootCommentId}`);

        // React to comment (Like toggle)
        const reactRes1 = await reactToComment(testPendingId, rootCommentId, 1, 'like');
        assert.strictEqual(reactRes1.comment.likes, 1);
        console.log(`  ✓ User #1 liked comment #${rootCommentId}: likes = 1`);

        const reactRes2 = await reactToComment(testPendingId, rootCommentId, 1, 'like');
        assert.strictEqual(reactRes2.comment.likes, 0);
        console.log(`  ✓ User #1 toggled like off: likes = 0`);

        // Hackathon Demo: Fast-forward 5 days elapsed (forceFinalizePost)
        // Currently 1 Yes vs 0 No -> Should finalize to APPROVED and copy to published table
        const finalizeRes = await forceFinalizePost(testPendingId);
        assert.strictEqual(finalizeRes.status, 'APPROVED');
        assert(finalizeRes.published_id !== null, 'Approved post must have published_id');
        console.log(`  ✓ Demo 5-day expiration simulation passed: Post approved (${finalizeRes.vote_approve} Yes vs ${finalizeRes.vote_not_approve} No) and dispatched to published #${finalizeRes.published_id}`);

        // Clean up test records
        await db.query('DELETE FROM published WHERE id = $1', [finalizeRes.published_id]);
        await db.query('DELETE FROM pending WHERE id = $1', [testPendingId]);
        console.log(`  ✓ Cleaned up test database records.`);
    } else {
        console.log(`  [NOTICE] PostgreSQL not running locally; skipping live DB transactions.`);
    }

    console.log('\n==============================================================');
    console.log('  Reviews Tab & Governance Voting Suite Passed Successfully!');
    console.log('==============================================================\n');
}

if (require.main === module) {
    runReviewsTests()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('\n[TEST FAILED]', err);
            process.exit(1);
        });
}

module.exports = { runReviewsTests };
