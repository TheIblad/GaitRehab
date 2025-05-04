import type React from "react"
import { Inter } from "next/font/google"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import AppSidebar from "@/components/app-sidebar"
import Header from "@/components/header"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Gait Rehabilitation App",
  description: "A web application for gait rehabilitation tracking and analysis",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <SidebarProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <div className="flex flex-1">
                <AppSidebar />
                <main className="flex-1 p-4 md:p-6">{children}</main>
              </div>
              <footer className="border-t bg-background py-6">
                <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
                  <p className="text-center text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} Gait Rehabilitation. All rights reserved.
                  </p>
                  <div className="flex items-center gap-4">
                    <a href="#" className="text-muted-foreground hover:text-foreground">
                      Terms
                    </a>
                    <a href="#" className="text-muted-foreground hover:text-foreground">
                      Privacy
                    </a>
                    <a href="#" className="text-muted-foreground hover:text-foreground">
                      Contact
                    </a>
                  </div>
                </div>
              </footer>
            </div>
          </SidebarProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
