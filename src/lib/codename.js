// src/lib/codename.js
// Client-side helper — DB trigger handles assignment at registration.

const ADJECTIVES = [
  'Swift','Bright','Cosmic','Stellar','Mighty','Electric','Crystal','Shadow',
  'Golden','Silver','Turbo','Omega','Alpha','Hyper','Ultra','Nano','Quantum',
  'Solar','Lunar','Astro','Cyber','Neon','Phantom','Titan','Blaze','Storm',
  'Frost','Apex','Rapid','Noble',
];
const NOUNS = [
  'Eagle','Falcon','Phoenix','Dragon','Tiger','Comet','Rocket','Meteor',
  'Nova','Pulsar','Voyager','Pioneer','Ranger','Sentinel','Guardian',
  'Champion','Cadet','Nexus','Vector','Zenith','Orbit','Bolt','Flash',
  'Spark','Wave','Surge','Drift','Cipher','Vortex','Proton',
];

export const generateCodename = () => {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num  = 100 + Math.floor(Math.random() * 900);
  return `${adj}${noun}${num}`;
};

/** Call once per scholar session to ensure they have a codename */
export const ensureCodename = async (supabase, scholar) => {
  if (scholar?.codename) return scholar.codename;
  const codename = generateCodename();
  await supabase
    .from('scholars')
    .update({ codename })
    .eq('id', scholar.id)
    .is('codename', null);
  return codename;
};