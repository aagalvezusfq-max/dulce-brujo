import { Button } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const Hero = () => {
  return (
    <div className="relative h-[82vh] w-full overflow-hidden border-b border-brujo-gold/20 bg-brujo-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(196,165,116,0.14),_transparent_58%)]" />
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-8 px-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.42em] text-brujo-gold">
          Casa de dulces
        </p>
        <h1 className="font-display text-6xl italic font-normal leading-none text-brujo-cream small:text-8xl">
          Dulce Brujo
        </h1>
        <span className="h-px w-16 bg-brujo-gold/70" />
        <p className="max-w-xl font-sans text-base font-light leading-7 text-brujo-gold/90">
          Dulces de cacao con nombres que saben a invento. Ecuador en dólares,
          Europa en euros.
        </p>
        <LocalizedClientLink href="/store">
          <Button
            variant="secondary"
            className="rounded-none border-brujo-gold/50 bg-transparent px-8 text-[11px] uppercase tracking-[0.28em] text-brujo-cream hover:bg-brujo-gold hover:text-brujo-ink"
          >
            Ver los dulces
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default Hero
