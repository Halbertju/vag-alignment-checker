
function clean(v) {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  if (!s || /not applicable|not reported|n\/a|null|unknown/i.test(s)) return "";
  return s;
}

function mapDrive(v) {
  const s = clean(v).toLowerCase();
  if (!s) return "";
  if (s.includes("all-wheel") || s.includes("awd") || s.includes("4wd") || s.includes("4x4") || s.includes("quattro")) return "awd";
  if (s.includes("front-wheel") || s === "fwd" || s.includes("front wheel")) return "fwd";
  if (s.includes("rear-wheel") || s === "rwd" || s.includes("rear wheel")) return "rwd";
  return "";
}

async function safeJson(url, timeoutMs = 5500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json", "User-Agent": "VAG-Alignment-Checker/0.4" }
    });
    if (!r.ok) return { ok: false, status: r.status };
    const data = await r.json();
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e?.name || "fetch_failed" };
  } finally {
    clearTimeout(timer);
  }
}

function fromDbVin(j) {
  if (!j || typeof j !== "object") return {};
  return {
    brand: clean(j.brand),
    model: clean(j.model),
    year: j.year ? Number(j.year) : "",
    fuel: clean(j.fuelType),
    body: clean(j.bodyType),
    series: clean(j.version),
    registrationCountry: clean(j.registrationCountry),
    sourceFields: ["DB.VIN"]
  };
}

function fromVinWhere(j) {
  const d = j?.decode || {};
  return {
    brand: clean(d.make),
    model: clean(d.model),
    year: d.year ? Number(d.year) : "",
    series: clean(d.trim),
    body: clean(d.bodyClass),
    fuel: clean(d.fuelType),
    drive: mapDrive(d.driveType),
    driveRaw: clean(d.driveType),
    engine: [
      clean(d.displacement) ? `${clean(d.displacement)} L` : "",
      clean(d.engineCylinders) ? `${clean(d.engineCylinders)} cyl` : ""
    ].filter(Boolean).join(" · "),
    sourceFields: ["VinWhere"]
  };
}

function fromVpic(j) {
  const x = j?.Results?.[0] || {};
  return {
    brand: clean(x.Make),
    model: clean(x.Model),
    year: clean(x.ModelYear) ? Number(x.ModelYear) : "",
    series: [clean(x.Series), clean(x.Trim)].filter(Boolean).join(" / "),
    body: clean(x.BodyClass),
    fuel: clean(x.FuelTypePrimary),
    drive: mapDrive(x.DriveType),
    driveRaw: clean(x.DriveType),
    engine: [
      clean(x.DisplacementL) ? `${clean(x.DisplacementL)} L` : "",
      clean(x.EngineCylinders) ? `${clean(x.EngineCylinders)} cyl` : "",
      clean(x.FuelTypePrimary)
    ].filter(Boolean).join(" · "),
    transmission: clean(x.TransmissionStyle),
    sourceFields: ["NHTSA vPIC"]
  };
}

function mergePrefer(...items) {
  const out = {};
  const usedSources = [];
  for (const item of items) {
    if (!item) continue;
    for (const [k, v] of Object.entries(item)) {
      if (k === "sourceFields") {
        for (const s of (v || [])) if (!usedSources.includes(s)) usedSources.push(s);
        continue;
      }
      if ((out[k] === undefined || out[k] === "") && v !== undefined && v !== "") out[k] = v;
    }
  }
  out.sources = usedSources;
  return out;
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const vin = (url.searchParams.get("vin") || "").replace(/\s/g, "").toUpperCase();

  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    return Response.json({ ok: false, error: "invalid_vin" }, { status: 400 });
  }

  // Run three free public sources in parallel.
  const [dbVin, vinWhere, vpic] = await Promise.all([
    safeJson(`https://db.vin/api/v1/vin/${encodeURIComponent(vin)}`),
    safeJson(`https://vinwhere.com/api/v1/decode?vin=${encodeURIComponent(vin)}`),
    safeJson(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(vin)}?format=json`)
  ]);

  const a = dbVin.ok ? fromDbVin(dbVin.data) : {};
  const b = vinWhere.ok ? fromVinWhere(vinWhere.data) : {};
  const c = vpic.ok ? fromVpic(vpic.data) : {};

  // Priority: DB.VIN often has better European model/version identity,
  // VinWhere can add drivetrain, vPIC fills remaining factory fields.
  const vehicle = mergePrefer(a, b, c);

  const useful = Boolean(vehicle.brand || vehicle.model || vehicle.year || vehicle.series || vehicle.drive || vehicle.engine);

  return Response.json({
    ok: true,
    vin,
    useful,
    vehicle,
    diagnostics: {
      dbVin: dbVin.ok ? "ok" : `failed${dbVin.status ? ":" + dbVin.status : ""}`,
      vinWhere: vinWhere.ok ? "ok" : `failed${vinWhere.status ? ":" + vinWhere.status : ""}`,
      vpic: vpic.ok ? "ok" : `failed${vpic.status ? ":" + vpic.status : ""}`
    }
  }, {
    headers: {
      "Cache-Control": "public, max-age=86400"
    }
  });
}
