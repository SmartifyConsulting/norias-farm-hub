/**
 * A small, curated directory of well-known government/development support available to farmers,
 * grouped by country so Home → Government & Development shows locally relevant programmes. This
 * is general public information, not a live feed — always verify current eligibility and
 * deadlines with the issuing department before applying.
 */
export type GovProgramme = {
  name: string;
  body: string;
  description: string;
  type: "funding" | "support" | "compliance" | "development";
};

export const PROGRAMMES_BY_COUNTRY: Record<string, GovProgramme[]> = {
  "South Africa": [
    {
      name: "Comprehensive Agricultural Support Programme (CASP)",
      body: "Department of Agriculture, Land Reform and Rural Development",
      description:
        "Infrastructure, training and technical support for farmers who received land or production inputs through land reform.",
      type: "development",
    },
    {
      name: "Ilima/Letsema Projects",
      body: "Department of Agriculture, Land Reform and Rural Development",
      description:
        "Provincial grants to increase food production, aimed at food-insecure households and subsistence producers moving toward commercial farming.",
      type: "funding",
    },
    {
      name: "AgriBEE Fund",
      body: "Department of Agriculture, Land Reform and Rural Development",
      description:
        "Grant funding to support broad-based black economic empowerment ownership and participation in the agricultural sector.",
      type: "funding",
    },
    {
      name: "Blended Finance Scheme",
      body: "Land Bank / National Treasury",
      description:
        "Combines grant and loan funding for black producers to improve access to commercial agricultural finance.",
      type: "funding",
    },
    {
      name: "Presidential Employment Stimulus — Agriculture",
      body: "Department of Agriculture, Land Reform and Rural Development",
      description:
        "Production input vouchers and support for subsistence and smallholder producers, run in seasonal rounds.",
      type: "funding",
    },
    {
      name: "Farmer Production Support Units (FPSUs)",
      body: "Provincial Departments of Agriculture",
      description:
        "District-level hubs offering mechanisation, storage, extension advice and market linkage support to nearby smallholders.",
      type: "support",
    },
    {
      name: "GlobalG.A.P. / Export Certification Support",
      body: "Provincial Departments of Agriculture / PPECB",
      description:
        "Technical and sometimes financial support toward food-safety and export-readiness certification for produce.",
      type: "compliance",
    },
    {
      name: "Land Bank Development Funding",
      body: "Land Bank",
      description:
        "Development-focused loan products for black, women and youth farmers, often at preferential terms to commercial finance.",
      type: "funding",
    },
  ],
};

export const GENERIC_PROGRAMMES: GovProgramme[] = [
  {
    name: "National Department of Agriculture",
    body: "Your country's agriculture ministry",
    description:
      "Start with your national agriculture department or ministry's farmer-support desk — most countries run seasonal input, training or finance programmes for smallholders.",
    type: "support",
  },
  {
    name: "Local Agricultural Extension Office",
    body: "Local/provincial government",
    description:
      "A local extension officer can usually point you to the specific grants, compliance requirements and development programmes active in your district.",
    type: "development",
  },
];

export function programmesFor(country: string | undefined): GovProgramme[] {
  if (country && PROGRAMMES_BY_COUNTRY[country]) return PROGRAMMES_BY_COUNTRY[country];
  return GENERIC_PROGRAMMES;
}
