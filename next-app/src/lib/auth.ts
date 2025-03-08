import NextAuth from "next-auth"
import { PrismaClient } from "@prisma/client";
import Google from "next-auth/providers/google";
 
export const runtime = "nodejs"; 

const prisma = new PrismaClient()
 
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  callbacks: {
    async signIn({profile}){
        if(!profile?.email){
            throw new Error("No profile");
        }
        
        await prisma.user.upsert({
            where:{
                email: profile.email
            },
            create:{
                email: profile.email,
                name: profile.name as string,
                avatar: profile.picture as string,
            },
            update:{
                name: profile.name as string,
            },  
        })

            return true;
    },

    // async session({ session }) {
    //     if (session?.user?.email) {
    //       const dbUser = await prisma.user.findUnique({
    //         where: { email: session.user.email },
    //         select: { id: true } // Fetch only the id
    //       });
  
    //       if (dbUser) {
    //         session.user.id = dbUser.id; // Add user ID to session
    //       }
    //     }
  
    //     return session;
    // }
 },
 pages:{
    signIn: "/sign-in",
 },
 secret: process.env.SECRET,
})