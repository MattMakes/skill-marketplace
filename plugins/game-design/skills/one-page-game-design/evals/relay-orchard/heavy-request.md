Help me work through a detailed design for Relay Orchard. This is a fictional solo desktop game about restoring an abandoned orchard's radio observatory over 3 days. The player should feel resourceful and caring. I need a system diagram a future programmer can inspect, with the actual costs, prerequisites, branches, and failure behavior visible. Produce the editable diagram, one printable PDF page, and a saved design record. Choose the appropriate format from the skill. Do not invent decisions to hide the open questions.

The following rules are confirmed:

- Each day has 6 action points (AP). Each listed action consumes its AP cost immediately. Actions cannot start without the required AP and resources.
- Day 1 starts at dawn with 6 AP, 6 energy, 2 water, 2 scrap, 0 fruit, 0 credits, and 0 research. Resource stores have no capacity limit in this prototype.
- Each travel between Workshop and Grove, Workshop and Reservoir, or Workshop and Observatory costs 1 AP and 1 energy. Routes are bidirectional. No other routes exist.
- The player starts at Workshop. Returning there is optional before ending a day. Ending the day moves the player to Workshop for free and resets AP to 6 at the next dawn. It preserves resource stores and project progress.
- A portable solar charger works at any location: spend 1 AP to gain 2 energy. This is the recovery path when energy reaches 0. It does not move the player.
- At Reservoir, collect 2 water for 1 AP.
- At Grove, tending consumes 1 AP and 1 water and adds 1 tended marker. Markers accumulate within the day. At the next dawn, each marker produces 2 fruit and is cleared. A storm reduces the combined dawn fruit yield by 1, to a minimum of 0.
- A forecast at each dawn announces whether the next dawn will be clear or stormy. The exact weather schedule or random model is undecided. The forecast is accurate. An illustrative example may explicitly assume clear weather.
- At Workshop, trade 2 fruit for 3 credits, costing 1 AP. Buy 1 scrap for 2 credits, costing 1 AP. No other trades exist.
- At Observatory, scan the sky for 1 AP and 2 energy to gain 1 research. A scan requires a repaired receiver.
- Repairing the receiver at Observatory costs 1 AP and 2 scrap. The repair persists.
- Installing the signal relay at Observatory costs 2 AP, 2 research, and 1 scrap. Installation persists and wins the game if completed before the player ends day 3.
- If day 3 ends before installation, show an incomplete-restoration outcome. The story consequence and replay behavior are undecided.
- The resource HUD and action preview show AP, energy, and resource costs before confirmation. A disabled action names the missing prerequisite. Feedback uses text and shape as well as color. Sound is optional.
- There is no combat, multiplayer, monetization, equipment leveling, or procedural map. Saving between real-world play sessions is undecided.

Please show how these systems connect: day/forecast, location/travel, energy/recovery, water/tending/fruit, trading/scrap, receiver/research/relay. Include one normal sequence and one energy-shortage recovery sequence, calculating the state changes. If the given rules make the 3-day objective impossible, show the contradiction and an explicit proposal instead of changing the rules silently. Preserve the distinction between a design proposal and a confirmed rule.
