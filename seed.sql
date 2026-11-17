-- =============================================================================
-- TrueTone Database Seed Data Script
-- Populates all 5 tables with realistic production-like sample data.
-- =============================================================================

-- Clear existing data if any (cascading cleanly)
TRUNCATE TABLE published RESTART IDENTITY CASCADE;
TRUNCATE TABLE actions RESTART IDENTITY CASCADE;
TRUNCATE TABLE logs RESTART IDENTITY CASCADE;
TRUNCATE TABLE pending RESTART IDENTITY CASCADE;
TRUNCATE TABLE users RESTART IDENTITY CASCADE;

-- =============================================================================
-- 1. SEED: USERS
-- Covers: Content Creators, Approvers/Managers, Compliance Admins, Execs
-- =============================================================================
INSERT INTO users (user_name, designation, department, contact_no, can_post, can_approve, can_take_action)
VALUES 
(
    'Sarah Jenkins', 
    'Senior Content Creator', 
    'Content & Creative Marketing', 
    '+1-555-0101', 
    'Y', 
    'N', 
    'N'
),
(
    'Michael Chen', 
    'Brand Governance Lead', 
    'Brand Strategy & Standards', 
    '+1-555-0102', 
    'Y', 
    'Y', 
    'N'
),
(
    'Elena Rostova', 
    'Compliance Officer & Brand Auditor', 
    'Legal & Brand Safety', 
    '+1-555-0103', 
    'N', 
    'Y', 
    'Y'
),
(
    'David Miller', 
    'VP of Corporate Communications', 
    'Executive Leadership', 
    '+1-555-0104', 
    'Y', 
    'Y', 
    'Y'
);


-- =============================================================================
-- 2. SEED: PENDING POSTS
-- Realistic queue items: AI issue detections, reviewer notes, and voting state
-- =============================================================================
INSERT INTO pending (post, timestamp, vote_approve, vote_not_approve, approved, overall_review)
VALUES
(
    '{
        "title": "Introducing QuantumFlow AI: Unlimited Power for Enterprise",
        "author_id": 1,
        "author_name": "Sarah Jenkins",
        "channels": ["LinkedIn", "Twitter/X"],
        "media_url": "https://cdn.truetone.ai/assets/quantum-flow-banner.jpg",
        "caption": "Experience unprecedented velocity. QuantumFlow AI guarantees 100% infallible marketing tone automation at zero marginal cost.",
        "tags": ["AI", "Innovation", "Enterprise"],
        "content_type": "Product_Teaser"
    }'::jsonb,
    NOW() - INTERVAL '25 minutes',
    1,
    1,
    'N',
    '{
        "ai_brand_score": 68,
        "compliance_status": "FLAGGED_FOR_HUMAN_REVIEW",
        "ai_flags": [
            {
                "rule": "UNVERIFIED_ABSOLUTE_CLAIMS",
                "severity": "HIGH",
                "matched_text": "guarantees 100% infallible",
                "recommendation": "Replace with empirical claim: Engineered for 99.9% consistency."
            },
            {
                "rule": "PROHIBITED_FINANCIAL_PROMISE",
                "severity": "MEDIUM",
                "matched_text": "at zero marginal cost",
                "recommendation": "Clarify pricing tier or reference standard enterprise pricing."
            }
        ],
        "reviewer_notes": "Michael Chen: Phrasing must comply with SEC safe harbor guidance. Waiting on author revision."
    }'::jsonb
),
(
    '{
        "title": "2026 ESG Milestone: TrueTone Achieves 100% Renewable Cloud Compute",
        "author_id": 2,
        "author_name": "Michael Chen",
        "channels": ["LinkedIn", "Company Blog", "Press Release"],
        "media_url": "https://cdn.truetone.ai/assets/esg-sustainability-2026.png",
        "caption": "Sustainability is core to how we scale. As of Q3, 100% of our model inference nodes are powered by certified wind and solar microgrids.",
        "tags": ["ESG", "Sustainability", "GreenCloud"],
        "content_type": "Corporate_Announcement"
    }'::jsonb,
    NOW() - INTERVAL '1 hour 15 minutes',
    2,
    0,
    'N',
    '{
        "ai_brand_score": 96,
        "compliance_status": "READY_FOR_FINAL_SIGN_OFF",
        "ai_flags": [],
        "reviewer_notes": "Elena Rostova: Third-party audit certificate verified. Ready for publish pending director approval."
    }'::jsonb
),
(
    '{
        "title": "Flash Partner Discount: 50% Off Lifetime Enterprise Subscriptions",
        "author_id": 1,
        "author_name": "Sarah Jenkins",
        "channels": ["Twitter/X", "Instagram"],
        "media_url": "https://cdn.truetone.ai/assets/flash-sale-neon.png",
        "caption": "URGENT FLASH SALE: Use coupon code NEON50 for crazy lifetime deals before midnight tonight! Do not miss out!",
        "tags": ["Sale", "Deals", "Discount"],
        "content_type": "Promotional"
    }'::jsonb,
    NOW() - INTERVAL '3 hours 40 minutes',
    0,
    3,
    'N',
    '{
        "ai_brand_score": 38,
        "compliance_status": "REJECTED_BRAND_DEVIATION",
        "ai_flags": [
            {
                "rule": "BRAND_VOICE_TONE_DISTORTION",
                "severity": "CRITICAL",
                "matched_text": "crazy lifetime deals / URGENT",
                "recommendation": "TrueTone brand voice prohibits urgency clickbait and hyperbolic discount language."
            },
            {
                "rule": "UNAUTHORIZED_PALETTE",
                "severity": "HIGH",
                "matched_text": "Neon Magenta (#FF0077) background",
                "recommendation": "Adhere to the approved enterprise brand guidelines: Navy, Slate, and Cyan."
            }
        ],
        "reviewer_notes": "David Miller: Rejection confirmed. Violates corporate voice policy Section 4.2."
    }'::jsonb
),
(
    '{
        "title": "Developer Spotlight: Building Custom Voice Guards with TrueTone SDK v3",
        "author_id": 4,
        "author_name": "David Miller",
        "channels": ["Developer Portal", "HackerNews", "X/Twitter"],
        "media_url": "https://cdn.truetone.ai/assets/sdk-v3-architecture.svg",
        "caption": "Explore the architectural principles behind TrueTone SDK v3. Learn how sub-10ms GIN-indexed Postgres queries power enterprise brand validation.",
        "tags": ["Developers", "PostgreSQL", "Engineering"],
        "content_type": "Technical_Article"
    }'::jsonb,
    NOW() - INTERVAL '15 minutes',
    0,
    0,
    'N',
    '{
        "ai_brand_score": 92,
        "compliance_status": "AWAITING_PEER_REVIEW",
        "ai_flags": [],
        "reviewer_notes": "Automated pipeline initialized. Awaiting initial peer vote."
    }'::jsonb
);


-- =============================================================================
-- 3. SEED: LOGS
-- Audit trail of AI brand violations, error types, and remediation history
-- =============================================================================
INSERT INTO logs (post, published_by, issue, timestamp, created_at)
VALUES
(
    '{
        "campaign": "Fall 2026 AI Suite Launch",
        "draft_id": "DRAFT-8841",
        "headline": "TrueTone is the first AI that will never make a single mistake."
    }'::jsonb,
    1,
    '{
        "error_type": "Tone_and_Voice_Violation",
        "severity": "HIGH",
        "category": "Overpromising_Claims",
        "ai_confidence": 0.98,
        "violation_details": {
            "flagged_phrases": ["never make a single mistake"],
            "guideline_reference": "Section 2.1: Objective and Probabilistic Tone Mandate",
            "required_remedy": "Rephrase to emphasize probabilistic testing and enterprise guardrails."
        }
    }'::jsonb,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
),
(
    '{
        "campaign": "Social Media Retargeting",
        "draft_id": "DRAFT-8862",
        "headline": "Grab the world best tone checker now!"
    }'::jsonb,
    1,
    '{
        "error_type": "Grammar_and_Syntax_Standard",
        "severity": "MEDIUM",
        "category": "Grammar_Error",
        "ai_confidence": 0.99,
        "violation_details": {
            "flagged_phrases": ["world best"],
            "guideline_reference": "Section 1.4: English Syntax & Editorial Quality",
            "required_remedy": "Correction: world''s best or world-leading."
        }
    }'::jsonb,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
),
(
    '{
        "campaign": "Investor Relations Briefing Q3",
        "draft_id": "DRAFT-8910",
        "headline": "Projected ARR growth trajectory exceeding 240% across Asia-Pacific."
    }'::jsonb,
    4,
    '{
        "error_type": "Legal_Regulatory_Risk",
        "severity": "CRITICAL",
        "category": "Missing_Disclaimer",
        "ai_confidence": 0.94,
        "violation_details": {
            "flagged_phrases": ["Projected ARR growth trajectory exceeding 240%"],
            "guideline_reference": "Section 6.3: Forward-Looking Statements Safe Harbor",
            "required_remedy": "Mandatory inclusion of standard disclaimer: Projections are estimates subject to market conditions."
        }
    }'::jsonb,
    NOW() - INTERVAL '1 day 6 hours',
    NOW() - INTERVAL '1 day 6 hours'
),
(
    '{
        "campaign": "Design System Modernization Announcement",
        "draft_id": "DRAFT-8935",
        "headline": "Updated TrueTone visual assets and brand kit released."
    }'::jsonb,
    2,
    '{
        "error_type": "Accessibility_Compliance",
        "severity": "LOW",
        "category": "WCAG_Contrast_Warning",
        "ai_confidence": 0.91,
        "violation_details": {
            "flagged_phrases": ["Graphic card text on gradient overlay"],
            "guideline_reference": "WCAG 2.2 AA Contrast Standards",
            "required_remedy": "Contrast ratio is 3.8:1; increase to minimum 4.5:1."
        }
    }'::jsonb,
    NOW() - INTERVAL '18 hours',
    NOW() - INTERVAL '18 hours'
);


-- =============================================================================
-- 4. SEED: ACTIONS
-- Cumulative user performance, brand violation trends, and action logs
-- =============================================================================
INSERT INTO actions (user_id, user_name, designation, cumulative_report, updated_at)
VALUES
(
    1,
    'Sarah Jenkins',
    'Senior Content Creator',
    '{
        "summary": {
            "total_submitted": 64,
            "approved_count": 48,
            "first_time_pass_rate": 0.75,
            "current_risk_level": "LOW",
            "audit_period": "Q3-Q4 2026"
        },
        "error_trends": {
            "Tone_and_Voice_Violation": 5,
            "Grammar_Error": 2,
            "Palette_Deviation": 1
        },
        "historical_activity": [
            { "date": "2026-11-10", "action": "Completed Brand Voice 2026 Refresher Course", "status": "COMPLETED" },
            { "date": "2026-11-14", "action": "Automated advisory sent for repetitive superlative usage", "status": "RESOLVED" }
        ],
        "action_recommendation": "Eligible for standard publishing workflow; AI pre-screening enabled."
    }'::jsonb,
    NOW() - INTERVAL '1 hour'
),
(
    2,
    'Michael Chen',
    'Brand Governance Lead',
    '{
        "summary": {
            "total_submitted": 42,
            "approved_count": 41,
            "first_time_pass_rate": 0.976,
            "current_risk_level": "NEGLIGIBLE",
            "reviews_conducted": 194,
            "average_decision_time_min": 14.5
        },
        "error_trends": {
            "Accessibility_Compliance": 1
        },
        "historical_activity": [
            { "date": "2026-10-01", "action": "Promoted to Senior Governance Reviewer", "status": "ACTIVE" },
            { "date": "2026-11-05", "action": "Authored Enterprise Inclusive Language Standard", "status": "PUBLISHED" }
        ],
        "action_recommendation": "Full approval privileges maintained."
    }'::jsonb,
    NOW() - INTERVAL '4 hours'
),
(
    3,
    'Elena Rostova',
    'Compliance Officer & Brand Auditor',
    '{
        "summary": {
            "total_submitted": 0,
            "audits_performed": 312,
            "corrective_actions_issued": 18,
            "escalations_to_legal": 3,
            "current_risk_level": "NEGLIGIBLE"
        },
        "historical_activity": [
            { "date": "2026-11-01", "action": "Conducted monthly AI compliance calibration audit", "status": "VERIFIED" },
            { "date": "2026-11-16", "action": "Updated Safe Harbor regulatory rule sets", "status": "ACTIVE" }
        ],
        "action_recommendation": "Compliance authority active; can enforce corrective restrictions."
    }'::jsonb,
    NOW() - INTERVAL '2 hours'
),
(
    4,
    'David Miller',
    'VP of Corporate Communications',
    '{
        "summary": {
            "total_submitted": 28,
            "approved_count": 27,
            "first_time_pass_rate": 0.964,
            "current_risk_level": "LOW",
            "executive_signoffs": 84
        },
        "error_trends": {
            "Legal_Regulatory_Risk": 1
        },
        "historical_activity": [
            { "date": "2026-11-16", "action": "Approved Safe Harbor disclaimer patch for IR briefing", "status": "RESOLVED" }
        ],
        "action_recommendation": "Executive override and instant publishing privileges enabled."
    }'::jsonb,
    NOW() - INTERVAL '30 minutes'
);


-- =============================================================================
-- 5. SEED: PUBLISHED
-- Historical catalog of verified, approved, and live enterprise broadcasts
-- =============================================================================
INSERT INTO published (post, timestamp)
VALUES
(
    '{
        "title": "TrueTone 2026 AI Ethics & Governance Whitepaper Released",
        "author_id": 4,
        "author_name": "David Miller",
        "channels": ["LinkedIn", "Corporate Blog", "Press Wire"],
        "summary": "Our comprehensive framework for verifiable AI communications, brand alignment, and automated compliance.",
        "media_url": "https://cdn.truetone.ai/assets/whitepaper-ethics-2026.pdf",
        "live_url": "https://truetone.ai/blog/2026-ai-ethics-framework",
        "metrics": {
            "views": 28450,
            "shares": 1420,
            "brand_resonance_score": 98.4
        }
    }'::jsonb,
    NOW() - INTERVAL '4 days'
),
(
    '{
        "title": "Case Study: Global Fintech Scales Multi-Region Content with TrueTone",
        "author_id": 1,
        "author_name": "Sarah Jenkins",
        "channels": ["LinkedIn", "Case Studies Portal"],
        "summary": "How Apex Financial reduced brand review cycle latency from 48 hours to 90 seconds while eliminating regulatory fines.",
        "media_url": "https://cdn.truetone.ai/assets/fintech-case-study.png",
        "live_url": "https://truetone.ai/stories/apex-financial",
        "metrics": {
            "views": 16900,
            "downloads": 890,
            "brand_resonance_score": 95.8
        }
    }'::jsonb,
    NOW() - INTERVAL '2 days 10 hours'
),
(
    '{
        "title": "TrueTone Architecture Deep Dive: High-Throughput GIN Indexing with Postgres",
        "author_id": 2,
        "author_name": "Michael Chen",
        "channels": ["Developer Blog", "Medium", "X/Twitter"],
        "summary": "Achieving sub-5ms query response times on millions of semi-structured brand compliance records using jsonb_path_ops.",
        "media_url": "https://cdn.truetone.ai/assets/postgres-gin-architecture.svg",
        "live_url": "https://truetone.ai/engineering/postgres-gin-at-scale",
        "metrics": {
            "views": 34100,
            "bookmarks": 2150,
            "brand_resonance_score": 99.1
        }
    }'::jsonb,
    NOW() - INTERVAL '1 day 2 hours'
),
(
    '{
        "title": "Welcome to the TrueTone Community: November 2026 Town Hall Recap",
        "author_id": 4,
        "author_name": "David Miller",
        "channels": ["YouTube", "Community Forum", "Newsletter"],
        "summary": "Key highlights from our global customer forum, upcoming roadmap reveals, and community spotlight award winners.",
        "media_url": "https://cdn.truetone.ai/assets/townhall-recap-nov26.jpg",
        "live_url": "https://truetone.ai/community/townhall-nov-2026",
        "metrics": {
            "views": 9400,
            "attendees": 1850,
            "brand_resonance_score": 97.2
        }
    }'::jsonb,
    NOW() - INTERVAL '8 hours'
);
