"use client"

import { Chart, ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

// Sample data for the chart
const data = [
  {
    name: "Steps",
    goal: 20000,
    current: 18500,
    percentage: 92.5,
  },
  {
    name: "Exercise",
    goal: 300,
    current: 240,
    percentage: 80,
  },
  {
    name: "Symmetry",
    goal: 90,
    current: 87,
    percentage: 96.7,
  },
  {
    name: "Distance",
    goal: 10,
    current: 8.2,
    percentage: 82,
  },
  {
    name: "Sessions",
    goal: 5,
    current: 4,
    percentage: 80,
  },
]

export default function WeeklyGoalsChart() {
  return (
    <ChartContainer className="h-[400px]">
      <Chart>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 60, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip content={<ChartTooltipContent />} />
            <Legend />
            <Bar dataKey="percentage" name="Completion" radius={[0, 4, 4, 0]} barSize={30}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.percentage >= 90
                      ? "hsl(var(--success))"
                      : entry.percentage >= 70
                        ? "hsl(var(--warning))"
                        : "hsl(var(--destructive))"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Chart>
    </ChartContainer>
  )
}
