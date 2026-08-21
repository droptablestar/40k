// Structured stratagem entries for pages that render them via the
// stratagem() macro. Scope is stratagems only (a CP cost + timing) --
// enhancements and secondary objectives stay as hardcoded markup on their
// pages since they carry no CP field.
//
// cp/cpStatus represent uncertainty structurally: a real CP cost is
// { cp: N, cpStatus: "confirmed" }; an unconfirmed one is
// { cp: null, cpStatus: "unverified" }. Never encode it as display text.
module.exports = [
  {
    id: "tyranids-sensory-amalgamation",
    factionSlug: "tyranids",
    group: "stratagems",
    name: "Sensory Amalgamation",
    cp: 1,
    cpStatus: "confirmed",
    timing: "Enemy shoot/fight",
    summary:
      "Right after an enemy declares targets against one of your Infantry units, make that unit harder to hit for the rest of the phase.",
    order: 1,
  },
  {
    id: "tyranids-scything-terror",
    factionSlug: "tyranids",
    group: "stratagems",
    name: "Scything Terror",
    cp: 1,
    cpStatus: "confirmed",
    timing: "Fight phase",
    summary:
      "Give one of your units that hasn't fought yet this phase better melee hit consistency for the rest of the phase.",
    order: 2,
  },
  {
    id: "tyranids-ravenous-rampage",
    factionSlug: "tyranids",
    group: "stratagems",
    name: "Ravenous Rampage",
    cp: 1,
    cpStatus: "confirmed",
    timing: "Your charge phase",
    summary:
      "Lets a unit that hasn't charged yet this phase declare a charge even though it Advanced this turn — normally those don't mix.",
    order: 3,
  },
  {
    id: "world-eaters-blood-offering",
    factionSlug: "world-eaters",
    group: "stratagems",
    name: "Blood Offering",
    cp: 1,
    cpStatus: "confirmed",
    timing: "Any phase",
    summary:
      "If a World Eaters unit holding an objective is destroyed, you can keep control of that objective until your opponent's control there exceeds yours.",
    order: 1,
  },
  {
    id: "world-eaters-hack-and-slash",
    factionSlug: "world-eaters",
    group: "stratagems",
    name: "Hack and Slash",
    cp: 1,
    cpStatus: "confirmed",
    timing: "Fight phase",
    summary:
      "Give a unit that charged this turn and hasn't fought yet +1 to the Armour Penetration of its melee weapons for the phase.",
    order: 2,
  },
  {
    id: "world-eaters-frenzied-resilience",
    factionSlug: "world-eaters",
    group: "stratagems",
    name: "Frenzied Resilience",
    cp: 1,
    cpStatus: "confirmed",
    timing: "Enemy shoot/fight",
    summary:
      "Right after an enemy declares targets against one of your units, subtract 1 from the Damage of attacks allocated to it for the rest of the phase.",
    order: 3,
  },
  {
    id: "world-eaters-skulls-for-the-skull-throne",
    factionSlug: "world-eaters",
    group: "stratagems",
    name: "Skulls for the Skull Throne!",
    cp: null,
    cpStatus: "unverified",
    timing: "Fight phase",
    summary:
      "Right after a unit destroys a Character or Monster in the Fight phase, make a Blessings of Khorne roll and activate an extra Blessing for the rest of the round.",
    order: 4,
  },
  {
    id: "world-eaters-apoplectic-frenzy",
    factionSlug: "world-eaters",
    group: "stratagems",
    name: "Apoplectic Frenzy",
    cp: null,
    cpStatus: "unverified",
    timing: "Movement phase",
    summary:
      "Right after a Khorne Berzerkers unit Advances, it can still declare a charge this turn despite having Advanced.",
    order: 5,
  },
  {
    id: "world-eaters-berzerkers-wrath",
    factionSlug: "world-eaters",
    group: "stratagems",
    name: "Berzerker's Wrath",
    cp: null,
    cpStatus: "unverified",
    timing: "Enemy shooting",
    summary:
      'When a Khorne Berzerkers unit makes a Blood Surge move after being shot, it moves a flat 8" instead of rolling a D6.',
    order: 6,
  },
];
