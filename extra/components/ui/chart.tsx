import * as React from "react"

const ChartContainer = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className="rounded-md border bg-card text-card-foreground shadow-sm data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
        {...props}
      />
    )
  },
)
ChartContainer.displayName = "ChartContainer"

const Chart = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => {
  return <div ref={ref} className="p-4" {...props} />
})
Chart.displayName = "Chart"

interface ChartTooltipContentProps {
  payload: any[]
  label: string
  formatter?: (value: any, name: string) => string
}

const ChartTooltipContent: React.FC<ChartTooltipContentProps> = ({ payload, label, formatter }) => {
  if (!payload || payload.length === 0) {
    return null
  }

  return (
    <div className="rounded-md border bg-popover p-4 text-popover-foreground shadow-md">
      <div className="mb-2 text-sm font-medium">{label}</div>
      <ul className="list-none space-y-1">
        {payload.map((item, index) => (
          <li key={index} className="flex items-center justify-between text-xs">
            <span className="mr-2">{item.name}:</span>
            <span>{formatter ? formatter(item.value, item.name) : item.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const ChartTooltip = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className="rounded-md border bg-popover p-4 text-popover-foreground shadow-md" {...props} />
  },
)
ChartTooltip.displayName = "ChartTooltip"

export { Chart, ChartContainer, ChartTooltip, ChartTooltipContent }
