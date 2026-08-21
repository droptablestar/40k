// Structured unit datasheet entries, rendered by the macros in
// _includes/datasheet-parts.njk. Facts (stats, keywords, weapons, traits)
// live here; narrative asides (like the Tyrant Guard loadout note) are
// written directly in the page template instead, since they don't reduce
// to a data field cleanly.
//
// keywords: { type: "plain", text } for a bare keyword, or
//           { type: "ref", ref } to look up _data/abilityTips.js.
// weapons[].tags: an array of ability-tip ids (may be empty).
module.exports = [
  {
    id: "tyranids-parasite-of-mortrex",
    factionSlug: "tyranids",
    group: "assault-brood",
    name: "Parasite of Mortrex",
    modelCount: null,
    stats: { m: "12″", t: "5", sv: "4+", w: "5", ld: "6+", oc: "1" },
    keywords: [
      { type: "plain", text: "Infantry" },
      { type: "plain", text: "Character" },
      { type: "ref", ref: "fly" },
      { type: "ref", ref: "synapse-parasite" },
      { type: "ref", ref: "shadow-in-the-warp" },
      { type: "ref", ref: "deep-strike" },
      { type: "ref", ref: "lone-operative" },
      { type: "ref", ref: "stealth" },
    ],
    weapons: [
      {
        id: "barbed-ovipositor",
        name: "Barbed ovipositor",
        tags: ["anti-infantry-3", "extra-attacks"],
        range: "Melee",
        attacks: "2",
        skill: "2+",
        strength: "3",
        ap: "-2",
        damage: "3",
      },
      {
        id: "clawed-limbs",
        name: "Clawed limbs",
        tags: [],
        range: "Melee",
        attacks: "6",
        skill: "2+",
        strength: "5",
        ap: "-1",
        damage: "1",
      },
    ],
    traits: [
      {
        name: "It Itches!",
        body: "At the start of the Fight phase, force one enemy unit within range to take a battle-shock test.",
      },
    ],
    order: 1,
  },
  {
    id: "tyranids-genestealers",
    factionSlug: "tyranids",
    group: "assault-brood",
    name: "Genestealers",
    modelCount: 10,
    stats: { m: "8″", t: "4", sv: "5+", w: "2", ld: "7+", oc: "1" },
    keywords: [
      { type: "plain", text: "Infantry" },
      { type: "ref", ref: "synapse" },
      { type: "plain", text: "5+ Invulnerable save" },
    ],
    weapons: [
      {
        id: "genestealer-claws-and-talons",
        name: "Genestealer claws and talons",
        tags: [],
        range: "Melee",
        attacks: "4",
        skill: "2+",
        strength: "4",
        ap: "-2",
        damage: "1",
      },
    ],
    traits: [
      {
        name: "Patrol Squads",
        body: "Can split into two 5-model units before the battle, and Scouts 8″ ahead at deployment.",
      },
      {
        name: "Vanguard Predator",
        body: "Re-roll a Hit roll of 1; also re-roll a Wound roll of 1 when attacking near an objective marker.",
      },
    ],
    order: 2,
  },
  {
    id: "tyranids-biovore",
    factionSlug: "tyranids",
    group: "assault-brood",
    name: "Biovore",
    modelCount: null,
    stats: { m: "5″", t: "6", sv: "3+", w: "5", ld: "8+", oc: "1" },
    keywords: [
      { type: "plain", text: "Infantry" },
      { type: "ref", ref: "synapse" },
    ],
    weapons: [
      {
        id: "spore-mine-launcher",
        name: "Spore Mine launcher",
        tags: ["blast", "devastating-wounds", "heavy"],
        range: "48″",
        attacks: "D3",
        skill: "4+",
        strength: "6",
        ap: "-1",
        damage: "2",
      },
      {
        id: "chitin-barbed-limbs",
        name: "Chitin-barbed limbs",
        tags: [],
        range: "Melee",
        attacks: "2",
        skill: "4+",
        strength: "5",
        ap: "0",
        damage: "1",
      },
    ],
    traits: [
      {
        name: "Deadly Demise 1",
        body: "Explodes when destroyed and can damage nearby units — don't cluster your own models around it.",
      },
    ],
    order: 3,
  },
  {
    id: "tyranids-tyrant-guard",
    factionSlug: "tyranids",
    group: "assault-brood",
    name: "Tyrant Guard",
    modelCount: 3,
    stats: { m: "6″", t: "8", sv: "3+", w: "4", ld: "8+", oc: "1" },
    keywords: [
      { type: "plain", text: "Infantry" },
      { type: "ref", ref: "synapse" },
    ],
    weapons: [
      {
        id: "bone-cleaver-lash-whip-and-rending-claws",
        name: "Bone cleaver, lash whip and rending claws",
        tags: [],
        range: "Melee",
        attacks: "3",
        skill: "3+",
        strength: "5",
        ap: "-1",
        damage: "2",
      },
      {
        id: "crushing-claws-and-rending-claws",
        name: "Crushing claws and rending claws",
        tags: ["twin-linked"],
        range: "Melee",
        attacks: "2",
        skill: "4+",
        strength: "8",
        ap: "-2",
        damage: "2",
      },
      {
        id: "scything-talons-and-rending-claws",
        name: "Scything talons and rending claws",
        tags: [],
        range: "Melee",
        attacks: "5",
        skill: "3+",
        strength: "5",
        ap: "-1",
        damage: "1",
      },
    ],
    traits: [],
    order: 4,
  },
];
