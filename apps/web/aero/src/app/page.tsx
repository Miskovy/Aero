import LandingHero from './components/LandingHero'
import HowItWorks from './components/HowItWorks'
import BentoFeatures from './components/BentoFeatures'
import CustomDomainShowcase from './components/CustomDomainShowcase'
import WhyAero from './components/WhyAero'
import PricingPreview from './components/PricingPreview'
import FooterCTA from './components/FooterCTA'

export default function Page() {
  return (
    <main>
      <LandingHero />
      <HowItWorks />
      <BentoFeatures />
      <CustomDomainShowcase />
      <WhyAero />
      <PricingPreview />
      <FooterCTA />
    </main>
  )
}
