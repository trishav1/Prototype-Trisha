"use client"

import { motion } from "framer-motion"
import { ServiceCard } from "./service-card"

export const services = [
  {
    id: "premium-carwash",
    title: "Premium Carwash",
    description: "A thorough hand wash that cleans, protects, and leaves your paint gleaming.",
    price: "₱500",
    priceValue: 500,
    image: "/images/premium-carwash.jpg",
    features: [
      "Hand wash & dry",
      "Tire dressing & rim clean",
      "Window & mirror polish",
      "Door jambs wiped down",
    ],
  },
  {
    id: "engine-wash",
    title: "Engine Wash",
    description: "Deep clean your engine bay to remove grime, grease, and buildup.",
    price: "₱800",
    priceValue: 800,
    image: "/images/engine-wash.jpg",
    features: [
      "Full engine degreasing",
      "Pressure rinse",
      "Dressing & protection",
      "Hose & wire safe cleaning",
    ],
  },
  {
    id: "int-ext-detailing",
    title: "Full Detailing",
    description: "Complete interior and exterior deep clean for a like-new feel inside and out.",
    price: "₱2,500",
    priceValue: 2500,
    image: "/images/interior-detailing.jpg",
    features: [
      "Full vacuum & shampoo",
      "Dashboard & panel wipe",
      "Exterior hand wash & wax",
      "Leather/fabric conditioning",
    ],
    popular: true,
  },
  {
    id: "bac-2-zero",
    title: "BAC-2-Zero",
    description: "Complete sanitization and disinfection service eliminating bacteria and odors.",
    price: "₱1,500",
    priceValue: 1500,
    image: "/images/bac-2-zero.jpg",
    features: [
      "Full cabin disinfection",
      "AC vent sanitization",
      "Odor elimination treatment",
      "Anti-bacterial coating",
    ],
  },
  {
    id: "wax-buffing",
    title: "Paint Protection",
    description: "Professional waxing and buffing to restore your car's showroom shine.",
    price: "₱2,000",
    priceValue: 2000,
    image: "/images/wax-buffing.jpg",
    features: [
      "Paint decontamination",
      "Machine buffing & polishing",
      "Premium carnauba wax",
      "UV protection coating",
    ],
  },
  {
    id: "ceramic-coating",
    title: "Ceramic Coating",
    description: "Premium ceramic coating for long-lasting protection and enhanced gloss finish.",
    price: "₱15,000",
    priceValue: 15000,
    image: "/images/ceramic-coating.jpg",
    features: [
      "Paint correction prep",
      "9H ceramic application",
      "Hydrophobic finish",
      "5-year protection warranty",
    ],
  },
]

interface ServicesSectionProps {
  onBookService: (serviceId: string) => void
}

export function ServicesSection({ onBookService }: ServicesSectionProps) {
  return (
    <section id="services" className="py-24 bg-[#0A0A0A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="text-[#D4A843] text-sm font-bold tracking-[0.2em] uppercase">
            What We Offer
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white mt-4 mb-4">
            Our <span className="text-[#ED0407]">Premium</span> Services
          </h2>
          <p className="text-white/50 max-w-2xl mx-auto">
            From basic washes to complete transformations, we offer a full range of
            professional auto detailing services.
          </p>
        </motion.div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <ServiceCard
              key={service.id}
              title={service.title}
              description={service.description}
              price={service.price}
              image={service.image}
              features={service.features}
              onBook={() => onBookService(service.id)}
              index={index}
              popular={service.popular}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
