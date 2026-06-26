export interface Certification {
  id: string
  code: string
  name: string
  level: string
  color: string
  domains: string[]
}

export const CERTIFICATIONS: Certification[] = [
  {
    id: 'clf-c02',
    code: 'CLF-C02',
    name: 'Cloud Practitioner',
    level: 'Foundational',
    color: '#FF9900',
    domains: ['cloud_concepts', 'security', 'technology', 'billing'],
  },
  {
    id: 'saa-c03',
    code: 'SAA-C03',
    name: 'Solutions Architect',
    level: 'Associate',
    color: '#1E88E5',
    domains: ['design_resilient', 'design_high_performing', 'design_secure', 'design_cost_optimized'],
  },
  {
    id: 'dva-c02',
    code: 'DVA-C02',
    name: 'Developer',
    level: 'Associate',
    color: '#43A047',
    domains: ['development_with_aws', 'security', 'deployment', 'troubleshooting'],
  },
]

export function getCertification(id: string): Certification {
  return CERTIFICATIONS.find((c) => c.id === id) ?? CERTIFICATIONS[0]
}
