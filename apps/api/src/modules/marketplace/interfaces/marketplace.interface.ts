export interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string;
  logo?: string;
  categories: string[];
  compose_url: string;
}

export interface RegistryData {
  version: string;
  templates: MarketplaceTemplate[];
}