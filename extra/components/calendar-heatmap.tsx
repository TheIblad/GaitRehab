"use client"

import { useState } from "react"
import { format, subMonths, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth } from "date-fns"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

// Generate sample data for the heatmap
const generateData = () => {
  const today = new Date()
  const sixMonthsAgo = subMonths(today, 6)

  const days = eachDayOfInterval({
    start: sixMonthsAgo,
    end: today,
  })

  return days.map((day) => {
    // Random activity level between 0-4
    const activityLevel = Math.floor(Math.random() * 5)
    return {
      date: format(day, "yyyy-MM-dd"),
      count: activityLevel === 0 ? 0 : Math.floor(Math.random() * 10) * activityLevel,
    }
  })
}

const activityData = generateData()

export default function CalendarHeatmap() {
  const [currentDate, setCurrentDate] = useState(new Date())

  const startDate = startOfMonth(currentDate)
  const endDate = endOfMonth(currentDate)

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  })

  const getActivityLevel = (date) => {
    const formattedDate = format(date, "yyyy-MM-dd")
    const activity = activityData.find((d) => d.date === formattedDate)
    return activity ? activity.count : 0
  }

  const getColorClass = (count) => {
    if (count === 0) return "bg-muted"
    if (count < 5) return "bg-primary/20"
    if (count < 10) return "bg-primary/40"
    if (count < 15) return "bg-primary/60"
    if (count < 20) return "bg-primary/80"
    return "bg-primary"
  }

  const previousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const nextMonth = () => {
    setCurrentDate(subMonths(currentDate, -1))
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{format(currentDate, "MMMM yyyy")}</h3>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous month</span>
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next month</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {dayNames.map((day) => (
          <div key={day} className="text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}

        {Array.from({ length: startDate.getDay() }).map((_, i) => (
          <div key={`empty-${i}`} className="h-10 rounded-md border border-transparent" />
        ))}

        {days.map((day) => {
          const activityCount = getActivityLevel(day)
          const isToday = isSameDay(day, new Date())

          return (
            <div
              key={day.toString()}
              className={`flex h-10 items-center justify-center rounded-md text-xs ${
                isToday ? "border border-primary" : "border border-transparent"
              }`}
              title={`${format(day, "MMM d, yyyy")}: ${activityCount} activities`}
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${getColorClass(activityCount)}`}>
                {format(day, "d")}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-center gap-2 pt-2">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-muted"></div>
          <span className="text-xs text-muted-foreground">None</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-primary/20"></div>
          <span className="text-xs text-muted-foreground">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-primary/60"></div>
          <span className="text-xs text-muted-foreground">Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-sm bg-primary"></div>
          <span className="text-xs text-muted-foreground">High</span>
        </div>
      </div>
    </div>
  )
}
