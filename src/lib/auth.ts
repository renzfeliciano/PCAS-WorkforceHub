import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare, hashSync } from "bcryptjs";

import { connectMongoDB } from "@/lib/mongodb";
import { UserModel } from "@/repositories/models/user-model";
import { getInactivityMs } from "@/lib/duration";
import { checkApiRateLimit, getClientIp } from "@/lib/rate-limit";

const inactivityMs = getInactivityMs();

// Computed once per process (not per request): compare() must run with the
// same cost regardless of whether the username exists, or response timing
// leaks which usernames are real accounts (bcrypt is deliberately slow, and
// was previously only invoked when a matching user was found).
const DUMMY_PASSWORD_HASH = hashSync("not-a-real-password", 10);

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,

  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 15,
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    CredentialsProvider({
      name: "PCAS-WorkforceHub",

      credentials: {
        username: {
          label: "Username",
          type: "text",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials, req) {
        // Brute-force resistance: this is the actual login attempt, so it
        // gets the strict "auth" tier (5/min per IP — see rate-limit.ts),
        // checked before any credential/DB work. Rejecting here returns
        // null, same as a wrong password, rather than a distinguishable
        // error — an attacker doesn't get to tell "rate limited" apart from
        // "wrong password" from the response alone.
        const ip = getClientIp(req?.headers);
        const rate = await checkApiRateLimit(`login:${ip}`, "auth");
        if (!rate.success) return null;

        // Explicit typeof checks, not just truthiness — credentials come
        // straight off the request body, and a crafted payload like
        // { username: { $ne: null } } is truthy but would otherwise reach
        // the Mongo query below as an object instead of a string (a classic
        // NoSQL operator-injection vector for login endpoints).
        if (
          typeof credentials?.username !== "string" ||
          typeof credentials.password !== "string" ||
          !credentials.username ||
          !credentials.password
        ) {
          return null;
        }

        await connectMongoDB();

        const login = credentials.username.trim().toLowerCase();

        const user = await UserModel.findOne({
          $or: [{ username: login }, { email: login }],
          active: true,
        })
          .select("+passwordHash +activeSessionId")
          .lean();

        // Always compare, even against a dummy hash when no user was found,
        // so this branch takes the same time either way.
        const passwordMatches = await compare(
          credentials.password,
          user?.passwordHash ?? DUMMY_PASSWORD_HASH,
        );
        if (!user || !passwordMatches) {
          return null;
        }

        const sessionId = crypto.randomUUID();

        await UserModel.updateOne(
          { _id: user._id },
          {
            $set: {
              activeSessionId: sessionId,
              lastActivityAt: new Date(),
            },
          },
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

      if (Date.now() - (token.lastActivityAt ?? 0) > inactivityMs) {
        return {
          ...token,
          expired: true,
          expiredReason: "idle_timeout",
        };
      }

      if (token.userId && token.sessionId) {
        await connectMongoDB();

        const currentUser = await UserModel.findOne({
          _id: token.userId,
          active: true,
        })
          .select("+activeSessionId +lastActivityAt")
          .lean();

        // A mismatch means a later sign-in (this account, another tab/device)
        // overwrote activeSessionId — this token is for a now-superseded
        // session, distinct from a plain idle timeout so the client can show
        // "signed in elsewhere" instead of a generic session-expired message.
        if (!currentUser || currentUser.activeSessionId !== token.sessionId) {
          return {
            ...token,
            expired: true,
            expiredReason: currentUser ? "concurrent_session" : "idle_timeout",
          };
        }
      }

      token.lastActivityAt = Date.now();

      return token;
    },

    async session({ session, token }) {
      if (!token.userId || !token.role || !token.sessionId) {
        return session;
      }

      // An invalidated token must not still hand back a session that looks
      // usable — client code (ConcurrentSessionGuard) checks `session.error`
      // to show an immediate "signed in elsewhere" takeover instead of
      // waiting for the user's next navigation to hit middleware.
      if (token.expired) {
        session.error =
          token.expiredReason === "concurrent_session" ? "ConcurrentSessionError" : "SessionExpired";
        return session;
      }

      session.user.id = token.userId;
      session.user.role = token.role;
      session.user.sessionId = token.sessionId;

      return session;
    },
  },
};
