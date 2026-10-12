export type SponsoredAd = {
  id: string;
  sponsor: string;
  title: string;
  blurb: string;
  cta: string;
  tag: string;
};

/** Seed sponsored listings shown on Opportunities, clearly labelled as ads. Placeholder content
 * only — swap for a real ad feed once a provider/network is selected. */
export const SPONSORED_ADS: SponsoredAd[] = [
  {
    id: "mtn-iot-farm",
    sponsor: "MTN Business",
    title: "MTN IoT for Agriculture",
    blurb: "Connected soil moisture, livestock and irrigation sensors on MTN's farm IoT network.",
    cta: "Get a quote",
    tag: "Connectivity",
  },
  {
    id: "mtn-sim-data",
    sponsor: "MTN Business",
    title: "Rural coverage data bundles",
    blurb: "Data bundles built for farms in low-coverage areas, with SMS alerts included.",
    cta: "View bundles",
    tag: "Connectivity",
  },
  {
    id: "aerobotics-drone",
    sponsor: "Aerobotics",
    title: "Drone crop health scans",
    blurb: "Aerial imagery and tree-by-tree health reports for orchards and row crops.",
    cta: "Book a scan",
    tag: "Drones",
  },
  {
    id: "agridrone-spray",
    sponsor: "AgriDrone SA",
    title: "Drone spraying services",
    blurb: "Precision spraying and seeding by certified operators, booked by the hectare.",
    cta: "Request a booking",
    tag: "Drones",
  },
  {
    id: "iot-irrigation",
    sponsor: "SmartFarm IoT",
    title: "Automated irrigation controllers",
    blurb: "Soil-moisture-triggered irrigation scheduling, monitored from your phone.",
    cta: "Learn more",
    tag: "IoT",
  },
];
