"use client"

import { useState } from "react"
import { Chart, ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

// Sample data for the chart
const data = [
  { date: "Apr 01", steps: 2100, symmetry: 78 },
  { date: "Apr 02", steps: 2400, symmetry: 80 },
  { date: "Apr 03", steps: 1800, symmetry: 75 },
  { date: "Apr 04", steps: 2800, symmetry: 82 },
  { date: "Apr 05", steps: 3100, symmetry: 85 },
  { date: "Apr 06", steps: 2900, symmetry: 84 },
  { date: "Apr 07", steps: 3300, symmetry: 87 },
  { date: "Apr 08", steps: 3500, symmetry: 88 },
  { date: "Apr 09", steps: 3200, symmetry: 86 },
  { date: "Apr 10", steps: 3800, symmetry: 89 },
  { date: "Apr 11", steps: 4000, symmetry: 90 },
  { date: "Apr 12", steps: 3700, symmetry: 88 },
  { date: "Apr 13", steps: 3500, symmetry: 87 },
  { date: "Apr 14", steps: 4200, symmetry: 91 },
]

export default function ProgressChart() {
  const [activeMetric, setActiveMetric] = useState<"steps" | "symmetry" | "both">("both")

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeMetric === "steps" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveMetric("steps")}
        >
          Steps
        </Button>
        <Button
          variant={activeMetric === "symmetry" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveMetric("symmetry")}
        >
          Symmetry
        </Button>
        <Button
          variant={activeMetric === "both" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveMetric("both")}
        >
          Both
        </Button>
      </div>

      <ChartContainer className="h-[300px]">
        <Chart>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="steps"
                orientation="left"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 5000]}
                hide={activeMetric === "symmetry"}
              />
              <YAxis
                yAxisId="symmetry"
                orientation="right"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                domain={[50, 100]}
                hide={activeMetric === "steps"}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend />
              {(activeMetric === "steps" || activeMetric === "both") && (
                <Bar
                  yAxisId="steps"
                  dataKey="steps"
                  name="Steps"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
              )}
              {(activeMetric === "symmetry" || activeMetric === "both") && (
                <Line
                  yAxisId="symmetry"
                  type="monotone"
                  dataKey="symmetry"
                  name="Symmetry (%)"
                  stroke="hsl(var(--destructive))"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </Chart>
      </ChartContainer>
    </div>
  )
}
