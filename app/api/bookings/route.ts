import { NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { Resend } from "resend"
import { getCalendarClient, getCalendarId } from "@/lib/google-calendar"
import {
  appendBookingToSheet,
  generateBookingId,
  formatAddons,
  formatVehicle,
  formatAppointmentDate,
  formatAppointmentTime,
  getSheetId,
} from "@/lib/google-sheets"

type Addon = {
  name: string
  price: number
}

type BookingPayload = {
  customerName: string
  customerEmail: string
  customerPhone: string
  serviceTitle: string
  serviceBasePrice: number
  vehicle: {
    make: string
    model?: string
    year?: string
    type: string
  }
  addons: Addon[]
  appointmentDate: string
  appointmentTime: string
  totalAmount: number
}

const currency = (value: number) => `PHP ${value.toLocaleString()}`

function formatSlot(date: string, time: string) {
  return `${date} ${time} (Asia/Manila)`
}

const SERVICE_DURATIONS: Record<string, number> = {
  "Express Wash": 35,
  "Express Full Detail": 60,
  "Premium Wash": 60,
  "Premium Detail": 60,
  "Executive Detail": 80,
  "Elite Detail": 105,
  "Paint Correction": 120,
  "Ceramic Coating 3yr": 480,
  "Ceramic Coating 5yr": 480,
}

const ADDON_DURATIONS: Record<string, number> = {
  "Headlight Restoration": 120,
  "Engine Bay Cleaning": 30,
  "Back to Zero Sanitation": 5,
  "Water Spot Removal": 10,
  "Quick Beads": 10,
  "Deluxe Interior Detail": 30,
}

function normalizeAddonName(addonName: string) {
  return addonName.split("(")[0].trim()
}

function getServiceDuration(serviceTitle: string): number {
  return SERVICE_DURATIONS[serviceTitle] || 60
}

function getAddonDuration(addonName: string): number {
  const normalized = normalizeAddonName(addonName)
  return ADDON_DURATIONS[normalized] || 0
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && endA > startB
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as BookingPayload

    if (
      !payload.customerEmail ||
      !payload.customerPhone ||
      !payload.serviceTitle ||
      !payload.appointmentDate ||
      !payload.appointmentTime
    ) {
      return NextResponse.json({ error: "Missing required booking fields." }, { status: 400 })
    }

    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      SMTP_FROM,
      BOOKING_OWNER_EMAIL,
      BOOKING_OWNER_EMAIL_ADDRESS,
      RESEND_API_KEY,
      RESEND_FROM_EMAIL,
    } = process.env

    const addonsText =
      payload.addons.length > 0
        ? payload.addons.map((addon) => `- ${addon.name} (${currency(addon.price)})`).join("\n")
        : "None"

    const slotLabel = formatSlot(payload.appointmentDate, payload.appointmentTime)
    const bookingText = [
      `Customer Name: ${payload.customerName || "N/A"}`,
      `Customer Email: ${payload.customerEmail}`,
      `Customer Phone: ${payload.customerPhone}`,
      "",
      `Service: ${payload.serviceTitle}`,
      `Base Price: ${currency(payload.serviceBasePrice)}`,
      `Add-ons:\n${addonsText}`,
      `Total Amount: ${currency(payload.totalAmount)}`,
      "",
      `Vehicle: ${payload.vehicle.make} ${payload.vehicle.model || ""}`.trim(),
      `Vehicle Year: ${payload.vehicle.year || "N/A"}`,
      `Vehicle Type: ${payload.vehicle.type}`,
      "",
      `Schedule: ${slotLabel}`,
    ].join("\n")

    const hasGoogleConfig =
      Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL) &&
      Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) &&
      Boolean(process.env.GOOGLE_CALENDAR_ID)

    let eventLink: string | null = null
    if (hasGoogleConfig) {
      try {
        const calendarId = getCalendarId()
        const calendar = getCalendarClient()
        const serviceDuration = getServiceDuration(payload.serviceTitle)
        const addOnDuration = payload.addons
          .map((addon) => getAddonDuration(addon.name))
          .reduce((sum, minutes) => sum + minutes, 0)
        const totalDurationMinutes = serviceDuration + addOnDuration

        const [startHourStr, startMinuteStr] = payload.appointmentTime.split(":")
        const startHour = Number(startHourStr)
        const startMinute = Number(startMinuteStr)

        const startDateTime = `${payload.appointmentDate}T${String(startHour).padStart(2, "0")}:${String(startMinute).padStart(2, "0")}:00+08:00`

        const [year, month, day] = payload.appointmentDate.split("-").map(Number)
        const appointmentDateObj = new Date(year, month - 1, day)
        const endTotalMinutes = startHour * 60 + startMinute + totalDurationMinutes
        const endDayOffset = Math.floor(endTotalMinutes / 1440)
        const endMinuteOfDay = endTotalMinutes % 1440
        const endHour = Math.floor(endMinuteOfDay / 60)
        const endMinute = endMinuteOfDay % 60

        appointmentDateObj.setDate(appointmentDateObj.getDate() + endDayOffset)
        const endDate = `${appointmentDateObj.getFullYear()}-${String(appointmentDateObj.getMonth() + 1).padStart(2, "0")}-${String(appointmentDateObj.getDate()).padStart(2, "0")}`
        const endDateTime = `${endDate}T${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}:00+08:00`

        // Check availability for the full booked duration
        const dayStart = `${payload.appointmentDate}T00:00:00+08:00`
        const dayEnd = `${payload.appointmentDate}T23:59:59+08:00`
        const eventsResponse = await calendar.events.list({
          calendarId,
          timeMin: dayStart,
          timeMax: dayEnd,
          singleEvents: true,
          orderBy: 'startTime',
        })
        const events = eventsResponse.data.items || []

        const requestedHours = Math.ceil(totalDurationMinutes / 60)
        let isAvailable = true
        const appointmentStartHour = Number(payload.appointmentTime.split(":")[0])

        for (let hour = 0; hour < requestedHours; hour++) {
          const slotStartHour = appointmentStartHour + hour
          const slotStart = `${payload.appointmentDate}T${String(slotStartHour).padStart(2, "0")}:00:00+08:00`
          const slotEnd = `${payload.appointmentDate}T${String(slotStartHour + 1).padStart(2, "0")}:00:00+08:00`

          const overlappingEvents = events.filter((event) => {
            if (!event.start?.dateTime || !event.end?.dateTime) return false
            return slotStart < event.end.dateTime && slotEnd > event.start.dateTime
          })

          if (overlappingEvents.length >= 4) {
            isAvailable = false
            break
          }
        }

        if (!isAvailable) {
          return NextResponse.json({ error: "Selected time slot is not available for the full service duration." }, { status: 400 })
        }

        const event = await calendar.events.insert({
          calendarId,
          requestBody: {
            summary: `${payload.serviceTitle} - ${payload.customerName}`,
            description: bookingText,
            start: {
              dateTime: startDateTime,
              timeZone: "Asia/Manila",
            },
            end: {
              dateTime: endDateTime,
              timeZone: "Asia/Manila",
            },
          },
        })
        eventLink = event.data.htmlLink || null
        console.log("✓ Google Calendar event created:", eventLink)
      } catch (calendarError) {
        const calendarErrorMsg = calendarError instanceof Error ? calendarError.message : "Unknown error"
        console.error("✗ Google Calendar API failed:", calendarErrorMsg)
        console.error("Full error:", calendarError)
        // Booking continues even if calendar fails - don't break the whole booking
      }
    } else {
      console.warn("⚠ Google Calendar not configured - skipping calendar sync")
    }

    const ownerEmail = BOOKING_OWNER_EMAIL || BOOKING_OWNER_EMAIL_ADDRESS || ""
    const customerSubject = "Booking Confirmation - Wayne's Detailing"
    const ownerSubject = `New Booking: ${payload.serviceTitle} - ${payload.customerName || payload.customerPhone}`
    const customerText = `Hi ${payload.customerName || "there"},\n\nYour booking has been received.\n\n${bookingText}\n\nIf you need changes, reply to this email or call 0917-376-3348.`

    let emailSent = false
    let emailProvider = ""

    if (RESEND_API_KEY && RESEND_FROM_EMAIL) {
      try {
        const resend = new Resend(RESEND_API_KEY)
        console.log("📧 Sending emails:")
        console.log("  - Customer email:", payload.customerEmail)
        console.log("  - Owner email:", ownerEmail)
        console.log("  - From:", RESEND_FROM_EMAIL)
        
        // Send customer email
        console.log("📤 Sending to customer...")
        const customerEmailResult = await resend.emails.send({
          from: RESEND_FROM_EMAIL,
          to: payload.customerEmail,
          subject: customerSubject,
          text: customerText,
        })
        console.log("Customer email result:", customerEmailResult)
        
        if (customerEmailResult.error) {
          console.error("❌ Customer email failed:", customerEmailResult.error)
        } else {
          console.log("✓ Customer email sent:", customerEmailResult.data?.id)
        }

        // Send owner email
        if (ownerEmail) {
          console.log("📤 Sending to owner...")
          const ownerEmailResult = await resend.emails.send({
            from: RESEND_FROM_EMAIL,
            to: ownerEmail,
            replyTo: payload.customerEmail,
            subject: ownerSubject,
            text: bookingText,
          })
          console.log("Owner email result:", ownerEmailResult)
          
          if (ownerEmailResult.error) {
            console.error("❌ Owner email failed:", ownerEmailResult.error)
          } else {
            console.log("✓ Owner email sent:", ownerEmailResult.data?.id)
          }
        }

        emailSent = true
        emailProvider = "resend"
        
        // Append booking to Google Sheets
        const hasGoogleSheetConfig = Boolean(process.env.GOOGLE_SHEET_ID)
        if (hasGoogleSheetConfig) {
          const bookingId = generateBookingId()
          const manilaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
          await appendBookingToSheet({
            bookingId,
            dateSubmitted: manilaTime,
            customerName: payload.customerName,
            customerEmail: payload.customerEmail,
            customerPhone: payload.customerPhone,
            service: payload.serviceTitle,
            addons: formatAddons(payload.addons),
            totalAmount: `PHP ${payload.totalAmount.toLocaleString()}`,
            vehicle: formatVehicle(payload.vehicle),
            appointmentDate: formatAppointmentDate(payload.appointmentDate),
            appointmentTime: formatAppointmentTime(payload.appointmentTime),
          })
        } else {
          console.warn("⚠ Google Sheets not configured - skipping booking record")
        }
        
        return NextResponse.json({ ok: true, emailSent: true, emailProvider: "resend", eventLink })
      } catch (resendError) {
        const errorMsg = resendError instanceof Error ? resendError.message : "Unknown error"
        console.error("✗ Resend API failed:", errorMsg)
        console.error("Full error:", resendError)
      }
    }

    if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS && SMTP_FROM) {
      try {
        const transporter = nodemailer.createTransport({
          host: SMTP_HOST,
          port: Number(SMTP_PORT),
          secure: Number(SMTP_PORT) === 465,
          auth: {
            user: SMTP_USER,
            pass: SMTP_PASS,
          },
        })

        const sends = [
          transporter.sendMail({
            from: SMTP_FROM,
            to: payload.customerEmail,
            subject: customerSubject,
            text: customerText,
          }),
        ]
        if (ownerEmail) {
          sends.push(
            transporter.sendMail({
              from: SMTP_FROM,
              to: ownerEmail,
              replyTo: payload.customerEmail,
              subject: ownerSubject,
              text: bookingText,
            }),
          )
        }
        const results = await Promise.all(sends)
        console.log("✓ Emails sent via SMTP:", {
          customerEmail: payload.customerEmail,
          ownerEmail: ownerEmail || "not configured",
        })
        emailSent = true
        emailProvider = "smtp"
        
        // Append booking to Google Sheets
        const hasGoogleSheetConfig = Boolean(process.env.GOOGLE_SHEET_ID)
        if (hasGoogleSheetConfig) {
          const bookingId = generateBookingId()
          const manilaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
          await appendBookingToSheet({
            bookingId,
            dateSubmitted: manilaTime,
            customerName: payload.customerName,
            customerEmail: payload.customerEmail,
            customerPhone: payload.customerPhone,
            service: payload.serviceTitle,
            addons: formatAddons(payload.addons),
            totalAmount: `PHP ${payload.totalAmount.toLocaleString()}`,
            vehicle: formatVehicle(payload.vehicle),
            appointmentDate: formatAppointmentDate(payload.appointmentDate),
            appointmentTime: formatAppointmentTime(payload.appointmentTime),
          })
        } else {
          console.warn("⚠ Google Sheets not configured - skipping booking record")
        }
        
        return NextResponse.json({ ok: true, emailSent: true, emailProvider: "smtp", eventLink })
      } catch (smtpError) {
        const errorMsg = smtpError instanceof Error ? smtpError.message : "Unknown error"
        console.error("✗ SMTP failed:", errorMsg)
      }
    }

    console.warn("⚠ No email provider configured. Set RESEND_* (recommended) or SMTP_* in .env.local")
    
    // Append booking to Google Sheets even if email fails
    const hasGoogleSheetConfig = Boolean(process.env.GOOGLE_SHEET_ID)
    if (hasGoogleSheetConfig) {
      const bookingId = generateBookingId()
      const manilaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
      await appendBookingToSheet({
        bookingId,
        dateSubmitted: manilaTime,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail,
        customerPhone: payload.customerPhone,
        service: payload.serviceTitle,
        addons: formatAddons(payload.addons),
        totalAmount: `PHP ${payload.totalAmount.toLocaleString()}`,
        vehicle: formatVehicle(payload.vehicle),
        appointmentDate: formatAppointmentDate(payload.appointmentDate),
        appointmentTime: formatAppointmentTime(payload.appointmentTime),
      })
    } else {
      console.warn("⚠ Google Sheets not configured - skipping booking record")
    }
    
    return NextResponse.json({
      ok: true,
      emailSent: false,
      eventLink,
      message:
        "Booking saved, but no email provider is configured. Set RESEND_* (recommended) or SMTP_* in .env.local.",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process booking."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
