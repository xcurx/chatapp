import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { signIn } from "@/lib/auth"
import Image from "next/image"
 
export default async function SignIn() {
  return (
    <form
      action={async () => {
        "use server"
        await signIn("google",{ redirectTo: "/" })
      }}
      className="flex flex-col items-center justify-center h-screen"
    >
      <Card className="xs:w-[400px] w-[300px] m-auto p-3 flex flex-col items-center">
        <CardHeader>
          <CardTitle className="text-3xl">Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          <Button type="submit" size={"lg"} className="flex items-center gap-2 py-6">
            <Image src={"/google.svg"} width={36} height={36} alt=""/>
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </form>
  )
} 