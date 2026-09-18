import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import XLSX from "xlsx";
import { ConfigHelper } from "@vbar/shared";
import { resolveRootEnvPath } from "@vbar/shared/infra";

const rootEnv = resolveRootEnvPath();
if (rootEnv) dotenv.config({ path: rootEnv });

const SOURCE =
  process.argv[2] ||
  process.env.LOCATIONS_XLSX ||
  "/Users/valentinbarakov/proecti/ASSETS/List with pharmacies.xlsx";

const OUT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/entities/location/model/locations.json"
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key =
  ConfigHelper.getEnv("GOOGLE_MAPS_GEOCODING_API_KEY", "") ||
  ConfigHelper.getEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");

if (!key) {
  throw new Error(
    "Set GOOGLE_MAPS_GEOCODING_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
  );
}

if (!fs.existsSync(SOURCE)) {
  throw new Error(`Locations Excel not found: ${SOURCE}`);
}

const wb = XLSX.readFile(SOURCE);
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { range: 1 });
const locations = [];

for (const [i, row] of rows.entries()) {
  const address = String(row["Адрес"] ?? "").trim();
  const city = String(row["Град"] ?? "").trim();
  const query = `${address}, ${city}, Bulgaria`;
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}` +
    `&region=bg&language=bg&key=${key}`;
  const data = await fetch(url).then((r) => r.json());
  const loc = data.results?.[0]?.geometry?.location;
  if (!loc) {
    console.warn("skip", query, data.status);
    continue;
  }
  locations.push({
    id: String(i + 1),
    chain: String(row["Верига"] ?? ""),
    name: String(row["Име аптека"] ?? ""),
    district: String(row["Област"] ?? ""),
    city,
    address,
    lat: loc.lat,
    lng: loc.lng,
  });
  await sleep(200);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(locations, null, 2) + "\n");
console.log(`wrote ${locations.length}/${rows.length} → ${OUT}`);
