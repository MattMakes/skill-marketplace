# Test Process, Plans, Types, Bugs, Triage & Reproducibility

## Test Process, Plans & Types

### Test Process & Schedule
- Treat QA as a planned, scheduled, first-class phase with its own calendar time alongside lifecycle, milestones, task list, and risk management — unplanned QA gets squeezed out under deadline, and bug-fixing always takes longer than expected (the last 10% takes the second 90% of the time). (QATesting; SWEngGames; CertGameDev)
- Align the test schedule with the production plan and treat QA time as a real milestone, not a squeezable end-of-process buffer — products that ship well are the ones given adequate QA resources and managed well. (QATesting)
- Treat Testing as its own named production phase between Production and Launch — do not fold QA into coding or treat it as an afterthought; it gets a dedicated stage (Pre-Production, Production, Testing, Launch). (CertGameDev)
- Test at every stage of development, not just at the end, and embed QA inside Scrum/dev teams to test content as it is created — early multi-disciplinary integration enables faster iteration and tighter polish than throwing finished units over the wall. (QATesting; PolishedGameDev)
- Avoid "code and fix" (diving in with no plan, patching each new problem) — it is one of the most inefficient ways to develop and breeds an unmanageable bug tail; plan up front (budget ~3x your first-instinct planning time, since one planning hour saves hundreds of coding-and-fixing hours). (SWEngGames)
- Demand solid end-to-end production understanding (concept to launch) from anyone driving release, and prefer a team that has previously shipped a game to publication — whole-flow knowledge is what makes milestone gating and release calls credible. (CertGameDev)

### Written Test Plans
- Build a documented test plan (the "master of all checklists") per project — without a written plan you can't expect thorough, repeatable coverage. (QATesting; SWEngGames)
- Make the test plan include game description, features-to-test, features-NOT-to-test, techniques, disciplines, severity-level definitions, pass/fail criteria, deliverables & milestones, tasks, environment/hardware needs, responsibilities, staffing/training, schedule, risks & contingencies, and an approval process — these are the load-bearing sections that make a plan executable. (QATesting)
- Have the QA lead author the test plan with the leadership team, covering legal compliance (logo sizes, title-screen durations), manufacturer technical requirements, spelling/grammar, and every feature of every level and how they interconnect — single ownership plus full-coverage scope. (PolishedGameDev)
- Update the test plan whenever features are added or requirements change, and task QA to verify the new feature works AND that old features didn't break — a stale plan can't gate a moving game. (PolishedGameDev)
- Author test cases from a current GDD / design document and supplied design materials, and keep that design doc current throughout the cycle — stale or absent design docs are a primary cause of missed features, coverage gaps, and slipped street dates. (QATesting; PolishedGameDev)

### Test-Case & Checklist Design
- Decompose the game into checklists (test-case spreadsheets), one area per tester (weapons, map holes, save/load) — parallel coverage of distinct areas finds more, faster. (QATesting)
- Hand a tester the next checklist the moment one is done — continuous checklist throughput keeps the whole team covering the game simultaneously. (QATesting)
- Establish "expected behavior" before testing anything (spend a day or two just playing to learn the game) — you can't flag a deviation if you don't know what's correct. (QATesting)
- Maintain a game bible / wiki for new hires listing map names, abbreviations, project severity rules, and basics — a living knowledge source onboards testers fast and standardizes classification. (QATesting)
- Design negative/edge test cases, not just positive ones — anyone can run the happy path; the value is in the edge negative case that breaks the system. (QATesting)
- Test how well the documentation matches actual behavior, not just the code — doc-vs-behavior drift is a defect class of its own, so check spec claims against the running program. (SWEngGames)
- Tune test cases to genre weak spots and give each genre's "pet bugs" extra attention, while still verifying everything — platformers (control/camera), FPS (weapon feel, flow, connectivity, balance), RPG (every item alone and in combination, all paths, long playthroughs), strategy/sim (balance, AI, fidelity), MMO (per-tester system ownership + networking strike team). (QATesting)

### Test Types — Functional & Progression
- Run functionality testing as the primary type: verify every feature returns expected results, the game never crashes, loads, and is completable — if expected differs from actual, write it up; fun is out of scope here. (QATesting)
- Run progression testing (linear playthrough hunting progression breaks) — a blocked door to the next area halts play even when the game still runs; ~99% of progression breaks are scripting issues. (QATesting)
- Use full no-cheats playthroughs across all difficulty levels (timed) to confirm completability and scout new builds before the team engages — never use cheats/exploits in playthroughs since they can break or unbalance the game; stop and write a thorough report on any crash or progression break. (QATesting)
- Actually USE the program a lot (e.g. play the game for an hour) — many bugs and bad-UI problems surface only through sustained real use, not quick checks. (SWEngGames)

### Test Types — Regression
- Re-run regression testing on every change and after every new build (a few times a week), re-verifying old supposedly-fixed bugs and the deviously obscure closed bugs in your database against later builds — a fix in one spot routinely breaks something elsewhere. (QATesting; SWEngGames; PolishedGameDev)
- Re-test similar/adjacent areas after a fix — the same change may have broken neighboring features. (PolishedGameDev)
- Verify scene-reload and death/retry paths actually reset state, and confirm cross-scene data persistence (DontDestroyOnLoad / PlayerPrefs) works end-to-end — these high-traffic transitions are common post-load regressions. (CertProgrammer)
- Explicitly test for and resolve import conflicts from Asset Store / Package Manager when integrating third-party assets/code — third-party imports are a known regression source. (CertProgrammer)

### Test Types — Compatibility & Platform
- Run compatibility/portability testing across many real machines and hardware configs (GPUs, RAM, video drivers, controllers, OSs, standards) before shipping or demoing — only supported hardware is tested; "works on my machine" is not shipped. (QATesting; SWEngGames)
- Test against the minimum-requirements ("min spec") machine — running on the lowest-denominator rig is a contractual obligation to reach buyers without high-end gear. (QATesting)
- Test for behavior independence from display resolution and from machine/processor speed — a game must behave well across screen sizes and CPU speeds. (SWEngGames)
- Always test the Release build AND the Debug build after each new version — divergence between them (often from uninitialized variables) is itself a critical signal. (SWEngGames)
- Test installers as fresh installs across many varied machines (VirtualBox/VMware images, D: partitions, paths with spaces, non-standard color schemes) and verify dependency installs (DirectX/registry) — end-user PCs differ wildly and flush out latent native-widget/visual bugs. (PolishedGameDev)
- Test the final BUILD, not just the editor, and ensure the intended boot scene is first in the build list — scene-load/boot-order bugs (e.g. menu not launching) appear only in the deployed build, so editor play-mode passing is not sufficient release evidence. (CertProgrammer)

### Test Types — Soak, Load & Stability
- Run soak testing by leaving the game running for a long time (e.g. title screen for days), then check for failure — memory leaks, accumulating-state failures, and rounding errors degrade long-run stability invisibly during normal testing. (QATesting; SWEngGames)
- Build an "autorun"/test-harness mode that runs with no user input and periodically changes program parameters as if a user were acting — automated soak/stability you can push far unattended, exercising paths manual testing misses. (SWEngGames)
- Add a "monkey on a typewriter" function that randomizes all program parameters on request — black-box random testing turns up bugs that escape targeted testing. (SWEngGames)
- Generate large data sets via scaffolding/mocks to surface non-scalable code (e.g. high-score insert at 10 vs 10,000 entries) — pick algorithms suited to the use case before scale exposes them. (PolishedGameDev)
- Use open/external beta to stress-test servers, balance gameplay, and surface bugs at scale — production+QA can't exercise an MMO's realistic load alone. (QATesting)
- Build a virtual network module wrapping all real network/file/API code so the suite can deterministically inject failures (missing files, lost network, corrupt packets, slow downloads) — a "reliably broken network" is the only way to test online robustness. (PolishedGameDev)

### Test Types — Ad-hoc, Automated & Specialized
- Run ad-hoc (free-form, checklist-off, "think-like-a-player") testing as a complement, not a substitute — methodical checklists catch surface bugs while the nastiest bugs surface during relaxed, edge-case exploratory play. (QATesting)
- Use automated testing for high-permutation, repetitive work (e.g. every upgrade x every other upgrade) and for stress, load, install, and content/appearance verification — free humans for fun, feel, and creative-asset judgment, since computers can flag "something's wrong" but can't say how to make it better. (QATesting)
- Treat input-replay/recorded-traversal as NOT a silver bullet for full automated testing — it breaks if you change level design, collision, physics, or any mesh/animation; full auto-playback needs explicit waypoints and camera moves (a separate big effort). (PolishedGameDev)
- Run usability and UI/UX testing repeatedly with real users on control and feedback schemes — mechanisms must be intuitive; the team subconsciously avoids known quirks, so start at pen-and-paper prototype stage and continue through and after release. (QATesting; PolishedGameDev)
- Test the game with a brand-new player on a complete-enough MVP — the dev team's innate mastery makes everything seem too easy; a virgin view exposes real difficulty, but the build must self-explain (no dev saying "that's not finished"). (PolishedGameDev)
- Spell/grammar-test as a named ownership (preferably two people) — a misspelled word makes players believe the whole game is low-quality and they quit; functional testing alone won't catch it. (PolishedGameDev)
- Test save/load (serialization) carefully and obsessively, including reopening a saved file in a fresh run — broken serialize order silently fills variables with garbage and crashes; bisect by backing up to a working point and re-adding code bit by bit. (SWEngGames)
- Test mobile call-handling and force-feedback edge cases (pause game+audio on incoming call, stop vibration during a call) — mock these on PC dev machines lacking the hardware. (PolishedGameDev)

### Coverage of Critical Paths
- Schedule polish and coverage on level 1 / the first minute first — it's the part the most players see, so prioritize early-game quality over rare end-game glitches. (PolishedGameDev)
- Double- or triple-check critical areas with more than one tester — QA is the last line of defense, so redundancy de-risks showstoppers slipping through. (QATesting)
- Rotate testers across areas so nobody goes numb to a level's bugs — fresh eyes and a rotation keep coverage honest. (QATesting)
- Don't ignore "low priority" subsystems (scoring, invites, UI) — nasty bugs hide where attention is lowest. (QATesting)
- Run coverage tools (e.g. Gcov) after play sessions — prove your tests actually exercise the whole codebase, not just the happy path. (PolishedGameDev)
- Wire up analytics to track in-game player behavior and use post-launch behavior data to drive patch priorities — instrumented telemetry reveals where real players struggle, drop off, or hit bugs that scripted QA never reproduces. (CertGameDev)

### Building Quality In vs Bolting On
- Engrain quality/polish at every step by every developer, not as a final-phase task or one person's job — "you can't polish a turd"; you can't add quality you never built in. (PolishedGameDev)
- Make testing the first thing in the dev cycle, not the last — it instills professionalism and catches defects when they are cheapest to fix. (PolishedGameDev)
- Integrate QA into planning and content development from the start, and treat QA as an ally rather than an enemy — supportive, early, multi-disciplinary collaboration yields a better product. (QATesting)
- Recognize QA can't inject quality into bad designs — fun, sound concepts remain the designers'/producers' responsibility; QA detects and reports, it doesn't redeem broken designs. **When it flips:** unfun or unbalanced concept → use focus groups / brand-new players early and often, since no algorithm detects fun and only repeated playtesting surfaces design-level problems QA alone won't. (QATesting; PolishedGameDev)
- Use a dispassionate, separate QA group/tester rather than relying on developers — developers unconsciously avoid the tests that would break their own code; recruit as many testers as possible since more eyes find more bugs. (SWEngGames)
- Change only one thing at a time, then test and commit, and trace the ramifications of every change before making it — two simultaneous changes hide which caused the effect, and one tweak can silently break something elsewhere (raising jump height raised jump distance and broke a puzzle). (PolishedGameDev)
- Run code reviews as front-line defect prevention before testing, keeping each review small (200–400 lines, timeboxed) — another developer sanity-checks design fit, edge cases, I/O, error handling, and whether tests exist; reading code finds more defects than meetings about it. (PolishedGameDev)
- Keep and version a review/failure-mode checklist per team — no checklist is ever "complete"; add each new failure mode once it has bitten you so you stop reintroducing those bugs. (PolishedGameDev)
- Run Lint/static analyzers and dynamic analysis (buffer-overrun, memory-leak detectors) as automatic build steps — catch use-before-init, ignored returns, and corruption before the code runs, accepting that not all errors can be found and minimizing impact instead. (PolishedGameDev)
- Code defensively and paranoid: assume parameters may hold bad values, validate input with a white-list, and never divide without checking the divisor — bolting robustness on later is far harder than building it in. (SWEngGames; PolishedGameDev)
- Fail loud, fast, and hard during development (missing assets, out-of-range coords stop the game) but fail quiet and defensive in production — and still log/trace defects even when the engine gracefully substitutes, so graceful degradation never hides the bug from the fix list. (PolishedGameDev)
- Auto-detect silently-missing assets and render garish placeholders (white-noise sound, black/green checkerboard texture) baked into the binary — QA can't report a sound it never knew should play, and a check-pattern can't be mistaken for a legitimately blank texture. (PolishedGameDev)
- Hold a hard frame-rate bar (e.g. 60fps) throughout production and use the Profiler (not guesswork) to diagnose drops — any drop is a sign of non-polish; serious perf issues are often too complex to fix in the last two months, so fix the offender immediately before continuing other work. (QATesting; PolishedGameDev; CertProgrammer)
- Write reusable routines once and call them everywhere instead of copy-pasting variants — single-location code is far easier to perfect, fix, and keep bug-free. (SWEngGames; CertProgrammer)
- Set up version control before "making the game," not after, configured correctly at creation time (visibility, .gitignore, README) — building the safety net first means every subsequent build is protected, trackable, and recoverable, and fixing exclusions after thousands of bad files are committed is far costlier. (VersionControl; CertGameDev)
- Build quality in by obsessively making the game fun and continuously re-testing — focusing hard on fun/balance and re-testing surfaces significant bugs and keeps new bugs from being introduced late where they would escape detection. (QATesting)

### Prototyping & Risk-First Testing
- Develop and validate a throwaway prototype before the real game to test the riskiest/most-uncertain mechanic or tech first — proving the core early de-risks the build and prevents committing test/QA effort to an unfun concept (if it's still fun with no audio/graphics, proceed). (PolishedGameDev; CertGameDev)
- For solvability/balance uncertainty, throw an AI at 1000 randomly generated puzzles — proves the design can actually be won (a transposed 15-puzzle is unsolvable). (PolishedGameDev)
- Play-test balance at every layer in isolation (unit test) and as a whole (integration test) — no single weapon/pickup/move should make others redundant. (PolishedGameDev)
- Make confident, fast prototype-test-revise iteration a baseline competency — quick loops are the engine of finding and fixing problems before they ship. (CertGameDev)

## Bug Reporting, Triage & Reproducibility

### Bug Definition & Classification

- Define a bug as anything unexpected that detracts from (rather than enhances) the game — if it looks intentional it is an Easter egg, not a bug; a bug is something that exists but works wrong, distinct from a change request (something that should exist but doesn't). (QATesting; PolishedGameDev)
- Categorize each bug correctly (visual, audio, level design, AI, physics, stability, performance, networking, compatibility) — miscategorizing sends developers on a wild goose chase and delays the schedule. (QATesting)
- Distinguish the three defect classes when testing: real bugs, bad/confusing features that look like bugs, and bad documentation (help doesn't match behavior) — each routes to a different fix owner. (SWEngGames)
- Reconcile tester perception vs. programmer intent before assigning a fix — one party's "bug" may be the other's "feature"; if many testers perceive a feature as a bug, change the feature or at minimum document it better, since consistent misperception is a real defect. (SWEngGames)

### Severity, Priority & Bug Bars

- Classify every bug by a fixed severity scale agreed up-front to remove whim and arguments — standard 4-level: Low/cosmetic (often un-fixed), Medium (occurs often / annoys / should fix), High (must fix — breaks gameplay/progression, frame rate below target), Critical (crashes, freezes, data corruption — drop everything); a fuller ladder runs Showstopper (can't play/complete) > Severe (workaround exists / looks amateurish) > Major (unreasonable inconvenience) > Minor (some inconvenience) > Time-permitting (only a die-hard would notice). (QATesting; PolishedGameDev)
- Add a "Legal" severity that trumps all others — during development it is grade-A; afterward it must be fixed and deployed before any other change. (PolishedGameDev)
- Treat repeatability and visibility as part of severity — a bug in a prominent place (title screen vs. deep UI) or that occurs frequently (often vs. rarely) is upgraded; a temp texture in late beta is High. (QATesting)
- Treat freezes, crashes, crash-to-desktop, and data corruption as Critical — they remove player control/display or destroy saves; capture debug info immediately when one hits. (QATesting)
- Treat crashing as the most-severe bug class but log other odd behavior as bugs too — severity ranges from "wrong output" to "hard crash." (SWEngGames)
- Treat stuck spots, map holes, loading failures, and high frame-rate drops as High — they halt or seriously degrade gameplay. (QATesting)
- Separate priority from raw severity when ordering fixes: don't blindly fix strictly A→E, because real polish lives in the C–E fixes — periodically pull some forward, and run an "anything-goes Friday" near the end so polish gets done even with A bugs outstanding. (PolishedGameDev)
- Route fixes by distinct priority bands — feature/change-request priorities run 2–5 and bug priorities run 1–5, with the QA lead assigning each. (PolishedGameDev)
- Don't ignore "low priority" subsystems (scoring, invites, UI) — nasty bugs hide where attention is lowest, so report low-priority issues too. (QATesting)
- Defer Low bugs to Will-Not-Fix when time is short — developers focus on Medium-and-above; not everything submitted gets fixed. **When it flips:** real polish and player-facing quality lives in the low-severity C–E fixes → deliberately pull some low/minor items forward rather than fixing strictly in severity order. (QATesting; PolishedGameDev)

### Writing the Bug Report

- Make the bug report the contract that lets a developer exactly reproduce the bug — the more detail, the easier the fix; the goal is "fire-and-forget" reports closed in one try. (QATesting)
- Write titles like newspaper headlines using the five W's (who/what/when/where/why) — vague or opinion titles ("Shotgun sucks") waste developer time; specify map, mode, and location. (QATesting)
- Write the report as bullets, not an essay, capturing: reporter name, exact build version, full machine/OS/browser/firmware/resolution details (auto-capture where possible), the smallest step-by-step repro, a save-game from just before the bug, and a screen-capture clip. (PolishedGameDev)
- Write descriptions with hard data — percentages, exact locations, game mode, number of simultaneous testers, and corroborating testers; opinion and abbreviations ("char") are not actionable. (QATesting)
- Differentiate clearly what is observed fact vs. opinion — the report must let the programmer watch their false assumption collapse in front of them. (QATesting; PolishedGameDev)
- Write Steps as precise, ordered, complete reproduction instructions — one missing detail makes the bug bounce back as "can't reproduce"; repro steps are the single most important thing in a report and a report without them is nearly useless. (QATesting; SWEngGames)
- Always record repeatability (e.g., 3-out-of-10, 5-out-of-5) and whether the bug "always happens" vs. "happens sometimes" — a 5/5 bug is far more serious than a 1/5, the frequency points developers at the right code, and the always-vs-sometimes distinction is essential for connection/lag/invisible-player bugs. (QATesting)
- Always record the exact game version the bug occurred in, and display the build version (e.g., build date-time) on the title screen — applying steps to the wrong build yields "can't reproduce," wasted time, and a reputation hit; every report must pin the exact code revision. (QATesting; PolishedGameDev)
- Take detailed notes before entering a bug into the tracker — limited lab PCs mean you must input quickly, and notes prevent guesswork at the keyboard. (QATesting)
- Capture rich repro on first sighting for rare/intermittent bugs — you may never reproduce it again, so make your first notes your release notes ("scientists never made rough copies"). (PolishedGameDev)
- Attach ancillary evidence — diagnostic log (PC: dxdiag with drivers/RAM/GPU specs; console: memory dump for crashes), screenshots, and video capture; logs act as forensics and many PC bugs trace to driver versions. (QATesting)
- Capture input/context at the moment of failure — for a freeze, note time, mode, player count, save a memory dump, and grab a debug screenshot to record the deterministic conditions. (QATesting)
- Take multiple screenshots at different angles/distances, mark the affected area, label the bug type, compress as JPEG, and zip multiples — make the visual evidence unambiguous and network-friendly. (QATesting)
- Run screen-capture (FRAPS, Camtasia) on all test sessions and upload bug clips with timestamps — cover all repro steps in one artifact, rehearse a clean run, optionally slow the footage, and spare devs from watching an hour for a 10-second bug; disc is cheap. (QATesting; PolishedGameDev)
- Verify a fix by reproducing the exact reported error string first, then confirming it disappears — error messages (e.g. "UnassignedReferenceException: The variable Visual has not been assigned") name the failing field/object and give a deterministic repro anchor. (CertProgrammer)

### Triage & Bug-Tracking Workflow

- Use a dedicated bug tracker (DevTrack, Bugzilla, TestTrack Pro, Jira, Mantis, Trac, Lean Testing, or proprietary) rather than email — even a simple bugs.txt in source works for small teams; the tool is immaterial, but a known, whole-team-followed lifecycle is what matters. (QATesting; SWEngGames; PolishedGameDev)
- Choose a bug tracker that is painless to use — if testers/devs dislike it, it won't get used; ideal tooling combines issue tracking, a wiki (living test plan/memory), and a forum. (QATesting)
- Record each bug with a brief description, exact repro steps, and a running record of what's been done to fix it. (SWEngGames)
- Triage every submitted bug through the lead before it reaches developers — the lead filters badly-written, duplicate, and joke entries, confirms all fields are filled before grading severity, then routes with the appropriate urgency to the right department owner. (QATesting; PolishedGameDev)
- Search for similar/existing bugs before submitting, and have the lead dedup on intake — duplicates irritate developers or get fixed twice; diligent searching is the only way to avoid them. (QATesting; PolishedGameDev)
- Prune stale/old issues from the bug database — dead issues clog triage. (PolishedGameDev)
- Keep a living list of known bugs and desired features separate from the code — so nothing gets lost between builds. (SWEngGames)
- Track each bug through standard statuses — Open → Assigned → Resolved/Fixed → Verified → Closed, with terminal designations WNF (Will Not Fix), NAB (Not a Bug / "as designed"), and Duplicate. (QATesting)
- Have the QA manager (non-technical on small teams) describe symptoms not presumed causes — their job is cataloging bugs, removing duplicates, and confirming claimed fixes are real. (PolishedGameDev)
- Investigate "invisible wall"-type findings closely to avoid being NAB'd — too many "Not a Bug" reclassifications signal you don't understand the game or your job. (QATesting)
- Surface and monitor the program's worst risks forward in time, asking "has it happened yet?" — risk monitoring is triage applied before failures land. (SWEngGames)

### Fix Verification & Regression Tracking

- Run regression testing on every change (and a few times a week as a standing pass) — fixes routinely spawn new bugs, so re-verify earlier fixes against later builds and re-run the deviously obscure closed bugs in your database. (QATesting; SWEngGames; PolishedGameDev)
- Re-test similar/adjacent areas after a fix — the same change may have broken a neighboring feature. (PolishedGameDev)
- Verify a fix by re-running your original steps multiple times, then trying an alternate path — confirming via different steps guards against a fix that only appears to work. (QATesting)
- Have testers verify their own fixed bugs and sign off, but let the lead change the status — sign-off creates accountability; falsely verifying unfixed bugs can snowball and get a tester fired. (QATesting)
- Only mark "verified" and sign your name once the bug is truly gone — one bad verification can cost millions once the game ships. (QATesting)
- Don't verify under distraction or with a huge backlog while multitasking — verification overload demands solo focus; a careless sign-off is a serious mistake. (QATesting)
- Reproduce the bug on a newer AND an older build — pinpoints which version introduced it. (PolishedGameDev)
- Use version-control History/diff views to root-cause a regression to a specific changeset — trace when a change was introduced, which files it touched, and the message used; inspect a teammate's commit diff before editing the same files so you don't re-introduce a regression they just fixed. (VersionControl)
- Tag/mark release revisions (gold master, date-time builds) using revision numbers over dates — enables retesting a bug on the exact old version it appeared in. (PolishedGameDev)
- Change only one thing at a time, then test and commit — two simultaneous changes hide which caused the effect or whether they cancelled out. (PolishedGameDev)

### Reproducibility & Determinism

- Make reproducibility the key deliverable of every report — if the tester can't follow their own steps to reproduce, the developer won't either. (PolishedGameDev)
- Take no shortcuts in the repro narrative — omitting "ordinary/unimportant" actions (even typing a short player name, or how you started the game: click? key? cheat screen? detour first?) can be the very cause. (QATesting; PolishedGameDev)
- Then minimize: explore alternate routes yourself to find the shortest repro — the fastest path to the developer seeing the problem; aim to reproduce on request. (PolishedGameDev)
- Use intuition to widen ("if X is broken, is Y too?") but watch for false reports — an "A key doesn't work" bug that was actually a broken keyboard. (PolishedGameDev)
- Seed the PRNG with a fixed identical value each run in Debug builds so behavior repeats identically run-to-run — you cannot chase a bug you can't reproduce; in Release builds seed from the wall clock for variety, since determinism is a debugging aid, not desired shipped behavior. (SWEngGames; PolishedGameDev)
- Keep the count of random() calls identical between run-throughs — a divergent call count desyncs the deterministic replay. (PolishedGameDev)
- Forbid draw() and any rendering pass from mutating state, including the RNG — a pure draw can be called any number of times in any order with no side effects, which is what makes deterministic replay possible. (PolishedGameDev)
- Expose the seed (getSeed/setSeed) so you can drive the program into a specific reproducible state — a recorded seed is a recorded test case. (SWEngGames)
- Provide save/load of full program state, preferring editable text-format save files during development — a saved state file is a reproducible test fixture you can hand-edit to set up exact reproduction states and inspect what was serialized. (SWEngGames)
- Provide a save-game from just before AND just after the bug for dev/QA at all level points (even if release saves only at waypoints) — note some bugs can't repro from a save because transient state isn't saved, so supply it when you can. (SWEngGames; PolishedGameDev)
- When a bug only appears in the Release build (no debugger), save the bad state to a parameter file, load it into the Debug build, and inspect — capture-and-replay state to make an un-debuggable failure debuggable. (SWEngGames)
- Build a cheat/debug screen (extra lives/resources/scores, skip to any save point) into every game's dev schedule — slashes the time QA spends grinding to the area under test; remove it before final release. (PolishedGameDev)
- Add a debug mode that force-triggers every conditional/random asset path one after another — randomized branches won't otherwise fire reliably, so a casual walkthrough can hit every variation. (PolishedGameDev)

### Input Logging & Automated Replay

- Log all play-session input and replay it later to reproduce bugs — the most powerful (and most complex) repro tool; it requires fully deterministic gameplay logic. (PolishedGameDev)
- Architect input as pushed into the input library (not pulled from devices) — so the logger can feed the same methods the real device events do, swapping the source transparently. (PolishedGameDev)
- Log ALL external inputs, not just keyboard/mouse — network traffic, disc loads, and timing all affect the update loop; even slight timing variance changes outcomes. (PolishedGameDev)
- Store inter-event time deltas, not absolute timestamps — makes pausing/resuming replay trivial. (PolishedGameDev)
- Model three event types — human input, system marks, and trigger methods — so replay waits for variable-duration stages (e.g., a logged button press fires after loading completes, not at a fixed wall-clock time). (PolishedGameDev)
- Treat input replay as NOT a silver bullet for full automated testing — a recorded traversal breaks if you change level design, collision, physics, or any mesh dimension/animation; full auto-playback needs explicit waypoints and camera moves (a separate big effort). (PolishedGameDev)
- Reuse the input logger for attract/demo mode and tutorial guides — bonus polish from the same machinery. (PolishedGameDev)

### Automated, Monkey & Soak Testing

- Use automated testing for high-permutation, repetitive work — write software to walk all combinations (e.g., every upgrade × every other upgrade) and flag any error messages, freeing humans for harder problems and polish. (QATesting)
- Automate stress, load, install, and content functionality/appearance verification; keep humans for fun, feel, and creative-asset judgment — computers can flag "something's wrong" but can't say how to make it better. (QATesting)
- Build an "autorun" mode that runs and does things with no user input, and have it periodically change program parameters as if a user were acting — simulated-user input exercises paths manual testing misses. (SWEngGames)
- Add a "monkey on a typewriter" function that randomizes all program parameters on request — black-box random testing turns up bugs that escape targeted testing. (SWEngGames)
- Run soak testing: leave the game running (e.g., the title screen, or an autorun left unattended) for days, then check for crash — memory leaks and rounding/accumulating-state errors degrade long-run stability invisibly during normal testing. (QATesting; SWEngGames)
- Generate large data sets via scaffolding/mocks to surface non-scalable code — test the high-score insert at 10 vs 10,000 entries and pick algorithms suited to the use case. (PolishedGameDev)
- Build a virtual network module wrapping all real network/file/API code so the test suite can deterministically inject failures — missing files, lost network, corrupt packets, slow downloads; a "reliably broken network" is the only way to test online robustness. (PolishedGameDev)
- Throw an AI at 1000 randomly generated puzzles for solvability/balance uncertainty — proves the design can be won (a transposed 15-puzzle is unsolvable). (PolishedGameDev)
- Run coverage tools (Gcov) after play sessions — prove your tests actually exercise the whole codebase, not just the happy path. (PolishedGameDev)
- Wire up analytics to track in-game player behavior and use it to drive patch priorities — instrumented telemetry reveals where real players struggle, drop off, or hit bugs that scripted QA never reproduces. (CertGameDev)
