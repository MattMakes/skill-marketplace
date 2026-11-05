# Internal economy: systems, resources, levers

Sources:
- Ernest Adams and Joris Dormans, *Game Mechanics: Advanced Game Design* (New Riders, 2012):
  the internal economy and the Machinations diagram vocabulary.
- Jesse Schell, *The Art of Game Design: A Book of Lenses*: the Lens of Economy.
- Robin Hunicke, Marc LeBlanc and Robert Zubek, "MDA: A Formal Approach to Game Design and Game
  Research" (2004).

## The internal economy (Adams and Dormans)

A game's rules move **resources** (light, coins, health, time, letters) between parts of the
game. Most mechanics are one of these elements:

- **Source**: makes a resource out of nothing (a sunbeam arrives every 8 seconds).
- **Sink** (Adams and Dormans call it a drain): removes a resource for good (unfolding a letter
  costs 6 light).
- **Converter**: turns one resource into another (a beam plus a theme becomes a brew).
- **Trader**: swaps resources between two owners without making or destroying any.
- **Pool**: holds a resource; its cap is a design choice.

Two loop shapes matter most:
- **Positive feedback** amplifies: the more you have, the faster you get more. It ends games and
  widens gaps. Use it for momentum, cap it for safety.
- **Negative feedback** stabilizes: the leader slows, the trailing player catches up. Use it for
  recovery.

A resource with a source but no sink inflates until it means nothing. A resource with a sink but
no source runs out and stalls the loop. Check both ends of every resource.

## Economy as fun (Schell)

Schell's Lens of Economy asks how players earn money, what they spend it on, and whether the
choices are meaningful. An economy gives depth, but it behaves like a living thing: small
changes to a rate can change behavior a lot. So name the levers and start them at explicit
values, then tune them in playtests.

## Fold-in (MDA)

Mechanics produce dynamics, and dynamics produce the aesthetics (the kinds of fun). A system that
the moment-to-moment or session loop never touches cannot produce the target fun for most of
play time. So each system names the kind it serves, and the primary kind must come from the
core-verb system. A cosmetic shop, a login bonus or a leaderboard bolted beside the loop serves
no target kind: redesign it into the loop or cut it.

## First hour in numbers

Write the player's resource amounts at a few minute marks. If the numbers show a long stretch
where nothing changes, or a resource that only grows, the economy has a gap. Fix it on paper
before any code.
