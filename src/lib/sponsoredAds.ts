export type SponsoredAd = {
  id: string;
  sponsor: string;
  title: string;
  blurb: string;
  cta: string;
  tag: string;
  /** Hex gradient endpoints for the ad's colour "image" — matches the shape of a real,
   * advertiser-paid campaign so both render through the same component. */
  from: string;
  to: string;
};

/** Seed sponsored listings shown whenever there are no (or not enough) real paid campaigns to
 * fill the rotation. Placeholder content only. */
export const SPONSORED_ADS: SponsoredAd[] = [
  {
    id: "mtn-iot-farm",
    sponsor: "MTN Business",
    title: "MTN IoT for Agriculture",
    blurb: "Connected soil moisture, livestock and irrigation sensors on MTN's farm IoT network.",
    cta: "Get a quote",
    tag: "Connectivity",
    from: "#ffcc00",
    to: "#1a1a1a",
  },
  {
    id: "isuzu-bakkie",
    sponsor: "Isuzu",
    title: "Built for the farm: Isuzu D-Max",
    blurb: "Go-anywhere bakkies with farmer finance deals and nationwide service support.",
    cta: "Find a dealer",
    tag: "Vehicles",
    from: "#c8102e",
    to: "#4a0a12",
  },
  {
    id: "aerobotics-drone",
    sponsor: "Aerobotics",
    title: "Drone crop health scans",
    blurb: "Aerial imagery and tree-by-tree health reports for orchards and row crops.",
    cta: "Book a scan",
    tag: "Drones",
    from: "#2563eb",
    to: "#0f172a",
  },
  {
    id: "agridrone-spray",
    sponsor: "AgriDrone SA",
    title: "Drone spraying services",
    blurb: "Precision spraying and seeding by certified operators, booked by the hectare.",
    cta: "Request a booking",
    tag: "Drones",
    from: "#16a34a",
    to: "#052e14",
  },
  {
    id: "iot-irrigation",
    sponsor: "SmartFarm IoT",
    title: "Automated irrigation controllers",
    blurb: "Soil-moisture-triggered irrigation scheduling, monitored from your phone.",
    cta: "Learn more",
    tag: "IoT",
    from: "#0891b2",
    to: "#042f3b",
  },
];
