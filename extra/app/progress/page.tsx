import type { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProgressChart from "@/components/progress-chart"
import SymmetryChart from "@/components/symmetry-chart"
import WeeklyGoalsChart from "@/components/weekly-goals-chart"

export const metadata: Metadata = {
  title: "Progress | Gait Rehabilitation",
  description: "Track your rehabilitation progress over time",
}

export default function ProgressPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Progress</h1>
        <p className="text-muted-foreground">Track your rehabilitation progress over time</p>
      </div>

      <Tabs defaultValue="steps" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="steps">Steps</TabsTrigger>
          <TabsTrigger value="symmetry">Symmetry</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
        </TabsList>
        <TabsContent value="steps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Steps</CardTitle>
              <CardDescription>Your step count over the past 30 days</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <ProgressChart />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="symmetry" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gait Symmetry</CardTitle>
              <CardDescription>Your symmetry index over the past 30 days</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <SymmetryChart />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="goals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Goals</CardTitle>
              <CardDescription>Your progress towards weekly rehabilitation goals</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              <WeeklyGoalsChart />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
