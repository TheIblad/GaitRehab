import type { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send } from "lucide-react"

export const metadata: Metadata = {
  title: "Messages | Gait Rehabilitation",
  description: "Communicate with your therapist and support team",
}

const messages = [
  {
    id: 1,
    sender: "Dr. Sarah Johnson",
    avatar: "/placeholder.svg?height=40&width=40",
    role: "Therapist",
    content: "How are you feeling after yesterday's session? Any pain or discomfort?",
    timestamp: "10:30 AM",
    isUser: false,
  },
  {
    id: 2,
    sender: "You",
    content: "I'm feeling good! A little sore in my right leg, but nothing concerning.",
    timestamp: "10:45 AM",
    isUser: true,
  },
  {
    id: 3,
    sender: "Dr. Sarah Johnson",
    avatar: "/placeholder.svg?height=40&width=40",
    role: "Therapist",
    content:
      "That's normal. Remember to do your stretching exercises before bed. I've updated your exercise plan for next week.",
    timestamp: "11:00 AM",
    isUser: false,
  },
  {
    id: 4,
    sender: "You",
    content: "Thanks! I'll check it out and let you know if I have any questions.",
    timestamp: "11:15 AM",
    isUser: true,
  },
]

export default function MessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Messages</h1>
        <p className="text-muted-foreground">Communicate with your therapist and support team</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <CardDescription>Your active message threads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <div className="flex items-center gap-3 rounded-md p-2 hover:bg-accent">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" alt="Dr. Sarah Johnson" />
                    <AvatarFallback>SJ</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium">Dr. Sarah Johnson</p>
                    <p className="truncate text-xs text-muted-foreground">Therapist</p>
                  </div>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <div className="flex items-center gap-3 rounded-md p-2 hover:bg-accent">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" alt="Dr. Michael Chen" />
                    <AvatarFallback>MC</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium">Dr. Michael Chen</p>
                    <p className="truncate text-xs text-muted-foreground">Physician</p>
                  </div>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <div className="flex items-center gap-3 rounded-md p-2 hover:bg-accent">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" alt="Support Team" />
                    <AvatarFallback>ST</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium">Support Team</p>
                    <p className="truncate text-xs text-muted-foreground">Technical Support</p>
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col md:col-span-2">
          <CardHeader className="border-b">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Dr. Sarah Johnson" />
                <AvatarFallback>SJ</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>Dr. Sarah Johnson</CardTitle>
                <CardDescription>Therapist • Online</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.isUser ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    {!message.isUser && (
                      <div className="mb-1 flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={message.avatar || "/placeholder.svg"} alt={message.sender} />
                          <AvatarFallback>
                            {message.sender
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{message.sender}</span>
                      </div>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={`mt-1 text-right text-xs ${message.isUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                    >
                      {message.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input placeholder="Type your message..." className="flex-1" />
              <Button size="icon">
                <Send className="h-4 w-4" />
                <span className="sr-only">Send message</span>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
