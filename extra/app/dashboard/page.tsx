import type { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { CalendarDays, Clock, Plus, Zap } from "lucide-react"
import ProgressChart from "@/components/progress-chart"
import CalendarHeatmap from "@/components/calendar-heatmap"
import RecentActivities from "@/components/recent-activities"
import AchievementBadges from "@/components/achievement-badges"

export const metadata: Metadata = {
  title: "Dashboard | Gait Rehabilitation",
  description: "Monitor your rehabilitation progress and activities",
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h1>
          <p className="text-muted-foreground">Monitor your rehabilitation progress and activities</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Log Activity
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Steps</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,345</div>
            <p className="text-xs text-muted-foreground">+12% from yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Symmetry Index</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <p className="text-xs text-muted-foreground">+3% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exercise Minutes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">75% of daily goal</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Days</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>
        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Progress Chart</CardTitle>
              <CardDescription>Your gait metrics over the past 30 days</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ProgressChart />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Calendar</CardTitle>
              <CardDescription>Your daily activity over the past 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <CalendarHeatmap />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>Your most recent rehabilitation activities</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentActivities />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="achievements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Achievement Badges</CardTitle>
              <CardDescription>Badges earned through your rehabilitation journey</CardDescription>
            </CardHeader>
            <CardContent>
              <AchievementBadges />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
