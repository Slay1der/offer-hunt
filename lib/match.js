const SENIOR = /\b(senior|sr\.?|staff|principal|lead|manager|head|director|architect|vp|iii|iv)\b/i;
const EARLY = /\b(junior|jr\.?|graduate|grad|new[\s-]?grad|entry[\s-]?level|early[\s-]?career|intern(ship)?|trainee|apprentice|associate|engineer i|level 1|l1|campus|university)\b/i;
const DEVOPS = /\b(devops|dev ops|sre|site reliability|cloud|platform|infrastructure|infra|systems engineer|kubernetes|reliability)\b/i;
const SWE = /\b(software|backend|back-end|frontend|front-end|full[\s-]?stack|developer|web engineer|mobile engineer|python|golang|java|node|react)\b/i;
const VISA_YES = /(visa sponsorship (is )?(available|provided|offered)|we (can |will )?sponsor|sponsorship available|relocation (support|package|assistance)|we offer relocation|blue card)/i;
const VISA_NO = /(no (visa )?sponsorship|unable to sponsor|cannot sponsor|can't sponsor|not able to sponsor|must have (the )?right to work|without (the need for )?sponsorship|do not (offer|provide) sponsorship)/i;

const EUROPE = /\b(germany|berlin|munich|hamburg|frankfurt|netherlands|amsterdam|rotterdam|ireland|dublin|france|paris|spain|madrid|barcelona|portugal|lisbon|poland|warsaw|krakow|sweden|stockholm|denmark|copenhagen|finland|helsinki|norway|oslo|switzerland|zurich|austria|vienna|belgium|brussels|italy|milan|czech|prague|estonia|tallinn|europe|emea|eu)\b/i;
const UK = /\b(uk|united kingdom|england|london|manchester|edinburgh|cambridge|bristol|scotland)\b/i;
const NA = /\b(us|usa|united states|canada|toronto|vancouver|montreal|new york|nyc|san francisco|seattle|austin|boston|chicago|california|remote - us|north america)\b/i;
const NIGERIA = /\b(nigeria|lagos|abuja|africa)\b/i;
const REMOTE = /\b(remote|anywhere|worldwide|global|work from home|distributed)\b/i;

export function trackFor(title) {
  if (DEVOPS.test(title)) return "DevOps / Cloud / SRE";
  if (SWE.test(title) || /\bengineer\b/i.test(title)) return "Software engineering";
  return null;
}

export function isEarlyCareer(title, text = "") {
  if (SENIOR.test(title)) return false;
  if (EARLY.test(title)) return true;
  return /\b(new grads?|recent graduates?|0-2 years|0 to 2 years|1\+ years?|entry level)\b/i.test(text);
}

export function regionFor(location = "", remoteFlag = false) {
  const loc = String(location || "");
  if (UK.test(loc)) return "UK";
  if (EUROPE.test(loc)) return "Europe";
  if (NIGERIA.test(loc)) return "Nigeria";
  if (NA.test(loc) && !REMOTE.test(loc)) return "US / Canada";
  if (remoteFlag || REMOTE.test(loc) || !loc.trim()) return "Remote";
  if (NA.test(loc)) return "US / Canada";
  return "Other";
}

export function visaFor(text = "", flag) {
  if (flag === true) return "yes";
  if (VISA_NO.test(text)) return "no";
  if (VISA_YES.test(text)) return "yes";
  return "unknown";
}

export function typeFor(title, extra = "") {
  const s = `${title} ${extra}`;
  if (/\bintern(ship)?\b/i.test(s)) return "Internship";
  if (/\b(graduate|new[\s-]?grad|campus|early[\s-]?career)\b/i.test(s)) return "Graduate / new grad";
  if (/\bcontract\b/i.test(s)) return "Contract";
  return "Full-time";
}

export function stripHtml(s = "") {
  return String(s)
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function toRole({ company, title, link, location, remote, text, visaFlag, extraType, source }) {
  title = String(title || "").trim();
  company = String(company || "").trim();
  if (!title || !company || !/^https?:\/\//i.test(link || "")) return null;
  const plain = stripHtml(text);
  const track = trackFor(title);
  if (!track || !isEarlyCareer(title, plain)) return null;
  const region = regionFor(location, remote);
  if (region === "US / Canada" && visaFor(plain, visaFlag) !== "yes") return null;
  return {
    company: company.slice(0, 120),
    title: title.slice(0, 200),
    link: link.slice(0, 1000),
    track,
    region,
    city: String(location || "").slice(0, 120),
    visa: visaFor(plain, visaFlag),
    type: typeFor(title, extraType),
    source,
  };
}
