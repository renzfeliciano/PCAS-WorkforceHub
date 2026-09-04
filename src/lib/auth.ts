import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { connectMongoDB } from "@/lib/mongodb";
import { UserModel } from "@/repositories/models/user-model";
import { parseDurationMs } from "@/lib/duration";
/**
 * The server-side cutoff matches the client's full idle + warning-countdown
 * window (see IdleSessionGuard), so a "Stay signed in" click during the
 * countdown still lands inside a still-valid window and genuinely extends
 * the session, rather than the server invalidating it out from under the
 * warning that's still being shown.
 */
const idleWarnMs = parseDurationMs(process.env.SESSION_INACTIVITY_MINUTES, 30 * 60_000);
const idleTimeoutMs = parseDurationMs(process.env.SESSION_INACTIVITY_TIMEOUT, 30_000);
const inactivityMs = idleWarnMs + idleTimeoutMs;

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8, updateAge: 60 * 15 },
  pages: { signIn: "/login" },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}workforcehub.session-token`,
      options: {
        httpOnly: true,
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "PCAS-WorkforceHub",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials.password) return null;
        await connectMongoDB();
        const login = credentials.username.trim().toLowerCase();
        const user = await UserModel.findOne({
          $or: [{ username: login }, { email: login }],
          active: true,
        })
          .select("+passwordHash +activeSessionId")
          .lean();
        if (!user || !(await compare(credentials.password, user.passwordHash)))
          return null;
        const sessionId = crypto.randomUUID();
        await UserModel.updateOne(
          { _id: user._id },
          { $set: { activeSessionId: sessionId, lastActivityAt: new Date() } },
        );
        return {
          id: user._id.toString(),
          email: user.email,
          username: user.username,
          name: user.name,
          role: user.role,
          sessionId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.role = user.role;
        token.sessionId = user.sessionId;
        token.lastActivityAt = Date.now();
      }
      if (Date.now() - (token.lastActivityAt ?? 0) > inactivityMs)
        return { ...token, expired: true };
      if (token.userId && token.sessionId) {
        await connectMongoDB();
        const currentUser = await UserModel.findOne({
          _id: token.userId,
          active: true,
        })
          .select("+activeSessionId +lastActivityAt")
          .lean();
        if (!currentUser || currentUser.activeSessionId !== token.sessionId)
          return { ...token, expired: true };
      }
      token.lastActivityAt = Date.now();
      return token;
    },
    async session({ session, token }) {
      if (!token.userId || !token.role || !token.sessionId) return session;
      session.user.id = token.userId;
      session.user.role = token.role;
      session.user.sessionId = token.sessionId;
      return session;
    },
  },
};
