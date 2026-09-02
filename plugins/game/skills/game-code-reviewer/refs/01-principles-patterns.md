# Principles, Decoupling, Patterns, State & Events

## Core Principles & Decoupling

### Single Responsibility & Cohesion
- Give each class/script ONE clear purpose and one reason to change — multi-responsibility classes mix change vectors and are harder to read, test, and change safely (HeadFirstPatterns; PatternsUnity6; AdvancedCSharp; CSharpForUnity; SWEngGames; ECSFundamentals; GPGems2).
- Split a god class into focused ones (GameManager → LevelLoader/ScoreManager/EnemySpawn; player → PlayerController/PlayerScoring/PlayerAnimation) — change one system without disturbing others; a single godlike Main/Game holding all data and logic is unmaintainable (PatternsUnity6; SWEngGames).
- Give each method one clear job (AddItem, RemoveItem, UpdateInventoryText each do exactly one thing) — keeps responsibilities separable and testable (AdvancedCSharp; CSharpForUnity).
- Push behavior into the object that owns it, not into a dispatcher or external procedure — each entity implements its own Interact()/Attack(); a class should own every method it needs to act, like an organism (AdvancedCSharp; SWEngGames; GPGems2).
- Separate data from behavior — store state in components/structs, put logic in systems; a script holding both a value and the code acting on it mixes two responsibilities (ECSFundamentals).
- Aim for high cohesion — a class built around one related set of functions is more maintainable than one juggling unrelated functions; encapsulate one set of related responsibilities per class so you can swap implementations cleanly (HeadFirstPatterns; SWEngGames).
- Keep each mini-system small and single-purpose so each concept has a clean place to live — isolated, focused systems are easier to read, test, and reason about than one tangled monolith (AdvancedCSharp; CSharpForUnity).
- Don't give one type two jobs (e.g. an aggregate that both manages a collection AND iterates it) — two reasons to change; split them (HeadFirstPatterns).
- Watch a script accumulating unrelated responsibilities over time (player gains scoring, then animation, then UI) as a refactor trigger — one change otherwise touches several systems; brains over-group related-looking behaviors, so be diligent (PatternsUnity6; HeadFirstPatterns).

### Encapsulate What Varies
- Identify the aspects that vary and separate them from what stays the same, so they can be altered or extended without touching the rest — edits to varying behavior (weapons, AI, movement) don't ripple into stable code (HeadFirstPatterns).
- Pull varying behavior into its own family of classes behind an interface — other types can reuse those behaviors, and you add new behaviors without touching existing ones (HeadFirstPatterns).
- Parameterize what varies — accept the variable part as a parameter even when current callers all pass the same value (AddGold(int amount), IncreaseScore(int amount)); future-proofs at zero cost and avoids per-value duplicate methods (AdvancedCSharp; CSharpForUnity).
- Hide implementation behind get/set accessors so callers need not know the stored data type or backing field — frees clients from format details and lets you change storage later without touching callers (small speed cost when types differ) (GPGems2; SWEngGames).
- Use mutators to enforce invariants across coupled fields (keep _velocity = _speed * _tangent consistent) — public fields would let callers desync them (SWEngGames).
- Decouple a variable's internal name from its exposed name (store m_colour, expose "color") — tools bind to stable external names, not internals (GPGems2).

### Open/Closed & Liskov Substitution
- Design classes open for extension, closed for modification — add new behavior (new enemy, powerup, command type) without editing tested, bug-free code; repeatedly editing working code multiplies bug risk (HeadFirstPatterns; PatternsUnity6; IntroGameDesign; AdvancedCSharp).
- Replace per-type methods (meleeAttack/rangedAttack, or type-switching if/switch chains) with an abstract/virtual method overridden per subclass — adding a variant then needs a new derived class, not edits to the base; also avoids RTTI cost (PatternsUnity6; GPGems2).
- Prefer adding behavior via polymorphism over checking an object's type and branching — branching couples callers to the concrete type set; reserve IsKindOf/GetRuntimeClass for rare cases and always question whether it's truly needed (GPGems2; SWEngGames).
- Keep the base class as the stable shared contract and introduce new behavior only via extension — predictable additions, safer existing code (PatternsUnity6).
- Ensure any subclass is a valid drop-in wherever the base type is expected (LSP) — code that needs special-case branches per subclass is an LSP smell; if a subclass can't behave like its base, the inheritance is a poor fit (PatternsUnity6).
- No method should override an implemented base method — if you override it, the base method wasn't really a shared abstraction; base methods should be meant for all subclasses (HeadFirstPatterns).
- Don't apply Open/Closed everywhere — making every part extensible is wasteful, adds abstraction layers and complexity; concentrate it on the areas most likely to change. **When it flips:** the area genuinely changes often → make it extensible (HeadFirstPatterns).

### Composition Over Inheritance
- Favor composition (HAS-A, delegation) over inheritance (IS-A) — composed objects delegate to behavior objects and gain far more flexibility than a frozen hierarchy; use inheritance only where an "is-a" relationship truly holds (HeadFirstPatterns; SWEngGames; IntroGameDesign; ECSFundamentals; GPGems2).
- Choose composition when you need runtime behavior change — inheritance locks behavior at link time; a setter (setFlyBehavior, set_pA) swaps the composed strategy live (HeadFirstPatterns; SWEngGames).
- Use composition to dodge combinatorial class explosion — composing N helper classes (2 sprites × 2 listeners × 2 forces = 8 composed) beats hard-coding every combo as ~18 inheritance classes; separate independent axes (look-and-feel via composition, interaction via hierarchy) (SWEngGames; GPGems2).
- Don't reach for inheritance to share code when behavior varies — inheriting fly()/quack() forces inappropriate behavior (flying rubber ducks) and duplicates code; the most common beginner mistake is block-copying a class when it should be a child or composed member (HeadFirstPatterns; SWEngGames).
- Build behavior by composing Components/data onto entities rather than deep inheritance — a GameObject is a bag of Components; an ECS entity groups components you add/remove to change what it is; model your own components after engine ones (Rigidbody, Collider) so they stay addable/removable/swappable (IntroGameDesign; ECSFundamentals; PatternsUnity6).
- Any inheritance relationship can be replaced by composition+delegation — give ClassB a ClassA* member and forward calls; pass `this` when delegating so the helper can mutate the owner via accessors (SWEngGames).
- Prefer composition for "black box" reuse — composing hides the reused class's internals, so you're less likely to break things other classes use than with "white box" inheritance (SWEngGames).
- Use composition instead of multiple inheritance — multiple inheritance is hard to maintain; compose one parent instead. Beware inheriting from multiple interfaces: use it for permanent intrinsic traits, not dynamic characteristics. **When it flips:** a permanent intrinsic trait → single/multiple inheritance can be cleaner than composition (SWEngGames; GPGems2).
- Don't compose (or force a common base class) for a trait two classes barely share — if classes have only one thing in common, give each a member rather than coupling them through a shared base; leaves room for richer child variants later (SWEngGames).
- Use inheritance to enforce uniform laws across an object family — define physics/shared logic once in a base move/update and derive all simulated objects instead of reprogramming per class; move shared code up into base-class helpers so deriving is cheap (SWEngGames; IntroGameDesign).

### Program to Interfaces & Dependency Inversion
- Program to an interface (supertype), not an implementation — type variables to the highest base possible (cCritter*, not cCritterAsteroid*) so the concrete runtime object isn't locked in and code stays reusable; "interface" means the concept (abstract class OR interface), exploiting polymorphism (HeadFirstPatterns; SWEngGames; GPGems2).
- Ask "does this object support the capability?" not "what concrete class is it?" — capability checks via interface decouple callers from type hierarchies; a controller calling Interact() on an IInteractable needs no per-type branches (AdvancedCSharp; IntroGameDesign).
- Depend on abstractions, not concrete classes — high-level systems (GameManager, Spawner, render loops) and low-level pieces (Enemy types, IRenderable/ISoundSystem) should both depend on a shared abstraction; adding a new type then needs zero edits to the consumer (HeadFirstPatterns; PatternsUnity6; IntroGameDesign; GPGems2).
- Use interfaces to express shared capability across unrelated classes — Ball/Door/ColorChanger share no gameplay purpose but all "can be interacted with"; an interface captures that without a forced hierarchy that would couple them needlessly (AdvancedCSharp).
- Make systems depend on capabilities, not identities — a movement system processes any entity that has the required components (player OR enemy), so logic is reusable instead of type-bound (ECSFundamentals).
- Use interfaces to decouple producer from consumer — a damage/spell system shouldn't know which enemy it hit, only that the target satisfies the interface; the concrete class can then change freely (IntroGameDesign; AdvancedCSharp; PatternsUnity6).
- Split fat interfaces into focused ones (ISP: IVehicle → IGroundVehicle.Drive, IAirVehicle.Fly) — never force a class to implement methods it doesn't use; large interfaces breed empty/placeholder bodies (PatternsUnity6).
- DIP guidelines (aspirations, not laws): no variable holds a reference to a concrete class, no class derives from a concrete class — use a factory instead of `new` and derive from abstractions; internalize them so you KNOW when and why you're violating (instantiating a String or a stable class is fine) (HeadFirstPatterns).
- Define interfaces as a method-signature contract with no bodies — the interface declares what must exist, never how, so implementers stay free to vary behavior; name them with a leading capital I (AdvancedCSharp).
- Push abstract, implementation-free classes to the top of hierarchies — derived classes then share identical interfaces, the strongest form of "program to an interface" (SWEngGames).
- Use the Bridge boundary to fully decouple abstraction from implementation — abstract an interface base (cGraphics) with concrete impls (MFC/OpenGL/DirectX), or pass identifiers (ints/strings/handles) across an API instead of class pointers, hiding how things are loaded and done (SWEngGames; GPGems2).
- Don't apply abstract interfaces indiscriminately — overuse obscures the design; reserve them for replaceable/pluggable modules (renderers, spatial DBs, AI behaviors, tool extensions) and add interface abstraction precisely where multiple unrelated classes must answer the same event (interaction, damage, save, AI) (GPGems2; AdvancedCSharp).
- Avoid interfaces (virtual calls) on functions called in inner loops (DrawPolygon, SetScreenPoint) — one indirection per call is fine occasionally, deadly in hot paths. **When it flips:** a hot inner-loop call → drop the virtual indirection (GPGems2).

### Minimizing Coupling
- Strive for loosely coupled designs between interacting objects — minimizing interdependency lets the system absorb change; objects interact while knowing very little about each other, and decoupled collaborators reuse independently (HeadFirstPatterns; PatternsUnity6).
- Keep coupling as low as possible while accepting some dependency is unavoidable — high coupling means a change in one class is likely to break another; treat every new direct script-to-script connection as added fragility (a renamed method silently breaks every caller) (PatternsUnity6).
- Watch the two main coupling sources: one script directly calling another concrete class's methods, and reading/writing another script's variables from outside — direct variable mutation is the tightest coupling of all (PatternsUnity6).
- Reduce coupling with events when a sender shouldn't know its listeners — the sender announces "something happened" and any interested script reacts; prefer raising an event over directly calling a UI script to update score (fires even with zero listeners, easier to extend) (PatternsUnity6; HeadFirstPatterns; IntroGameDesign).
- Communicate through shared data/handles, not direct references — InputSystem writes singleton InputData, PlayerSystem reads it; neither knows the other, so either swaps independently; reference data by stable handles (Entity, ID, tracking pointer), not heavyweight objects (ECSFundamentals; GPGems2).
- Let a subject/observer know only the small interface of the other side — a subject needn't know observers' concrete class; add/replace/remove listeners at runtime without modifying the subject (HeadFirstPatterns; PatternsUnity6).
- Route ALL game input through one input system/controller, queried at one predictable point in the update cycle — enables record/playback, portability, determinism, and decouples input source from consumers; querying OS input directly scatters coupling (GPGems2; SWEngGames).
- Isolate the platform/API boundary in one place — input lives only in InputSystem; porting changes that one file while the rest of the pipeline is untouched; encapsulate platform/version fragility behind explicit loading (ECSFundamentals; GPGems2).
- Mind variable scope: declare at the narrowest scope that works and keep data local unless it genuinely needs sharing — broad scope is the seed of hidden coupling and order-of-execution bugs; distinguish instance from static/shared state (IntroGameDesign).
- Default to private fields; widen access only when a real collaborator needs it — don't make a field public just to expose it in the Inspector (use [SerializeField] private); narrow the API to what other scripts genuinely need (CSharpForUnity; AdvancedCSharp).
- Expose read-only access while protecting invariants — use { get; private set; } / exported-tag enums for state others read but only the owner writes (Score, Instance, FSM state); never leak internal states that outside code would couple to (PatternsUnity6; GPGems2).
- Make creation ignorant of subclass internals — use a Factory/Abstract Factory so callers request a type without hardcoding `new` against a concrete class; encapsulate `new` so adding a type doesn't force edits across the codebase (HeadFirstPatterns; IntroGameDesign; GPGems2; SWEngGames).
- Don't store the same data in two places — derive counts/state on demand rather than a separate field you must keep in sync; rebuild derived display state from the source of truth in one place after every change so the view can't drift from the model (SWEngGames; AdvancedCSharp).
- Avoid two-way coupling between independent attributes — explicitly turn off links (attitude-to-motion, aim-to-attitude) when the two should move independently; avoid `friend` statements that break encapsulation (SWEngGames).
- Use the Singleton/global access point sparingly and treat it as a cost, not a free win — it creates a global access point many scripts depend on (every X.Instance caller breaks if its API changes), violates one-class-one-responsibility, and induces order-dependence; use only for systems that are genuinely unique AND globally needed (GameManager, AudioManager, SaveSystem). **When it flips:** a genuinely one-of-a-kind, globally-needed service → Singleton beats a raw global (which gives no single-instance guarantee) (HeadFirstPatterns; PatternsUnity6; IntroGameDesign; SWEngGames; ECSFundamentals).
- Limit header/compile coupling — only include a header in a header when absolutely required; use forward declarations for pointer-only members and keep app-specific types out of low-level headers (SWEngGames).

### Least Knowledge & Dependency Direction
- Apply the Principle of Least Knowledge (Law of Demeter): talk only to your immediate friends — from any method, call methods only on the object itself, its parameters, objects it creates, and its own components; keep the circle of acquaintance small so a change in one part doesn't cascade (HeadFirstPatterns).
- Don't call methods on objects returned from other calls — that couples you to another object's subparts; add a method on the friend to make the request for you (HeadFirstPatterns).
- Weigh Least Knowledge's cost — it reduces coupling and eases maintenance but introduces wrapper/helper classes, increasing complexity and possibly hurting runtime performance. **When it flips:** the wrapper overhead outweighs the coupling it removes → call through directly (HeadFirstPatterns).
- Apply the Hollywood Principle ("Don't call us, we'll call you") — high-level components decide when low-level components are invoked; low-level components hook in but never call up, preventing tangled circular/sideways dependency rot (HeadFirstPatterns).
- Route inter-view/inter-object communication through a coordinating owner, not peer-to-peer — in Document-View, edits go through the document mutator which publishes via UpdateAllViews; views never directly poke each other; centralize multi-agent cooperation behind a manager rather than peer coordination (SWEngGames; GPGems2).
- Don't let clients change a Context's state directly — the Context owns its state; external mutation without its knowledge breaks invariants (HeadFirstPatterns).

## Design Patterns, State & Events

### Choosing & Applying Patterns Wisely
- Reach for a pattern only to solve real friction (rippling changes, tight coupling, repetitive wiring) — patterns are proven structures for common problems, not decoration you stamp on hopefully. (PatternsUnity6; HeadFirstPatterns)
- Add a pattern only when you're sure it addresses a real problem in your design, and seriously consider a simpler solution first — patterns are not a magic bullet you plug in and walk away from; you must think through their consequences on the rest of the design. (HeadFirstPatterns)
- Match the pattern to the problem — Factory for creation, Strategy for swappable behavior, Singleton for true single-instance services; don't pattern-stamp where a plain object suffices. (IntroGameDesign)
- Center thinking on design and object principles, not on patterns — let patterns emerge naturally as the design progresses; never start a design from patterns. (HeadFirstPatterns)
- Follow the maturity curve: beginners use patterns everywhere, the Zen mind reasons in object principles and tradeoffs and applies a pattern only when the need naturally arises — and adapts it when the canonical form doesn't fit. (HeadFirstPatterns)
- Treat a pattern's value as experience/vocabulary reuse, not code reuse — saying "Observer" or "Strategy" conveys a whole set of qualities, constraints, and tradeoffs, keeping discussion at the design level. (HeadFirstPatterns)
- No principle or pattern is a law — all design involves tradeoffs (abstraction vs speed, space vs time); weigh every factor before applying one. (HeadFirstPatterns)

### KISS / YAGNI / Pattern Overuse
- KISS: solve things the simplest way possible — your goal is simplicity, not "how can I apply a pattern here"; other developers admire simple designs. (HeadFirstPatterns)
- Add abstraction/patterns for change that is likely, not hypothetical (YAGNI) — flexibility for change that may never come only adds complexity you might never need. (HeadFirstPatterns)
- Keep data/components minimal and right-size structure to the project — hold only what's needed now, don't pre-load structs with fields "just in case," and start minimal (one component, one system), adding only as behaviors appear. (ECSFundamentals)
- Beware pattern overuse — it leads to over-engineered, complex, inefficient code; extra layers add complexity AND runtime inefficiency and can be outright overkill. (HeadFirstPatterns)
- Don't apply abstract interfaces indiscriminately — overuse obscures the design; reserve them for replaceable/pluggable modules (renderers, spatial DBs, AI behaviors, tool extensions). (GPGems2)
- Don't apply Open-Closed everywhere — making every part extensible is wasteful and adds abstraction layers; concentrate it on the areas most likely to change. (HeadFirstPatterns)
- Skip the abstraction when there's nothing to configure — create the entity/object directly when it has no Inspector-facing values; avoid ceremony for ceremony's sake. (ECSFundamentals)
- Be willing to REMOVE a pattern — when the system became complex and the planned flexibility isn't needed, a simpler solution without the pattern is better. (HeadFirstPatterns)
- Don't reach for the full Command pattern when a simpler mechanism is clearer — a callback-stack or plain collection sometimes communicates intent better. (GPGems2)
- Don't feel unsophisticated for not using a pattern — but recognize that sometimes a pattern IS the simplest, most flexible solution. (HeadFirstPatterns)

### Anti-Patterns
- Treat the "Big Ball of Mud"/spaghetti code as the anti-pattern to resist (Throwaway Code, Piecemeal Growth, Sweeping It Under the Rug) — even pattern-ignorant code drifts there; design APIs and status/logging hooks to navigate the swamp. (GPGems2)
- Document and name anti-patterns — a recurring bad-but-attractive solution; naming it (e.g., Golden Hammer) creates shared vocabulary and warns others, explaining why it looks attractive, why it's bad long-term, and which patterns to use instead. (HeadFirstPatterns)
- Watch for the Golden Hammer — forcing one familiar technology/pattern onto every problem, including where it's clearly inappropriate; the fix is broadening the team's knowledge. (HeadFirstPatterns)
- Treat a growing chain of `if (is TypeA) … else if (is TypeB)` type checks as a refactoring smell — it doesn't scale, clutters the dispatcher with special cases, and is hard to maintain; replace with a polymorphic/interface call. (AdvancedCSharp; SWEngGames; PatternsUnity6)
- Don't ask an object its class type or branch on it — replace type-switching `if`/`switch` chains with a virtual function per subclass; reserve `IsKindOf`/RTTI for rare cases and always question whether it's truly needed. (GPGems2; SWEngGames)
- Don't register a listener and then immediately clear all listeners in the same setup — adding a callback then calling `RemoveAllListeners()` in `Start()` leaves the control dead; audit setup order so teardown doesn't undo wiring. (AdvancedCSharp)
- Don't re-`GetComponent`/look up the same reference per event — cache component/interface results in a local or in `Awake` since lookups aren't free; calling `GetComponent<IInteractable>()` twice (null-check then invoke) is redundant. (AdvancedCSharp)

### Strategy
- Use Strategy to define a family of interchangeable algorithms, encapsulate each, and make them swappable — vary the algorithm (AI behavior, movement, weapon) independently of the client and at runtime without affecting classmates or subclassing per variant. (HeadFirstPatterns; GPGems2; SWEngGames; IntroGameDesign)
- Implement Strategy by swapping function pointers / setting the composed behavior via a setter — a clean pointer/`set_pA` assignment replaces a subclass proliferation and changes capability live. (GPGems2; SWEngGames; HeadFirstPatterns)
- Use Strategy in place of old C function pointers — and to avoid deriving a new subclass for every behavior variant. (SWEngGames)

### Observer / Events / Message Systems
- Use Observer to define a one-to-many dependency so dependents auto-update on state change — split roles into observables (notify) and observers (subscribe and react); the broadcaster needs no references to its listeners and works even with zero of them. (HeadFirstPatterns; PatternsUnity6)
- Build event/observer/message systems to be dynamic and loosely coupled — listeners join or remove themselves at any time, and the broadcaster doesn't know or care who listens. (HeadFirstPatterns; PatternsUnity6)
- Reduce coupling with events when a sender shouldn't know its listeners — prefer raising an event over a script directly calling another (e.g. player calling a UI script to update score); it's a looser connection that's easier to extend. (PatternsUnity6)
- Replace a manager holding direct references to N controlled objects with an event broadcaster — otherwise adding a 4th object means a new field plus edits to both branches; events let new observers appear with zero manager changes. (PatternsUnity6)
- Let a subject know only that observers implement a small interface, not their concrete class — add/replace/remove observers at runtime without modifying the subject, and reuse subjects and observers independently. (HeadFirstPatterns)
- Use function delegates/callbacks as the event mechanism so the publisher stays independent of subscribers — the firer invokes a delegate without knowing who's subscribed, and either side can change freely. (IntroGameDesign)
- Use Document-View / Publisher-Subscriber to keep multiple representations of one data set in sync — route all edits through the document mutator, which publishes via `UpdateAllViews`/`OnUpdate`; views never poke each other directly, and event-hint payloads stay generic (int code + catch-all pointer). (SWEngGames)
- Prefer pull over push in observer systems when observers need different data — observers fetch only what they need, so you add new state without rewriting every observer's update signature. (HeadFirstPatterns)
- Guard notification with a "changed" flag — only notify when state actually changed, and reset the flag after notifying, to avoid spurious updates. (HeadFirstPatterns)
- Restrict event mutation with the C# `event` keyword so external code can only subscribe/unsubscribe, not invoke or overwrite the whole delegate — and invoke with the null-conditional `OnX?.Invoke()` so zero subscribers don't throw. (PatternsUnity6)
- Subscribe to events in OnEnable and unsubscribe in OnDisable — ties subscription lifecycle to active state and prevents stale-listener errors and leaks on disabled/destroyed targets. (PatternsUnity6)
- Register listeners from code with `AddListener` when wiring should be versioned and reviewable, passing a method reference (no parentheses) and matching the event's signature — `AddListener(Method())` invokes immediately and is wrong; clear with `RemoveAllListeners()` when reusing a UI element across states. (AdvancedCSharp)
- Use event-driven behavior instead of polling — react to a triggering event rather than re-checking every frame; foundational AI optimization. (GPGems2)
- Demote handler methods to private once they're only called via events — narrows the public surface and signals intent. (PatternsUnity6)

### Command / Undo / Queue
- Use Command to encapsulate a request as an object — decouple the invoker (input handler, button, queue, player/AI/network) from the receiver that does the work; any class can be a receiver and all issuers enqueue identically. (GPGems2; HeadFirstPatterns; PatternsUnity6)
- Use Command when order of operations matters or you need undo/redo/replay/queues — queue, log, replay, draw a preview, and reverse each request; give each Command an `Execute()` and an `Undo()` and a MacroCommand runs a list as one. (PatternsUnity6; HeadFirstPatterns; GPGems2)
- Define a minimal command contract (`ICommand { Execute(); Undo(); }`) and make each command self-contained — store its target reference and data so it can both perform and reverse itself (e.g. Undo by applying the negated vector); any new action then fits the existing system with one command class. (PatternsUnity6)
- Separate input from action logic via commands — a key press creates a command object rather than directly mutating a transform, so the same actions can be stored, reordered, repeated, and reversed; keep the executor ignorant of how actions work. (PatternsUnity6)
- Use Command to defer or queue a request whose timing/handler you don't control — store requests as objects and process them at one safe, fixed point in the cycle via a CommandProcessor/queue. (SWEngGames; AdvancedCSharp)
- Make a unit's "brain" a queue of task/command structs (each carrying its own data) processed front-first — a uniform task list whether filled by player, AI, or network; a cyclic flag turns Move into Patrol. (GPGems2)
- Back undo/redo with two LIFO stacks, clearing the redo stack on any brand-new action — push executed commands to the undo stack, move undone ones to the redo stack; a new action branches history and invalidates the redo chain. (PatternsUnity6)
- Recognize "half-hearted" Command implementations — a message/`switch`-on-ID or string-switch is a non-fully-OO Command variant; a fully-OO version gives each command its own `execute`. (SWEngGames)
- Keep new command/handler classes structurally consistent with existing ones (ScaleCommand mirrors MoveCommand) — consistency keeps the design predictable and easy to extend. (PatternsUnity6)

### Factory / Prototype / Creation
- Use a Factory/Factory Method to centralize creation, so callers request an abstraction without hardcoding which concrete class to instantiate — encapsulate `new` so adding a type doesn't force edits scattered across spawners and consumers. (IntroGameDesign; HeadFirstPatterns)
- Use an Abstract Factory to provide families of related objects and hide which concrete implementation is instantiated — callers include only the interface + factory header, can't cast to the real type, and keep a product family consistent (region/platform-specific). (HeadFirstPatterns; GPGems2)
- Combine Factory + interface so spawning code stays open to new types — add a type to the factory, not edits across spawners. (IntroGameDesign)
- Make factories ignorant of subclass internals — let each constructor read its own params from the level stream so the factory needs zero knowledge of what it builds; use a class token (`CRuntimeClass`/`CreateObject`) plus a two-stage `initialize` to inject context. (GPGems2; SWEngGames)
- Use the Prototype pattern (clone an already-loaded instance) for repeat creations so siblings share flyweights — avoids reloading heavy assets. (GPGems2)

### Object Pooling
- Use Object Pooling for objects created/destroyed in large numbers (bullets, enemies, particles) — pre-create reusable instances and toggle `SetActive(false/true)` instead of constant Instantiate/Destroy, which registers/unregisters physics/rendering/tracking and causes GC frame spikes (worst on mobile). (PatternsUnity6; GPGems2)
- Reposition and re-initialize a pooled object after retrieval, and have it deactivate itself at end-of-life — pooled objects retain their last transform, and pooling only works if objects return to the pool. (PatternsUnity6)
- Make pools generic over plain prefab references, let them start at a minimum and grow on demand, and pre-spawn the minimum batch at load time — one pool serves bullets/enemies/effects, self-tunes to demand, and shifts allocation cost out of gameplay. (PatternsUnity6)
- Keep a pool's responsibility to managing reusable instances only — let the requesting script decide position/initialization (separation of concerns even inside a utility). (PatternsUnity6)
- Recognize Object Pooling and Factory as related creational ideas — pooling specifically reuses existing instances rather than always creating new ones. (PatternsUnity6)
- Preallocate and recycle frequently created/destroyed objects through a cache/pool instead of constant new/delete — mirrors the C "big array up front" approach and fights heap fragmentation. (GPGems2)

### Singleton (Sparingly)
- Use Singleton only for systems that are genuinely unique AND globally needed (GameManager, AudioManager, SaveSystem) — it's the wrong tool for anything that isn't both, and many Singletons mean you should take a hard look at your design. (PatternsUnity6; HeadFirstPatterns; IntroGameDesign)
- Treat Singleton as a cost, not a free win — its global access point creates hidden coupling and order-dependence, and violates One Class/One Responsibility (it manages its own instance AND its real job); an API change ripples to every `X.Instance` caller. (IntroGameDesign; HeadFirstPatterns; PatternsUnity6)
- Prefer a Singleton to a raw global when you do need one — a global provides global access but not the single-instance guarantee and encourages namespace pollution; the OO-correct Singleton replaces it. (HeadFirstPatterns; SWEngGames)
- Centralize singleton logic in a generic `Singleton<T> : MonoBehaviour where T : Component` base rather than copy-pasting Instance+Awake boilerplate — define behavior once so a single base change (e.g. adding DontDestroyOnLoad) updates every singleton; keep `Instance` static and cast `this as T`. (PatternsUnity6)
- Always include the duplicate-destroy check in singleton Awake — without it a second instance silently overwrites the first based on arbitrary execution order and survives scene reloads under DontDestroyOnLoad. (PatternsUnity6)
- Use a singleton component only for genuinely one-of-a-kind resources (game state, settings, input, level config), never for collections — `GetSingleton<T>`/`GetSingleton` throws on zero-or-many, making it self-documenting; singleton access for plural data is a code smell. (ECSFundamentals)
- Prefer a lazy pointer-Singleton over a static-instance Singleton in C++, and delete it at exit — multi-file static init order is uncontrollable, and there's no GC. (SWEngGames)
- Beware subclassing a Singleton — a private constructor blocks extension, a public/protected one breaks singularity, and a static instance is shared by all derived classes unless you build a registry. (HeadFirstPatterns)

### Decorator
- Use Decorator to wrap an object and attach responsibilities dynamically — a flexible alternative to subclassing for stacking buffs/modifiers/effects at runtime; each decorator HAS-A and is the same type as what it wraps, adding behavior before/after delegating. (HeadFirstPatterns)
- Beware decorator downsides — overuse spawns many tiny classes, code that depends on a specific concrete type breaks when you insert decorators, and instantiation gets complex (pair with a Factory or Builder). (HeadFirstPatterns)

### Composite
- Use Composite to compose objects into part-whole trees and let clients treat individual objects and compositions uniformly — a base Component, leaf, and container with one cascading operation; ideal for nested menus, scene graphs, and UI hierarchies. (HeadFirstPatterns; SWEngGames; GPGems2)

### Template Method
- Use Template Method to define an algorithm skeleton in a non-virtual base method that calls subclass-overridden hook steps — eliminates cut-and-paste across related classes while fixing the call order. (HeadFirstPatterns; GPGems2; SWEngGames)
- Don't override the Template Method itself — the orchestrating method (e.g. `cGame::step`, `cCritter::move`) is non-virtual on purpose; overriding the fixed sequence breaks the carefully-tuned ordering/physics. (SWEngGames)

### Other Structural Patterns (Facade / Adapter / Proxy / Bridge / Flyweight)
- Use Facade to provide a simplified interface that hides a subsystem's complexity — one clean entry point over many classes (audio, rendering, physics). (HeadFirstPatterns; GPGems2)
- Use Adapter to convert one interface into another a client expects — wrap an incompatible/legacy/third-party object so it plugs in without changes; distinguish it from Decorator (adds responsibility) and Facade (simplifies) by intent, not mechanics. (HeadFirstPatterns)
- Use Proxy to provide a surrogate controlling access to another object — virtual proxy (lazy/expensive loading), protection proxy (access control), remote proxy (network stand-in). (HeadFirstPatterns)
- Use Bridge to swap a whole family of method implementations behind one interface (`cGraphics` → `cGraphicsMFC`/`cGraphicsOpenGL`/DirectX) — treat it as "super-Strategy" (Strategy swaps one method, Bridge an entire set); pass identifiers/handles across the boundary instead of class pointers to fully decouple abstraction from implementation. (SWEngGames; GPGems2)
- Use flyweights to share heavy, context-free data (models, textures, FSM definitions, scripts) across instances, keeping only per-instance status local — implement "look and feel" via composition and "how it interacts" via an inheritance hierarchy so one class spans many visual variants. (GPGems2)
- Model an audio subsystem with deliberate patterns layered together — Facade (one API over many subsystems), Composite (treat a managed group like one sound), Proxy/Handle (control a live instance via a returned handle), Decorator (per-instance data/callbacks), Memento (`PauseAllSounds` returns a restore handle), Observer (type-tagged sounds notified as a group). (GPGems2)
- Iterator: provide sequential access without exposing the collection's representation — and don't give the aggregate both collection-management AND iteration duties (that's two reasons to change). (HeadFirstPatterns)

### State & State Machines
- Use the State pattern to replace large monolithic conditionals — encapsulate each state's behavior in its own class and delegate to the current state so the object appears to change class; sprawling if/switch on a mode field is the smell that signals it. (HeadFirstPatterns)
- Model discrete modes with explicit state (enums + switch / a named state machine) rather than tangled boolean flags — a named, exhaustively-checkable machine is readable and makes illegal states unrepresentable; track simple binary state with a single bool flipped after acting. (IntroGameDesign; AdvancedCSharp)
- Decide deliberately where state transitions live — fixed transitions belong in the Context; dynamic/runtime-dependent transitions belong in the state classes, but minimize inter-state dependencies via getters on the Context rather than hardcoding concrete next-state classes. (HeadFirstPatterns)
- Don't let clients change a Context's state directly — the Context owns its state; external mutation without its knowledge breaks invariants. (HeadFirstPatterns)
- Share stateless state objects across many Context instances via static fields — only works if the state objects keep no internal state; pass the Context into each handler if needed. (HeadFirstPatterns)
- Accept that State adds classes — that's the price of flexibility; hide the extra classes from clients rather than collapsing back into giant conditionals. (HeadFirstPatterns)
- Distinguish State from Strategy despite identical class diagrams — State changes the Context's behavior over time as internal state transitions; Strategy is a client-chosen, usually-fixed algorithm alternative to subclassing. (HeadFirstPatterns)
- Use an FSM (or fuzzy variant) for control where states are clear (RTS subroutines, third-person animation) — FSMs let you suspend/resume, essential when many entities share the CPU; generalize to a Fuzzy State Machine (simultaneous states + degree of membership) when a decision has more than two discrete outcomes. (GPGems2)
- Adapt rather than rewrite when extending a generic FSM — morphing an FSM into a FuSM needed only multi-state support, membership ranges, and a new transition function; extend the abstraction in place. (GPGems2)
- Recognize that an explicit state-machine `switch` is often the program counter and stack simulated by hand — hand-rolled FSMs that hoist locals into `m_state`/`m_target` members add accidental, removable complexity (essential vs accidental complexity). **When it flips:** for clear, suspendable per-entity control (RTS subroutines, animation) → an explicit FSM/FuSM is the right tool. (GPGems2)
- Prefer micro-threads (cooperative fibers with tiny stacks) over manual callback state machines for per-entity AI — lets you write linear code with `WaitOneFrame()`/`Sleep()`, no spaghetti state jumps, and the whole conditional path is visible when debugging. (GPGems2)
- Choose AI module granularity at the conceptual "behavior" level (hunger, fear, combat), not per-FSM-state — low-level per-state granularity is what makes classic state machines awkward. (GPGems2)
- Give each behavior a uniform interface (`IsRunnable`, `OnActivate`, `Update`, `Cleanup`) and a priority, with a "brain" picking the highest-priority runnable behavior each tick so a higher-priority one can preempt — and always provide a default/idle fallback that always passes `IsRunnable` so the entity is never stuck. (GPGems2)
- Drive state transitions off data + time rather than external triggers where possible, storing an absolute "next event time" instead of counting down — the entity owns its `ChangeDirectionTime`, making transitions deterministic, self-contained, and drift-free over long sessions (match the time field to a `double` source). (ECSFundamentals)
- Refresh shared/singleton data each frame in `OnUpdate`, not once in setup/`OnCreate` — so re-baking or runtime changes are picked up; caching stale references is a bug source. (ECSFundamentals)
- Model a rendering backend as a state machine you load then trigger — set coordinates/colors/primitive-mode, then push "draw"; encapsulate context activation in one `activate()` method. (SWEngGames)
- Use a self-disabling system / `RequireForUpdate<T>()` for run-once or data-gated work — set `state.Enabled = false` (at the TOP of `OnUpdate`, before the work, or the system runs one extra frame) instead of a manual `hasRun` flag, and let the system simply not run until its data exists instead of null-checking inside the loop. (ECSFundamentals)

### Refactoring Toward (and Away From) Patterns
- Treat refactoring time as patterns time — refactoring improves structure without changing behavior, so it's the moment to re-examine whether patterns fit better (conditionals → State, concrete deps → Factory) or whether a planned-for pattern should be removed. (HeadFirstPatterns)
- Refactor toward modularity proactively as a project grows — patterns are useful at any scale and reduce friction before it compounds; treat "even small changes feel bigger than they should" or a script accumulating unrelated responsibilities as the trigger. (PatternsUnity6)
- Plan for change — no matter how well designed, an application must grow and change or it dies; the one constant in software is change. (HeadFirstPatterns)
