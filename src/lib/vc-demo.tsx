import { useEffect, useState } from "react";
import { VC_COLLECTIONS, isDemo } from "./vc-sync";

const FLAG = "farmerplus:vc:demoSeeded";
const d = (offset: number) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);

/** Builds a valid 13-digit SA ID (Luhn) from a 12-digit stem. */
function saId(stem: string) {
  for (let c = 0; c < 10; c++) {
    const id = stem + c;
    let sum = 0;
    for (let i = 0; i < 13; i++) { let x = Number(id[12 - i]); if (i % 2) { x *= 2; if (x > 9) x -= 9; } sum += x; }
    if (sum % 10 === 0) return id;
  }
  return stem + "0";
}

/**
 * One connected story across all four modules:
 * a field officer registers and inspects Happy Acres Coop farmers → they insure their crops →
 * they hire seasonal workers → the harvest is trucked and stored at a shared silo (whose free space reflects bookings).
 */
export function demoData(): Record<string, unknown[]> {
  const farmers = [
    { id: "demo-f1", ain: "AIN-482113", first: "Thandi", last: "Mokoena", idNumber: saId("850312065108"), phone: "072 481 2290", province: "Free State", commodity: "Maize", hectares: 42, createdAt: d(-60) },
    { id: "demo-f2", ain: "AIN-517620", first: "Sipho", last: "Dlamini", idNumber: saId("790825571208"), phone: "083 220 1174", province: "KwaZulu-Natal", commodity: "Sugarcane", hectares: 18, createdAt: d(-55) },
    { id: "demo-f3", ain: "AIN-639054", first: "Pieter", last: "van der Merwe", idNumber: saId("680417502908"), phone: "082 905 3318", province: "Free State", commodity: "Sunflower", hectares: 120, createdAt: d(-48) },
    { id: "demo-f4", ain: "AIN-701482", first: "Naledi", last: "Khumalo", idNumber: saId("920130081408"), phone: "071 334 8812", province: "Limpopo", commodity: "Macadamia", hectares: 9.5, createdAt: d(-30) },
    { id: "demo-f5", ain: "AIN-755931", first: "Lerato", last: "Nkosi", idNumber: saId("880606123408"), phone: "076 118 4420", province: "Mpumalanga", commodity: "Citrus", hectares: 26, createdAt: d(-21) },
    { id: "demo-f6", ain: "AIN-812207", first: "Bongani", last: "Zulu", idNumber: "8104155", phone: "060 772 9013", province: "Eastern Cape", commodity: "Beef cattle", hectares: 0, createdAt: d(-6) },
  ];
  const officer = "Field officer: Ayanda Mthembu";
  const visits = [
    { id: "demo-v1", farmerId: "demo-f1", date: d(-45), type: "Registration visit", officer, done: true },
    { id: "demo-v2", farmerId: "demo-f2", date: d(-40), type: "Soil sampling", officer, done: true },
    { id: "demo-v3", farmerId: "demo-f4", date: d(-14), type: "Orchard inspection", officer, done: true },
    { id: "demo-v4", farmerId: "demo-f5", date: d(3), type: "Pre-harvest check", officer },
    { id: "demo-v5", farmerId: "demo-f6", date: d(5), type: "Registration visit — collect ID & boundary", officer },
  ];
  const inspections = [
    { id: "demo-i1", farmerId: "demo-f1", date: d(-44), result: "Pass", notes: "Boundary walked, 42 ha confirmed. Storage dry.", gps: "-28.5306, 26.7068", officer },
    { id: "demo-i2", farmerId: "demo-f2", date: d(-39), result: "Conditional", notes: "Fire breaks need clearing before cover can be bound.", gps: "-29.6006, 30.3794", officer },
    { id: "demo-i3", farmerId: "demo-f3", date: d(-47), result: "Pass", notes: "Pivot irrigation in good order.", gps: "-27.9850, 26.7280", officer },
    { id: "demo-i4", farmerId: "demo-f4", date: d(-13), result: "Pass", notes: "Young trees, netting installed.", gps: "-23.0469, 30.4561", officer },
  ];
  const jobs = [
    { id: "demo-j1", title: "Seasonal maize harvest crew", category: "General farm work", type: "Seasonal", province: "Free State", town: "Bothaville", openings: 8, minPay: 5500, maxPay: 7000, period: "month", deadline: d(14), description: "Harvest and bagging for Happy Acres Coop members. Transport from town provided.", requirements: "Physically fit. Harvest experience a plus.", postedAt: d(-5), status: "Active" },
    { id: "demo-j2", title: "Combine harvester operator", category: "Machinery operator", type: "Contract", province: "Free State", town: "Viljoenskroon", openings: 2, minPay: 12000, maxPay: 16000, period: "month", deadline: d(10), description: "Operate the coop's shared combine across member farms.", requirements: "Code EC licence, 2 years on combines.", postedAt: d(-8), status: "Active" },
    { id: "demo-j3", title: "Macadamia packhouse sorter", category: "Packhouse", type: "Seasonal", province: "Limpopo", town: "Levubu", openings: 5, minPay: 4800, maxPay: 5600, period: "month", deadline: d(20), description: "Sorting and grading nuts before cold storage.", requirements: "Attention to detail.", postedAt: d(-3), status: "Active" },
    { id: "demo-j4", title: "Grain truck driver", category: "Logistics & driving", type: "Full time", province: "Free State", town: "Kroonstad", openings: 1, minPay: 9000, maxPay: 11000, period: "month", deadline: d(-2), description: "Farm-to-silo runs for coop members.", requirements: "Code 14 licence, PrDP.", postedAt: d(-30), status: "Closed" },
  ];
  const applications = [
    { id: "demo-a1", jobId: "demo-j1", name: "Mpho Sekhukhune", phone: "073 552 0198", note: "Worked two maize seasons in Hoopstad.", at: d(-3) },
    { id: "demo-a2", jobId: "demo-j1", name: "Kagiso Molefe", phone: "084 117 3305", note: "Available immediately with my brother.", at: d(-2) },
    { id: "demo-a3", jobId: "demo-j2", name: "Johan Botha", phone: "082 640 7721", note: "5 years on John Deere S-series.", at: d(-6) },
    { id: "demo-a4", jobId: "demo-j3", name: "Rendani Netshitenzhe", phone: "079 803 4410", note: "Packhouse experience at Levubu.", at: d(-1) },
  ];
  const cover = [
    { id: "demo-c1", crop: "Maize — Thandi Mokoena, 42 ha", value: 1_260_000, province: "Free State", peril: "Drought", status: "Active", premium: 52_920, deductible: 10, terms: "Drought cover. 10% deductible.", startsOn: d(-40), endsOn: d(325), createdAt: d(-43),
      claims: [{ id: "demo-k1", date: d(-4), amount: 85_000, reason: "Mid-season dry spell, 3 weeks no rain", status: "Submitted" }] },
    { id: "demo-c2", crop: "Sunflower — Pieter van der Merwe, 120 ha", value: 2_400_000, province: "Free State", peril: "Hail", status: "Quoted", premium: 100_800, deductible: 15, terms: "Hail cover. 15% deductible.", createdAt: d(-10), claims: [] },
    { id: "demo-c3", crop: "Macadamia — Naledi Khumalo, 9.5 ha", value: 950_000, province: "Limpopo", peril: "Multi-peril", status: "Needs quote", createdAt: d(-2), claims: [] },
    { id: "demo-c4", crop: "Sugarcane — Sipho Dlamini, 18 ha", value: 540_000, province: "KwaZulu-Natal", peril: "Fire", status: "Declined", createdAt: d(-35), claims: [] },
  ];
  const vehicles = [
    { id: "demo-t1", name: "Happy Acres 10 t tipper", plate: "FS 482-118", body: "Grain tipper", tonnes: 10, base: "Bothaville", ratePerKm: 28 },
    { id: "demo-t2", name: "Limpopo cold-chain truck", plate: "LP 77-21 KP", body: "Refrigerated", tonnes: 6, base: "Louis Trichardt", ratePerKm: 34 },
    { id: "demo-t3", name: "Bakkie & trailer", plate: "FS 990-342", body: "Flatbed", tonnes: 2, base: "Kroonstad", ratePerKm: 12 },
  ];
  const facilities = [
    { id: "demo-s1", name: "Happy Acres shared silo", kind: "Grain silo", province: "Free State", capacity: 500, booked: 0, ratePerTMonth: 45 },
    { id: "demo-s2", name: "Levubu cold room", kind: "Cold room", province: "Limpopo", capacity: 60, booked: 0, ratePerTMonth: 180 },
    { id: "demo-s3", name: "Kroonstad dry warehouse", kind: "Dry warehouse", province: "Free State", capacity: 200, booked: 0, ratePerTMonth: 30 },
  ];
  const bookings = [
    { id: "demo-b1", kind: "Storage", resourceId: "demo-s1", qty: 180, from: "Thandi Mokoena — maize", date: d(-7), status: "Stored" },
    { id: "demo-b2", kind: "Storage", resourceId: "demo-s1", qty: 250, from: "Pieter van der Merwe — sunflower", date: d(-2), status: "Accepted" },
    { id: "demo-b3", kind: "Storage", resourceId: "demo-s2", qty: 12, from: "Naledi Khumalo — macadamia", date: d(-1), status: "Requested" },
    { id: "demo-b4", kind: "Storage", resourceId: "demo-s3", qty: 40, from: "Lerato Nkosi — citrus crates", date: d(-9), status: "Cancelled" },
    { id: "demo-b5", kind: "Transport", resourceId: "demo-t1", qty: 10, from: "Bothaville farm → Happy Acres silo", date: d(-7), status: "Delivered" },
    { id: "demo-b6", kind: "Transport", resourceId: "demo-t2", qty: 4, from: "Levubu → Johannesburg market", date: d(1), status: "Accepted" },
  ];
  return { farmers, visits, inspections, jobs, applications, cover, vehicles, facilities, bookings };
}

const read = (k: string) => { try { return JSON.parse(localStorage.getItem(k) || "[]") as { id: string }[]; } catch { return []; } };
const changed = () => window.dispatchEvent(new Event("farmerplus:change"));

/** Adds the sample records once per device (they never sync to the cloud). */
export function seedDemo(force = false) {
  if (!force && localStorage.getItem(FLAG)) return;
  const data = demoData();
  for (const [k, col] of Object.entries(VC_COLLECTIONS)) {
    const mine = read(k).filter((i) => !isDemo(i));
    localStorage.setItem(k, JSON.stringify([...mine, ...(data[col] ?? [])]));
  }
  localStorage.setItem(FLAG, "1");
  changed();
}
export function clearDemo() {
  for (const k of Object.keys(VC_COLLECTIONS)) localStorage.setItem(k, JSON.stringify(read(k).filter((i) => !isDemo(i))));
  changed();
}
export function hasDemo() {
  return Object.keys(VC_COLLECTIONS).some((k) => read(k).some(isDemo));
}

/** Seeds once, and shows a strip to remove or restore the sample records. */
export function DemoBar() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    seedDemo();
    const f = () => setOn(hasDemo());
    f();
    window.addEventListener("farmerplus:change", f);
    return () => window.removeEventListener("farmerplus:change", f);
  }, []);
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground">
      <span>{on ? "Sample Happy Acres Coop records are shown on this device. They are never uploaded." : "Sample records are hidden."}</span>
      <button className="font-semibold text-foreground underline" onClick={() => (on ? clearDemo() : seedDemo(true))}>
        {on ? "Remove sample data" : "Show sample data"}
      </button>
    </div>
  );
}
