/* Combat Patrol boxes, and what's in them.
 *
 * Picking a box on the paint log fills in its units and model counts instead
 * of you typing four rows on a phone. This is a plain data file — add a box by
 * copying a block below and filling it in. Nothing in the paint log's JS knows
 * about any particular faction.
 *
 *   id      stable, lowercase, dashed. Stored against the faction, so don't
 *           rename one after anybody has used it.
 *   faction the army name, shown as the heading in the log
 *   box     the box's name as printed on it
 *   page    a page on this site about the box, or "" for none
 *   units   name and how many miniatures come in that unit
 *
 * Only add a box whose contents you can check against the box or its rules
 * card. A pre-filled log with the wrong units in it is worse than an empty
 * one — you'd be painting to a list that doesn't match what you own.
 */
window.CombatPatrols = [
  {
    id: "tyranids-assault-brood",
    faction: "Tyranids",
    box: "Combat Patrol: Tyranid Assault Brood",
    page: "/factions/tyranids.html",
    units: [
      { name: "Parasite of Mortrex", models: 1 },
      { name: "Genestealers", models: 10 },
      { name: "Tyrant Guard", models: 3 },
      { name: "Biovore", models: 1 }
    ]
  }
];
