import ChatRoom from "@/components/Features/ChatRoom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const page = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-900 to-yellow-900">
      <Card className="bg-white/20 backdrop-blur-md border-none">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Join Room</CardTitle>
        </CardHeader>
        <CardContent>
          <ChatRoom />
        </CardContent>
      </Card>
    </div>
  )
}

export default page