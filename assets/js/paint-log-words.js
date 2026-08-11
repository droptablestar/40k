/* The word list a paint log's code is drawn from.
 *
 * A code is four of these joined by dashes — "rust-hive-brass-nine" — and it
 * is the only thing that identifies a log. Four words from 128 is about 268
 * million codes, which is far past anyone stumbling onto someone else's log,
 * while still being short enough to write on the back of an army list or read
 * down the phone to a friend.
 *
 * Every word is lowercase, one syllable or two, and unambiguous when spoken:
 * no plurals of other entries, no words that sound alike, nothing that could
 * be spelled two ways. If you extend this list, keep to that and never remove
 * a word — a code already written down has to keep resolving.
 */
window.PaintLogWords = [
  "amber", "anvil", "arc", "ash", "banner", "basilisk", "beacon", "bell",
  "blade", "bolt", "bone", "brass", "bridge", "bunker", "cable", "canyon",
  "chapel", "chapter", "cinder", "cobalt", "comet", "copper", "crater",
  "crest", "crimson", "crypt", "dagger", "delta", "drift", "dune", "dust",
  "ember", "engine", "falcon", "fang", "flare", "flint", "forge", "fossil",
  "frost", "furnace", "gale", "gantry", "gate", "glacier", "granite", "grave",
  "grid", "harbour", "hatch", "hazard", "helm", "hive", "hollow", "hull",
  "ingot", "iron", "ivory", "jade", "kiln", "lantern", "lattice", "lichen",
  "lumen", "marble", "marsh", "mesa", "monolith", "moss", "nebula", "nine",
  "obsidian", "ochre", "onyx", "orbit", "pillar", "piston", "plating",
  "prism", "pylon", "quarry", "quartz", "rampart", "ravine", "relic",
  "resin", "ridge", "rivet", "rubble", "rust", "sable", "salvage", "sentry",
  "shale", "shield", "shrine", "signal", "slate", "smelter", "solder",
  "spire", "sprue", "steel", "storm", "stratum", "talon", "tarmac", "tempest",
  "thicket", "thorn", "tide", "tinder", "titan", "torch", "tower", "trench",
  "tundra", "turbine", "valley", "vane", "vault", "vellum", "verdant",
  "vessel", "vigil", "warden", "watch", "wedge", "wire"
];
