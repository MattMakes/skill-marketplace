# Milestones, Definition of Done, Build, Release & Post-Launch

## Milestones & Definition of Done

### Milestone Gates (Alpha / Beta / Feature-Lock)

- Define identifiable milestone stages AND a date for each (preliminary spec, approved spec + class diagram, alpha, beta, final/ship) — milestones make "done" measurable and gateable (SWEngGames; CertGameDev)
- Split the project into an alpha phase (features fluid) and a beta phase (features frozen, testing/debugging) — you cannot meaningfully test a moving target (SWEngGames; QATesting)
- Treat Alpha as feature-lock, not bug-free — alpha requires feature-completion and a full playthrough but allows placeholder/temp assets; it is about locking features (QATesting)
- Treat Beta as the asset-complete, high-bug-clear milestone — all assets permanent and all High-priority bugs addressed; a chunk of dev funding is often conditional on hitting beta on time (QATesting)
- Enforce a hard feature freeze entering beta: no new features no matter how enticing — set-in-concrete scope is what makes finishing and stabilizing possible (SWEngGames; QATesting)
- Treat any late feature as needing its own full pass through repeated alphas (get it working) then multiple betas (get it tested) — late features re-open the whole QA cost, so only add one if you KNOW there is time to fully alpha-then-beta test it (SWEngGames)
- Avoid feature creep during beta (and gold-plating / over-strong requirements) — adding mechanics late is usually fatal in delays and budget overrun; navigating beta cleanly separates ~75% from ~95% review scores (QATesting; SWEngGames)
- Lock core design decisions before alpha (difficulty, title font, jump height) — settle these early, not during the pragmatism-vs-perfectionism endgame (PolishedGameDev)
- Sign off the lead character and its movements first, then build levels around it — settling ramifications early prevents per-level hacks to make puzzles work (PolishedGameDev)
- Continually revise milestones and schedule to match reality — like everything in software engineering, the plan must track what you have actually done (SWEngGames)
- Treat Testing as its own named production phase between Production and Launch — do not fold QA into coding or treat it as an afterthought (CertGameDev)

### Definition of Done

- Define a feature/addition as "done" only when both the feature owner and the QA lead have signed off — dual sign-off is the gate (QATesting)
- Distinguish "functionally complete" from "polished" — score-goes-up works, but polish is the flash, sound, animation, and growth that fills the gap; you cannot fix a gap you cannot see (PolishedGameDev)
- Hold a definition-of-done bar where the only acceptable complaint left is "I did not like it, but someone will" — any "is it stuck or crashed?" reaction means unpolished/unfinished (PolishedGameDev)
- Update the test plan whenever features are added or requirements change, and task QA to verify the new feature works AND old features did not break — done is re-proven, not assumed (PolishedGameDev)
- Gate "ready to ship/certify" on a deliberate readiness assessment against a fixed set of published objectives, not a feeling — run the structured check first, then schedule certification or release only when results clear the bar (CertGameDev)
- Assess readiness well before the formal certification/release date and remediate weak areas specifically before re-attempting the gate — self-assessment is most useful early, so gaps are shored up rather than discovered at submission (CertGameDev)

### Zero-Showstopper Gold Gate

- Gate Gold on: polished and shippable, all assets final, all features implemented, zero showstopper (critical) bugs, all levels load properly, and only a small percentage of low-priority bugs remaining (QATesting)
- Never ship with a showstopper — producers will ship less-than-polished, but never a showstopper bug (PolishedGameDev)
- Treat freezes, crashes, crash-to-desktop, and data corruption as Critical/showstopper — they remove player control/display or destroy saves and must block the gate (QATesting)
- Tag/mark the release revision ("gold master", date-time build) using revision numbers over dates — enables retesting bugs against the exact gold version (PolishedGameDev)
- Test the final BUILD, not just the editor/play-mode — boot-order, scene-load, and persistence bugs appear only in the deployed build, so editor passing is not sufficient release evidence (CertProgrammer)
- Verify the handoff/build actually builds clean before shipping it (clean dir, zip with required subdirs, unzip elsewhere, rebuild) — an unbuildable handoff blocks the whole team (SWEngGames)

### Protect the Polish / QA Tail

- Reckon the last 10% of code takes 90% (the second 90%) of the time and schedule explicitly for it — bug-fixing always takes longer than expected; deadlines arrive like a freewheeling bicycle hitting the hill bottom (PolishedGameDev; SWEngGames)
- Use beta as the final window to fix major bugs and to polish, and protect that time — polish is where games become great (QATesting)
- Trade scope, not quality, to hit the deadline: economize by strictly limiting feature count, NOT by leaving bugs unfixed — the Constraint Triangle lets you flex features, never ship-quality (SWEngGames)
- Refuse "faster, cheaper, better" all at once — any change to one of cost/time/quality must be compensated in another, or the project fails (SWEngGames)
- Ship 5 features properly added-and-tested over 100 features with 95 broken — and over missing the deadline chasing "just one more feature" (PolishedGameDev)
- Do not blindly fix strictly in severity order A→E — real polish lives in the C–E fixes, so periodically pull some forward (e.g. "anything-goes Friday") so the game actually gets polished even with A bugs outstanding (PolishedGameDev)
- Schedule polish on level 1 / the first minute first — it is the part the most players see; defer rare end-game glitches over early-game quality (PolishedGameDev)
- Be ruthlessly pragmatic at the end about which bugs get fixed and how long to spend before taking a work-around — pragmatism is the art of telling which annoyances offend the most players the most (PolishedGameDev)
- Have someone other than a perfectionist own the final builds — emotional bond blindsides solo/indie devs; an outside hand forces pragmatism (PolishedGameDev)
- Be prepared to "kill your babies" and cut a feature that does not connect even after repeated polish — demote it to a bonus/mini-game rather than disrupt main flow, but be ready to cut; keep everything you cut for a future game (PolishedGameDev)
- Avoid crunch to protect the tail — even crunching, 100 one-hour tasks is two solid weeks; the math does not collapse just because the deadline is near (PolishedGameDev)
- Have the willpower to disable or comment out flaky, trouble-causing features before you ship — avoid developer gold-plating; a removed flaky feature cannot crash (SWEngGames)
- Do not be beholden to deadlines at the cost of quality where you can afford it; slip the release date when needed to minimize bugs and test thoroughly in-house — studios that push launches back to polish (id, Blizzard, Nintendo, GTA IV) ship near-bug-free titles, and quality drives word-of-mouth, reviews, and shelf life (QATesting)

### Schedule QA From Day One

- Treat QA as a planned, scheduled phase with its own calendar time, not an afterthought — testing+debugging is the whole point of the beta phase and gets a dedicated stage in the pipeline (SWEngGames; CertGameDev)
- Make a QA plan a first-class part of the project schedule alongside lifecycle, milestones, task list, and risk management — unplanned QA gets squeezed out under deadline (SWEngGames)
- Align the test schedule with the production plan and treat QA time as a real milestone, not a squeezable end-of-process buffer — products that ship well are the ones given adequate QA resources and managed well (QATesting)
- Make testing the first thing in the dev cycle, not the last, and test at every stage as content is created — instills professionalism and catches defects when cheapest to fix (PolishedGameDev; QATesting)
- Integrate QA into planning and content development from the start ("building quality in") — early multi-disciplinary integration enables faster iteration and tighter polish than throwing finished units over the wall (QATesting)
- Treat quality/polish as engrained at every step by every developer, not a final-phase task or one person's job — "you cannot polish a turd"; you cannot add quality you never built in (PolishedGameDev)
- Put the project under version control from day one and configure the repo correctly at creation time — building the safety net first means every subsequent build is protected, trackable, recoverable, and reproducible by default (VersionControl; CertGameDev)
- Adopt "ship any day": after every feature/bug/change leave a release-ready build, and release a minimal working build to the team early — so if the worst happens you can always release something (PolishedGameDev)
- Build a cheat/debug screen (extra lives/resources, skip to any save point) into every game's dev schedule from the start — slashes the time QA spends grinding to the area under test; remove it before final release (PolishedGameDev)
- Avoid "code and fix" (diving in with no plan, patching each new problem) — it is one of the most inefficient ways to develop and breeds an unmanageable bug tail; plan roughly three times as long as your first instinct (SWEngGames)

### Don't Ship-Then-Patch as a Crutch

- Do not equate Gold with "done" — gold means shippable; online patching tempts teams to ship "almost ready," which does not produce better games (QATesting)
- Recognize that shipping-then-patching does NOT yield better games — relying on post-launch patches (a title "finished" six months after launch) degrades quality; prefer finishing before gold (QATesting)
- Build quality in by obsessively making the game fun and continuously re-testing — focusing hard on fun/balance surfaces significant bugs and keeps new bugs from being introduced late where they would escape detection (QATesting; PolishedGameDev)
- Keep a small "patch squad" after gold for patches and last-minute issues, and re-test every hot fix, expansion, or live change with full pre-launch rigor — a post-gold crew is for genuine residual issues, not a substitute for finishing. **When it flips:** online/social titles where the medium itself creates an expectation of continuous (often biweekly) patching → push fixed clients the moment they are ready and auto-download on next launch, since a polished v1 can always grow into v2 and players forgive a short game if the experience was worth it (QATesting; PolishedGameDev)
- Use post-launch analytics and observed player-behavior data to drive patch priorities, not guesswork — let where real players struggle, drop off, or hit bugs decide what to fix and tune after release (CertGameDev)
- Plan a maintenance phase for ongoing debugging and tweaks and expect the first release of any complex title to need a follow-up service patch — shipping is not the end of QA, but budget the patch cadence rather than depending on it to finish the game (SWEngGames)

## Build, Release, Certification & Post-Launch

### Build Process & Automation
- Make the build process scriptable, single-step, and runnable unattended from the command line — automation removes per-build human error and lets builds run hands-off; "it works" plus those three is the minimal bar. (PolishedGameDev)
- Drive release builds through automated build/CI fed from source control, not ad-hoc FTP or hand-copied files — sourcing builds from the repo gives reproducible, traceable builds where every artifact maps to a known commit. (CertGameDev)
- Designate one single "builder" per cycle to integrate code and produce the official evaluated executable — otherwise the team argues over which is the "real" new build. **When it flips:** to spread build knowledge and kill single-machine choke points → rotate which team member creates each build, which also forces a clean process since all needed files must be in source control on every machine. (SWEngGames; PolishedGameDev)
- Build everything through an automated asset pipeline (raw→cooked) and supplement every asset with a metadata file — a 10MB game may carry 200MB of source; keep highest-quality source for HD re-releases, since no file format does everything you need. (PolishedGameDev)
- Make the source-processing pipeline fast — a slow pipeline pushes people to edit post-processed files directly, which must be discouraged. (PolishedGameDev)
- Verify the handoff/zip actually builds before shipping it: clean the directory, zip with required res/hlp subdirs, unzip elsewhere, and rebuild — an unbuildable handoff blocks the whole team. (SWEngGames)
- Demonstrate "deploy a basic build", "debug non-complex problems", and "address import conflicts" as baseline competencies before doing release work — these are the prerequisite skills any release-ready dev must show. (CertProgrammer)

### Debug vs Release Builds
- Build separate debug and release targets and keep the dev environment running the same un-post-processed source under test — debug is one-to-one with edited/committed files for easy debugging; debugging obfuscated/minimized code wastes time re-running scripts. (PolishedGameDev)
- Always test the Release build AND the Debug build after each new version — divergence between them (often from uninitialized variables) is itself a critical signal. (SWEngGames)
- Distribute the Release build, not the Debug build — Release is smaller and ~30% (up to 2x) faster; Debug carries debug info users don't need. (SWEngGames)
- For distributable Release MFC builds, link the runtime statically (Use MFC in a static library), not via shared DLL — chasing missing/mismatched MFC*.DLL files on users' machines is impractical and breaks the program with cryptic errors; use the lighter shared-DLL config only for local Debug builds. (SWEngGames)
- Always test with obfuscation/minification turned on regularly, and explicitly mark all entry/exit symbols so the obfuscator doesn't rename them — one error makes the whole dataset unreadable and the game unplayable. (PolishedGameDev)
- Strip nearly all dev/debug menu selections (and the cheat/debug screen) from the shipped game — "a user interface isn't done until there's nothing left to remove"; ship the player-facing controls, not the developer dashboard. (SWEngGames; PolishedGameDev)

### Deterministic & Stamped Builds
- Stamp version number + build date into the executable name, the caption-bar/title-screen string, and the directory name — never lose track of which build you're holding, and every bug report can pin the exact code revision. (SWEngGames; PolishedGameDev)
- Number AND date every build directory and copy the last good build to a new dated directory before risky changes — so a sudden mysterious break can roll back to a working build. (SWEngGames)
- Seed the PRNG with a fixed identical value each run in Debug, and keep the count of random() calls identical between run-throughs — deterministic randomness ensures the same play reproduces; a divergent call count desyncs the replay. **When it flips:** in Release builds → seed from the wall clock for variety, since determinism is a debugging aid, not desired shipped behavior. (SWEngGames; PolishedGameDev)
- Expose the seed (getSeed/setSeed) so you can drive the program into a specific reproducible state — a recorded seed is a recorded test case. (SWEngGames)
- Provide save/load of full program state (prefer editable text format during dev) — a saved state file is a reproducible test fixture; hand-edit it to set up exact reproduction states and inspect what was serialized. (SWEngGames)
- When a bug only appears in the Release build with no debugger, save the bad state to a parameter file and load it into the Debug build to inspect — capture-and-replay state makes an un-debuggable failure debuggable. (SWEngGames)
- Embed a version string at the head of each save file and abort the load if it doesn't match the app version (guarding against bogus/corrupt input like an absurd version-string length) — prevents hideous crashes from loading foreign-build files and stops malformed files running wild over memory. (SWEngGames)
- Forbid draw() and any rendering pass from mutating state including the RNG — pure draw can be called any number of times in any order with no side effects, which is what makes deterministic replay possible. (PolishedGameDev)

### Version Control Foundations
- Put the project under version control from day one (source AND assets), before "making the game" — a tracked history is the safety net that lets every subsequent build be reproduced, bisected, and recovered by default. (PolishedGameDev; CertGameDev; VersionControl)
- Treat the repository as the single source of truth for what a build contains — local-only files that never get committed cannot be reproduced by CI, teammates, or your future self. (VersionControl)
- Use a centralized revision-control system that saves every prior version and require a log entry on every check-in — the cumulative log tracks when and why each change was made and gives access to all earlier builds. (SWEngGames; VersionControl)
- Build releases off source-control trunk/mainline assets via VCS export (not copy) — export replicates only committed files, exposing anything a dev forgot to commit before it breaks others' machines; strip .git/.svn dot-files from targets. (PolishedGameDev)
- Make small, frequent commits and commit/push at least daily, even for tiny changes — small snapshots isolate which change introduced a defect, and the remote is the backup of record; un-pushed work is un-recovered work if the machine fails. (PolishedGameDev; VersionControl)
- Write commit messages your future self will understand, explaining problem and solution — "the worst programmer you'll meet is yourself from six months ago"; the message is the audit trail for tracing when and why behavior changed. (PolishedGameDev; VersionControl)
- Configure the repo correctly at creation time (visibility, official engine `.gitignore` template, README) and verify the ignore actually filtered the expected folders — fixing exclusions after thousands of bad files are committed is far costlier, and presence of Library/Obj in the change list is a defect to fix. (VersionControl)
- Never commit regenerable caches (Library, Obj, Temp, logs, user settings); monitor repo size as a signal of mis-ignored files — machine-specific caches bloat the repo, create false diffs, and cloud VCS has storage limits (e.g. 5 GB free). (VersionControl)
- Keep Asset Serialization Mode set to Force Text — text-serialized scenes/prefabs/materials produce meaningful diffs and merge-resolvable conflicts, the precondition for reviewing and reproducing asset changes. (VersionControl)
- Always commit `.meta` files alongside their assets and treat deletions as first-class tracked changes — missing meta files regenerate new GUIDs per machine (silently breaking every cross-reference), and uncommitted deletions leave stale files that produce divergent, irreproducible builds. (VersionControl)
- Keep dependencies self-contained: pin externals/submodules to a specific revision and make each build directory copy in the files it needs rather than referencing a shared "Common Files" path — new/broken upstream code or non-matching paths silently break old builds and portability. (SWEngGames; PolishedGameDev)
- Keep API keys/secrets out of version control and inject them at deploy time from a secure admin-only source — use separate developer apps/keys for staging/dev to test integrations. (PolishedGameDev)

### Branching, Merging & Release Flow
- Always keep one stable mainline/branch you can deploy from, and protect it — any branching strategy works provided the team diligently tests each merge; funnel changes through reviewed merges, not ad-hoc direct edits. (PolishedGameDev; VersionControl)
- Pick a branching strategy matched to team size: trunk-heavy (all devs commit tested code to trunk, branch "release" for a build, tag it, cherry-pick fixes) for fast-iterating small teams; feature-branch (feature branches built/tested before merge, release cut from develop, hot-fix off master merged back) for larger teams sharing code with non-programmers, at the cost of heavy merging. (PolishedGameDev)
- Route changes through pull requests rather than direct pushes to main; open a PR, review the diff, then merge — a PR adds a diff-review gate before defects reach the integration/release line. **When it flips:** as an optional extra gate → restrict merges to main to the lead developer. (PolishedGameDev; VersionControl)
- Enforce single-writer checkout (only one user edits a file at a time; others read-only) — this prevents the painful code-merge situations that breed re-introduced bugs. (SWEngGames)
- Submit changes in the order Pull, then Commit, then Push — pull/sync latest first to integrate others' work, then commit your validated change, then push; reordering risks clobbering or pushing un-reconciled state and breaking release builds. (CertGameDev)
- Pull before starting work every time (fetch first to detect remote commits), and push/pull regularly instead of hoarding large local change sets — editing outdated files is the root cause of avoidable merge conflicts, and long-lived divergence multiplies conflict size. (CertGameDev; VersionControl)
- Respect Git's push block when the remote has commits you lack (fetch + pull + resolve rather than forcing) — forcing could overwrite teammates' work and lose history. (VersionControl)
- Communicate which scripts/assets you plan to edit and divide file ownership — reducing overlapping edits is more effective than resolving conflicts after the fact. (VersionControl)
- When merging two changed copies, use a diff tool and merge into the file with the MOST new code (keep both variants behind an #ifdef when you can't agree, then keep the build that runs better) — never "fast-merge" from a verbal list of changes, since forgotten changes cause build errors or silent bugs. (SWEngGames)
- After a successful merged build, clean it, archive a zip, and have EVERY team member replace all their source with the new build's source — avoids repeatedly re-fixing the same bugs and re-merging the same code. (SWEngGames)
- Delete feature branches after merge — they're rarely useful and too many branches degrade tooling performance. (PolishedGameDev)
- Treat a merge conflict as Git protecting the project, not a bug: read both `<<<<<<< HEAD` (local) and `>>>>>>>` (incoming) blocks, choose deliberately per conflict, accept both then hand-edit when both hold value, remove all three marker lines, then inspect the merged file to confirm correct logic — a clean Git merge does not guarantee correct behavior (e.g. movement applied twice compiles but misbehaves). (VersionControl)
- Coordinate so only one person edits a given scene/prefab at a time and pull first before committing scene changes; configure UnityYAMLMerge (Smart Merge) for `*.unity`/`*.prefab` but don't treat it as a substitute for coordination — scene files are fragile under concurrent edits and can corrupt, while Smart Merge only reduces small-overlap pain. (VersionControl)

### Recovery & Engine Pinning
- Discard/undo uncommitted edits through the tool rather than hand-reversing them, and restore the last committed state when an experiment goes wrong — a discard guarantees the file matches the last check-in exactly, eliminating "I think I put it back" risk; don't commit a mistake as if it were intended work. (VersionControl)
- Experiment freely once changes are recoverable — knowing any unwanted change can be rolled back lets you test risky ideas without endangering the known-good build. (VersionControl)
- Stay fanatically organized about which files belong to which version — the worst outcome is a fixed bug getting overwritten by an old file and reappearing weeks later. (SWEngGames)
- Pin a known engine version (prefer LTS) and avoid newer versions than specified — version drift changes menus/packages/behavior and makes results irreproducible across the team. (VersionControl)
- Use battle-tested toolchain versions over bleeding-edge — wait for the first service patch (~6 months) before trusting a new compiler; early versions are buggy. (SWEngGames)

### Certification, Compliance & Min-Spec
- Pass first-party certification before shelf release (Sony TRC, Microsoft TCR, Nintendo Lot Check) — manufacturers verify guideline compliance and reject non-conforming submissions; a single critical bug found at cert sends the game back. (QATesting; PolishedGameDev)
- Recheck the game against manufacturer technical requirements before EVERY submission — a single nonconformance (even wrong capitalization of a button name) fails the game, and turnaround is weeks for software, months for consoles. (PolishedGameDev)
- Treat compliance as its own discipline with concrete checks: pause on controller disconnect, warn before formatting memory/HDD, warn on data corruption + suggest reformat, no prohibited imagery, correct copyright/trademark marks, correct low-storage warnings, legal logo sizes and title-screen durations, spelling/grammar — failing any single item fails first-party cert. (QATesting; PolishedGameDev)
- Budget heavily for certification on complex/multiplayer titles and start the pre-submission 3–4 months before you need release — cert requirements can run hundreds of pages (e.g., 250 for XBLA), and first-time failures (often translation issues) force long resubmit cycles. (QATesting; PolishedGameDev)
- Test against the minimum-requirements ("min spec") machine — running on the lowest-denominator rig is a contractual obligation to reach buyers without high-end gear. (QATesting)
- Run compatibility/portability testing across many hardware configs (GPUs, RAM, drivers, controllers, OSs) and on machines other than your own before shipping or demoing — only supported hardware is tested, and "works on my machine" is not shipped. (QATesting; SWEngGames)
- Test for behavior independence from display resolution and from machine/processor speed — a game must behave well across screen sizes and CPU speeds. (SWEngGames)
- Gate "ready to ship/certify" on a deliberate readiness assessment against a fixed set of published objectives, not a feeling, run well before the formal date — measuring against the authoritative criteria makes the verdict defensible; assessing early lets you remediate weak areas before the real gate, not discover gaps at submission. (CertGameDev)
- Identify weak topic areas from assessment results and remediate them specifically before re-attempting the release gate — target the exact areas that tripped you up, then retest with fresh eyes. (CertGameDev)
- Demand solid end-to-end production understanding (concept to launch) and prior ship experience from anyone driving release — knowing the whole flow is what makes milestone gating and release calls credible. (CertGameDev)
- For software platforms (Facebook etc.), keep maintenance staff ready for frequent requirement changes — rivals will report nonconformances to get your game pulled while they grab market share. (PolishedGameDev)
- Verify licensed-IP scope before designing around it and maintain an externals reference file logging every third-party asset (with versioned iterations) — each element (name, typeface, story, likeness, voice, music) is a separate license, and provenance records defend against copyright-infringement claims. (PolishedGameDev)
- Protect unreleased project information with NDAs — preventing leaks of confidential pre-release material is part of disciplined release management. (CertGameDev)

### Gold, Definition of Done & Submission Quality
- Gate Gold on: polished and shippable, all assets final, all features implemented, zero showstopper (critical) bugs, all levels load properly, only a small percentage of low-priority bugs remaining — never ship with a showstopper. (QATesting; PolishedGameDev)
- Don't equate Gold with "done" — gold means shippable; online patching tempts teams to ship "almost ready," which does not produce better games. (QATesting)
- Slip the release date when needed to minimize bugs and thoroughly test in-house rather than ship buggy — date slips (e.g. GTA IV) let teams clean up submissions; trade scope, not quality, to hit a deadline. (QATesting; SWEngGames)
- Increase headcount via simultaneous multi-platform release dates — more eyes on the product improves coverage. (QATesting)
- Tag/mark release revisions ("gold master", date-time builds), preferring revision numbers over dates — many commits per day make dates ambiguous, and exact tags let bugs be retested on the precise old version. (PolishedGameDev)
- Display build version (e.g. build date-time) on the title screen — every bug report must pin the exact code revision exhibiting the defect. (PolishedGameDev)
- Adopt "ship any day": after every feature/bug/change leave a release-ready build — so if the worst happens you can always release something. (PolishedGameDev)

### Deployment & Live Operations
- Match deployment cadence to medium — once a lifetime (console/cartridge) up to every two weeks (online/social); the more frequent the cadence, the more you must automate deployment. (PolishedGameDev)
- Use three online deployment phases — Staging (new code + dev DB, dev-focused testing) → UAT (new code + a MODIFIED copy of the live DB for scaling/ownership/format-migration testing) → Production (new code + the real DB for the first time). (PolishedGameDev)
- In UAT, scrub or modify users' names, emails, and purchase data on the copied live DB — so real notifications don't fire at real users (e.g. rewrite emails to gamename+original@gmail.com). (PolishedGameDev)
- Preserve player data across every deployment via explicit schema, fixture/seed, and migration files — migration lets DB structure change incrementally, and live data (purchases, achievements, accrued items) must never be wiped by a new version. (PolishedGameDev)
- Use separate dev and content databases — content curation is error-prone and leaves the DB transiently inconsistent (causing non-reproducible errors); separation lets old-data bugs be found before content is lost. (PolishedGameDev)
- Use manifest files (directory structure + sizes + CRC) where the platform can't enumerate files (e.g. web) — enables most-specific-resource-first loading, better progress bars, and CRC validation against corruption/tampering. (PolishedGameDev)
- Customize and test the PC installer as fresh installs across many varied Windows images (VirtualBox/VMware), including D: partitions, paths with spaces, and dependency installs (DirectX/registry) — end-user PCs differ wildly and flush out latent native-widget/visual bugs. (PolishedGameDev)
- Use a user-management library/package, never roll your own auth — forgotten-password/reset emails, account verification, password salting, and rainbow-table defense are bigger than they look. (PolishedGameDev)
- Verify the intended boot scene is FIRST in the build list and test the final BUILD (not just the editor) — the build launches into the first scene, and scene-load/boot-order bugs appear only in the deployed build, so editor play-mode passing is not sufficient release evidence. (CertProgrammer)
- Verify the clean quit path (`Application.Quit()`) and cross-scene data persistence (DontDestroyOnLoad / PlayerPrefs) work end-to-end before ship — a non-functional quit button and broken state transfer between scenes are basic release-readiness failures. (CertProgrammer)
- Choose non-intrusive ad formats (e.g. banner) so monetization doesn't degrade play post-launch — formats that impede gameplay harm retention and live-ops health. (CertGameDev)

### Post-Launch Patch Cadence & Hotfix Discipline
- Plan a maintenance phase and keep a post-gold "patch squad" on patches and last-minute issues — the first release of any complex tool is buggy, the worst bugs get fixed in a follow-up service patch, and always-online platforms ship "almost-ready" then fix via updates, so budget for the patch cadence. (QATesting; SWEngGames)
- Recognize that shipping-then-patching does NOT yield better games — relying on post-launch patches (a title "finished" six months after launch) degrades quality; prefer finishing before gold. (QATesting)
- Expect online games to be updated regularly (often biweekly) and build automated deploy tooling for it — being online creates the expectation of continuous patching. (PolishedGameDev)
- Exploit online's update advantage: push fixed clients the moment they're ready and auto-download on next launch — a polished v1 can always grow into v2, and players forgive a short game if the experience was worth it. (PolishedGameDev)
- Re-test every hot fix, expansion, and change to a live game with the same verification rigor as pre-launch builds — live changes are not exempt from regression risk. (QATesting)
- Heavily document hard-to-track networking/invisible-player bugs so post-launch fixes are possible — expect some shipped bugs to be patched a couple months post-launch. (QATesting)
- Wire up analytics to track in-game player behavior and use that data to drive patch priorities — instrumented telemetry reveals where real players struggle, drop off, or hit bugs scripted QA never reproduces; let observed behavior, not guesswork, decide what to fix and tune. (CertGameDev)
- Add a "Legal" severity that trumps all others post-launch — after dev it must be fixed and deployed before any other change. (PolishedGameDev)
- Reward players for being first to report a live bug rather than only threatening bans, and use open beta to stress-test servers and surface bugs at scale — in MMOs players vastly outnumber testers and will find every leak, so a carrot turns playtesting into a customer-relationship tool. (QATesting)
- Build online leaderboards/achievements with social self-regulation (restrict results to friends) — making cheating pointless via social coercion fixes technical problems without tech. (PolishedGameDev)
