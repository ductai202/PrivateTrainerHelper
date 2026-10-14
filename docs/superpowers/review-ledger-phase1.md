# SDD ledger — plan: docs/superpowers/plans/2026-10-15-pt-scheduling-phase1.md
Pre-flight: shared interfaces T2->T3 (vn* helpers), T3->T6/8/9 (domain), T4->all (schema). Types consistent in plan.
Ruling: Supabase CLI/DB tasks use npx supabase (not preinstalled); Docker 24 present.
Task 1: Ruling: scaffold+impl written before first RED run (config-only step) — shell tests then passed 2/2 — cost if wrong: none, tests assert real manifest/SW
Task 1: complete (commits 0c8322c..5e1b362, tests: npm run e2e -- shell →   2 passed (14.8s))
Task 2: Ruling: fixed UTC+7 offset instead of date-fns-tz — VN has no DST, fewer deps — cost if wrong: none
Task 2: complete (commits 5e1b362..8ec564e, tests: npm run test → [2m   Duration [22m 1.29s[2m (transform 267ms, setup 0ms, collect 555ms, tests 40ms, environment 2ms, prepare 1.37s)[22m)
Task 3: complete (commits 8ec564e..e8ff880, tests: npm run test → [2m   Duration [22m 2.82s[2m (transform 1.51s, setup 0ms, collect 3.32s, tests 119ms, environment 11ms, prepare 7.01s)[22m)
Task 4: Ruling: anon RLS test asserts 0 rows (not 42501) — Supabase grants anon table privilege, RLS filters to empty — cost if wrong: none
Task 4: complete (commits e8ff880..e50df6a, tests: npx supabase test db → Result: PASS)
Task 5: complete (commits e50df6a..109161b, tests: npm run e2e -- auth →   3 passed (15.6s))
Task 6: Ruling: students_all RLS policy uses column checks (not can_access_student) — function self-lookup cannot see the row being inserted; StudentForm dispatches via onSubmit because React 19 resets uncontrolled fields after a form action — cost if wrong: none
Task 6: complete (commits 109161b..b4c03ca, tests: npm run e2e -- students →   1 passed (20.1s))
Task 7: complete (commits b4c03ca..30790f2, tests: npm run e2e -- student-detail →   1 passed (19.7s))
Task 8: complete (commits 30790f2..59fdc8d, tests: npm run e2e -- schedule →   2 passed (22.5s))
Task 9: complete (commits 59fdc8d..185958d, tests: npm run e2e -- session-detail →   3 passed (30.8s))
Task 10: Ruling: public VAPID key env is NEXT_PUBLIC_VAPID_PUBLIC_KEY (browser needs it) instead of VAPID_PUBLIC_KEY; cron migration exposes schedule_tick(url, secret) to run once per env because Vault/URL are environment-specific — cost if wrong: rename env var; one manual SQL call at deploy
Task 10: complete (commits 185958d..8c0bfbe, tests: npm run test → [2m   Duration [22m 1.15s[2m (transform 293ms, setup 0ms, collect 737ms, tests 59ms, environment 2ms, prepare 1.63s)[22m)
Task 11: complete (commits 8c0bfbe..f095c55, tests: npm run e2e -- owner →   2 passed (15.8s))
Task 12: Ruling: step 4 (real phone PWA/push check) cannot be run unattended — left for the human; e2e timeout raised to 15s/60s and workers=1 because the Next dev server compiles routes on first hit
Task 12: complete (commits f095c55..281a366, tests: npm run test → [2m   Duration [22m 1.47s[2m (transform 287ms, setup 0ms, collect 802ms, tests 65ms, environment 3ms, prepare 1.75s)[22m)
Phase 2/3: student link (/c/<token>, HMAC) + Zalo Bot webhook/client/cron reminders — unit 38/38, e2e student-link 3/3
Final review: whole-branch, fresh opus reviewer
Final: fixed bot reply acted on wrong session (Critical) — bot-target.spec 'acts on the reminded session' RED→GREEN
Final: fixed cancel keywords caught chatty messages (Important) — bot.test classifyReply 4 new cases RED→GREEN
Final: fixed link code never rotated / update error ignored (Important) — bot-target.spec 'link code is rotated' RED→GREEN
Final: fixed sessions tied to package newest at booking (Important) — packages.test remainingAcrossPackages RED→GREEN
Final: fixed (cheap, with the pass) status guard on student respond; empty-secret guard on /c action
Final: minor (deferred): push subscribe upsert 500 when device changes hands
Final: minor (deferred): conflict check misses overlaps across VN midnight; no DB exclusion constraint
Final: minor (deferred): progress photos uploaded but never displayed; photo without note dropped
Final: minor (deferred): owner can set pt_id of another gym (RLS lacks same-gym check on pt_id)
Final: minor (deferred): "+84 0912..." phone rejected
Final: minor (deferred): invitePt leaves orphan auth user on member insert failure; bot message_log insert error ignored in cron
Final: minor (deferred): storage policy uuid cast may throw on non-uuid path; link tokens never expire (blocked once session starts)
Final: minor (deferred): linkSecret() falls back to CRON_SECRET; no webhook update_id dedupe
