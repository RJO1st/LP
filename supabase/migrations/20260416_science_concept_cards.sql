-- ============================================================
-- Science Concept Cards — KS1 through KS4, ng_primary, ng_jss, ng_sss
--
-- visual_type values used here:
--   'concept_visual' → key maps to CONCEPT_VISUALS in KS12ScienceVisuals.jsx
--   'svg_science'    → { component, props } maps to ScienceVisuals.jsx exports
--   'nih_3d'         → { label, query, nih_url } renders NIH 3D link panel
--
-- Safe to re-run (ON CONFLICT DO NOTHING).
-- ============================================================

-- ── KS1 SCIENCE (UK National) ─────────────────────────────────────────────

INSERT INTO concept_cards
  (topic_slug, curriculum, subject, year_band, title, hook, key_concept, worked_example, visual_type, visual_data, memory_hook)
VALUES
(
  'plants',
  'uk_national',
  'science',
  'ks1',
  'Plants — Living Things That Grow',
  'A tiny seed smaller than your fingernail can grow into a tree taller than your house! 🌱',
  'Plants are living things. They need water, light, and air to grow. Most plants have roots, a stem, leaves, and flowers. Roots hold the plant in soil and drink water. Leaves use sunlight to make food.',
  '[
    {"context":"universal","label":"Parts of a plant","steps":["Roots → underground, absorb water and minerals from soil","Stem → carries water upward, holds the plant upright","Leaves → catch sunlight, make food for the plant","Flower → makes seeds so new plants can grow 🌸"]}
  ]',
  'concept_visual',
  '{"key": "lifecycle"}',
  'Roots drink, stems carry, leaves cook, flowers reproduce!'
),
(
  'animals',
  'uk_national',
  'science',
  'ks1',
  'Animals — Groups of Living Things',
  'A fish breathes underwater, a bird flies through air, a dog runs on land — they are all animals! 🐟🐦🐕',
  'Animals are living things that move, eat, breathe, and grow. Scientists group animals by how they are similar. Mammals have fur and feed their young milk. Birds have feathers and wings. Fish have scales and live in water.',
  '[
    {"context":"uk","label":"Sorting animals","steps":["Mammal: fur/hair, warm-blooded, feeds young milk → dog, cat, whale","Bird: feathers, beak, two wings, lays eggs → robin, eagle, penguin","Fish: scales, fins, lives in water, breathes through gills → salmon, shark","Reptile: scales, cold-blooded → snake, lizard, crocodile"]},
    {"context":"ng","label":"Nigerian animals","steps":["Mammal → elephant, gorilla, goat, cattle","Bird → hornbill, weaver bird, eagle","Fish → tilapia, catfish, mudskipper","Reptile → monitor lizard, chameleon, crocodile"]}
  ]',
  'concept_visual',
  '{"key": "mammals"}',
  'Fur = mammal, Feathers = bird, Scales = fish or reptile!'
),
(
  'materials',
  'uk_national',
  'science',
  'ks1',
  'Everyday Materials',
  'Your chair might be wood or plastic — why did someone choose that material? 🪑',
  'Materials are what objects are made from. Different materials have different properties. We choose materials for jobs based on their properties: wood is hard, plastic is waterproof, fabric is flexible.',
  '[
    {"context":"universal","label":"Matching material to job","steps":["A raincoat → waterproof material (plastic or rubber)","A window → transparent material (glass) so light passes through","A cooking pot → heat-resistant material (metal)","A soft toy → flexible, safe material (fabric)"]}
  ]',
  'concept_visual',
  '{"key": "materials"}',
  'Choose the material that FITS the job — match the property to the purpose!'
),
(
  'seasonal_changes',
  'uk_national',
  'science',
  'ks1',
  'Seasons — How the Year Changes',
  'Why do trees lose their leaves in autumn but bloom again in spring? The seasons explain everything! 🍂🌸',
  'There are four seasons in the UK: Spring, Summer, Autumn, Winter. Each season has different weather, temperature, and day length. The Earth tilting as it orbits the Sun causes the seasons.',
  '[
    {"context":"uk","label":"The four seasons","steps":["Spring → mild, flowers bloom, days get longer 🌸","Summer → warm/hot, long days, trees are green ☀️","Autumn → cool, leaves turn orange and fall, days shorten 🍂","Winter → cold, short days, some trees are bare, may snow ❄️"]}
  ]',
  'concept_visual',
  '{"key": "seasons"}',
  'Spring → Summer → Autumn → Winter — and back to Spring!'
)
ON CONFLICT (topic_slug, curriculum, year_band, subject) DO NOTHING;

-- ── KS2 SCIENCE (UK National) ─────────────────────────────────────────────

INSERT INTO concept_cards
  (topic_slug, curriculum, subject, year_band, title, hook, key_concept, worked_example, visual_type, visual_data, memory_hook)
VALUES
(
  'food_chains',
  'uk_national',
  'science',
  'ks2',
  'Food Chains — Who Eats Whom',
  'Every animal you eat started its journey as a plant using sunlight! 🌞',
  'A food chain shows the flow of energy from one organism to the next. Producers (plants) make their own food from sunlight. Primary consumers (herbivores) eat plants. Secondary consumers (carnivores) eat herbivores. Energy is lost at each step.',
  '[
    {"context":"uk","label":"Woodland food chain","steps":["Oak tree (producer) → makes food from sunlight","Caterpillar (primary consumer) → eats oak leaves","Blue tit (secondary consumer) → eats caterpillars","Sparrowhawk (tertiary consumer) → eats blue tits ✅"]},
    {"context":"ng","label":"Nigerian food chain","steps":["Grass (producer) → grows using sunlight","Grasshopper (primary consumer) → eats grass","Lizard (secondary consumer) → eats grasshoppers","Eagle (tertiary consumer) → eats lizards ✅"]}
  ]',
  'concept_visual',
  '{"key": "food_chain"}',
  'Energy flows from SUN → Plant → Herbivore → Carnivore — left to right always!'
),
(
  'light',
  'uk_national',
  'science',
  'ks2',
  'Light — Sources and Shadows',
  'How does a tiny torch create a giant shadow on the wall? The answer is in how light travels! 💡',
  'Light travels in straight lines from a source. Luminous sources make their own light (the Sun, a flame, a torch). Opaque objects block light and create shadows. Transparent objects let light through. Translucent objects let some light through.',
  '[
    {"context":"universal","label":"Shadow investigation","steps":["Hold an opaque object (your hand) between a torch and a wall","Light travels in a straight line and cannot bend around it","Where light is blocked, a dark shadow forms","Move the object closer to the torch → shadow gets BIGGER","Move it closer to the wall → shadow gets SMALLER ✅"]}
  ]',
  'concept_visual',
  '{"key": "light_basic"}',
  'Light travels STRAIGHT — opaque objects block it, making shadows!'
),
(
  'electricity',
  'uk_national',
  'science',
  'ks2',
  'Simple Electric Circuits',
  'How does flicking a switch make a bulb light up instantly across the room? 💡',
  'Electricity flows in a circuit — a complete loop from the battery, through components, and back. If the loop is broken, current stops and the bulb goes out. A switch opens or closes the circuit. Conductors let electricity flow; insulators block it.',
  '[
    {"context":"uk","label":"Building a simple circuit","steps":["Connect a battery to a bulb with wires forming a complete loop","The bulb lights → current is flowing ✅","Remove one wire → loop is broken → bulb goes OUT","Add a switch → it opens/closes the gap to control the bulb"]},
    {"context":"ng","label":"Conductors and insulators","steps":["Test a coin → metal → conductor → bulb lights ✅","Test a rubber eraser → insulator → bulb stays OFF","Test a pencil → graphite (carbon) → weak conductor → bulb dims"]}
  ]',
  'concept_visual',
  '{"key": "magnet_basic"}',
  'A circuit must be a COMPLETE LOOP — any gap and the current stops!'
),
(
  'forces',
  'uk_national',
  'science',
  'ks2',
  'Forces — Pushes and Pulls',
  'Why does a football slow down after you kick it, even though nothing seems to touch it? 🏈',
  'A force is a push or pull. Forces can change the speed, direction, or shape of an object. Gravity pulls everything toward Earth. Friction acts against motion. Air resistance slows things moving through air. Forces are measured in Newtons (N).',
  '[
    {"context":"uk","label":"Everyday forces","steps":["Gravity → pulls the ball DOWN when you throw it","Air resistance → slows a falling feather much more than a stone","Friction → slows your shoe on the floor (but helps you grip!)","Upthrust → pushes a boat UP in water so it floats"]},
    {"context":"ng","label":"Friction in context","steps":["A okada (motorbike) braking → friction between tyre and road","Sliding on a smooth tiled floor is easy → less friction than carpet","Sandpaper has HIGH friction — useful for smoothing wood"]}
  ]',
  'svg_science',
  '{"component": "ForcesVis", "props": {"force1": 15, "force2": 8, "label1": "Applied Force", "label2": "Friction"}}',
  'Gravity pulls DOWN, friction pushes BACK — forces always come in pairs!'
),
(
  'states_of_matter',
  'uk_national',
  'science',
  'ks2',
  'States of Matter',
  'Water can be ice, liquid water, or steam — the same substance in three completely different forms! ❄️💧💨',
  'All matter exists in three states: solid, liquid, or gas. The state depends on temperature. Solids have a fixed shape. Liquids flow and take the shape of their container. Gases spread out to fill any space.',
  '[
    {"context":"universal","label":"Changing states","steps":["Solid → Liquid: MELTING (add heat) — ice melts at 0°C","Liquid → Gas: EVAPORATION / BOILING (add heat) — water boils at 100°C","Gas → Liquid: CONDENSATION (remove heat) — steam on a cold window","Liquid → Solid: FREEZING (remove heat) — water freezes at 0°C"]},
    {"context":"ng","label":"Everyday examples","steps":["Palm oil is solid at cool temperatures, liquid in the heat of the day","Dew on leaves in the morning → water vapour condensed overnight","Cooking pots → liquid water boils away → evaporation"]}
  ]',
  'svg_science',
  '{"component": "StateChangesVis", "props": {"highlighted": "all"}}',
  'Melt → Evaporate going up in temperature; Condense → Freeze going down!'
)
ON CONFLICT (topic_slug, curriculum, year_band, subject) DO NOTHING;

-- ── KS3 SCIENCE (UK National) ─────────────────────────────────────────────

INSERT INTO concept_cards
  (topic_slug, curriculum, subject, year_band, title, hook, key_concept, worked_example, visual_type, visual_data, memory_hook)
VALUES
(
  'cell_biology',
  'uk_national',
  'science',
  'ks3',
  'Cells — The Building Blocks of Life',
  'Every part of your body — your skin, blood, muscles, brain — is made of cells too small to see with the naked eye! 🔬',
  'All living things are made of cells. Animal cells have a nucleus (controls the cell), cell membrane (controls what enters/exits), cytoplasm (where reactions happen), and mitochondria (release energy). Plant cells have all of these PLUS a cell wall (rigid support), large vacuole (stores water), and chloroplasts (for photosynthesis).',
  '[
    {"context":"universal","label":"Comparing animal and plant cells","steps":["Both have: nucleus, cell membrane, cytoplasm, mitochondria","Plant cells ALSO have: cell wall (rigid, made of cellulose)","Plant cells ALSO have: chloroplasts (contain chlorophyll, site of photosynthesis)","Plant cells ALSO have: large permanent vacuole (filled with cell sap)","Memory: Plants get THREE extras — Wall, Vacuole, Chloroplasts"]}
  ]',
  'svg_science',
  '{"component": "CellVis", "props": {"cellType": "both"}}',
  'Plant cells have 3 extras over animal cells: Wall, Vacuole, Chloroplasts!'
),
(
  'photosynthesis',
  'uk_national',
  'science',
  'ks3',
  'Photosynthesis — Plants Making Food',
  'Plants do not eat — they MAKE their own food using sunlight, water, and air. They are living solar panels! ☀️',
  'Photosynthesis is the process by which plants use light energy to convert carbon dioxide and water into glucose and oxygen. It happens in the chloroplasts. The equation is: CO₂ + H₂O → (light energy) → glucose + O₂. Glucose is used for energy and building materials.',
  '[
    {"context":"universal","label":"Word equation","steps":["Carbon dioxide + Water → (light energy) → Glucose + Oxygen","Carbon dioxide enters through tiny pores called stomata in leaves","Water travels up from roots through the stem (xylem)","Chlorophyll in chloroplasts absorbs the light energy","Glucose is used for respiration, growth, or stored as starch"]},
    {"context":"ng","label":"Nigerian context","steps":["Cassava, yam, and maize all use photosynthesis to grow their edible parts","The starch in a yam is stored glucose from photosynthesis","Deforestation reduces the number of trees doing photosynthesis → less O₂ produced"]}
  ]',
  'nih_3d',
  '{"label": "Chloroplast 3D Model", "query": "chloroplast plant cell", "nih_url": "https://3d.nih.gov/search?query=chloroplast"}',
  'CO₂ + H₂O + Light → Glucose + O₂ — plants IN carbon dioxide, OUT oxygen!'
),
(
  'digestion',
  'uk_national',
  'science',
  'ks3',
  'Digestion — Breaking Down Food',
  'The food you eat this morning will take up to 24 hours to travel the full length of your digestive system! 🍽️',
  'Digestion breaks large food molecules into small soluble ones that can pass into the blood. Physical digestion (teeth, stomach churning) breaks food into smaller pieces. Chemical digestion (enzymes) breaks molecules into simple sugars, amino acids, and fatty acids.',
  '[
    {"context":"universal","label":"Journey of a meal","steps":["Mouth: teeth crush food; saliva starts breaking down starch (amylase)","Oesophagus: muscular tube pushes food to stomach (peristalsis)","Stomach: acid and protease enzymes digest proteins; churning mixes food","Small intestine: lipase digests fats; food molecules absorbed into blood","Large intestine: water reabsorbed; undigested matter becomes faeces"]},
    {"context":"ng","label":"Nigerian diet context","steps":["Eba (cassava) → starch → digested to glucose in small intestine","Suya (meat) → protein → digested to amino acids by protease enzymes","Palm oil → fat → digested to fatty acids and glycerol by lipase"]}
  ]',
  'nih_3d',
  '{"label": "Human Digestive System 3D", "query": "human digestive system anatomy", "nih_url": "https://3d.nih.gov/search?query=digestive+system"}',
  'Mouth → Stomach → Small intestine (absorb) → Large intestine (water) → out!'
),
(
  'atoms_elements',
  'uk_national',
  'science',
  'ks3',
  'Atoms and Elements',
  'Everything in the universe — your body, the air, this page — is made of just 118 types of atom! ⚛️',
  'An atom is the smallest particle of an element. Elements are pure substances made of only one type of atom. Elements are arranged in the Periodic Table by atomic number (number of protons). Compounds are two or more elements chemically joined together.',
  '[
    {"context":"universal","label":"Atoms to compounds","steps":["Element: only one type of atom → Iron (Fe), Oxygen (O), Carbon (C)","Compound: two or more elements chemically bonded → Water (H₂O), CO₂, NaCl","Mixture: elements or compounds mixed but NOT bonded → air, salt water","To separate a compound you need a chemical reaction — not just filtering"]},
    {"context":"ng","label":"Nigerian chemistry","steps":["Salt (NaCl) is a compound of sodium and chlorine — used in Nigerian cooking","Iron (Fe) in laterite soil → common Nigerian soil has high iron content","Carbon (C) → charcoal used for cooking in Nigeria is almost pure carbon"]}
  ]',
  'svg_science',
  '{"component": "AtomVis", "props": {"protons": 6, "neutrons": 6, "electrons": 6, "element": "C"}}',
  'Element = one type of atom; Compound = atoms bonded together; Mixture = not bonded!'
),
(
  'periodic_table',
  'uk_national',
  'science',
  'ks3',
  'The Periodic Table',
  'The periodic table is one of the most powerful ideas in science — it predicted the existence of elements before they were even discovered! 🧪',
  'The Periodic Table arranges all elements by increasing atomic number. Elements in the same GROUP (column) have similar properties because they have the same number of outer electrons. Metals are on the left; non-metals are on the right. Noble gases (Group 0) are very unreactive.',
  '[
    {"context":"universal","label":"Reading the table","steps":["Period (row) → tells you how many electron shells the atom has","Group (column) → tells you how many electrons in the outer shell","Group 1 (alkali metals): 1 outer electron → very reactive","Group 7 (halogens): 7 outer electrons → reactive non-metals","Group 0 (noble gases): full outer shell → very unreactive ✅"]}
  ]',
  'svg_science',
  '{"component": "PeriodicTableVis", "props": {"symbol": "Na", "name": "Sodium", "atomicNumber": 11, "atomicMass": 23, "group": 1, "period": 3, "category": "alkali_metal"}}',
  'Same GROUP = same outer electrons = same reactions — the table is a pattern map!'
),
(
  'energy',
  'uk_national',
  'science',
  'ks3',
  'Energy Stores and Transfers',
  'Energy cannot be created or destroyed — it only moves from one store to another! ⚡',
  'Energy is stored in different ways (chemical, kinetic, thermal, gravitational, elastic). Energy is transferred between stores by heating, by mechanical work (forces), by electrical work, or by radiation. The total amount of energy never changes — it is always conserved.',
  '[
    {"context":"uk","label":"A bouncing ball","steps":["Ball held still → gravitational potential energy store","Ball released → energy transfers to kinetic (movement) store","Ball hits ground → some transfers to thermal (heat) store (friction)","Ball bounces up → kinetic transfers back to gravitational","Energy is conserved — but some is always lost to heat ✅"]},
    {"context":"ng","label":"Charging a phone","steps":["Chemical energy in mains electricity → electrical work → device","Phone battery stores chemical energy","Screen converts electrical energy to light (radiation) and heat (thermal)","Total energy in = total energy out (just in different forms) ✅"]}
  ]',
  'svg_science',
  '{"component": "EnergyStoresVis", "props": {"stores": ["chemical", "kinetic", "thermal", "gravitational"], "transfers": ["mechanical", "heating", "electrical"]}}',
  'Energy is ALWAYS conserved — it only changes form, never disappears!'
),
(
  'waves',
  'uk_national',
  'science',
  'ks3',
  'Waves — Properties and Types',
  'The sound of your voice, the light from the sun, the Wi-Fi signal on your phone — all of these are waves! 📡',
  'A wave transfers energy without transferring matter. Waves have amplitude (height from rest), wavelength (length of one cycle), and frequency (waves per second, measured in Hertz). Transverse waves (light, water) vibrate perpendicular to travel. Longitudinal waves (sound) vibrate parallel to travel.',
  '[
    {"context":"universal","label":"Wave properties","steps":["Amplitude → how loud (sound) or bright (light) — bigger = more energy","Wavelength → distance from peak to peak","Frequency → waves per second (Hz) — higher frequency = higher pitch","Wave speed = frequency × wavelength (v = fλ)","Sound needs a medium (matter) to travel — it cannot travel through a vacuum"]}
  ]',
  'svg_science',
  '{"component": "WaveVis", "props": {"type": "transverse", "wavelength": 2, "amplitude": 1, "label": "Transverse wave"}}',
  'v = f × λ — speed equals frequency times wavelength!'
)
ON CONFLICT (topic_slug, curriculum, year_band, subject) DO NOTHING;

-- ── KS4 SCIENCE (UK National — GCSE) ──────────────────────────────────────

INSERT INTO concept_cards
  (topic_slug, curriculum, subject, year_band, title, hook, key_concept, worked_example, visual_type, visual_data, memory_hook)
VALUES
(
  'dna_genetics',
  'uk_national',
  'science',
  'ks4',
  'DNA and Genetics',
  'You share 99.9% of your DNA with every other human — but that 0.1% is what makes you unique! 🧬',
  'DNA (deoxyribonucleic acid) is the molecule that carries genetic information. It has a double helix structure with four bases: A, T, C, G. A always pairs with T; C always pairs with G. Genes are sections of DNA that code for proteins. Chromosomes are long coils of DNA found in the nucleus.',
  '[
    {"context":"universal","label":"DNA to protein","steps":["DNA in nucleus → contains gene (sequence of base pairs)","Gene is transcribed to mRNA → mRNA leaves nucleus","mRNA is translated by ribosomes → specific sequence of amino acids","Amino acid chain folds → becomes a functional PROTEIN","Proteins control everything: eye colour, enzymes, hormones ✅"]},
    {"context":"ng","label":"Inheritance","steps":["Sickle cell disease is common in Nigeria → recessive allele (s)","Two carrier parents (Ss × Ss) → 25% chance of child with sickle cell (ss)","Genetic testing can identify carriers before having children"]}
  ]',
  'nih_3d',
  '{"label": "DNA Double Helix 3D Model", "query": "DNA double helix structure", "nih_url": "https://3d.nih.gov/search?query=dna+double+helix"}',
  'A pairs T, C pairs G — complementary base pairing locks DNA together!'
),
(
  'chemical_bonding',
  'uk_national',
  'science',
  'ks4',
  'Chemical Bonding',
  'Salt dissolved in water conducts electricity — but solid salt does not. The answer lies in how atoms bond! ⚡',
  'Ionic bonding: electrons transferred from metal to non-metal → forms ions held by electrostatic attraction → high melting point, conducts when dissolved. Covalent bonding: electrons shared between non-metals → molecules → low melting point, poor conductors. Metallic bonding: sea of delocalised electrons → conducts electricity well.',
  '[
    {"context":"universal","label":"Bonding type → properties","steps":["NaCl (salt): ionic → Na⁺ and Cl⁻ ions, high MP (801°C), conducts when molten/dissolved","H₂O (water): covalent → molecules, low MP (0°C), poor conductor","Copper: metallic → delocalised electrons, conducts, can be shaped (malleable)"]},
    {"context":"ng","label":"Nigerian chemistry context","steps":["Salt (NaCl) used in cooking → ionic compound, dissolves in water","Petrol (hydrocarbons): covalent compounds, do not dissolve in water","Copper wire in electrical cables → metallic bonding → conducts electricity"]}
  ]',
  'svg_science',
  '{"component": "MoleculeVis", "props": {"formula": "NaCl", "bonds": [{"type": "ionic"}]}}',
  'Metal + non-metal = ionic; non-metal + non-metal = covalent; pure metal = metallic!'
),
(
  'natural_selection',
  'uk_national',
  'science',
  'ks4',
  'Natural Selection and Evolution',
  'The peppered moth changed colour during the Industrial Revolution — not by choosing to, but through natural selection! 🦋',
  'Natural selection is the process by which organisms with favourable adaptations survive, reproduce, and pass on those traits. Key steps: variation exists → some variants better suited to environment → better-suited organisms survive and reproduce more → traits passed to offspring → population changes over generations.',
  '[
    {"context":"universal","label":"Peppered moth example","steps":["Before industry: light moths blend with pale bark → survive; dark moths visible → eaten by birds","Industrial Revolution: soot darkened trees → dark moths now camouflaged, survive more","Light moths now stand out → eaten more by predators","Over generations → dark allele becomes more common in population ✅"]},
    {"context":"ng","label":"Antibiotic resistance","steps":["Bacteria population: small % have random mutation → resist antibiotics","Antibiotic given → kills susceptible bacteria","Resistant bacteria survive and reproduce","Over time → most bacteria are resistant → antibiotic becomes ineffective"]}
  ]',
  'svg_science',
  '{"component": "PunnettVis", "props": {"parent1": "Ss", "parent2": "Ss", "trait": "fur colour"}}',
  'Variation → Selection → Survival → Reproduction → Pass on traits — VSSRP!'
)
ON CONFLICT (topic_slug, curriculum, year_band, subject) DO NOTHING;

-- ── NIGERIAN PRIMARY SCIENCE (ng_primary) ─────────────────────────────────

INSERT INTO concept_cards
  (topic_slug, curriculum, subject, year_band, title, hook, key_concept, worked_example, visual_type, visual_data, memory_hook)
VALUES
(
  'plants',
  'ng_primary',
  'science',
  'ks1',
  'Plants Around Us',
  'The mango tree in your compound uses sunlight, water and air to grow fruit — it is a living factory! 🥭',
  'Plants are living things found all around us in Nigeria. They need sunlight, water, air, and soil to grow. Plants give us food, oxygen, and shade. Common Nigerian plants include mango, iroko, oil palm, cassava, and banana.',
  '[
    {"context":"ng","label":"Parts of a plant","steps":["Roots → underground, absorb water from the soil","Stem → supports the plant and carries water upward","Leaves → flat, absorb sunlight to make food","Fruits and seeds → how new plants are spread 🥭"]},
    {"context":"ng","label":"Uses of plants","steps":["Food: cassava, yam, plantain, maize, tomato","Medicine: neem (dogonyaro) leaves used for malaria treatment","Wood: iroko, mahogany used for furniture and building","Oil: oil palm → palm oil used for cooking"]}
  ]',
  'concept_visual',
  '{"key": "lifecycle"}',
  'Roots drink, stems carry, leaves cook — plants make their own food!'
),
(
  'food_chains',
  'ng_primary',
  'science',
  'ks2',
  'Food Chains in Nigeria',
  'The grass that cows eat, the cow that gives us beef — this is a food chain in action! 🌿🐄',
  'A food chain shows what eats what in nature. It always starts with a plant (producer) because plants make their own food. Arrows show the direction energy flows — from what is eaten to what eats it.',
  '[
    {"context":"ng","label":"Savanna food chain","steps":["Grass → is eaten by → Grasshopper → is eaten by → Lizard → is eaten by → Eagle","Energy flows in the direction of the arrows","The grass is the producer — it gets energy from the Sun","The eagle is at the top — it has no predator here ✅"]},
    {"context":"ng","label":"Water food chain","steps":["Algae → is eaten by → Small fish → is eaten by → Catfish → is eaten by → Crocodile","If we remove one organism, the whole chain is affected"]}
  ]',
  'concept_visual',
  '{"key": "food_chain"}',
  'Arrows show energy flow — from EATEN to EATER, always starting with a plant!'
),
(
  'human_body',
  'ng_primary',
  'science',
  'ks2',
  'The Human Body — Systems',
  'Your heart beats about 100,000 times every day without you thinking about it — your body systems work automatically! ❤️',
  'The human body has several organ systems that work together. The skeletal system gives structure and protection. The muscular system allows movement. The digestive system breaks down food. The circulatory system transports blood.',
  '[
    {"context":"ng","label":"Body systems","steps":["Skeletal system: bones give shape, protect organs (skull protects brain)","Muscular system: muscles pull on bones to create movement","Digestive system: mouth → stomach → intestines → breaks down fufu, rice, eba","Circulatory system: heart pumps blood carrying oxygen and food to all body cells"]},
    {"context":"ng","label":"Healthy habits","steps":["Drink clean water — dehydration weakens all body systems","Eat a balanced diet — rice, beans, vegetables, fruit, fish or meat","Exercise regularly — strengthens muscles and heart","Wash hands — prevents the spread of germs that attack body systems"]}
  ]',
  'nih_3d',
  '{"label": "Human Skeleton 3D Model", "query": "human skeleton anatomy", "nih_url": "https://3d.nih.gov/search?query=human+skeleton"}',
  'Skeleton supports, muscles move, heart pumps, gut digests — systems work together!'
)
ON CONFLICT (topic_slug, curriculum, year_band, subject) DO NOTHING;

-- ── NIGERIAN JSS SCIENCE (ng_jss) ─────────────────────────────────────────

INSERT INTO concept_cards
  (topic_slug, curriculum, subject, year_band, title, hook, key_concept, worked_example, visual_type, visual_data, memory_hook)
VALUES
(
  'cell_biology',
  'ng_jss',
  'science',
  'jss',
  'The Cell — Unit of Life',
  'One drop of your blood contains about 5 million red blood cells — each one doing its job right now! 🔬',
  'The cell is the basic unit of life. All living things are made of cells. Some organisms are unicellular (one cell — e.g. bacteria, amoeba). Others are multicellular (e.g. humans, plants, trees). Cells have specialised organelles that carry out specific functions.',
  '[
    {"context":"ng","label":"Animal vs plant cell","steps":["Animal cell: nucleus (control centre), cytoplasm (where reactions happen), cell membrane (outer boundary), mitochondria (energy release)","Plant cell: has all of the above PLUS cell wall (rigid support), large vacuole (water store), chloroplasts (photosynthesis)","A cell wall is NOT the same as a cell membrane — wall is outside, membrane is inside the wall"]},
    {"context":"universal","label":"Specialised cells","steps":["Red blood cell → biconcave shape, no nucleus → maximises haemoglobin for O₂ transport","Root hair cell → long extension → large surface area for water absorption","Sperm cell → tail (flagellum) for swimming toward egg"]}
  ]',
  'svg_science',
  '{"component": "CellVis", "props": {"cellType": "both"}}',
  'Plant cells: Wall + Vacuole + Chloroplasts — animal cells have none of these three!'
),
(
  'photosynthesis',
  'ng_jss',
  'science',
  'jss',
  'Photosynthesis',
  'Nigeria has year-round sunshine — the perfect energy source for the plants that feed our nation! ☀️',
  'Photosynthesis is the process in which plants use light energy to produce glucose from carbon dioxide and water. The reaction occurs in chloroplasts. Oxygen is released as a by-product — this is the oxygen we breathe.',
  '[
    {"context":"ng","label":"Word equation","steps":["Carbon dioxide + Water → (sunlight energy) → Glucose + Oxygen","CO₂ enters through stomata (pores on leaves)","Water absorbed by roots, travels up xylem to leaves","Chlorophyll absorbs sunlight — it is what makes leaves green","Glucose used for energy (respiration) or stored as starch"]},
    {"context":"ng","label":"Limiting factors in Nigeria","steps":["Light: during harmattan, dust reduces light → photosynthesis rate drops","Water: drought reduces rate → plant wilts and cannot photosynthesise","CO₂: low CO₂ on windy days → rate slows","Warm temperatures in Nigeria generally INCREASE the rate ✅"]}
  ]',
  'nih_3d',
  '{"label": "Leaf Structure 3D / Chloroplast", "query": "plant leaf chloroplast structure", "nih_url": "https://3d.nih.gov/search?query=plant+cell+chloroplast"}',
  'CO₂ + H₂O + Light → Glucose + O₂ — chloroplasts are the green factories!'
),
(
  'atoms_elements',
  'ng_jss',
  'science',
  'jss',
  'Atoms, Elements and Compounds',
  'The air you breathe is a mixture — but water is a compound. What is the difference? ⚗️',
  'An atom is the smallest particle of an element that still has the properties of that element. Elements are pure substances made of one type of atom. Compounds are formed when two or more elements combine chemically in fixed ratios.',
  '[
    {"context":"ng","label":"Elements in everyday life","steps":["Iron (Fe) → found in laterite soil (red colour of Nigerian roads)","Carbon (C) → charcoal (cooking fuel), coal, graphite in pencils","Oxygen (O) → 21% of air, needed for respiration and combustion","Gold (Au) → jewellery, found in Nigerian mines"]},
    {"context":"universal","label":"Element → compound","steps":["Hydrogen (H₂) + Oxygen (O₂) → Water (H₂O): compound","Sodium (Na) + Chlorine (Cl₂) → Salt (NaCl): compound","In a compound, properties are DIFFERENT from the original elements","Salt tastes salty — sodium is an explosive metal, chlorine is a poisonous gas!"]}
  ]',
  'svg_science',
  '{"component": "AtomVis", "props": {"protons": 8, "neutrons": 8, "electrons": 8, "element": "O"}}',
  'Element = one type of atom; Compound = bonded together; Mixture = not bonded!'
),
(
  'forces',
  'ng_jss',
  'science',
  'jss',
  'Forces and Motion',
  'An okada accelerating from a standstill, a falling mango, a boat pushed by the river current — all governed by forces! 🏍️',
  'A force is a push or pull that changes an object''s speed, direction, or shape. Force is measured in Newtons (N). Unbalanced forces cause acceleration. Balanced forces mean no change in motion (Newton''s First Law). Weight = mass × gravitational field strength (W = mg).',
  '[
    {"context":"ng","label":"Weight vs mass","steps":["Mass is the amount of matter in an object — measured in kg — does NOT change","Weight is the gravitational pull on that mass — measured in Newtons (N)","W = m × g (g = 10 N/kg on Earth)","A 60 kg person weighs 60 × 10 = 600 N on Earth","On the Moon (g = 1.6 N/kg): weight = 60 × 1.6 = 96 N but MASS is still 60 kg"]},
    {"context":"ng","label":"Everyday forces","steps":["A market woman carrying a load on her head → upward contact force balances weight","A car braking → friction (between tyres and road) is an unbalanced force → deceleration","An okada on a straight road at constant speed → balanced forces (engine thrust = air resistance + friction)"]}
  ]',
  'svg_science',
  '{"component": "FreeBodyVis", "props": {"forces": [{"label": "Weight", "direction": "down", "magnitude": 600}, {"label": "Normal", "direction": "up", "magnitude": 600}]}}',
  'W = mg — weight in Newtons, mass in kg, g = 10 N/kg on Earth!'
),
(
  'energy',
  'ng_jss',
  'science',
  'jss',
  'Energy — Forms and Conservation',
  'The yam you eat at breakfast becomes the energy that powers your brain and muscles all morning! ⚡',
  'Energy is the ability to do work. It exists in many forms: chemical, kinetic, thermal (heat), light, sound, electrical, gravitational potential, elastic potential. Energy cannot be created or destroyed — it is always conserved (Law of Conservation of Energy). It is measured in Joules (J).',
  '[
    {"context":"ng","label":"Energy conversions in daily life","steps":["Burning charcoal → chemical energy → thermal (heat) energy","Solar panel → light energy → electrical energy","A generator (gen) → chemical energy (fuel) → electrical energy","Pressing a phone screen → electrical energy → light + sound energy"]},
    {"context":"ng","label":"Renewable vs non-renewable","steps":["Non-renewable (finite): crude oil, coal, natural gas — Nigeria''s main energy export","Renewable (infinite): solar (abundant in Nigeria), wind, hydroelectric (Kainji Dam)","Renewable energy does not run out and produces less pollution"]}
  ]',
  'svg_science',
  '{"component": "EnergyStoresVis", "props": {"stores": ["chemical", "thermal", "electrical", "kinetic"], "transfers": ["heating", "electrical", "mechanical"]}}',
  'Energy changes FORM but never disappears — total energy is always conserved!'
)
ON CONFLICT (topic_slug, curriculum, year_band, subject) DO NOTHING;

-- ── NIGERIAN SSS SCIENCE (ng_sss) ─────────────────────────────────────────

INSERT INTO concept_cards
  (topic_slug, curriculum, subject, year_band, title, hook, key_concept, worked_example, visual_type, visual_data, memory_hook)
VALUES
(
  'electrochemistry',
  'ng_sss',
  'science',
  'sss',
  'Electrochemistry — Electrolysis',
  'The aluminium in your phone and the chlorine that treats drinking water in Nigeria are both produced by electrolysis! ⚡',
  'Electrolysis uses electrical energy to drive a non-spontaneous chemical reaction. An electrolyte (ionic compound dissolved in water or molten) conducts electricity. At the cathode (−): cations (positive ions) are reduced (gain electrons). At the anode (+): anions (negative ions) are oxidised (lose electrons).',
  '[
    {"context":"ng","label":"Electrolysis of brine (NaCl solution)","steps":["Brine = salt + water → ions: Na⁺, Cl⁻, H⁺, OH⁻","Cathode (−): H⁺ ions reduced → 2H⁺ + 2e⁻ → H₂ gas ↑","Anode (+): Cl⁻ ions oxidised → 2Cl⁻ → Cl₂ gas ↑ + 2e⁻","Remaining solution: NaOH (sodium hydroxide)","Products: chlorine (water treatment), hydrogen (fuel cells), NaOH (soap making) ✅"]},
    {"context":"ng","label":"Industrial applications in Nigeria","steps":["Aluminium smelting → electrolysis of bauxite (expensive — requires huge electrical power)","Electroplating → coat cheap metal with gold or silver for jewellery","Water treatment → chlorine from electrolysis of brine kills bacteria in drinking water"]}
  ]',
  'svg_science',
  '{"component": "PHScaleVis", "props": {"value": 12, "substance": "Sodium Hydroxide (NaOH)"}}',
  'Cathode = reduction (gain e⁻); Anode = oxidation (lose e⁻) — OIL RIG!'
),
(
  'genetics',
  'ng_sss',
  'science',
  'sss',
  'Genetics — Inheritance and Variation',
  'Sickle cell disease affects millions of Nigerians — understanding genetics can help every family assess their risk! 🧬',
  'Genetics is the study of how traits are inherited. Genes exist in different forms called alleles. Dominant alleles (uppercase letter) are always expressed. Recessive alleles (lowercase) are only expressed when paired with another recessive allele. A Punnett square predicts the probability of each genotype and phenotype in offspring.',
  '[
    {"context":"ng","label":"Sickle cell inheritance","steps":["Sickle cell allele = s (recessive); normal allele = S (dominant)","Sickle cell trait (carrier): Ss — carrier is healthy but can pass on s allele","Sickle cell disease: ss — both alleles are recessive","Two carriers (Ss × Ss) have a 25% chance of ss child, 50% Ss carrier, 25% SS normal","Genotype screening before marriage is advised in Nigeria"]},
    {"context":"universal","label":"Punnett square worked example","steps":["Parents: Ss × Ss","Possible offspring: SS (25%), Ss (25%), sS (25%), ss (25%)","Phenotype ratio: 3 unaffected : 1 sickle cell disease","This is a 3:1 phenotype ratio — classic Mendelian ratio ✅"]}
  ]',
  'svg_science',
  '{"component": "PunnettVis", "props": {"parent1": "Ss", "parent2": "Ss", "trait": "sickle cell"}}',
  'Dominant masks recessive; two recessives needed to show the trait — ss causes disease!'
),
(
  'electromagnetic_spectrum',
  'ng_sss',
  'science',
  'sss',
  'The Electromagnetic Spectrum',
  'Your microwave oven, the X-ray at the hospital, the radio in the market — all of these are the same type of wave! 📡',
  'The electromagnetic spectrum is a family of transverse waves that travel at the speed of light (3 × 10⁸ m/s) through a vacuum. Arranged by increasing frequency (decreasing wavelength): Radio, Microwave, Infrared, Visible light, Ultraviolet, X-ray, Gamma ray.',
  '[
    {"context":"ng","label":"EM spectrum uses","steps":["Radio waves → radio stations (Rhythm FM, Cool FM Nigeria), mobile phone signals","Microwaves → satellite TV (DSTV, GOtv), mobile data (4G/5G)","Infrared → TV remotes, thermal cameras, night-vision","Visible light → human vision","Ultraviolet → sterilising water in treatment plants, detecting fake naira notes","X-rays → hospital imaging (Chest X-ray)","Gamma rays → radiotherapy for cancer, sterilising medical equipment"]},
    {"context":"universal","label":"Wavelength and frequency","steps":["As frequency increases → wavelength decreases (they are inversely proportional)","Higher frequency = more energy per photon","Gamma rays have the HIGHEST frequency and energy","Radio waves have the LOWEST frequency and energy"]}
  ]',
  'svg_science',
  '{"component": "EMSpectrumVis", "props": {"highlighted": "all"}}',
  'Radio → Micro → IR → Visible → UV → X-ray → Gamma — frequency increases left to right!'
)
ON CONFLICT (topic_slug, curriculum, year_band, subject) DO NOTHING;
