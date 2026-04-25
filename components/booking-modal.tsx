"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Info, Check, ChevronLeft, ChevronRight, Star } from "lucide-react"
import { services } from "./services-section"
import { merchandise } from "./shop-section"

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  initialServiceId?: string
}

type Step = 1 | 2 | 3 | 4 | 5 | 6

const stepTitles: Record<Step, { title: string; subtitle: string }> = {
  1: { title: "YOUR PHONE", subtitle: "Your Phone" },
  2: { title: "SELECT SERVICE", subtitle: "Choose Service" },
  3: { title: "YOUR VEHICLE(S)", subtitle: "Vehicle Info" },
  4: { title: "UPGRADES & ADD-ONS", subtitle: "Customize" },
  5: { title: "PICK A DATE & TIME", subtitle: "Schedule" },
  6: { title: "CONFIRMATION", subtitle: "Complete" },
}

const vehicleMakes = [
  "Select make", "Audi", "BMW", "Chevrolet", "Ford", "Honda", "Hyundai", 
  "Isuzu", "Kia", "Mazda", "Mercedes-Benz", "Mitsubishi", "Nissan", 
  "Subaru", "Suzuki", "Toyota", "Volkswagen", "Other"
]

const vehicleTypes = [
  "SEDAN", "SUV 2-ROW", "SUV 3-ROW", "TRUCK MID", "TRUCK FULL", "VAN"
]

const yearRange = Array.from({ length: 30 }, (_, i) => (2026 - i).toString())

const upgrades = [
  {
    id: "full-detail",
    name: "Express Full Detail",
    description: "Upgrade to get both interior & exterior in one visit.",
    price: 500,
    badge: "MOST POPULAR UPGRADE",
    badgeColor: "bg-[#D4A843]",
    duration: "2 hr 45 min",
    image: "/images/interior-detailing.jpg"
  },
  {
    id: "ceramic-upgrade",
    name: "2-Step Ceramic Coating",
    description: "2-step correction + ceramic coating. Max gloss, wheel coating included. 5-year warranty.",
    price: 8000,
    badge: "ADD CERAMIC COATING",
    badgeColor: "bg-[#D4A843]",
    image: "/images/ceramic-coating.jpg"
  },
  {
    id: "engine-addon",
    name: "Engine Bay Detail",
    description: "Full engine degreasing and dressing for a like-new engine bay.",
    price: 800,
    badge: "ADD-ON",
    badgeColor: "bg-gray-600",
    duration: "45 min",
    image: "/images/engine-wash.jpg"
  }
]

export function BookingModal({ isOpen, onClose, initialServiceId }: BookingModalProps) {
  const [step, setStep] = useState<Step>(1)
  const [phone, setPhone] = useState("")
  const [selectedService, setSelectedService] = useState(initialServiceId || "")
  const [vehicleMake, setVehicleMake] = useState("")
  const [vehicleModel, setVehicleModel] = useState("")
  const [vehicleYear, setVehicleYear] = useState("")
  const [vehicleType, setVehicleType] = useState("")
  const [selectedUpgrades, setSelectedUpgrades] = useState<string[]>([])
  const [selectedShopItems, setSelectedShopItems] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState("")
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotError, setSlotError] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitNotice, setSubmitNotice] = useState("")
  const contentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [step, isOpen])

  useEffect(() => {
    if (initialServiceId) {
      setSelectedService(initialServiceId)
      setStep(1)
    }
  }, [initialServiceId])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  const handleClose = () => {
    setStep(1)
    setPhone("")
    setSelectedService(initialServiceId || "")
    setVehicleMake("")
    setVehicleModel("")
    setVehicleYear("")
    setVehicleType("")
    setSelectedUpgrades([])
    setSelectedShopItems([])
    setSelectedDate(null)
    setSelectedTime("")
    setCurrentMonth(new Date())
    setAvailableSlots([])
    setLoadingSlots(false)
    setSlotError("")
    setName("")
    setEmail("")
    setIsSubmitting(false)
    setSubmitError("")
    setSubmitNotice("")
    onClose()
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return phone.length >= 10 && name.trim().length >= 2 && email.includes("@")
      case 2:
        return selectedService !== ""
      case 3:
        return vehicleMake !== "" && vehicleMake !== "Select make" && vehicleType !== ""
      case 4:
        return true // Upgrades are optional
      case 5:
        return selectedDate !== null && selectedTime !== ""
      default:
        return true
    }
  }

  const handleContinue = async () => {
    if (!canProceed()) return

    if (step === 5) {
      setIsSubmitting(true)
      setSubmitError("")
      setSubmitNotice("")
      try {
        const selectedUpgradesData = selectedUpgrades
          .map((upgradeId) => upgrades.find((u) => u.id === upgradeId))
          .filter((upgrade): upgrade is (typeof upgrades)[number] => Boolean(upgrade))

        const response = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: name,
            customerEmail: email,
            customerPhone: phone,
            serviceTitle: selectedServiceData?.title || "",
            serviceBasePrice: selectedServiceData?.priceValue || 0,
            vehicle: {
              make: vehicleMake,
              model: vehicleModel,
              year: vehicleYear,
              type: vehicleType,
            },
            addons: [
              ...selectedUpgradesData.map((upgrade) => ({
                name: upgrade.name,
                price: upgrade.price,
              })),
              ...selectedShopItemsData.map((item) => ({
                name: item.name,
                price: item.priceValue,
              })),
            ],
            appointmentDate: selectedDate ? formatDateForApi(selectedDate) : "",
            appointmentTime: selectedTime,
            totalAmount: calculateTotal(),
          }),
        })

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}))
          throw new Error(errorPayload?.error || "Failed to submit booking.")
        }

        const result = await response.json().catch(() => null)
        if (result?.emailSent === false) {
          setSubmitNotice("Booking continued. Email delivery is pending until SMTP is configured.")
        }
        setStep(6)
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : "Failed to submit booking.")
      } finally {
        setIsSubmitting(false)
      }
      return
    }

    if (step < 6) {
      setStep((prev) => (prev + 1) as Step)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => (prev - 1) as Step)
    }
  }

  const toggleUpgrade = (id: string) => {
    setSelectedUpgrades(prev => 
      prev.includes(id) ? prev.filter(u => u !== id) : [...prev, id]
    )
  }

    const toggleShopItem = (id: string) => {
    setSelectedShopItems(prev =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    )
  }

  const selectedServiceData = services.find(s => s.id === selectedService)
  const selectedShopItemsData = selectedShopItems
    .map((itemId) => merchandise.find((item) => item.id === itemId))
    .filter((item): item is typeof merchandise[number] => Boolean(item))

  useEffect(() => {
    const loadAvailability = async () => {
      if (!selectedDate || step !== 5) return

      setLoadingSlots(true)
      setSlotError("")
      setSelectedTime("")
      try {
        const date = formatDateForApi(selectedDate)
        const response = await fetch(`/api/availability?date=${date}`)
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result?.error || "Failed to load slots.")
        }
        setAvailableSlots(result.slots || [])
      } catch (error) {
        setSlotError(error instanceof Error ? error.message : "Failed to load slots.")
        setAvailableSlots([])
      } finally {
        setLoadingSlots(false)
      }
    }

    loadAvailability()
  }, [selectedDate, step])

  // Calculate total price
  const calculateTotal = () => {
    let total = selectedServiceData?.priceValue || 0
    selectedUpgrades.forEach(upgradeId => {
      const upgrade = upgrades.find(u => u.id === upgradeId)
      if (upgrade) total += upgrade.price
    })
    selectedShopItemsData.forEach((item) => {
      total += item.priceValue
    })
    return total
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    return { daysInMonth, startingDay }
  }

  const isDateAvailable = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date >= today
  }

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
    )
  }

  const handleDateSelect = (day: number) => {
    if (isDateAvailable(day)) {
      setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))
    }
  }

  const navigateMonth = (direction: number) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + direction, 1))
  }

  const formatTimeLabel = (time24: string) => {
    const [hour, minute] = time24.split(":").map(Number)
    const ampm = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 || 12
    return `${displayHour}:${String(minute).padStart(2, "0")} ${ampm}`
  }

  const formatSelectedDate = () => {
    if (!selectedDate) return ""
    return selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }).toUpperCase()
  }

  const formatDateForApi = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            ref={contentRef}
            className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto shadow-2xl"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white p-6 pb-4 border-b border-gray-100 z-10">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-black text-gray-900">{stepTitles[step].title}</h2>
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <p className="text-gray-500 text-sm">
                Step {step} of 6 — {stepTitles[step].subtitle}
              </p>

              {/* Progress Bar */}
              <div className="flex gap-2 mt-4">
                {[1, 2, 3, 4, 5, 6].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      s <= step ? "bg-[#D4A843]" : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>

              {/* Selected Service Display */}
              {selectedServiceData && step > 1 && (
                <div className="mt-4 p-3 rounded-lg border-2 border-[#D4A843]/30 bg-[#D4A843]/5 flex items-center justify-between">
                  <span className="text-gray-500 text-sm">Selected Service</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{selectedServiceData.title}</span>
                    <span className="text-[#D4A843] font-bold">{selectedServiceData.price}</span>
                    <Info className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                {/* Step 1: Phone Number */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">Your phone number</h3>
                      <p className="text-gray-500 text-sm">We&apos;ll send your booking confirmation here.</p>
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full px-4 py-4 text-lg border-2 border-[#D4A843] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4A843]/50 text-gray-900 placeholder-gray-400"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full px-4 py-4 text-lg border-2 border-[#D4A843] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4A843]/50 text-gray-900 placeholder-gray-400"
                    />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0917 000 0000"
                      className="w-full px-4 py-4 text-lg border-2 border-[#D4A843] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4A843]/50 text-gray-900 placeholder-gray-400"
                    />
                    <p className="text-gray-400 text-xs text-center">
                      By continuing you agree to receive texts & calls about our services.
                    </p>
                  </motion.div>
                )}

                {/* Step 2: Select Service */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">Select a service</h3>
                      <p className="text-gray-500 text-sm">Choose the service you need for your vehicle.</p>
                    </div>
                    <div className="space-y-3">
                      {services.map((service) => (
                        <button
                          key={service.id}
                          onClick={() => setSelectedService(service.id)}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                            selectedService === service.id
                              ? "border-[#D4A843] bg-[#D4A843]/5"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 rounded-lg overflow-hidden ${
                                selectedService === service.id ? "ring-2 ring-[#D4A843]" : ""
                              }`}>
                                <img 
                                  src={service.image} 
                                  alt={service.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{service.title}</div>
                                <div className="text-sm text-gray-500">{service.price}</div>
                              </div>
                            </div>
                            {selectedService === service.id && (
                              <Check className="w-5 h-5 text-[#D4A843]" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Vehicle Information */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-5"
                  >
                    <p className="text-gray-500 text-sm">Tell us about your vehicle. We&apos;ll customize add-ons for each one next.</p>
                    
                    {/* Vehicle Make */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 tracking-wider mb-2">VEHICLE MAKE</label>
                      <select
                        value={vehicleMake}
                        onChange={(e) => setVehicleMake(e.target.value)}
                        className="w-full px-4 py-4 border-2 border-[#D4A843] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#D4A843]/50 text-gray-900 bg-white appearance-none cursor-pointer"
                      >
                        {vehicleMakes.map((make) => (
                          <option key={make} value={make}>{make}</option>
                        ))}
                      </select>
                    </div>

                    {/* Vehicle Model */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 tracking-wider mb-2">VEHICLE MODEL</label>
                      <input
                        type="text"
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        placeholder="Select model (optional)"
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#D4A843] text-gray-900 placeholder-gray-400"
                      />
                    </div>

                    {/* Year */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 tracking-wider mb-2">YEAR</label>
                      <select
                        value={vehicleYear}
                        onChange={(e) => setVehicleYear(e.target.value)}
                        className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#D4A843] text-gray-900 bg-white appearance-none cursor-pointer"
                      >
                        <option value="">Select year</option>
                        {yearRange.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>

                    {/* Vehicle Type */}
                    <div>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs font-bold text-gray-500 tracking-wider">VEHICLE TYPE</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {vehicleTypes.map((type) => (
                          <button
                            key={type}
                            onClick={() => setVehicleType(type)}
                            className={`p-3 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                              vehicleType === type
                                ? "border-[#D4A843] bg-[#D4A843]/5 text-gray-900"
                                : "border-gray-200 text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Upgrades & Add-ons */}
                {step === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <p className="text-gray-600 text-sm">Add upgrades, add-ons, or shop items for this vehicle.</p>

                    {/* Top Star Favorites Header */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-[#D4A843]/30" />
                      <div className="flex items-center gap-2 text-[#D4A843]">
                        <Star className="w-4 h-4 fill-[#D4A843]" />
                        <span className="text-xs font-bold tracking-wider">WAYNE&apos;S FAVORITES</span>
                      </div>
                      <div className="flex-1 h-px bg-[#D4A843]/30" />
                    </div>

                    {/* Upgrades List */}
                    <div className="space-y-4">
                      {upgrades.map((upgrade) => (
                        <div
                          key={upgrade.id}
                          className={`rounded-xl border-2 overflow-hidden transition-all ${
                            selectedUpgrades.includes(upgrade.id)
                              ? "border-[#D4A843]"
                              : "border-gray-200"
                          }`}
                        >
                          {/* Badge */}
                          <div className="flex justify-center -mb-3 relative">
                            <span className={`${upgrade.badgeColor} text-white text-[10px] font-bold px-3 py-1 rounded-full`}>
                              {upgrade.badge}
                            </span>
                          </div>

                          <div className="p-4 pt-5">
                            <div className="flex gap-4">
                              <div className="w-20 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                <img 
                                  src={upgrade.image} 
                                  alt={upgrade.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-gray-900">{upgrade.name}</h4>
                                <p className="text-gray-500 text-sm">{upgrade.description}</p>
                                {upgrade.duration && (
                                  <p className="text-gray-400 text-xs mt-1">{upgrade.duration}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-[#D4A843] font-bold">+₱{upgrade.price.toLocaleString()}</div>
                              </div>
                            </div>
                            <button
                              onClick={() => toggleUpgrade(upgrade.id)}
                              className={`w-full mt-3 py-2.5 rounded-full font-bold text-sm transition-all ${
                                selectedUpgrades.includes(upgrade.id)
                                  ? "bg-[#D4A843] text-white"
                                  : "bg-[#D4A843]/10 text-[#D4A843] hover:bg-[#D4A843]/20"
                              }`}
                            >
                              {selectedUpgrades.includes(upgrade.id) ? "SELECTED ✓" : "TAP TO SELECT"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Shop Items */}
                    <div className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">Shop Items</h3>
                          <p className="text-gray-500 text-sm">Add merchandise and products to your booking.</p>
                        </div>
                        <span className="text-xs text-gray-500 uppercase tracking-[0.2em]">Optional</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {merchandise.map((item) => {
                          const selected = selectedShopItems.includes(item.id)
                          return (
                            <button
                              key={item.id}
                              onClick={() => toggleShopItem(item.id)}
                              className={`rounded-2xl border p-4 text-left transition-all ${
                                selected ? "border-[#D4A843] bg-[#FDF7E4]" : "border-gray-200 bg-white hover:border-gray-300"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h4 className="font-bold text-gray-900">{item.name}</h4>
                                  <p className="text-gray-500 text-sm mt-1 line-clamp-2">{item.description}</p>
                                </div>
                                <span className="text-[#D4A843] font-bold">{item.price}</span>
                              </div>
                              <div className="mt-4 flex items-center justify-between">
                                <span className="text-xs uppercase tracking-[0.2em] text-gray-500">{item.category}</span>
                                <span className={`text-[11px] font-bold uppercase px-2 py-1 rounded-full ${
                                  selected ? "bg-[#D4A843] text-white" : "bg-[#F3F4F6] text-gray-700"
                                }`}>
                                  {selected ? "SELECTED" : "ADD"}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 5: Live Calendar Scheduling */}
                {step === 5 && (
                  <motion.div
                    key="step5"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="bg-gray-900 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between p-4">
                        <button
                          onClick={() => navigateMonth(-1)}
                          className="w-10 h-10 rounded-full border-2 border-[#D4A843] flex items-center justify-center text-white hover:bg-[#D4A843]/20 transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h3 className="text-white font-bold text-lg">
                          {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                        </h3>
                        <button
                          onClick={() => navigateMonth(1)}
                          className="w-10 h-10 rounded-full border-2 border-[#D4A843] flex items-center justify-center text-white hover:bg-[#D4A843]/20 transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-7 bg-white/5">
                        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((day) => (
                          <div key={day} className="p-2 text-center text-xs font-bold text-gray-400">
                            {day}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 bg-white">
                        {Array.from({ length: startingDay }).map((_, i) => (
                          <div key={`empty-${i}`} className="p-3" />
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1
                          const available = isDateAvailable(day)
                          const selected = isDateSelected(day)
                          return (
                            <button
                              key={day}
                              onClick={() => handleDateSelect(day)}
                              disabled={!available}
                              className={`p-3 text-center relative transition-all ${
                                selected
                                  ? "bg-[#D4A843] text-gray-900 font-bold"
                                  : available
                                    ? "text-gray-900 hover:bg-gray-100"
                                    : "text-gray-300"
                              }`}
                            >
                              {day}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {selectedDate && (
                      <>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-xs font-bold text-gray-500 tracking-wider">
                            {formatSelectedDate()}
                          </span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                        {loadingSlots ? (
                          <div className="text-sm text-gray-500">Loading available slots...</div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {availableSlots.map((time) => (
                              <button
                                key={time}
                                onClick={() => setSelectedTime(time)}
                                className={`p-3 rounded-xl border-2 text-center text-sm font-medium transition-all ${
                                  selectedTime === time
                                    ? "border-[#D4A843] bg-[#D4A843]/5 text-gray-900"
                                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                                }`}
                              >
                                {formatTimeLabel(time)}
                              </button>
                            ))}
                          </div>
                        )}
                        {!loadingSlots && availableSlots.length === 0 && !slotError && (
                          <p className="text-sm text-gray-500">No available slots for this date.</p>
                        )}
                      </>
                    )}
                    {slotError && <p className="text-sm text-red-600">{slotError}</p>}
                    {submitError && <p className="text-sm text-red-600">{submitError}</p>}
                    {submitNotice && <p className="text-sm text-amber-700">{submitNotice}</p>}
                  </motion.div>
                )}

                {/* Step 6: Confirmation */}
                {step === 6 && (
                  <motion.div
                    key="step6"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6 text-center"
                  >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-10 h-10 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h3>
                      <p className="text-gray-500">We&apos;ve sent a confirmation email to you and our team.</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Service</span>
                        <span className="font-semibold text-gray-900">{selectedServiceData?.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Vehicle</span>
                        <span className="font-semibold text-gray-900">{vehicleMake} {vehicleModel}</span>
                      </div>
                      {selectedUpgrades.length > 0 && (
                        <div className="flex justify-between items-start gap-4">
                          <span className="text-gray-500">Add-ons</span>
                          <span className="font-semibold text-gray-900 text-right">
                            {selectedUpgrades
                              .map((upgradeId) => upgrades.find((u) => u.id === upgradeId)?.name)
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">Schedule</span>
                        <span className="font-semibold text-gray-900">
                          {selectedDate
                            ? `${selectedDate.toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })} ${formatTimeLabel(selectedTime)}`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Phone</span>
                        <span className="font-semibold text-gray-900">{phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email</span>
                        <span className="font-semibold text-gray-900">{email}</span>
                      </div>
                      <div className="pt-3 border-t border-gray-200 flex justify-between">
                        <span className="text-gray-900 font-bold">Total</span>
                        <span className="font-bold text-[#D4A843]">₱{calculateTotal().toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400">
                      Questions? Call us at 0917-376-3348
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {(step === 4 || step === 5) && (
              <div className="sticky bottom-20 z-20 bg-white border-t border-gray-100 px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-gray-500">Total</span>
                  <span className="text-lg font-black text-[#D4A843]">
                    ₱{calculateTotal().toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="sticky bottom-0 bg-white p-6 pt-4 border-t border-gray-100">
              {step < 6 ? (
                <div className="flex items-center gap-4">
                  {step > 1 && (
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-1 text-gray-500 hover:text-gray-700 font-medium"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      BACK
                    </button>
                  )}
                  <motion.button
                    onClick={handleContinue}
                    disabled={!canProceed() || isSubmitting}
                    className={`flex-1 py-4 rounded-full font-bold text-lg transition-all ${
                      canProceed() && !isSubmitting
                        ? "bg-[#D4A843] hover:bg-[#D4A843]/90 text-gray-900"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                    whileHover={canProceed() && !isSubmitting ? { scale: 1.02 } : {}}
                    whileTap={canProceed() && !isSubmitting ? { scale: 0.98 } : {}}
                  >
                    {isSubmitting ? "SENDING..." : "CONTINUE →"}
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  onClick={handleClose}
                  className="w-full py-4 rounded-full font-bold text-lg bg-[#ED0407] hover:bg-[#ED0407]/90 text-white transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  DONE
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
