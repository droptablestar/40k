// Shared registry of ability/weapon-tag tip content, referenced by id from
// _data/datasheets.js (a unit's keywords[].ref and weapons[].tags[]).
// Definitions with genuinely identical wording across units are shared
// (e.g. "synapse"); wording that differs by context stays as its own entry
// (e.g. "synapse-parasite") rather than being forced to match.
module.exports = [
  {
    id: "fly",
    label: "Fly",
    body: "Before it moves, you can declare it takes to the skies: it moves through models and terrain and ignores vertical distance, but loses 2″ off that move.",
  },
  {
    id: "synapse-parasite",
    label: "Synapse",
    body: "Within 6″ of this model, other Tyranids test battle-shock on 3D6 instead of 2D6.",
  },
  {
    id: "shadow-in-the-warp",
    label: "Shadow in the Warp",
    body: "Once per battle, force every enemy unit on the battlefield to take a battle-shock test.",
  },
  {
    id: "deep-strike",
    label: "Deep Strike",
    body: "When it arrives from reserves, it can be set up anywhere on the battlefield more than 8″ horizontally from every enemy unit — including in your opponent's deployment zone.",
  },
  {
    id: "lone-operative",
    label: "Lone Operative",
    body: "Enemies can't see it at all unless they're within 12″, so it can't be shot from further away. Stops working while it's leading another unit.",
  },
  {
    id: "stealth",
    label: "Stealth",
    body: "Counts as having the benefit of cover against every ranged attack, even in the open. It doesn't stack with real cover — both give the same −1.",
  },
  {
    id: "anti-infantry-3",
    label: "Anti-Infantry 3+",
    body: "Against Infantry, an unmodified Wound roll of 3+ counts as a critical wound instead of needing a 6.",
  },
  {
    id: "extra-attacks",
    label: "Extra Attacks",
    body: "Fought in addition to the model's other weapons, not instead of them.",
  },
  {
    id: "synapse",
    label: "Synapse",
    body: "Within 6″ of a synapse model, this unit tests battle-shock on 3D6 instead of 2D6.",
  },
  {
    id: "blast",
    label: "Blast",
    body: "Gets +1 attack for every 5 models (rounding down) in the target unit.",
  },
  {
    id: "devastating-wounds",
    label: "Devastating Wounds",
    body: "A critical wound skips saves entirely and deals mortal wounds equal to this weapon's Damage.",
  },
  {
    id: "heavy",
    label: "Heavy",
    body: "+1 to Hit in your Shooting phase, if the unit is unengaged, didn't arrive this turn, and no model in it moved more than 3″.",
  },
  {
    id: "twin-linked",
    label: "Twin-linked",
    body: "You may re-roll the Wound roll for this weapon's attacks.",
  },
];
