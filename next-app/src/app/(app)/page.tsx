"use client"
import { Button } from "@/components/ui/button";
// import { signOut } from "@/lib/auth";
import { useContext } from "react";
import { UserContext } from "./layout";
import axios from "axios";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";

export default function Home() {
  const session = useContext(UserContext);
  const router = useRouter();

  const handleSignOut = async () => {
    await axios.post("/api/sign-out");
    router.push("/sign-in");
  }
  
  return (
    <div className="font-[family-name:var(--font-geist-sans)] h-full w-full text-white flex flex-col items-center justify-center">
      <Avatar className="w-60 h-60 mb-8">
        <AvatarImage src={session?.user?.image as string} className="w-60 h-60"/>
      </Avatar>
      <div className="text-2xl">
        Welcome {session?.user?.email}  
      </div>

      <Button
       type="submit" 
       size={"lg"} 
       onClick={handleSignOut}
       className="mt-8 text-lg"
      >
        Sign Out
      </Button>
    </div>
  );
}
