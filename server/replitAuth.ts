import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  try {
    console.log("[upsertUser] Creating/updating user with claims:", {
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"]
    });
    
    await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
    });
    
    console.log("[upsertUser] User created/updated successfully");
  } catch (error) {
    console.error("[upsertUser] Error creating/updating user:", error);
    throw error; // Re-throw to handle in auth flow
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    } catch (error) {
      console.error("[verify] Authentication error:", error);
      verified(error, null);
    }
  };

  // Register strategies for all configured domains
  const configuredDomains = process.env.REPLIT_DOMAINS!.split(",");
  for (const domain of configuredDomains) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
    console.log(`[setupAuth] Registered strategy for domain: ${domain}`);
  }
  
  // Helper function to register a new domain strategy if needed
  const registerDomainStrategy = (domain: string) => {
    if (!configuredDomains.includes(domain)) {
      console.log(`[setupAuth] Registering new strategy for domain: ${domain}`);
      const strategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      configuredDomains.push(domain);
    }
  };
  
  // Store the register function for dynamic use
  (app as any).registerDomainStrategy = registerDomainStrategy;

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    console.log("[login] Request hostname:", req.hostname);
    console.log("[login] Available domains:", process.env.REPLIT_DOMAINS);
    
    // Find the correct strategy for this hostname
    const domains = process.env.REPLIT_DOMAINS!.split(",");
    let targetDomain = req.hostname;
    
    // Check if the current hostname matches any configured domain
    if (!domains.includes(req.hostname)) {
      // Try to register this domain dynamically for deployment domains
      if (req.hostname.endsWith('.replit.app') || req.hostname.endsWith('.replit.dev')) {
        console.log("[login] Registering new deployment domain:", req.hostname);
        (app as any).registerDomainStrategy(req.hostname);
        targetDomain = req.hostname;
      } else {
        // If not a replit domain, use first domain as fallback
        console.log("[login] Hostname not found in configured domains, using first domain as fallback");
        targetDomain = domains[0];
      }
    }
    
    console.log("[login] Using target domain:", targetDomain);
    
    passport.authenticate(`replitauth:${targetDomain}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log("[callback] Request hostname:", req.hostname);
    
    // Find the correct strategy for this hostname
    const domains = process.env.REPLIT_DOMAINS!.split(",");
    let targetDomain = req.hostname;
    
    // Check if the current hostname matches any configured domain
    if (!domains.includes(req.hostname)) {
      // Try to register this domain dynamically for deployment domains
      if (req.hostname.endsWith('.replit.app') || req.hostname.endsWith('.replit.dev')) {
        console.log("[callback] Using registered deployment domain:", req.hostname);
        targetDomain = req.hostname;
      } else {
        console.log("[callback] Hostname not found in configured domains, using first domain as fallback");
        targetDomain = domains[0];
      }
    }
    
    console.log("[callback] Using target domain:", targetDomain);
    
    passport.authenticate(`replitauth:${targetDomain}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, (err: any) => {
      if (err) {
        console.error("[callback] Authentication callback error:", err);
        return res.status(500).json({ 
          message: "Authentication failed", 
          error: err.message || "Internal server error" 
        });
      }
      next();
    });
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
  
  // Debug route for troubleshooting auth issues
  app.get("/api/auth/debug", (req, res) => {
    res.json({
      hostname: req.hostname,
      configuredDomains: process.env.REPLIT_DOMAINS?.split(",") || [],
      isAuthenticated: req.isAuthenticated(),
      userAgent: req.headers['user-agent'],
      protocol: req.protocol,
      headers: {
        host: req.headers.host,
        origin: req.headers.origin,
        referer: req.headers.referer
      }
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};