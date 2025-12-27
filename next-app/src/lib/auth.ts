import NextAuth from "next-auth"
import "next-auth/jwt"
import Google from "next-auth/providers/google";

declare module "next-auth" {
    interface Session {
        user: {
            id: string
            email: string
            name: string
            image?: string
        }
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string
    }
}
 
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [Google],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // On initial sign in, sync user to database via API route
      if (account && profile?.email) {
        try {
          const response = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/sync-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: profile.email,
              name: profile.name,
              avatar: profile.picture,
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            token.id = data.id;
          }
          console.log(token)
        } catch (error) {
          console.error('Failed to sync user:', error);
        }
      }
      return token;
    },

    async session({ session, token }) {
      // Add user ID from JWT to session
      if (token.id) {
        session.user.id = token.id;
      }
      return session;
    }
 },
 pages:{
    signIn: "/sign-in",
 },
 secret: process.env.SECRET,
})