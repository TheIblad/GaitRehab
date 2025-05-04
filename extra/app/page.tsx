import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Award, BarChart2, Calendar } from "lucide-react"

export default function Home() {
  return (
    <div className="container mx-auto space-y-12 py-6">
      {/* Hero Section */}
      <section className="space-y-6 pb-8 pt-6 md:pb-12 md:pt-10 lg:py-32">
        <div className="flex max-w-[980px] flex-col items-start gap-2">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-5xl lg:text-6xl">
            Improve Your Mobility <br className="hidden sm:inline" />
            Track Your Progress
          </h1>
          <p className="max-w-[700px] text-lg text-muted-foreground md:text-xl">
            Our gait rehabilitation platform helps you monitor your progress, set goals, and achieve better mobility
            through personalized exercises.
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/dashboard">Get Started</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/about">Learn More</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Key Features</h2>
          <p className="mx-auto mt-4 max-w-[700px] text-muted-foreground">
            Our platform offers comprehensive tools to help you track and improve your mobility.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <BarChart2 className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Progress Tracking</CardTitle>
              <CardDescription>Monitor your gait metrics and see improvements over time</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Track steps, symmetry index, and other key metrics to understand your progress and identify areas for
                improvement.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Activity Calendar</CardTitle>
              <CardDescription>Visualize your activity patterns with our calendar heatmap</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                See your daily activity at a glance and identify trends in your rehabilitation journey with our
                intuitive calendar visualization.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Award className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Achievement Badges</CardTitle>
              <CardDescription>Earn badges as you reach milestones in your rehabilitation</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Stay motivated with achievement badges that celebrate your progress and encourage consistent
                participation in your rehabilitation program.
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="text-center">
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/features">
              View All Features <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Call to Action */}
      <section className="rounded-lg bg-muted p-8 md:p-10">
        <div className="flex flex-col items-center justify-between gap-6 lg:flex-row">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tighter md:text-3xl">
              Ready to start your rehabilitation journey?
            </h2>
            <p className="max-w-[600px] text-muted-foreground">
              Create an account today and take the first step towards improved mobility.
            </p>
          </div>
          <Button size="lg" asChild>
            <Link href="/register">Sign Up Now</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
