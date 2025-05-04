"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin, Ruler, User, Zap } from "lucide-react"

const activities = [
  {
    id: 1,
    type: "Walking",
    date: "Today, 10:30 AM",
    duration: "45 minutes",
    steps: 4500,
    distance: "3.2 km",
    symmetry: 87,
    location: "Local Park",
  },
  {
    id: 2,
    type: "Therapy Session",
    date: "Yesterday, 2:00 PM",
    duration: "60 minutes",
    therapist: "Dr. Sarah Johnson",
    therapistAvatar: "/placeholder.svg?height=32&width=32",
    notes: "Focused on balance exercises and gait training",
  },
  {
    id: 3,
    type: "Walking",
    date: "Yesterday, 9:15 AM",
    duration: "30 minutes",
    steps: 3200,
    distance: "2.1 km",
    symmetry: 85,
    location: "Neighborhood",
  },
  {
    id: 4,
    type: "Exercise",
    date: "Apr 25, 4:30 PM",
    duration: "25 minutes",
    exercises: ["Leg raises", "Ankle rotations", "Heel slides"],
    notes: "Completed all exercises with minimal discomfort",
  },
]

export default function RecentActivities() {
  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex flex-col space-y-2 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                {activity.type === "Walking" ? (
                  <Zap className="h-4 w-4 text-primary" />
                ) : activity.type === "Therapy Session" ? (
                  <User className="h-4 w-4 text-primary" />
                ) : (
                  <Calendar className="h-4 w-4 text-primary" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-medium">{activity.type}</h4>
                <p className="text-xs text-muted-foreground">{activity.date}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              Details
            </Button>
          </div>

          <div className="grid gap-2 text-sm md:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{activity.duration}</span>
            </div>

            {activity.steps && (
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span>{activity.steps} steps</span>
              </div>
            )}

            {activity.distance && (
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-muted-foreground" />
                <span>{activity.distance}</span>
              </div>
            )}

            {activity.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{activity.location}</span>
              </div>
            )}

            {activity.therapist && (
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={activity.therapistAvatar || "/placeholder.svg"} alt={activity.therapist} />
                  <AvatarFallback>
                    {activity.therapist
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <span>{activity.therapist}</span>
              </div>
            )}
          </div>

          {activity.notes && <p className="text-sm text-muted-foreground">{activity.notes}</p>}

          {activity.exercises && (
            <div className="flex flex-wrap gap-1">
              {activity.exercises.map((exercise, index) => (
                <span key={index} className="rounded-full bg-muted px-2 py-1 text-xs">
                  {exercise}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
