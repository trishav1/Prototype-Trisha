"use client"

import { motion } from "framer-motion"
import Image from "next/image"

interface ServiceCardProps {
  title: string
  description: string
  price: string
  image: string
  features: string[]
  onBook: () => void
  index: number
  popular?: boolean
}

export function ServiceCard({ 
  title, 
  description, 
  price, 
  image,
  features,
  onBook, 
  index,
  popular
}: ServiceCardProps) {
  return (
    <motion.div
      className="group relative bg-[#111111] rounded-2xl overflow-hidden transition-all duration-500 cursor-pointer"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.05 }}
      style={{
        boxShadow: "0 0 0 1px rgba(42, 42, 42, 1)",
      }}
    >
      {/* Gold glow border on hover */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none z-20"
        style={{
          boxShadow: "0 0 20px rgba(212, 168, 67, 0.5), 0 0 40px rgba(212, 168, 67, 0.3), inset 0 0 0 2px rgba(212, 168, 67, 0.8)",
        }}
      />
      
      {/* Corner accents that glow gold on hover */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-transparent group-hover:border-[#D4A843] rounded-tl-2xl transition-all duration-500 z-30 group-hover:shadow-[0_0_10px_rgba(212,168,67,0.8)]" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-transparent group-hover:border-[#D4A843] rounded-tr-2xl transition-all duration-500 z-30 group-hover:shadow-[0_0_10px_rgba(212,168,67,0.8)]" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-transparent group-hover:border-[#D4A843] rounded-bl-2xl transition-all duration-500 z-30 group-hover:shadow-[0_0_10px_rgba(212,168,67,0.8)]" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-transparent group-hover:border-[#D4A843] rounded-br-2xl transition-all duration-500 z-30 group-hover:shadow-[0_0_10px_rgba(212,168,67,0.8)]" />

      {/* Popular Badge */}
      {popular && (
        <div className="absolute top-4 right-4 z-10 bg-[#ED0407] text-white text-xs font-bold px-3 py-1.5 rounded-md shadow-lg">
          Most Popular
        </div>
      )}

      {/* Image Container */}
      <div className="relative h-56 overflow-hidden">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="p-6 relative z-10">
        <h3 className="text-xl md:text-2xl font-bold text-white mb-3 group-hover:text-[#D4A843] transition-colors duration-300">
          {title}
        </h3>
        <p className="text-white/60 text-sm leading-relaxed mb-5">
          {description}
        </p>

        {/* Features List */}
        <ul className="space-y-2.5 mb-6">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-3 text-sm text-white/80">
              <span className="text-[#ED0407] mt-1 flex-shrink-0 group-hover:text-[#D4A843] transition-colors duration-300">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                  <path d="M5 0L6.12 3.88L10 5L6.12 6.12L5 10L3.88 6.12L0 5L3.88 3.88L5 0Z" />
                </svg>
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-5">
          <span className="text-white/50 text-xs tracking-wider uppercase">Starting at</span>
          <span className="text-[#D4A843] font-bold text-2xl">{price}</span>
        </div>

        {/* Book Button */}
        <motion.button
          onClick={onBook}
          className="w-full bg-[#ED0407] hover:bg-[#ED0407]/90 text-white py-3.5 rounded-md font-bold text-sm tracking-wider transition-all"
          whileTap={{ scale: 0.98 }}
        >
          BOOK NOW
        </motion.button>
      </div>
    </motion.div>
  )
}
