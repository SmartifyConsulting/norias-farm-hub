export type SponsoredAd = {
  id: string;
  sponsor: string;
  title: string;
  blurb: string;
  cta: string;
  tag: string;
  /** Tailwind gradient classes for the ad's colour "image" — no real creative assets yet. */
  gradient: string;
};

/** Seed sponsored listings, clearly labelled as ads. Placeholder content only — swap for a real
 * ad feed once a provider/network is selected. */
export const SPONSORED_ADS: SponsoredAd[] = [
  {
    id: "mtn-iot-farm",
    sponsor: "MTN Business",
    title: "MTN IoT for Agriculture",
    blurb: "Connected soil moisture, livestock and irrigation sensors on MTN's farm IoT network.",
    cta: "Get a quote",
    tag: "Connectivity",
    gradient: "from-[#ffcc00] to-[#1a1a1a]",
  },
  {
    id: "isuzu-bakkie",
    sponsor: "Isuzu",
    title: "Built for the farm: Isuzu D-Max",
    blurb: "Go-anywhere bakkies with farmer finance deals and nationwide service support.",
    cta: "Find a dealer",
    tag: "Vehicles",
    gradient: "from-[#c8102e] to-[#4a0a12]",
  },
  {
    id: "aerobotics-drone",
    sponsor: "Aerobotics",
    title: "Drone crop health scans",
    blurb: "Aerial imagery and tree-by-tree health reports for orchards and row crops.",
    cta: "Book a scan",
    tag: "Drones",
    gradient: "from-[#2563eb] to-[#0f172a]",
  },
  {
    id: "agridrone-spray",
    sponsor: "AgriDrone SA",
    title: "Drone spraying services",
    blurb: "Precision spraying and seeding by certified operators, booked by the hectare.",
    cta: "Request a booking",
    tag: "Drones",
    gradient: "from-[#16a34a] to-[#052e14]",
  },
  {
    id: "iot-irrigation",
    sponsor: "SmartFarm IoT",
    title: "Automated irrigation controllers",
    blurb: "Soil-moisture-triggered irrigation scheduling, monitored from your phone.",
    cta: "Learn more",
    tag: "IoT",
    gradient: "from-[#0891b2] to-[#042f3b]",
  },
];
