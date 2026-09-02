## Code Architecture, Patterns & Quality


### SOLID — Single Responsibility

- Give each class/module exactly one reason to change — every responsibility is an axis of change; mixing iteration, persistence, rendering, and logic in one class multiplies fragility (widely corroborated).
- Build small classes with single, well-defined purposes (concentric-ring design) — far more reusable, including in tools, than large classes that try to do everything.
- Split a bloated player/manager script into focused scripts (PlayerController, PlayerScoring, PlayerAnimation; LevelLoader, ScoreManager, EnemySpawn) — lets you change one system without disturbing others.
- Model your own components after the engine's built-ins — Rigidbody/MeshRenderer/Collider each do one thing and don't know about each other, which is why they compose cleanly.
- Let an object own its own behavior — the balloon knows how to grow and pop itself; a separate manager only detects input and dispatches, so logic lives where the data lives.
- Separate "set the data" from "decide on the data" — gameplay scripts feed parameters; the FSM/BT/fuzzy/decision system owns the choice, keeping each side simple and reusable.
- Apply Separation of Concerns: each system has one purpose and no overlapping responsibilities — beware hidden state machines spawned by intertwining gameplay and animation (widely corroborated).
- Make the 3D/render engine responsible for rendering only — no physics, AI, or networking hooks inside it, or subsystems become un-untanglable; one top-level container owns and commands all subsystems.
- Keep animation, physics, AI, and collision as separate systems that feed each other via data, not merged code — but expect tight feedback loops between them.
- Keep distinct behaviors in distinct scripts (CameraFollow separate from PlayerController) — narrower responsibilities are easier to maintain and adjust.
- Give every game component a single, clearly defined function — nothing fuzzy, purposeless, or with more than one job; this makes balancing methodical instead of a guessing game.
- Give iteration its own class/responsibility, separate from the collection — a collection that also manages iteration has two reasons to change.
- Separate input handling from the logic that performs the action — input creates a command; a separate executor runs it; a third script does the actual work, keeping responsibilities clean.
- Keep functions single-purpose and small (Bowl, MoveLeft, MoveRight each do one thing) — easier to wire to UI, test, and reason about.
- Separate every object into a draw method (const, no state change) and an update method (with time-elapsed) — enables smooth, frame-rate-independent gradual change and clean separation of rendering from simulation.

### SOLID — Open/Closed

- Keep classes open for extension but closed for modification — add new content (enemies, items, abilities) by writing new code, not editing tested code, reducing regression risk (widely corroborated).
- Apply Open/Closed / abstraction only where change is likely, not everywhere — over-abstracting wastes effort and breeds complex, hard-to-read code that can also cost runtime. **When it flips:** stable, never-varying types (a String, Vector3, fixed 256-item array) → instantiate/handle directly; reserve the discipline for things that actually change.
- Prefer a base class with an abstract method (Enemy.Attack()) overridden per subtype over adding methods to one class — new behavior plugs in via a derived class, leaving the stable base untouched.
- Make systems open for extension, closed for modification at cross-cutting points — adding a lever or pickup should mean implementing an interface on it, never editing the controller; if you must edit the dispatcher to add a feature, the abstraction is wrong.
- Adding a new action/product type should be one new class implementing the same interface — Execute/Undo/Redo machinery, the dispatcher, and callers work unchanged, so the system scales without rewrites.
- Use an "exported class" enum so an entity advertises a stable external identity while its internal FSM grows freely — decouples interaction code from animation states.

### SOLID — Liskov, Interface Segregation, Dependency Inversion

- Ensure any subclass works wherever its base type is expected (Liskov) — if a subclass can't behave like the base, the inheritance is a bad fit; remove it.
- Put shared behavior in a common base type (Character damage logic) so systems (spikes, hazards) target the base, not specific types — keeps systems general and future subtypes drop in for free.
- Keep interfaces small and capability-focused (Interface Segregation) — fat interfaces force classes to implement empty/placeholder methods they don't use.
- Split a do-everything interface (IVehicle: Drive+Fly) into focused ones (IGroundVehicle, IAirVehicle) — each class implements only what it actually does.
- Depend on abstractions, not concrete implementations (Dependency Inversion) — high-level systems and low-level components should both depend on interfaces, so either side can change independently (widely corroborated).
- Guideline: no variable should hold a reference to a concrete class where it varies — route creation through a factory instead of `new ConcreteThing()`.
- Guideline: derive from abstractions (interface/abstract class), not concrete classes — and don't override an already-implemented base method (it wasn't meant to be shared).
- Hollywood Principle ("Don't call us, we'll call you") — let high-level components call into low-level ones via hooks/callbacks, preventing low-level modules from depending on high-level ones and avoiding dependency rot.
- Have a damage system interact with any object implementing a damage interface rather than checking for a specific enemy class — decouples the system from concrete types.

### Composition vs Inheritance

- Favor composition over inheritance — entities should HAVE-A behavior object, not BE-A subclass; composition lets you swap behavior at runtime and avoids brittle deep hierarchies (widely corroborated). **When it flips:** for permanent, intrinsic, genuinely "is-a" traits with shared general→specific behavior (a MovingObject base for Player/Enemy, an abstract Node base, RPG race/profession) → inheritance is the right tool; reserve it for stable shared behavior, not feature combinations.
- Prefer composition/delegation for black-box reuse, runtime-swappable behavior, and to avoid the combinatorial explosion of one subclass per feature combination — the core reason composition scales where inheritance does not.
- Build behavior by composing components, not deep class hierarchies — a GameObject is an empty container; features come from attached modules, so swap/add/remove components to change behavior (widely corroborated, component frameworks).
- Compose behavior from components attached to entities rather than monolithic classes — composition is more flexible than rigid hierarchies for game worlds.
- Use multiple inheritance only for permanent intrinsic traits (IRenderable, ICollidable), never dynamic characteristics — and avoid diamond hierarchies.
- Use "is-a" relationships for inheritance and "has-a" relationships for attributes — the parent must be the more general/abstract type; never make the specific class the parent.
- Inherit shared behavior from an abstract base; override per-subtype specifics — write blocking/movement once, specialize OnCantMove per class.
- Inherit shared behavior; override or extend with `super()` when a child needs different/extra logic — avoids copy-paste classes that drift out of sync.
- Reuse behavior objects across unrelated entity types — a "Quack"/"Shoot"/"Patrol" behavior pulled out of its host class can be shared by anything that needs it (a turret and an enemy sharing fire logic).
- Plug runtime-selectable strategies into a class via function pointers/delegates — clean, fast strategy switching and fewer behavioral subclasses (but don't obfuscate).
- Drive entity behavior and creation from data, not code — a flyweight (shared media/FSM) + behavioral class hierarchy + factory lets designers build entities in minutes without code bloat; share heavy context-free data and keep only per-instance state per object.
- Move shared helper code up into the base class so deriving children is trivial — making "define a new class" cheap encourages clean small classes.
- Use pointer members, not instance members, for polymorphic objects — only pointers (and casts) preserve child-class behavior in C++; instance members silently upcast.

### Interfaces & Decoupling

- Program to an interface (supertype), not an implementation — declare variables/fields as abstract types so concrete runtime objects aren't hard-wired into callers (widely corroborated).
- Program to abstract interfaces (pure-virtual base classes) for swappable subsystems — renderers, audio, spatial DBs, AI behaviors can switch at runtime and recompile faster; but don't put interface calls in inner loops (see the inner-loop caveat).
- Program/think against capabilities, not concrete types — ask "does this object support interaction?" via an interface, not "is this a Ball/Door?" via type checks, so the system unifies the call site without homogenizing behavior and the caller never needs to know exact classes.
- Define a shared interface (IInteractable with Interact()) for any behavior multiple unrelated classes must answer to — new objects join by implementing one method, with zero changes to existing callers.
- Use interfaces instead of forcing unrelated classes into an inheritance hierarchy — expresses a shared capability (interactable, damageable, saveable) without a fake "is-a" relationship.
- Reach for interfaces on cross-cutting systems: interaction, damage, save/load, AI commands — exactly the cases where many distinct object types must respond to one event.
- Let each implementer keep its own unique behavior behind a common method name — Cube randomizes color, Ball jumps, Door rotates, all through Interact(); the contract unifies callers/the call site without homogenizing behaviors.
- Program to interfaces/abstract base classes for behavior families — a Sense interface or Node base lets you add new senses/nodes without touching existing code.
- Use interfaces as a middle layer so callers depend on a capability, not a class — the implementation can change/swap/test without touching calling code.
- Strive for loosely coupled designs between interacting objects — minimize interdependency so a change in one system doesn't cascade through the codebase.
- Treat coupling as the thing to minimize — high coupling means a rename/change in one class silently breaks others, and breakage spreads across a large project.
- Watch the two main coupling sources: direct method calls on concrete classes, and reading/writing another script's variables — both create fragile dependencies; use them deliberately.
- Avoid long chains of type checks and special cases — they don't scale, are harder to maintain, easier to break, and signal a missing abstraction.
- Don't switch on an object's class type — replace the switch with a polymorphic call; reach for runtime-type checks only when truly necessary.
- Hide concrete implementations behind a factory — callers include only the interface header, can't downcast to "special features," and stay decoupled.
- Reserve abstract interfaces for replaceable/pluggable modules, not everything — overuse adds indirection, debugging pain, and design complexity for no gain.
- Keep controllers/dispatchers short and focused by delegating behavior to the objects themselves — each object owns its logic behind a uniform contract, so the controller never grows special cases.
- Declare only signatures (no bodies) in interfaces — a contract defines what implementers must provide, not how, keeping the abstraction free of behavior.
- Let the compiler enforce contracts — listing an interface but omitting a required member is a compile error, turning "did I implement everything?" into a guaranteed check rather than a runtime surprise.
- Name interfaces with a leading capital I (IInteractable) — a widely-followed convention that makes contracts recognizable at a glance.
- Wrap every engine subsystem in a thin class (cGraphics, cTexture, cMesh, cInput, cSound) that returns simple success/fail — callers never touch the low-level API and swapping the backend touches one file; use a Bridge to abstract an entire subsystem (graphics → MFC/OpenGL/DirectX).
- Use the Bridge pattern to abstract an entire subsystem behind an interface (graphics → MFC/OpenGL/DirectX) — port to a new backend without rewriting calling code or maintaining two program versions.
- Keep audio/subsystem APIs as a Facade that hides internal complexity behind one interface — SetMasterVolume can update several subsystems invisibly.
- Push the code/data dependency between gameplay and the animgraph as far from gameplay code as possible, and move control-parameter translation logic (degrees→blend weight, clamping, damping) into the animgraph/controller layer — then gameplay sends human units (degrees, speed) and animators iterate freely, swapping graphs without breaking gameplay.
- Make animation orders fire-and-forget with a returned handle — gameplay stops micromanaging transitions; the controller/behavior layer handles them.
- Don't put interface/virtual calls in inner loops — every interface call costs a virtual indirection; keep DrawPolygon/SetPixel-grade calls concrete.
- Keep skills/behaviors well-encapsulated and decoupled so failed experiments rip out cleanly — enables prototyping major AI/mechanic changes right up to ship (Stalkers added months before launch).
- Build non-destructive, additive, revertible runtime A/B switches for behaviors — swap a new action implementation beside the old one and compare side-by-side without touching shipping/gameplay code.

### Principle of Least Knowledge / Law of Demeter

- Principle of Least Knowledge (talk only to your immediate friends) — a method should call only methods on itself, its parameters, objects it creates, and its own components; deep `a.getB().getC().doX()` chains build fragile, tightly-coupled systems.
- Accept the Least-Knowledge tradeoff consciously — it adds wrapper/delegating methods that raise complexity and can cost runtime performance; apply where coupling actually hurts.
- Use a Facade to honor Least Knowledge — give gameplay code one `startMatch()`/`watchMovie()` call instead of orchestrating a dozen subsystems, reducing coupling.

### Events, Observer & Messaging

- Observer: define a one-to-many dependency so when one object's state changes, all dependents are notified automatically — decouple data (model, score, health) from the many displays/systems that react to it (widely corroborated).
- Use events to decouple a broadcaster from its listeners — the sender announces "something happened" without knowing or referencing who cares.
- Replace direct references-to-many (a manager holding light1/light2/light3) with an event the manager raises — new listeners join without editing the broadcaster, so the system scales as observers are added/removed.
- The subject should know observers only as "things implementing the Observer interface" — add, remove, or replace observers at runtime without modifying the subject.
- Make the data's owner the single source of truth and let observers depend on it for updates — cleaner than many objects fighting to control the same data.
- Prefer pull over push for observer updates — let observers request the specific data they need from the subject rather than the subject broadcasting everything (more flexible).
- Never depend on a specific notification order among observers — order is not guaranteed; design observers to be independent.
- Use function delegates/callbacks to decouple "what triggers" from "what happens" (firing logic in a shoot-em-up) — events keep modules independent.
- Use a C# event (OnDeath) for the fact, not the consequence — Health reports death; the player triggers UI/animation, enemies self-destruct, future objects react differently.
- Mark delegates with the `event` keyword — it lets outside code only subscribe (+=) or unsubscribe (-=), not invoke or overwrite the listener list — exactly the observer contract.
- Invoke events with the null-conditional `OnEvent?.Invoke()` — thread-safely skips invocation when no one is subscribed, avoiding a NullReferenceException.
- Subscribe in OnEnable/Awake and unsubscribe in OnDisable/OnDestroy — ties the subscription lifecycle to the component's active state and prevents events firing on disabled/destroyed targets (subscribe in Awake when a signal must never be missed before Start).
- Always unsubscribe — a still-subscribed dead object causes the event to call a method on an invalid target, producing runtime errors and memory leaks (orphaned delegate references prevent objects from being freed).
- Make methods that are only called via events non-public — they're no longer invoked from outside, so tighten access accordingly.
- Always null-check an event before invoking and subscribe/unsubscribe across recompiles — prevents null-ref crashes and dangling handlers.
- Use event-driven behavior, not polling — agents react to messages instead of re-checking conditions every frame.
- Prefer a decoupled global messaging system for broadcast comms — senders need not know listeners; keep message fields readonly so payloads can't be mutated in transit.
- Throttle a decoupled message-queue/messaging system with a per-frame time budget and use it sparingly — prevents a message flood from freezing the frame, and message objects are heap-allocated and accumulate toward GC; overflow processes next frame.
- Use messaging sparingly — message objects are heap-allocated and accumulate toward GC; don't spam them every update; cache GetType().Name once since each call allocates a string.
- Have the document mutate-then-publish to all views (Observer) — one view editing the document refreshes all views, keeping representations in sync.
- Use a blackboard for cross-behavior and cross-agent communication at global/group/local scope — manage shared scene state while keeping each behavior's logic independent.

### MVC & Compound Patterns

- MVC is a compound pattern, not magic — Model uses Observer (notify views of state changes), View+Controller use Strategy (controller is the view's swappable behavior), View uses Composite (nested UI); learn it as cooperating patterns.
- Keep the Model independent of views and controllers via Observer — lets you attach different views, or multiple views at once, to the same model (minimap + HUD + debug overlay on one game state).
- Use the Document-View pattern: data in the document, view-specific state (zoom, point-of-view, detail level, graphics mode) in the view — only savable world data belongs in the document.
- A compound pattern combines several patterns into a solution for a recurring general problem (like MVC) — the most powerful designs are patterns working together.

### Strategy / State / Template Method

- Use the Strategy pattern to define a family of interchangeable algorithms, encapsulate each, and swap them at runtime — ideal for weapon behaviors, movement styles, AI tactics, firing logic, and difficulty curves a character can change mid-game (widely corroborated).
- Set behavior via a setter/inject method, not only in the constructor — e.g. `setFlyBehavior(new RocketPowered())` lets an entity change ability at runtime (power-ups, status effects) instead of being locked at spawn.
- Use the Strategy pattern to plug in behavior (forces, listeners) instead of subclassing per combination — pass `this` into the strategy so it can read and mutate the owner.
- State and Strategy share the same diagram but differ in intent — State encapsulates state-dependent behavior and transitions internally; Strategy lets the client choose a behavior; pick by purpose, not structure.
- Use the State pattern when code branches heavily on a mode/phase — that's the signal to refactor; each branch becomes a state class that knows its own transitions, cleaner than sprawling if/switch chains.
- Template Method: define the fixed skeleton of an algorithm in a base method and let subclasses fill in specific steps — standardize a pipeline (spawn, update, render, cleanup) while varying the details.
- Use Template Method for fixed sequences with overridable hooks (draw: push matrix, multiply attitude, call virtual imagedraw, pop matrix) — wrap "don't-touch" setup/teardown around the customizable middle.
- Keep the number of abstract steps small — fewer, less-granular steps ease the subclass burden; more granularity buys flexibility but costs implementation effort (a deliberate tradeoff).
- Use hooks (concrete methods with empty/default bodies) for optional steps — subclasses override only when they need to react, instead of being forced to implement everything.
- Implement serialization with a virtual Serialize that calls Super::Serialize first — child classes persist inherited data, then their own, in a fixed order both ways.
- Keep the core move()/physics method non-virtual so subclasses can't override the physics — homogeneous laws of motion across all objects keep the world consistent.

### Command Pattern

- Command: encapsulate a request as an object (receiver + action) so you can parameterize, queue, log, and undo it, decoupling the button/input layer from the receiver so rebinding is trivial — perfect for input remapping, action queues, replays, and ability systems (widely corroborated).
- Represent actions as objects implementing a shared interface (ICommand with Execute/Undo) — turning actions into data makes them easy to store, queue, reorder, repeat, and reverse.
- Decouple the invoker from the receiver — the button/input layer only calls `execute()`; it never knows which device/entity acts, so rebinding is trivial.
- Prefer "dumb" command objects that just invoke an action on a receiver — "smart" commands that bake in logic lose the decoupling and the ability to re-parameterize with different receivers.
- Give each command everything it needs to perform and reverse itself (target reference + parameters in the constructor) — Undo just applies the inverse (Move(-movement), Scale(-scaleAmount)).
- Implement undo by storing executed commands on a stack — pop and call `undo()` for multi-level undo/redo (level editors, turn-based moves); back undo/redo with two Stack<ICommand>.
- On a fresh action, push to the undo stack and clear the redo stack — a new action branches history, invalidating the previous redo chain; guard both stacks against being empty.
- Use a Macro Command (a command holding an array of commands) for composite actions — assemble combos dynamically at runtime rather than hardcoding a fixed sequence.
- Queue command objects for deferred/parallel execution — thread pools, schedulers, and job queues pull commands and run execute(), capping work to a fixed number of workers.
- Log commands (store/load) to support crash recovery and transactions — replay actions from the last checkpoint instead of saving full state every change.
- Use command queuing for units (e.g. RTS): treat every order as a task in a per-unit "brain queue," process the front, default-task at the tail — flexible and source-agnostic (player, AI, network); a "cyclic" flag turns Move into looping patrols.
- Make queued commands replaceable: a non-queued order clears the queue — single click overrides everything cleanly.
- Use the Command pattern for deferred/queued actions (message queue, service requests) — encapsulate "what to do" so you can run it at a safe, predictable point in the cycle.
- Reach for Command for turn-based queues, RTS unit-action ordering, multiplayer rewind/replay, and replay recording — anywhere order of operations matters.

### Factory & Object Creation

- Factory Method: let subclasses decide which concrete object to create — encapsulate `new` so adding a new product type (enemy variant, item, tile) doesn't edit the creator's logic.
- Abstract Factory: provide an interface for creating families of related objects without naming concretes — swap whole product sets (biome/regional ingredient sets, platform-specific asset families) by switching the factory.
- Pull object creation out of the consumer into a factory — when a class instantiates concretes, it depends on them; factories invert that dependency and keep consumers closed to change.
- Apply the Factory pattern to spawn families of objects (an EnemyFactory) — centralize creation so adding new types is one place to change.

### Singletons & Global State

- Singleton: ensure a class has exactly one instance with a global access point — for managers/registries (audio, input, settings, game/score) where multiple instances would break behavior (widely corroborated). **When it flips:** singletons are convenient but every `Manager.Instance` call is a direct dependency that ripples to every caller on an API change — use them sparingly; many singletons in an app is a design smell, and they can be abused like global variables.
- Reach for a singleton only when a system is both unique and widely needed (GameManager, AudioManager, save system) — the narrow case where one shared controller is justified.
- Store the one instance in a `public static Instance { get; private set; }` and assign it in Awake — Awake runs before Start and any frame, so the instance is ready when other scripts need it.
- Always include the duplicate check (`if (Instance != null && Instance != this) Destroy(gameObject); else Instance = this;`) — without it, a second instance overwrites the first and behavior becomes order-dependent.
- Centralize singleton boilerplate in a generic `Singleton<T> : MonoBehaviour where T : Component` base — avoids copy-pasted Instance/Awake logic that drifts out of sync; mark Instance static, make base Awake virtual, cast with `this as T`.
- Put cross-cutting concerns (DontDestroyOnLoad) in the singleton base, not each manager — one edit updates every singleton; add DontDestroyOnLoad only to systems that must survive scene loads (audio, save, networking).
- Use a persistent manager (singleton + DontDestroyOnLoad) to carry cross-scene data (score, lives, options) — state survives scene loads instead of being destroyed with the scene.
- Use a singleton manager as the single connection point between subsystems — one GameManager brokers data so Player/Board/Dungeon classes stay decoupled. **When it flips:** the book itself flags public-static shared state as a "known debt" that breaks down on multi-dev codebases → prefer private fields with getters; expose only what's needed.
- Prefer a static class over a hand-rolled singleton for global managers when you don't need MonoBehaviour features — same result with less boilerplate, no private ctor/Instance ceremony; use a singleton-as-component only when you need lifecycle callbacks.
- Use a SingletonAsComponent (with DontDestroyOnLoad) only when you need MonoBehaviour features (callbacks, Coroutines, Inspector) — pure static classes can't access them.
- Guard Singleton access during shutdown with an IsAlive flag — OnDestroy runs in random order; calling Instance there can resurrect a Singleton and corrupt the Scene.
- Use the Singleton pattern with lazy pointer initialization for global services (a randomizer) — a NULL-checked accessor avoids the unpredictable static-init order across translation units.
- Prefer lazy initialization for resource-heavy Singletons — create on first use; but watch thread-safety (synchronize or use eager/holder idioms) so concurrent access doesn't create two instances.
- A global variable gives global access but not single-instance guarantee — a Singleton enforces both; don't substitute globals for it.
- Examine performance before subclassing or synchronizing a Singleton — the lazy/double-checked-locking and registry tricks add cost; only pay it when justified.
- Centralize cross-cutting logic in a dedicated manager object (input dispatcher, ScoreManager) instead of scattering it across every entity — one place to find and change a concern. **When it flips:** avoid module-level globals entirely where you can — any line anywhere can mutate a global, so a bad value means searching the whole program instead of one function.
- Avoid singleton UI patterns when screens need transitions — exiting and entering UIs must coexist during a slide/fade, which a single-instance pattern forbids.

### Structural Patterns — Decorator, Adapter, Facade, Proxy, Composite, Iterator

- Decorator: attach responsibilities to an object dynamically by wrapping it — a flexible alternative to subclass explosion for stacking effects (buffs, modifiers, condiment/costume-style add-ons).
- Decorators must share the wrapped object's type and stay transparent to clients — clients keep treating the decorated thing as the base type. Beware decorator overuse — wrapping produces many small objects and can make a design hard to debug; use only when stacking is genuinely needed.
- Adapter: convert one class's interface into the interface clients expect — wrap legacy/third-party/middleware APIs so they plug into your code without rewriting either side.
- Facade: provide a simplified, unified interface over a complex subsystem — give gameplay code one call instead of orchestrating a dozen subsystems, reducing coupling.
- Proxy: provide a surrogate that controls access to another object — use Virtual Proxy for expensive/streamed resources (placeholder "loading..." then lazy-create), Caching Proxy to reuse prior results, Protection Proxy to gate by role.
- Distinguish intent: Adapter changes an interface, Decorator adds responsibility without changing the interface, Facade simplifies/unifies, Proxy controls access with the same interface — choose by what you need, not by structural resemblance (they share the same wrapping shape).
- Return handles from "start" operations and require them for update/stop — gives controlled, placeholder-based access to live instances (sounds, animations).
- Iterator: provide sequential access to an aggregate's elements without exposing its internal representation — traverse menus, inventories, entity lists uniformly regardless of array/list/map backing.
- Composite: compose objects into tree structures (part-whole) and let clients treat individual objects and groups uniformly — model nested UI, scene graphs, skill trees, menu/submenu hierarchies; a recursive operation on the root cascades to all children.
- Composite deliberately trades Single Responsibility for transparency — putting child-management and leaf operations in one Component interface lets clients treat leaves and composites the same; accept the slight loss of compile-time safety, or split interfaces if safety matters more.
- Use the Composite pattern for hierarchical objects (composite sprites, maze rooms) — treat primitives and groups uniformly so one call cascades to all leaves.
- Treat a game audio API through the lens of design patterns — Facade (hide subsystems), Composite (engine/ambience from many sounds), Proxy/handles, Command queue, Observer (type-grouped control), Memento (pause/restart state).
