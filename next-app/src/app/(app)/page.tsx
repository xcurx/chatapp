"use client"
import { Button } from "@/components/ui/button";
// import { signOut } from "@/lib/auth";
import { useContext } from "react";
import { UserContext } from "./layout";
import axios from "axios";
import Image from "next/image";

export default function Home() {
  const session = useContext(UserContext);
  // console.log(session?.user,"in page");

  const handleSignOut = async () => {
      await axios.post("/api/sign-out");
      window.location.reload();
  }
  
  return (
    <div className="font-[family-name:var(--font-geist-sans)] h-full w-full text-white flex flex-col">
       Welcome {session?.user?.email}
       <Image src={session?.user?.image as string} alt="user image" width={100} height={100} />

      <Button type="submit" size={"default"} onClick={handleSignOut}>Sign Out</Button>
    </div>
  );
}
