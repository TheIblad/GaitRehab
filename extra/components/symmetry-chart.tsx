"use client"

import { Chart, ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

// Sample data for the chart
const data = [
  { date: "Apr 01", symmetry: 78, target: 85 },
  { date: "Apr 02", symmetry: 80, target: 85 },
  { date: "Apr 03", symmetry: 75, target: 85 },
  { date: "Apr 04", symmetry: 82, target: 85 },
  { date: "Apr 05", symmetry: 85, target: 85 },
  { date: "Apr 06", symmetry: 84, target: 85 },
  { date: "Apr 07", symmetry: 87, target: 85 },
  { date: "Apr 08", symmetry: 88, target: 90 },
  { date: "Apr 09", symmetry: 86, target: 90 },
  { date: "Apr 10", symmetry: 89, target: 90 },
  { date: "Apr 11", symmetry: 90, target: 90 },
  { date: "Apr 12", symmetry: 88, target: 90 },
  { date: "Apr 13", symmetry: 87, target: 90 },
  { date: "Apr 14", symmetry: 91, target: 90 },
]

export default function SymmetryChart() {
  return (
    <ChartContainer className="h-[400px]">
      <Chart>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSymmetry" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis
              domain={[50, 100]}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              label={{ value: "Symmetry (%)", angle: -90, position: "insideLeft", style: { textAnchor: "middle" } }}
            />
            <Tooltip content={<ChartTooltipContent />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="symmetry"
              name="Symmetry (%)"
              stroke="hsl(var(--primary))"
              fillOpacity={1}
              fill="url(#colorSymmetry)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="target"
              name="Target (%)"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Chart>
    </ChartContainer>
  )
}
