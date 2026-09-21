/* =====================================================================
   EcoScan SA — data.js
   South Australian "Which Bin" rules, object concepts, science claims
   and references.

   Every disposal rule below is sourced. See REFERENCES at the bottom and
   the in-app Sources section. Where guidance varies by council, the item
   carries a `varies` note instead of pretending there is one rule.
   ===================================================================== */

/* ------------------------------------------------------------------
   CATEGORIES
   `none` / `notwaste` / `uncertain` are deliberately NOT bin verdicts.
   They exist so the app can say "I don't know" without inventing a bin.
   ------------------------------------------------------------------ */
export const CATEGORIES = {
  organics: {
    bin: "green",
    title: "GREEN ORGANICS BIN",
    short: "Green bin",
  },
  recycling: {
    bin: "yellow",
    title: "YELLOW RECYCLING BIN",
    short: "Yellow bin",
  },
  landfill: {
    bin: "blue",
    title: "BLUE (OR RED) LANDFILL BIN",
    short: "Landfill bin",
  },
  dropoff: {
    bin: "hazwaste",
    title: "SPECIALIST DROP-OFF — NOT A HOUSEHOLD BIN",
    short: "Drop-off",
  },
  notwaste: {
    bin: null,
    title: "NOT A WASTE ITEM",
    short: "No verdict",
  },
  uncertain: {
    bin: null,
    title: "AI IDENTIFICATION IS UNCERTAIN",
    short: "No verdict",
  },
  none: {
    bin: null,
    title: "NO RESULT",
    short: "No verdict",
  },
};

export const BIN_TO_CATEGORY = { green: "organics", yellow: "recycling", blue: "landfill", hazwaste: "dropoff" };

/* ------------------------------------------------------------------
   BINS — for the legend and the game
   ------------------------------------------------------------------ */
export const BINS = {
  green: { key: "green", name: "Green Bin", sub: "Organics (FOGO)", icon: "leaf", lid: "#1E4620" },
  yellow: { key: "yellow", name: "Yellow Bin", sub: "Recycling", icon: "recycle", lid: "#c98f00" },
  blue: { key: "blue", name: "Blue Bin", sub: "Landfill / General", icon: "trash", lid: "#2454a6" },
  hazwaste: { key: "hazwaste", name: "Specialised Drop-off", sub: "Hazwaste / E-waste", icon: "alert", lid: "#5a3fbf" },
};

/* ------------------------------------------------------------------
   LAYER 1 → 2: model label → object concept

   The detector outputs COCO-91 labels. Those are *object recognition*
   results, not waste classifications. This table is the only place the
   two are connected.
   ------------------------------------------------------------------ */
export const LABEL_TO_CONCEPT = {
  bottle: "bottle",
  book: "book",
  banana: "food-fresh", apple: "food-fresh", orange: "food-fresh",
  broccoli: "food-fresh", carrot: "food-fresh",
  sandwich: "food-prepared", pizza: "food-prepared", donut: "food-prepared",
  cake: "food-prepared", "hot dog": "food-prepared",
  "potted plant": "potted-plant",
  "wine glass": "drinking-glass", cup: "cup-mug", bowl: "crockery", plate: "crockery",
  vase: "glass-decor", mirror: "mirror", window: "window-glass",
  fork: "cutlery", knife: "cutlery", spoon: "cutlery",
  "cell phone": "phone", remote: "electronics-small", keyboard: "electronics-small",
  mouse: "electronics-small", laptop: "electronics-portable", tv: "electronics-large",
  toaster: "appliance-small", blender: "appliance-small", "hair drier": "appliance-small",
  microwave: "appliance-large", oven: "appliance-large", refrigerator: "appliance-large",
  clock: "battery-product",
  hat: "textile", tie: "textile", shoe: "textile", handbag: "textile",
  backpack: "textile", suitcase: "bulky-goods",
  frisbee: "rigid-plastic-goods", "sports ball": "rigid-plastic-goods",
  "baseball glove": "textile", kite: "mixed-goods",
  skis: "bulky-goods", snowboard: "bulky-goods", skateboard: "bulky-goods",
  surfboard: "bulky-goods", "baseball bat": "bulky-goods", "tennis racket": "bulky-goods",
  chair: "furniture", couch: "furniture", bed: "furniture", desk: "furniture",
  "dining table": "furniture", bench: "furniture",
  door: "building-fixture", sink: "building-fixture", toilet: "building-fixture",
  toothbrush: "small-mixed-plastic", scissors: "metal-small", "teddy bear": "soft-toy",
  umbrella: "mixed-goods", "eye glasses": "small-mixed-plastic",

  // Not disposable items at all
  person: "not-waste", bird: "not-waste", cat: "not-waste", dog: "not-waste",
  horse: "not-waste", sheep: "not-waste", cow: "not-waste", elephant: "not-waste",
  bear: "not-waste", zebra: "not-waste", giraffe: "not-waste", bicycle: "not-waste",
  car: "not-waste", motorcycle: "not-waste", airplane: "not-waste", bus: "not-waste",
  train: "not-waste", truck: "not-waste", boat: "not-waste", "traffic light": "not-waste",
  "fire hydrant": "not-waste", "street sign": "not-waste", "stop sign": "not-waste",
  "parking meter": "not-waste",
};

/* ------------------------------------------------------------------
   LAYER 3 → 4: object concept → material candidates → SA disposal

   `materials` are the plausible materials for that object, each with a
   weight (they need not sum to 1; they are normalised at runtime) and
   the SA category that material leads to.

   `unseen` lists the things a photograph CANNOT tell us that would
   change the answer. `conditionRisk` (0–1) is how much that matters.
   ------------------------------------------------------------------ */
export const CONCEPTS = {
  "not-waste": {
    name: "not a waste item",
    materials: [{ name: "n/a", weight: 1, category: "notwaste" }],
    unseen: [],
    conditionRisk: 0,
    why: "The scanner recognised a person, animal, vehicle or piece of street furniture — none of which is a disposable item.",
    science: "Object recognition and waste classification are separate problems. A detector that is 99% sure it can see a car has told you nothing about how to dispose of anything.",
  },

  "bottle": {
    name: "bottle",
    materials: [
      { name: "rigid plastic (PET or HDPE)", weight: 0.62, category: "recycling" },
      { name: "glass", weight: 0.38, category: "recycling" },
    ],
    unseen: ["whether it is empty and rinsed", "whether it is whole or broken"],
    conditionRisk: 0.16,
    why: "Bottles — plastic or glass — are exactly what South Australia's yellow bin is designed for. Empty and rinse them first; broken glass must not go in.",
    science: "PET and glass are both single-material and can be melted and reformed repeatedly. Sorting plants separate them by density, optical sorting and air jets, which only works on rigid, whole containers.",
    source: "charlessturt",
  },

  "book": {
    name: "book",
    materials: [{ name: "paper", weight: 1, category: "recycling" }],
    unseen: ["hardback binding and glue"],
    conditionRisk: 0.1,
    why: "Paper is accepted in the yellow bin. For a hardback, remove the cover and binding first — the glue and cloth cannot be pulped.",
    science: "Paper recycling re-suspends cellulose fibres in water to make pulp. Non-paper components such as plastic covers and hot-melt glue do not break down and contaminate the pulp.",
    source: "charlessturt",
  },

  "food-fresh": {
    name: "fresh fruit or vegetable",
    materials: [{ name: "organic matter", weight: 1, category: "organics" }],
    unseen: [],
    conditionRisk: 0.02,
    why: "All food scraps belong in the green organics bin, where South Australian facilities compost them at scale.",
    science: "Composted with oxygen, microbes convert food into stable humus and CO₂. The same material buried in landfill goes anaerobic within about a year and is converted by methanogenic archaea into landfill gas, which is roughly half methane.",
    source: "epa-lfg",
  },

  "food-prepared": {
    name: "prepared food",
    materials: [
      { name: "food", weight: 0.85, category: "organics" },
      { name: "packaging around the food", weight: 0.15, category: "uncertain" },
    ],
    unseen: ["whether packaging is present and what it is made of"],
    conditionRisk: 0.18,
    why: "Cooked food, takeaway meals, meat, bones and dairy all go in the green organics bin. Remove any packaging first — that goes according to its own material.",
    science: "Commercial composting runs hot enough (typically 55–65 °C) to break down cooked food and kill pathogens. Landfill does not: it is compacted and oxygen-free, so the same food ferments to methane instead.",
    source: "goolwa",
  },

  "potted-plant": {
    name: "potted plant",
    materials: [
      { name: "plant material", weight: 0.6, category: "organics" },
      { name: "plastic or terracotta pot", weight: 0.4, category: "landfill" },
    ],
    unseen: ["pot material"],
    conditionRisk: 0.2,
    why: "Split it up. The plant itself goes in the green organics bin; the pot does not. A clean rigid plastic pot can go in the yellow bin, but pots are not accepted in the green bin.",
    science: "Composting needs material microbes can digest. Terracotta is fired clay and plastic is a synthetic polymer — neither is biodegradable in a composting window of a few months.",
    source: "goolwa",
  },

  "drinking-glass": {
    name: "drinking glass",
    materials: [{ name: "soda-lime or tempered glass", weight: 1, category: "landfill" }],
    unseen: ["whether it is broken"],
    conditionRisk: 0.08,
    why: "Drinking glasses are NOT accepted in South Australia's yellow bin. Only whole, unbroken glass bottles and jars are. Wrap it and put it in the landfill bin.",
    science: "Drinking glasses, vases and ovenware are formulated with different oxides and melt at different temperatures to container glass. Mixed into a glass furnace they form stones and weak points that can ruin an entire batch of cullet.",
    source: "whichbin-contaminants",
  },

  "cup-mug": {
    name: "cup or mug",
    materials: [
      { name: "ceramic", weight: 0.5, category: "landfill" },
      { name: "polystyrene or paper-lined disposable", weight: 0.35, category: "landfill" },
      { name: "rigid plastic", weight: 0.15, category: "recycling" },
    ],
    unseen: ["material", "whether it is certified compostable"],
    conditionRisk: 0.3,
    why: "Most cups are landfill in South Australia. Ceramic mugs cannot be recycled, and disposable coffee cups are lined with plastic that cannot be separated at a kerbside facility. A clean rigid plastic cup is the exception.",
    science: "A paper coffee cup is a laminate: paper bonded to a polyethylene film. Kerbside sorting separates single materials by density and optics; it cannot delaminate a bonded composite, so the whole item is rejected.",
    source: "whichbin-contaminants",
  },

  "crockery": {
    name: "crockery",
    materials: [{ name: "ceramic or porcelain", weight: 1, category: "landfill" }],
    unseen: ["whether it is broken"],
    conditionRisk: 0.08,
    why: "Crockery such as plates, bowls and mugs — broken or not — cannot go in South Australia's yellow recycling bin. Wrap broken pieces in paper and put them in the landfill bin.",
    science: "Ceramics are fired aluminosilicates with a much higher melting point than soda-lime container glass. They survive the glass furnace unmelted and become solid inclusions that weaken recycled glass.",
    source: "whichbin-contaminants",
  },

  "glass-decor": {
    name: "glass vase or décor",
    materials: [
      { name: "decorative glass", weight: 0.7, category: "landfill" },
      { name: "ceramic", weight: 0.3, category: "landfill" },
    ],
    unseen: [],
    conditionRisk: 0.08,
    why: "Vases and decorative glass are not container glass, so they cannot go in the yellow bin. If it is in good condition, donate it; otherwise wrap it and bin it.",
    science: "Container glass is manufactured to a tight composition so it can be re-melted endlessly. Decorative glass often contains lead, colourants or opalisers that contaminate a recycled batch.",
    source: "whichbin-contaminants",
  },

  "mirror": {
    name: "mirror",
    materials: [{ name: "glass with a metal backing", weight: 1, category: "landfill" }],
    unseen: [],
    conditionRisk: 0.08,
    why: "Mirrors are explicitly excluded from South Australia's yellow bin. Wrap broken pieces in cardboard or newspaper and put them in the landfill bin.",
    science: "A mirror is glass with a reflective silver or aluminium coating bonded to the back. That coating cannot be stripped during glass reprocessing, so the material cannot re-enter the container-glass stream.",
    source: "whichbin-az",
  },

  "window-glass": {
    name: "window glass",
    materials: [{ name: "float or toughened glass", weight: 1, category: "landfill" }],
    unseen: [],
    conditionRisk: 0.06,
    why: "Window glass is not accepted in the yellow bin. Large amounts should go to a waste and recycling depot rather than the household bin.",
    science: "Architectural glass is often toughened or laminated with a plastic interlayer. Toughened glass shatters into small cubes and laminated glass contains PVB film — neither behaves like container glass in a furnace.",
    source: "whichbin-az",
  },

  "cutlery": {
    name: "cutlery",
    materials: [
      { name: "stainless steel", weight: 0.6, category: "landfill" },
      { name: "hard plastic", weight: 0.4, category: "landfill" },
    ],
    unseen: ["material"],
    conditionRisk: 0.15,
    why: "Cutlery is not packaging and is not accepted in the yellow bin in South Australia, even when it is metal or rigid plastic. Wrap anything sharp and bin it.",
    science: "Kerbside recycling is a packaging stream. Loose small metal items fall through sorting screens or are mistaken for contaminants, and hard plastic utensils are a different polymer mix to bottles and containers.",
    source: "whichbin-az",
  },

  "phone": {
    name: "mobile phone",
    materials: [{ name: "electronics with a lithium battery", weight: 1, category: "dropoff" }],
    unseen: [],
    conditionRisk: 0.03,
    why: "A phone must never go in any household bin. Drop it at an accredited collection point — MobileMuster, a retailer, or a Green Industries SA site.",
    science: "Phones contain lithium-ion cells that can enter thermal runaway when crushed in a truck or baler, plus recoverable gold, copper, cobalt and rare earths. Batteries in kerbside bins are linked to more than 10,000 fires a year across Australia.",
    source: "gisa-batteries",
  },

  "electronics-small": {
    name: "small electronic device",
    materials: [{ name: "electronics, often battery-powered", weight: 1, category: "dropoff" }],
    unseen: ["whether a battery is fitted"],
    conditionRisk: 0.05,
    why: "Small electronics go to an e-waste drop-off, not a household bin. If it has a rechargeable battery inside, use a Green Industries SA embedded-battery collection point.",
    science: "Circuit boards carry recoverable precious metals and toxic ones such as lead and brominated flame retardants. Landfilling them loses the metals and risks leachate; crushing them risks fire.",
    source: "gisa-batteries",
  },

  "electronics-portable": {
    name: "laptop or tablet",
    materials: [{ name: "electronics with a lithium battery", weight: 1, category: "dropoff" }],
    unseen: [],
    conditionRisk: 0.03,
    why: "Computers are covered by the National Television and Computer Recycling Scheme. Take it to a participating drop-off — never a household bin. Wipe your data first.",
    science: "Product-stewardship schemes make manufacturers fund recovery. A laptop holds aluminium, copper, gold and a lithium-ion cell that is a serious fire risk if compacted.",
    source: "gisa-batteries",
  },

  "electronics-large": {
    name: "television or monitor",
    materials: [{ name: "electronics", weight: 1, category: "dropoff" }],
    unseen: [],
    conditionRisk: 0.03,
    why: "Televisions and computers are free to recycle under the National Television and Computer Recycling Scheme at most council resource recovery centres.",
    science: "Older screens contain leaded glass and mercury backlights. These are recoverable in a controlled facility and hazardous in landfill.",
    source: "gisa-batteries",
  },

  "appliance-small": {
    name: "small appliance",
    materials: [{ name: "electrical appliance, usually with a motor or heating element", weight: 1, category: "dropoff" }],
    unseen: ["whether it contains a rechargeable battery"],
    conditionRisk: 0.06,
    why: "Appliances must not go in a household bin. Take them to an e-waste drop-off; if they have a built-in rechargeable battery, use a Green Industries SA embedded-battery site.",
    science: "Appliances combine steel, copper, aluminium and plastics that are easily separated once shredded — but only in a facility designed for it. Cordless appliances also carry lithium cells that ignite when crushed.",
    source: "gisa-batteries",
  },

  "appliance-large": {
    name: "large appliance (whitegoods)",
    materials: [{ name: "whitegoods", weight: 1, category: "dropoff" }],
    unseen: [],
    conditionRisk: 0.04,
    why: "Fridges, ovens and microwaves are far too large for any household bin. Book a hard-waste collection or take them to a resource recovery centre.",
    science: "Refrigerators also contain refrigerant gases with very high global warming potential. Recovering them at a depot prevents those gases being vented to the atmosphere.",
    source: "gisa-batteries",
  },

  "battery-product": {
    name: "battery-powered product",
    materials: [{ name: "product containing a battery", weight: 1, category: "landfill" }],
    unseen: ["whether the battery is removable"],
    conditionRisk: 0.35,
    why: "Remove the battery first and take it to a B-cycle collection point — batteries must never go in a household bin. The product itself then goes in the landfill bin unless it is electronic.",
    science: "A short-circuited cell can reach several hundred degrees in seconds. That is why loose and embedded batteries are treated as a fire risk throughout the collection chain, not just at the facility.",
    source: "gisa-batteries",
  },

  "textile": {
    name: "clothing or fabric item",
    materials: [{ name: "textile", weight: 1, category: "landfill" }],
    unseen: ["condition and whether it can be reused"],
    conditionRisk: 0.2,
    why: "Clothing and fabric cannot go in the yellow bin. If it is still usable, donate it; otherwise it goes in the landfill bin.",
    science: "Fabrics are the classic 'tanglers' at a materials recovery facility. Long flexible fibres wrap around spinning shafts and screens, forcing the whole line to be shut down and cut free by hand.",
    source: "whichbin-contaminants",
  },

  "soft-toy": {
    name: "soft toy",
    materials: [{ name: "textile and stuffing", weight: 1, category: "landfill" }],
    unseen: ["whether an electronic module is fitted"],
    conditionRisk: 0.15,
    why: "Soft toys go in the landfill bin. If the toy lights up, talks or moves, it has a battery — remove it or take the whole toy to a battery drop-off.",
    science: "Any item with a battery in it becomes a fire risk the moment it is compacted, which is why battery-containing toys are treated differently to ordinary soft goods.",
    source: "gisa-batteries",
  },

  "rigid-plastic-goods": {
    name: "rigid plastic item",
    materials: [{ name: "hard plastic, non-packaging", weight: 1, category: "landfill" }],
    unseen: ["polymer type"],
    conditionRisk: 0.2,
    why: "South Australia's yellow bin is a packaging stream. Non-packaging hard plastics such as sports equipment are not accepted kerbside; check a waste depot for larger items.",
    science: "Sorting plants are tuned to packaging shapes and polymer types. Mixed, unpigmented or composite hard plastics have no reliable market and are usually rejected at the sorting line.",
    source: "whichbin-az",
  },

  "small-mixed-plastic": {
    name: "small mixed-material item",
    materials: [{ name: "mixed plastic, metal and other materials", weight: 1, category: "landfill" }],
    unseen: ["material mix"],
    conditionRisk: 0.15,
    why: "Small mixed-material items go in the landfill bin. They are too small to be sorted and are made of several materials bonded together.",
    science: "Items smaller than about 50 mm fall through the screening drums at a materials recovery facility before they can be sorted, so they end up in the residue stream regardless of what they are made of.",
    source: "whichbin-contaminants",
  },

  "metal-small": {
    name: "small metal item",
    materials: [{ name: "steel", weight: 1, category: "landfill" }],
    unseen: ["condition"],
    conditionRisk: 0.15,
    why: "Small metal tools and household items are not part of the kerbside packaging stream. Scrap metal should go to a waste and recycling depot, where it is recovered.",
    science: "Ferrous metals are pulled off the sorting line by magnets, which works well for cans. Loose small tools are a different shape and quantity, and sharp items are a handling hazard for sorters.",
    source: "charlessturt",
  },

  "mixed-goods": {
    name: "mixed-material item",
    materials: [{ name: "several materials bonded together", weight: 1, category: "landfill" }],
    unseen: ["material mix"],
    conditionRisk: 0.2,
    why: "Items made from several materials bonded together go in the landfill bin, because kerbside facilities cannot separate them.",
    science: "Recycling needs a single, identifiable material. Once two materials are glued, moulded or welded together, separating them costs more than the recovered material is worth.",
    source: "whichbin-az",
  },

  "bulky-goods": {
    name: "bulky item",
    materials: [{ name: "mixed materials", weight: 1, category: "landfill" }],
    unseen: ["whether it fits in the bin at all"],
    conditionRisk: 0.25,
    why: "This is almost certainly too large for a household bin. Most SA councils run a booked hard-waste collection, or you can take it to a waste and recycling depot.",
    science: "Bulky items cannot travel down a sorting line at all. They are handled as a separate stream and, where possible, dismantled so steel and other materials can be recovered.",
    source: "charlessturt",
  },

  "furniture": {
    name: "furniture",
    materials: [{ name: "timber, metal and fabric", weight: 1, category: "landfill" }],
    unseen: ["whether it can be reused"],
    conditionRisk: 0.25,
    why: "Furniture does not go in any household bin. Donate it if it is usable, otherwise book your council's hard-waste collection or take it to a resource recovery centre.",
    science: "Furniture is a composite of timber, foam, fabric and fixings. Separating those for recycling is labour-intensive, so reuse is by far the highest-value outcome in the waste hierarchy.",
    source: "charlessturt",
  },

  "building-fixture": {
    name: "building fixture",
    materials: [{ name: "ceramic, metal or composite", weight: 1, category: "landfill" }],
    unseen: [],
    conditionRisk: 0.15,
    why: "Sinks, doors and toilets are building materials, not household waste. Take them to a waste and recycling depot — construction and demolition waste is a separate stream.",
    science: "Construction and demolition waste is sorted separately because its materials — concrete, brick, ceramic, timber — are recovered in bulk for aggregate and reuse rather than through a packaging line.",
    source: "charlessturt",
  },

  "tissue": {
    name: "tissue or paper towel",
    materials: [{ name: "short-fibre paper", weight: 1, category: "organics" }],
    unseen: [],
    conditionRisk: 0.05,
    why: "Most SA councils accept tissues and paper towel in the green organics bin. They are too soiled and fibres too short to recycle.",
    science: "Tissue is made from deliberately short cellulose fibres and is usually contaminated. Composting recovers its carbon instead of trying to re-pulp it.",
    source: "adelaideaz",
  },
  "carton": {
    name: "carton (milk, juice, long-life)",
    materials: [{ name: "paperboard with thin plastic lining", weight: 1, category: "recycling" }],
    unseen: ["whether it is empty and rinsed"],
    conditionRisk: 0.12,
    why: "Milk and juice cartons are accepted in South Australia's yellow bin. Empty and rinse them first; flatten if you can.",
    science: "A carton is mostly paperboard with a thin polyethylene liner. SA facilities hydrate it to separate the paper fibre, which is the largest fraction by mass.",
    source: "charlessturt",
  },
  "soft-plastic": {
    name: "soft plastic bag or wrapper",
    materials: [{ name: "flexible polyethylene film", weight: 1, category: "landfill" }],
    unseen: [],
    conditionRisk: 0.04,
    why: "Soft plastics — bags, bread bags, cling wrap, bubble wrap — go in the landfill bin, not the yellow bin.",
    science: "Flexible film wraps around spinning shafts and star screens at a sorting facility. Staff must stop the line and cut it free by hand, which is why it is excluded.",
    source: "adelaideaz",
  },
  "foil": {
    name: "aluminium foil or tray",
    materials: [{ name: "aluminium", weight: 1, category: "recycling" }],
    unseen: ["whether it is clean and scrunched into a ball"],
    conditionRisk: 0.15,
    why: "Clean foil scrunched into a ball larger than a golf ball, and clean foil trays, go in the yellow bin. Food-soiled foil goes in landfill.",
    science: "Foil is the same alloy as cans. Small flat sheets fall through screens, but a scrunched ball is large enough for eddy-current separators to recover.",
    source: "charlessturt",
  },
  "paper": {
    name: "paper or newspaper",
    materials: [{ name: "paper", weight: 1, category: "recycling" }],
    unseen: [],
    conditionRisk: 0.05,
    why: "Newspapers, magazines, office paper and junk mail go in the yellow bin. Shredded paper should be contained in a paper bag.",
    science: "Paper is recycled by re-suspending fibres in water. Each cycle shortens fibres slightly, so paper can be recycled around five to seven times.",
    source: "charlessturt",
  },
  "receipt": {
    name: "retail receipt",
    materials: [{ name: "thermal paper with BPA/BPS coating", weight: 1, category: "landfill" }],
    unseen: [],
    conditionRisk: 0.03,
    why: "Receipts go in the landfill bin, not recycling, because of their chemical coating.",
    science: "Most thermal receipts are coated with BPA or BPS developer. Recycling them would spread that coating through an entire batch of paper pulp.",
    source: "adelaideaz",
  },
  "polystyrene": {
    name: "polystyrene foam",
    materials: [{ name: "expanded polystyrene (EPS)", weight: 1, category: "landfill" }],
    unseen: [],
    conditionRisk: 0.04,
    why: "Foam cups, trays and packaging go in the landfill bin, even if they have a recycling symbol.",
    science: "EPS is about 95% air, too light for density separation, and breaks into beads that contaminate every other stream.",
    source: "goolwa",
  },

  "tyre": {
    name: "tyre",
    materials: [{ name: "rubber and steel", weight: 1, category: "dropoff" }],
    unseen: [],
    conditionRisk: 0.04,
    why: "Tyres do not go in any household bin. Return them to a tyre retailer or take them to a waste depot — most charge a small fee.",
    science: "Tyres trap methane in landfill and can catch fire. Shredded, they become aggregate, playground surface or fuel in controlled facilities.",
    source: "charlessturt",
  },
  "cable": {
    name: "cable, charger or power board",
    materials: [{ name: "copper and plastic", weight: 1, category: "dropoff" }],
    unseen: [],
    conditionRisk: 0.03,
    why: "Cables, chargers and power boards are e-waste. Take them to an e-waste drop-off, not a household bin.",
    science: "Cables are copper inside plastic sheath — valuable when shredded in an e-waste plant, but a classic tangler that jams sorting lines.",
    source: "gisa-batteries",
  },
};





/* ------------------------------------------------------------------
   CONFIDENCE

   Detection confidence and disposal confidence are DIFFERENT numbers.
   A model can be 91% sure it sees a bottle and still have no idea
   whether that bottle is empty, whole, plastic or glass.
   ------------------------------------------------------------------ */
export const CONFIDENCE = {
  bands: [
    { min: 0.72, key: "high", label: "Confident", advice: "This is a reliable result." },
    { min: 0.45, key: "medium", label: "Partly confident", advice: "AI identification is partly confident. Please check manually." },
    { min: 0.0, key: "low", label: "Uncertain", advice: "The item was detected, but its disposal category could not be determined confidently." },
  ],
};

/**
 * Combine the three independent sources of doubt into one number.
 *  - detectionScore : how sure the model is about the OBJECT
 *  - materialShare  : how much of the object's plausible materials agree
 *                     on a single disposal category
 *  - conditionRisk  : how much the answer depends on things a photo
 *                     cannot show (clean/dirty, whole/broken, soft/rigid)
 */
export function disposalConfidence(detectionScore, materialShare, conditionRisk) {
  const d = Math.max(0, Math.min(1, detectionScore || 0));
  const m = Math.max(0, Math.min(1, materialShare || 0));
  const c = Math.max(0, Math.min(1, conditionRisk || 0));
  return Math.max(0, Math.min(1, d * m * (1 - c)));
}

export function confidenceBand(score) {
  return CONFIDENCE.bands.find((b) => score >= b.min) || CONFIDENCE.bands[CONFIDENCE.bands.length - 1];
}

/* ------------------------------------------------------------------
   MANUAL LOOKUP
   Every entry verified against a South Australian source (see `src`).
   ------------------------------------------------------------------ */
export const ITEMS = [
  // ---- Green organics ----
  { id: "foodscraps", name: "Food Scraps", icon: "carrot", bin: "green", src: "goolwa",
    why: "All food scraps — including meat, bones, dairy and seafood — go in the green organics bin, where SA facilities compost them at scale.",
    science: "Composted with oxygen, microbes turn food into stable humus. The same food buried in landfill goes anaerobic within about a year and becomes landfill gas, roughly half of which is methane." },
  { id: "banana", name: "Banana Peel", icon: "banana", bin: "green", src: "goolwa",
    why: "Fruit and vegetable scraps belong in the green bin. In landfill they rot without oxygen and release methane instead of becoming soil.",
    science: "Methane's 100-year global warming potential is about 28 times that of CO₂ on the IPCC AR5 scale; over the first 20 years the same gas is roughly 80 to 86 times more potent." },
  { id: "papertowel", name: "Tissues & Paper Towel", icon: "scroll", bin: "green", src: "adelaideaz",
    why: "Most SA councils accept tissues and paper towel in the green organics bin. They are usually too soiled and their fibres too short to recycle.",
    science: "Recycling paper needs long, clean cellulose fibres. Tissue is made from deliberately short fibres and is usually contaminated, so composting recovers its carbon value instead.",
    varies: "A small number of councils differ — check your council on Which Bin SA." },
  { id: "garden", name: "Garden Prunings", icon: "leaf", bin: "green", src: "goolwa",
    why: "Grass, leaves and prunings go in the green bin. Shake off excess soil, and keep plastic pots, hose and tools out.",
    science: "Woody garden waste is high in lignin, which breaks down slowly. Composting facilities shred and turn it to keep oxygen flowing so the process stays aerobic." },
  { id: "pizzabox", name: "Greasy Pizza Box", icon: "pizza", bin: "green", src: "goolwa",
    why: "A very greasy pizza box goes in the green bin. A clean one with no food scraps can go in the yellow bin.",
    science: "Grease is hydrophobic and coats cellulose fibres, so it breaks the water-based pulping process. In a compost pile that same grease is simply carbon for microbes to eat." },
  { id: "compostable", name: "Certified Compostable Cup", icon: "cup", bin: "green", src: "thepostsa",
    why: "Only if it carries the Australasian Bioplastics Association seedling logo. Without that certification it goes in the landfill bin, not the green one.",
    science: "Industrial composting reaches 55–65 °C and only breaks down polymers designed to hydrolyse at those temperatures. 'Biodegradable' is a marketing word; the seedling logo is a tested standard." },

  // ---- Yellow recycling ----
  { id: "can", name: "Aluminium Can", icon: "can", bin: "yellow", src: "charlessturt",
    why: "Empty drink cans go in the yellow bin, lids included. In SA many are also eligible for the 10 cent container deposit.",
    science: "Recycling aluminium saves about 95% of the energy of making it from bauxite — roughly 8.3 GJ per tonne against 186 GJ — because it skips the electrolysis step entirely." },
  { id: "bottle", name: "Plastic Bottle (clean)", icon: "bottle", bin: "yellow", src: "charlessturt",
    why: "Rinse it, keep the lid on, and put it in the yellow bin. Soft or scrunchable plastic is a different story.",
    science: "Rigid PET is a single polymer that can be washed, flaked and re-polymerised. Studies put the energy saving over virgin PET at 40–85% depending on the method used." },
  { id: "cardboard", name: "Clean Cardboard", icon: "box", bin: "yellow", src: "charlessturt",
    why: "Flatten clean cardboard and put it in the yellow bin. Keep food residue off it and keep it separate from cans and bottles.",
    science: "Cardboard is long-fibre kraft paper. Flattening matters because a sorting line is sized for volume — loose bulky cardboard pushes other material off the belt." },
  { id: "glassjar", name: "Glass Jar / Bottle", icon: "jar", bin: "yellow", src: "charlessturt",
    why: "Whole, unbroken glass bottles and jars go in the yellow bin, rinsed with lids off. Broken glass does not.",
    science: "Container glass can be re-melted endlessly without losing quality. Broken glass shatters further at the facility and embeds in paper and cardboard, contaminating those streams too." },
  { id: "carton", name: "Milk / Juice Carton", icon: "milk", bin: "yellow", src: "charlessturt",
    why: "Cartons are accepted in South Australia's yellow bin. Empty and rinse them first.",
    science: "A carton is layered paperboard, polyethylene and sometimes aluminium foil. SA facilities hydrate and separate the paper fibre, which is the largest fraction by mass." },
  { id: "container", name: "Rigid Plastic Container", icon: "tub", bin: "yellow", src: "charlessturt",
    why: "Yoghurt tubs, ice-cream containers and similar rigid plastics go in the yellow bin once rinsed, lids off.",
    science: "Optical sorters read how each polymer reflects near-infrared light, which is why a rigid tub can be identified and separated but a flexible film cannot be held still long enough to read." },
  { id: "takeaway", name: "Rigid Takeaway Container", icon: "tub", bin: "yellow", src: "charlessturt",
    why: "A clean, rinsed rigid plastic takeaway container goes in the yellow bin. If it is still greasy, or is foam, it does not.",
    science: "Food residue is the main reason recyclables are rejected: it spoils paper fibre and gums up sorting equipment. Rinsing is what turns a contaminant back into a recyclable." },
  { id: "aerosol", name: "Empty Aerosol Can", icon: "aerosol", bin: "yellow", src: "adelaideaz",
    why: "Completely empty aerosol cans go in the yellow bin with the lid removed. Do not pierce or crush them.",
    science: "Aerosols are steel or aluminium, which magnets and eddy currents recover easily. A can that is not fully empty is a pressurised vessel that can rupture in a baler." },
  { id: "painttin", name: "Empty Dry Paint Tin", icon: "paint", bin: "yellow", src: "goolwa",
    why: "A completely empty, dry paint tin goes in the yellow bin. A tin with wet paint in it must go to a household hazardous waste depot.",
    science: "Steel is recovered magnetically. Liquid paint is a chemical hazard that contaminates a whole load, which is why 'empty and dry' is the test rather than 'mostly empty'." },
  { id: "plantpot", name: "Clean Plastic Plant Pot", icon: "pot", bin: "yellow", src: "goolwa",
    why: "Clean, rigid plastic plant pots can go in the yellow bin. They must never go in the green bin.",
    science: "Potting mix and soil are the problem: soil is abrasive, blinds the sorting screens and adds mass that is not recyclable. Shaking and rinsing makes the pot recoverable." },
  { id: "paper", name: "Paper & Newspaper", icon: "scroll", bin: "yellow", src: "charlessturt",
    why: "Newspapers, magazines, office paper and junk mail go in the yellow bin. Receipts do not.",
    science: "Paper is recycled by re-suspending fibres in water. Each cycle shortens the fibres slightly, which is why paper can usually be recycled around five to seven times before the fibres are too short." },

  // ---- Blue landfill ----
  { id: "softplastic", name: "Soft Plastic Bag / Wrapper", icon: "bread", bin: "blue", src: "adelaideaz",
    why: "Plastic bags, bread bags, wrappers, cling wrap and bubble wrap go in the red or blue landfill bin, not the yellow one.",
    science: "Flexible film wraps around the spinning shafts and screens at a materials recovery facility. Sorters have to stop the line and cut it free by hand, which is why it is excluded entirely." },
  { id: "chips", name: "Chip Packet", icon: "packet", bin: "blue", src: "adelaideaz",
    why: "Chip packets and foil-lined snack wrappers go in the landfill bin. They are a metallised laminate that cannot be separated.",
    science: "The shiny layer is a vapour-deposited aluminium film only nanometres thick, bonded to plastic. There is no economic process to recover either material from a single packet." },
  { id: "coffeecup", name: "Disposable Coffee Cup", icon: "cup", bin: "blue", src: "whichbin-contaminants",
    why: "Unless it carries the ABA seedling logo, a disposable coffee cup goes in the landfill bin — not recycling, not compost.",
    science: "The cup is paper bonded to a polyethylene liner. Kerbside plants separate single materials; they cannot delaminate a composite, so the whole item is rejected as a contaminant." },
  { id: "receipt", name: "Retail Receipt", icon: "receipt", bin: "blue", src: "adelaideaz",
    why: "Receipts go in the landfill bin, not recycling.",
    science: "Most thermal receipts are coated with a developer chemical such as BPA or BPS. Recycling them would spread that coating through an entire batch of paper pulp." },
  { id: "brokenglass", name: "Broken Glass", icon: "glass", bin: "blue", src: "whichbin-contaminants",
    why: "Wrap broken glass in newspaper or cardboard and put it in the landfill bin — even if it was a bottle or jar before it broke.",
    science: "Broken glass keeps shattering as it moves down the line, and the fragments embed themselves in cardboard and paper. That single problem can downgrade several tonnes of otherwise good recycling." },
  { id: "ceramics", name: "Broken Crockery / Ceramics", icon: "plate", bin: "blue", src: "whichbin-contaminants",
    why: "Plates, mugs and ceramics — broken or whole — go in the landfill bin. Wrap sharp edges first.",
    science: "Ceramic is fired at over 1,000 °C and will not melt in a glass furnace. Pieces survive as solid inclusions that create stress points, weakening every container made from that batch." },
  { id: "nappy", name: "Nappy", icon: "nappy", bin: "blue", src: "adelaideaz",
    why: "All nappies go in the landfill bin — including any labelled 'biodegradable' or 'compostable'.",
    science: "A nappy mixes superabsorbent polymer, plastic film and cellulose with biological waste. Even certified-compostable versions need industrial conditions a kerbside green bin does not provide." },
  { id: "polystyrene", name: "Polystyrene Foam", icon: "foam", bin: "blue", src: "goolwa",
    why: "Foam cups, trays and packaging go in the landfill bin.",
    science: "Expanded polystyrene is about 95% air. It is too light to be sorted by density, breaks into beads that contaminate every other stream, and has almost no recycling market." },
  { id: "textiles", name: "Clothing & Textiles", icon: "shirt", bin: "blue", src: "goolwa",
    why: "No clothing or fabric in the yellow bin. Donate what is wearable; the rest goes in the landfill bin.",
    science: "Fabrics are 'tanglers'. Long fibres wind around rotating equipment and stall the line, which is why textiles are excluded from kerbside recycling in South Australia." },
  { id: "vacuumdust", name: "Vacuum Cleaner Dust", icon: "dust", bin: "blue", src: "goolwa",
    why: "Vacuum dust goes in the landfill bin, bagged. It must not go in the green organics bin.",
    science: "Vacuum dust is mostly synthetic carpet fibre, microplastics, skin cells and grit. It adds no organic value to compost and introduces plastic contamination into a soil product." },
  { id: "butts", name: "Cigarette Butts", icon: "butt", bin: "blue", src: "goolwa",
    why: "Cigarette butts and ash go in the landfill bin, never the green bin.",
    science: "A cigarette filter is cellulose acetate, a plastic — not paper. It persists in the environment and leaches trapped chemicals, which is why it is excluded from compost." },

  // ---- Specialist drop-off ----
  { id: "battery", name: "Loose Battery (AA etc.)", icon: "battery", bin: "hazwaste", src: "gisa-batteries",
    why: "Tape both terminals and take it to a B-cycle point — most Aldi, Bunnings, Coles, Foodland, IGA and Woolworths stores have one. Never any household bin.",
    science: "A short-circuited cell can heat to several hundred degrees within seconds. Batteries in kerbside bins are linked to more than 10,000 fires a year across Australia." },
  { id: "embedded", name: "Product With Built-in Battery", icon: "phone", bin: "hazwaste", src: "gisa-batteries",
    why: "Vapes, e-scooters, Bluetooth speakers, electric toothbrushes, cordless vacuums and smart watches go to a Green Industries SA embedded-battery drop-off.",
    why_extra: "",
    science: "Embedded lithium cells cannot be removed safely at home. SA has dedicated collection points precisely so these are isolated before they can be crushed in a truck or baler." },
  { id: "globe", name: "Light Globe / Fluorescent Tube", icon: "bulb", bin: "hazwaste", src: "charlessturt",
    why: "Light globes and fluorescent tubes are not accepted in the yellow bin. Take them to a household hazardous waste depot or a retail collection point.",
    science: "Fluorescent tubes contain a small amount of mercury vapour. Broken in a truck or facility, that mercury is released and can contaminate an entire load of recyclables." },
  { id: "ewaste", name: "E-waste (Phone, Laptop, TV)", icon: "ewaste", bin: "hazwaste", src: "gisa-batteries",
    why: " TVs and computers are free to drop off under the National Television and Computer Recycling Scheme. Phones go to MobileMuster or a retailer.",
    science: "A circuit board contains recoverable gold, copper and palladium alongside lead and brominated flame retardants. Controlled recovery captures the first group and contains the second." },
  { id: "paint", name: "Paint & Chemicals", icon: "paint", bin: "hazwaste", src: "goolwa",
    why: "Wet paint, solvents, oils, pesticides and gas bottles go to a household hazardous waste depot — never a kerbside bin.",
    science: "These are reactive, flammable or toxic. In a compacting truck they can rupture and mix, and in landfill they can form leachate that a liner is not designed to contain indefinitely." },
  { id: "gasbottle", name: "Gas Bottle", icon: "gas", bin: "hazwaste", src: "charlessturt",
    why: "Gas bottles must never go in any kerbside bin. Return them to the supplier or take them to a waste depot.",
    science: "A pressurised cylinder that is crushed in a compactor can rupture explosively. This is one of the most dangerous items that can enter a collection vehicle." },

  // ---- Expanded set — 20 more common SA household items (sourced) ----
  { id: "foil", name: "Aluminium Foil (clean, scrunched)", icon: "foil", bin: "yellow", src: "charlessturt",
    why: "Clean foil scrunched into a ball bigger than a golf ball goes in the yellow bin. If it is food-soiled, it goes in landfill.",
    science: "Aluminium foil is the same alloy as cans. Small flat sheets fall through sorting screens, but a scrunched ball is large enough for eddy-current separators to recover." },
  { id: "steeltin", name: "Steel Food Tin", icon: "can", bin: "yellow", src: "charlessturt",
    why: "Empty steel tins and cans go in the yellow bin, rinsed, lids on. Aerosol-style food sprays count as aerosols, not tins.",
    science: "Steel is pulled off the line by an overhead magnet. Rinsing prevents food residue contaminating paper fibre in the same load." },
  { id: "winebottle", name: "Wine / Beer Bottle", icon: "bottle", bin: "yellow", src: "charlessturt",
    why: "Whole, unbroken wine and beer bottles go in the yellow bin, rinsed, lids off. Broken bottles must be wrapped and landfilled.",
    science: "Container glass is made to a tight soda-lime recipe so it can be re-melted endlessly. SA's Container Deposit Scheme also gives 10c back for many beverage bottles." },
  { id: "plasticbag", name: "Plastic Shopping Bag", icon: "bag", bin: "blue", src: "adelaideaz",
    why: "Plastic bags go in the landfill bin, not the yellow bin. Take reusable bags shopping, or return bags to a REDcycle-style soft-plastics point if available.",
    science: "Thin film wraps around the spinning discs and star screens at a materials recovery facility, forcing the whole line to stop while staff cut it free by hand." },
  { id: "clingwrap", name: "Cling Wrap", icon: "bread", bin: "blue", src: "adelaideaz",
    why: "Cling wrap and stretch film go in the landfill bin. They are soft plastic, not rigid packaging.",
    science: "Flexible polyethylene film cannot be held still for optical sorters to read, and it tangles in machinery the same way a plastic bag does." },
  { id: "styrotray", name: "Foam Meat Tray", icon: "foam", bin: "blue", src: "goolwa",
    why: "Polystyrene foam trays, cups and meat trays go in the landfill bin, even if they have a recycling symbol.",
    science: "Expanded polystyrene is 95% air, too light for density separation, and it shatters into beads that contaminate paper and cardboard streams." },
  { id: "magazine", name: "Magazines & Junk Mail", icon: "scroll", bin: "yellow", src: "charlessturt",
    why: "Magazines, catalogues, junk mail and office paper go in the yellow bin. Remove any plastic wrap first.",
    science: "Magazine paper is coated clay that still pulps. The clay becomes filler in recycled paper, but plastic wrap must be removed because it is a tangler." },
  { id: "eggcarton", name: "Egg Carton (cardboard)", icon: "box", bin: "yellow", src: "charlessturt",
    why: "Clean cardboard egg cartons go in the yellow bin. If heavily soiled with egg, they go in the green bin.",
    science: "Cardboard egg cartons are unbleached kraft. Soiled ones are better composted, because food residue would otherwise spoil paper recycling." },
  { id: "toothbrush", name: "Toothbrush", icon: "dust", bin: "blue", src: "whichbin-az",
    why: "Toothbrushes go in the landfill bin. They are too small and made of mixed plastics to be sorted.",
    science: "Items smaller than about 50 mm fall through the first screening drums at a sorting facility before any sorting happens, regardless of material." },
  { id: "razor", name: "Disposable Razor", icon: "dust", bin: "blue", src: "whichbin-az",
    why: "Disposable razors go in the landfill bin. Wrap any sharp edge in paper first.",
    science: "A razor mixes steel, rubber and multiple plastics bonded together. Kerbside plants separate single materials, not bonded composites, and sharp items are a handling hazard." },
  { id: "foiltray", name: "Aluminium Foil Tray", icon: "can", bin: "yellow", src: "charlessturt",
    why: "Clean aluminium pie trays and takeaway trays go in the yellow bin, scrunched if possible.",
    science: "Like foil, trays are aluminium and infinitely recyclable once recovered. Food residue is the reason they are rejected, not the material itself." },
  { id: "detergent", name: "Laundry Detergent Bottle", icon: "bottle", bin: "yellow", src: "charlessturt",
    why: "Empty, rinsed detergent and cleaning product bottles go in the yellow bin, lids on.",
    science: "HDPE bottles are rigid and easily identified by near-infrared. The detergent itself is washed away in the recycling wash stage." },
  { id: "shampoo", name: "Shampoo & Conditioner Bottle", icon: "bottle", bin: "yellow", src: "charlessturt",
    why: "Empty shampoo, conditioner and body-wash bottles go in the yellow bin, rinsed, lids on.",
    science: "These are HDPE or PET, both high-value polymers. Keeping the lid on stops the small lid falling through screens and being lost." },
  { id: "oilbottle", name: "Motor Oil Bottle (empty)", icon: "bottle", bin: "hazwaste", src: "goolwa",
    why: "Motor oil bottles, even empty, must go to a household hazardous waste depot, not any kerbside bin.",
    science: "Residual oil is a chemical contaminant that can spoil a whole load of otherwise clean recycling and creates leachate in landfill." },
  { id: "carbattery", name: "Car Battery", icon: "battery", bin: "hazwaste", src: "gisa-batteries",
    why: "Car batteries must never go in any bin. Return them to an auto retailer or take them to a resource recovery centre — they are free to recycle.",
    science: "Lead-acid batteries contain lead and sulphuric acid. They are almost entirely recyclable when kept separate, but highly hazardous when crushed." },
  { id: "tyre", name: "Car Tyre", icon: "tyre", bin: "hazwaste", src: "charlessturt",
    why: "Tyres do not go in any household bin. Return them to a tyre retailer or take them to a waste depot — most charge a small fee.",
    science: "Tyres trap methane in landfill and can catch fire. Shredded, they become aggregate, playground surface or fuel in controlled facilities." },
  { id: "cable", name: "Cables, Chargers & Power Boards", icon: "cable", bin: "hazwaste", src: "gisa-batteries",
    why: "Cables, chargers and power boards are e-waste. Take them to an e-waste drop-off, not a household bin.",
    science: "Cables are copper inside plastic sheath — valuable when shredded in an e-waste plant, but a classic tangler that jams sorting lines." },
  { id: "ledbulb", name: "LED Light Bulb", icon: "bulb", bin: "hazwaste", src: "charlessturt",
    why: "LED and other light bulbs do not go in the yellow bin. Take them to a household hazardous waste depot or retailer collection.",
    science: "LEDs contain electronics and small amounts of metals that are recoverable in a dedicated stream but contaminate glass and paper if put kerbside." },
  { id: "coffeepod", name: "Coffee Pod", icon: "cup", bin: "blue", src: "whichbin-contaminants",
    why: "Unless you are using a brand-specific take-back program, coffee pods go in the landfill bin. Aluminium and plastic are fused with coffee grounds.",
    science: "A pod is a bonded composite of aluminium or plastic plus organic coffee. Kerbside plants cannot separate those layers, so the whole item is rejected." },
  { id: "envelope", name: "Window Envelope", icon: "envelope", bin: "blue", src: "adelaideaz",
    why: "Window envelopes (with a clear plastic window) go in the landfill bin. Plain paper envelopes go in the yellow bin.",
    science: "The plastic window is a different polymer bonded to paper. It does not pulp and contaminates the paper stream, so the envelope is treated as a composite." },
];

export const GAME_ITEMS = ITEMS.filter((i) => i.bin !== "hazwaste");

/* ------------------------------------------------------------------
   SCIENCE CONTENT
   ------------------------------------------------------------------ */
export const SCIENCE_FACTS = [
  { num: "≈28×", label: "Methane vs CO₂ (100 years)", src: "epa-lfg",
    body: "Methane traps about 28 times more heat than the same mass of CO₂ over 100 years on the IPCC AR5 scale. The IPCC's Sixth Assessment gives roughly 27–28 for biogenic methane such as landfill gas, and about 80–86× over 20 years — the exact figure depends on the time window and the assessment report." },
  { num: "50%", label: "Methane in landfill gas", src: "epa-lfg",
    body: "Landfill gas is roughly half methane and half carbon dioxide, with trace amounts of other compounds. It starts forming once oxygen in the waste is used up, typically within about a year of burial." },
  { num: "95%", label: "Energy saved recycling aluminium", src: "iai",
    body: "Making aluminium from bauxite takes about 186 gigajoules per tonne; making it from scrap takes about 8.3 GJ. That is a 95.5% saving, because recycling skips the electrolysis step that dominates primary production." },
  { num: "40–85%", label: "Energy saved recycling PET", src: "bataineh",
    body: "A peer-reviewed life-cycle assessment found recycled PET saves 40–85% of the non-renewable energy of virgin PET. The spread is not sloppiness — it depends on the allocation method the study uses." },
  { num: "10,000+", label: "Battery fires a year in Australia", src: "gisa-batteries",
    body: "Batteries placed in kerbside bins are linked to more than 10,000 fires and fire events a year across Australia, in trucks and at facilities. South Australian incidents include depot fires at Goolwa and Port Augusta." },
  { num: "30–60%", label: "Cheaper to compost than landfill", src: "thepostsa",
    body: "Green Industries SA estimates that for every dollar a council spends sending food waste to landfill, composting would cost roughly 30–60% less — before counting the methane avoided." },
];

export const SCIENCE_BLOCKS = [
  {
    id: "decomposition",
    title: "Decomposition: two very different fates",
    sub: "The same banana peel produces completely different outcomes depending on whether oxygen is present.",
    cards: [
      {
        kind: "landfill",
        heading: "In landfill — no oxygen",
        badge: "Anaerobic decomposition",
        body: "Waste is compacted and buried, so oxygen runs out — typically within about a year. Methanogenic archaea then take over and produce landfill gas, which is roughly half methane and half carbon dioxide.",
        note: "Methane's 100-year global warming potential is about 28× CO₂ on the IPCC AR5 scale, and roughly 80–86× over 20 years.",
        src: "epa-lfg",
      },
      {
        kind: "compost",
        heading: "In the green bin — with oxygen",
        badge: "Aerobic composting",
        body: "South Australia's green organics are shredded, turned and aerated at large-scale facilities. With oxygen present, bacteria and fungi convert the same material into stable, dark compost rather than methane.",
        note: "Green Industries SA estimates composting food waste costs councils about 30–60% less than landfilling it.",
        src: "thepostsa",
      },
    ],
  },
  {
    id: "mrf",
    title: "Inside a materials recovery facility",
    sub: "Understanding the machines explains most of the 'but it looks recyclable' rules.",
    steps: [
      { t: "1. Screen", d: "Rotating and vibrating screens sort by size. Anything smaller than roughly 50 mm falls through and is lost — which is why loose lids and small items are a problem." },
      { t: "2. Magnet", d: "An overhead magnet lifts ferrous metals — steel cans and tins — off the belt." },
      { t: "3. Eddy current", d: "A rapidly spinning magnetic rotor induces a current in aluminium, literally repelling cans off the belt into a separate chute." },
      { t: "4. Optical sorter", d: "Near-infrared light reflects differently off each polymer. Air jets then blast identified plastic into the right chute in milliseconds." },
      { t: "5. Glass & paper", d: "Glass is crushed and screened by size; paper is separated by density in an air stream." },
    ],
    tanglers: [
      { name: "Soft plastics", d: "Film wraps around spinning shafts and screens. The line stops and staff cut it free by hand." },
      { name: "Textiles & ropes", d: "Long fibres tangle in exactly the same way — clothing, hoses, straps and cables." },
      { name: "Tanglers generally", d: "This is the single biggest cause of downtime at a sorting facility, and the reason 'when in doubt, leave it out' is real advice rather than caution." },
    ],
  },
  {
    id: "materials",
    title: "Why some recyclable-looking things can't be recycled",
    sub: "Recyclability is a property of the material and the process, not of how the object looks.",
    cards: [
      { heading: "Glass is not one material", body: "Bottles and jars are soda-lime container glass, made to a tight composition so it can be re-melted endlessly. Drinking glasses, vases, mirrors and ovenware contain different oxides and melt at different temperatures — mixed in, they form stones that weaken a whole batch.", src: "whichbin-contaminants" },
      { heading: "A composite cannot be sorted", body: "A coffee cup is paper bonded to a polyethylene liner. A chip packet is plastic with a nanometre-thick aluminium coating. Sorting plants separate single materials; nothing on the line can delaminate a bonded composite.", src: "whichbin-az" },
      { heading: "Shape matters as much as material", body: "The same rigid plastic is recyclable as a tub and a contaminant as a film. Optical sorters need a rigid surface to read and an air jet needs something it can push. Flexible film fails both tests.", src: "whichbin-az" },
      { heading: "Cleanliness is a technical requirement", body: "Food residue breaks the water-based pulping of paper and gums up equipment. This is why 'empty and rinse' is a process specification, not politeness — and why a greasy pizza box is compost but a clean one is recycling.", src: "whichbin-contaminants" },
      { heading: "Certification beats marketing", body: "'Biodegradable' and 'eco-friendly' are unregulated words. The Australasian Bioplastics Association seedling logo means the item has been tested to break down in industrial composting conditions. Without it, assume landfill.", src: "thepostsa" },
      { heading: "Batteries change everything", body: "One lithium cell in a load of recycling can start a fire that closes a facility. That is why anything with a battery — including toys, vapes and cordless vacuums — is diverted entirely rather than sorted.", src: "gisa-batteries" },
    ],
  },
  {
    id: "circular",
    title: "The circular economy: energy you can measure",
    sub: "Recycling is worth doing because the energy difference is large — but the size of the difference varies by material and by how you measure it.",
    bars: [
      { pct: 95, name: "Aluminium", src: "iai",
        d: "About 95% energy saving: 8.3 GJ per tonne from scrap against 186 GJ from bauxite. Recycling skips the electrolysis that dominates primary production." },
      { pct: 65, name: "Plastics (PET / HDPE)", src: "bataineh",
        d: "Roughly 40–85% depending on the study's allocation method. The bar shows the mid-range; the honest answer is that it varies." },
      { pct: 65, name: "Steel", src: "charlessturt",
        d: "Commonly quoted between 60% and 75%. The spread reflects scrap quality, furnace type and grid electricity." },
    ],
    caveat: "These percentages compare different system boundaries in different studies, so they should not be read as directly comparable. The consistent finding across all of them is that the saving is large and the ranking — aluminium well ahead of plastics and steel — is stable.",
  },
];

/* ------------------------------------------------------------------
   REFERENCES — every one of these URLs was retrieved and checked.
   Real, checked sources only — no invented citations.
   ------------------------------------------------------------------ */
export const REFERENCES = {
  "whichbin-az": {
    label: "Which Bin SA — Recycling from A to Z",
    org: "Green Industries SA (South Australian Government)",
    url: "https://www.whichbin.sa.gov.au/a-z-items",
    used: "Item-by-item South Australian disposal guidance: aerosols, receipts, tissues, soft plastics, broken glass, mirrors, window glass, garden waste.",
  },
  "whichbin-contaminants": {
    label: "Which Bin SA — 10 common yellow bin contaminants",
    org: "Green Industries SA (South Australian Government)",
    url: "https://www.whichbin.sa.gov.au/tips/yellow-bin-contaminants",
    used: "Crockery and glassware exclusion, broken glass rules, tangles and machinery contamination, food and liquid contamination.",
  },
  "gisa-batteries": {
    label: "Batteries and embedded battery drop-off",
    org: "Green Industries SA (South Australian Government)",
    url: "https://www.greenindustries.sa.gov.au/batteries",
    used: "Battery and e-waste drop-off locations, embedded-battery products, B-cycle retail collection points, fire statistics.",
  },
  "gisa-embedded": {
    label: "Depots open to get batteries out of bins and reduce fire risk",
    org: "Green Industries SA (South Australian Government)",
    url: "https://www.greenindustries.sa.gov.au/news/embedded-battery-depots-open",
    used: "The 10,000+ annual battery fire figure and South Australian depot fire incidents at Goolwa and Port Augusta.",
  },
  "charlessturt": {
    label: "Recycling (yellow lid) — what can and cannot go in",
    org: "City of Charles Sturt (South Australian council)",
    url: "https://www.charlessturt.sa.gov.au/services/waste-and-recycling/bins/recycling",
    used: "Council-level yellow bin acceptance and exclusion lists, including mirrors, light globes and window glass.",
  },
  "goolwa": {
    label: "Which Bin Does It Go In? — Frequently Asked Questions About Waste Disposal",
    org: "Cittaslow Goolwa (South Australia)",
    url: "https://www.cittaslowgoolwa.com.au/application/files/3315/0931/4653/Information-Pack-AlexVH-Complete.pdf",
    used: "Green bin acceptance list, nappy rule, paint tin rule, aerosols, plastic plant pots, vacuum dust and cigarette butts.",
  },
  "adelaideaz": {
    label: "A to Z guide on items to go in red, yellow, green bins",
    org: "AdelaideAZ, summarising the Green Industries SA Which Bin guide",
    url: "https://adelaideaz.com/articles/a-to-z-guide-on-what-items-to-place-in-red--yellow-or-green-bins-published-by-south-australian-government-s-green-industries-sa",
    used: "Aerosol cans, hair, nappies, soft plastics, retail receipts, tissues and paper towel.",
  },
  "thepostsa": {
    label: "Which bin does that actually go in? / A-Z: how to dispose of things the right way",
    org: "The Post SA, quoting Green Industries SA",
    url: "https://thepostsa.au/education/2026/04/16/rubbish-rules-explained-what-actually-goes-where/",
    used: "Australasian Bioplastics Association seedling logo certification rule; Green Industries SA estimate that composting costs councils 30–60% less than landfill.",
  },
  "epa-lfg": {
    label: "Basic Information about Landfill Gas",
    org: "United States Environmental Protection Agency, Landfill Methane Outreach Program",
    url: "https://www.epa.gov/lmop/basic-information-about-landfill-gas",
    used: "Landfill gas is roughly 50% methane and 50% CO₂; anaerobic conditions establish within about a year; methane's 100-year warming potential of at least 28× CO₂ per IPCC AR5.",
  },
  "ipcc": {
    label: "AR6 Climate Change 2021: The Physical Science Basis, Chapter 7",
    org: "Intergovernmental Panel on Climate Change",
    url: "https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-7/",
    used: "Global warming potential values for methane: 27.9 generic, 27.0 non-fossil (biogenic), 29.8 fossil, over a 100-year horizon; about 80–82 over 20 years.",
  },
  "iai": {
    label: "Aluminium recycling saves 95% of the energy needed for primary aluminium production",
    org: "International Aluminium Institute",
    url: "https://international-aluminium.org/landing/aluminium-recycling-saves-95-of-the-energy-needed-for-primary-aluminium-production/",
    used: "186 GJ per tonne for primary aluminium (2019) against 8.3 GJ per tonne for recycled — a 95.5% energy saving.",
  },
  "bataineh": {
    label: "Life-Cycle Assessment of Recycling Postconsumer High-Density Polyethylene and Polyethylene Terephthalate",
    org: "Bataineh & Fater, Advances in Civil Engineering (2020), peer-reviewed",
    url: "https://onlinelibrary.wiley.com/doi/10.1155/2020/8905431",
    used: "Recycled PET and HDPE save 40–85% of non-renewable energy and 25–75% of greenhouse gas emissions versus virgin resin, depending on allocation method.",
  },
  "transformers": {
    label: "Transformers.js documentation",
    org: "Hugging Face",
    url: "https://huggingface.co/docs/transformers.js",
    used: "The in-browser inference library used for on-device object detection.",
  },
  "detr": {
    label: "Xenova/detr-resnet-50",
    org: "Hugging Face Hub (ONNX conversion of facebook/detr-resnet-50)",
    url: "https://huggingface.co/Xenova/detr-resnet-50",
    used: "The 41 MB quantised object-detection model, and its COCO-91 label set.",
  },
  "detr-paper": {
    label: "End-to-End Object Detection with Transformers",
    org: "Carion et al. (2020) — the DETR architecture",
    url: "https://arxiv.org/abs/2005.12872",
    used: "Background on how the detection model works and what its confidence scores mean.",
  },
};

export const REFERENCE_ORDER = [
  "whichbin-az", "whichbin-contaminants", "gisa-batteries", "gisa-embedded",
  "charlessturt", "goolwa", "adelaideaz", "thepostsa",
  "epa-lfg", "ipcc", "iai", "bataineh",
  "transformers", "detr", "detr-paper",
];
