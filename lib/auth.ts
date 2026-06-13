import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  // 7-day expiry (down from NextAuth's 30-day default): shorter session window
  // while still friendly to the no-email recovery model.
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/login" },
  providers: [
    // New users: nickname + one-time recovery code. The session cookie keeps
    // them logged in day-to-day; this is only hit on first sign-in / recovery.
    CredentialsProvider({
      id: "nickname",
      name: "Nickname",
      credentials: {
        nickname: { label: "Nickname", type: "text" },
      },
      // Nickname-only sign-in: if the nickname exists, you're in — no password
      // or recovery code. A deliberate zero-friction choice for this private,
      // play-money game. Legacy email accounts (incl. admin) have no nickname,
      // so they can't be reached this way and keep their email + password.
      async authorize(credentials) {
        const nickname = credentials?.nickname?.trim();
        if (!nickname) return null;
        const user = await db.user.findUnique({
          where: { nicknameLower: nickname.toLowerCase() },
        });
        if (!user) return null;
        return { id: user.id, name: user.name, role: user.role };
      },
    }),
    // Legacy: the original 4 users + admin keep email + password.
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user?.passwordHash) return null;
        const valid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!valid) return null;
        return { id: user.id, email: user.email ?? undefined, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
