# Prototyping and playtesting

Sources:
- Tracy Fullerton, *Game Design Workshop: A Playcentric Approach to Creating Innovative Games*:
  physical (paper) prototypes first, then digital prototypes, and playtesting at every stage.
- Jesse Schell, *The Art of Game Design: A Book of Lenses*: playtesting (who, why, what you
  want to learn) and the rule that prototypes answer questions.
- Robin Hunicke, Marc LeBlanc and Robert Zubek, "MDA" (2004): test the aesthetics the design
  targets, not the mechanics alone.

## Cheapest first (Fullerton)

Fullerton's playcentric method puts a player in front of the idea as early as possible. A
physical prototype made of paper, cards and tokens tests the formal elements (player actions,
rules, the core loop) in hours, before any code. Digital prototypes come next, and each one
should answer a question the paper version could not.

## Three milestones

- **Paper prototype**: proves the core verb produces the primary kind of fun. Days, not weeks.
- **Grey-box**: proves the loop feels right in motion (timing, feel, pacing) with placeholder
  shapes and no art.
- **Vertical slice**: proves one finished-quality piece of the game (one level, one street)
  delivers every target kind. Only now does art matter.

Each milestone has an exit criterion a tester can see: "4 of 5 testers ask to play again", not
"it feels good".

## Playtest questions (Schell, MDA)

Schell's advice: know what you want to learn before the test. Tie every question to a target kind
of fun, so a failure tells you which kind failed. Ask about behavior and feelings the player can
report ("When did you want to stop?"), not opinions ("Did you like it?"). Watch more than you
ask: what testers do outweighs what they say.

## Risks retired

List the biggest risks from the brief. The biggest risk goes first, into the cheapest milestone
that can test it. A risk that no milestone retires is still open; name it.

## Tech for one developer

Pick the tool the developer can ship with fastest, not the most powerful one. Small 2D games:
Godot, PICO-8, Phaser, Love2D. 3D: Godot or Unity. A paper prototype needs no engine.
