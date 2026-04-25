import { NextResponse } from "next/server"
import { getCalendarClient, getCalendarId } from "@/lib/google-calendar"

const SLOT_HOURS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
]

const GOOGLE_ENV_KEYS = [
  "GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL",
  "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  "GOOGLE_CALENDAR_ID",
]

function toIso(dateStr: string, time: string) {
  return `${dateStr}T${time}:00+08:00`
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && endA > startB
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")

    if (!date) {
      return NextResponse.json({ error: "Missing date query parameter." }, { status: 400 })
    }

    const hasGoogleConfig = GOOGLE_ENV_KEYS.every((key) => Boolean(process.env[key]))
    if (!hasGoogleConfig) {
      return NextResponse.json({
        date,
        slots: SLOT_HOURS,
        fallback: true,
        message: "Google Calendar is not configured yet. Showing default slots.",
      })
    }

    const calendar = getCalendarClient()
    const calendarId = getCalendarId()

    const dayStart = `${date}T00:00:00+08:00`
    const dayEnd = `${date}T23:59:59+08:00`

    const busyResponse = await calendar.freebusy.query({
      requestBody: {
        timeMin: dayStart,
        timeMax: dayEnd,
        timeZone: "Asia/Manila",
        items: [{ id: calendarId }],
      },
    })

    const busy = busyResponse.data.calendars?.[calendarId]?.busy || []

    const availableSlots = SLOT_HOURS.filter((slotStart) => {
      const start = toIso(date, slotStart)
      const [hour] = slotStart.split(":")
      const endHour = Number(hour) + 1
      const end = toIso(date, `${String(endHour).padStart(2, "0")}:00`)

      return !busy.some((period) => {
        if (!period.start || !period.end) return false
        return overlaps(start, end, period.start, period.end)
      })
    })

    return NextResponse.json({ date, slots: availableSlots })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load availability from Google Calendar."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
