"use client"

import { Award, Calendar, Clock, Footprints, Medal, Star, Zap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const badges = [
  {
    id: 1,
    name: "First Steps",
    description: "Complete your first week of rehabilitation",
    icon: Footprints,
    color: "bg-green-500",
    earned: true,
    date: "Apr 10, 2023",
  },
  {
    id: 2,
    name: "Consistency Champion",
    description: "Complete activities for 30 consecutive days",
    icon: Calendar,
    color: "bg-blue-500",
    earned: true,
    date: "May 15, 2023",
  },
  {
    id: 3,
    name: "Symmetry Master",
    description: "Achieve 90% symmetry for 7 consecutive days",
    icon: Zap,
    color: "bg-purple-500",
    earned: true,
    date: "Jun 22, 2023",
  },
  {
    id: 4,
    name: "Marathon Milestone",
    description: "Walk a cumulative total of 100 kilometers",
    icon: Medal,
    color: "bg-amber-500",
    earned: false,
    progress: 82,
  },
  {
    id: 5,
    name: "Early Bird",
    description: "Complete 10 morning exercises before 8 AM",
    icon: Clock,
    color: "bg-red-500",
    earned: false,
    progress: 60,
  },
  {
    id: 6,
    name: "Perfect Attendance",
    description: "Attend all scheduled therapy sessions for 3 months",
    icon: Star,
    color: "bg-teal-500",
    earned: false,
    progress: 45,
  },
]

export default function AchievementBadges() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {badges.map((badge) => (
        <Card key={badge.id} className={badge.earned ? "border-primary/50" : ""}>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  badge.earned ? badge.color : "bg-muted"
                }`}
              >
                <badge.icon className={`h-6 w-6 ${badge.earned ? "text-white" : "text-muted-foreground"}`} />
              </div>
              {badge.earned && <Award className="h-5 w-5 text-primary" />}
            </div>
            <CardTitle className="text-base">{badge.name}</CardTitle>
            <CardDescription>{badge.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {badge.earned ? (
              <p className="text-xs text-muted-foreground">Earned on {badge.date}</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{badge.progress}%</span>
                </div>
                <Progress value={badge.progress} />
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
