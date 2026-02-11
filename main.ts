import { AuthService } from "./src/services/auth.service";
import { InMemoryUserStore } from "./src/services/user.store";
import { createConfig } from "./src/config";
import { MfaRequiredError } from "./src/errors";

async function main(): Promise<void> {
  console.log("=== Advanced Authentication System - Demo ===\n");

  const config = createConfig({
    jwt: {
      accessTokenSecret: "demo-access-secret-do-not-use-in-production",
      refreshTokenSecret: "demo-refresh-secret-do-not-use-in-production",
    },
    password: {
      minLength: 8,
    },
  });

  const userStore = new InMemoryUserStore();
  const authService = new AuthService(config, userStore);

  try {
    console.log("1. Registering a new user...");
    const registerResult = await authService.register({
      email: "demo@example.com",
      password: "SecureP@ss123!",
    });
    console.log("   User registered:", registerResult.user.email);
    console.log("   User ID:", registerResult.user.id);
    console.log("   Access token received:", registerResult.tokens.accessToken.substring(0, 20) + "...");
    console.log();

    console.log("2. Logging in...");
    const loginResult = await authService.login({
      email: "demo@example.com",
      password: "SecureP@ss123!",
    });
    console.log("   Login successful!");
    console.log("   Token expires in:", loginResult.tokens.expiresIn, "seconds");
    console.log();

    console.log("3. Verifying access token...");
    const verified = authService.verifyAccessToken(loginResult.tokens.accessToken);
    console.log("   Token valid for user:", verified.email);
    console.log("   Roles:", verified.roles.join(", "));
    console.log();

    console.log("4. Refreshing tokens...");
    const newTokens = await authService.refreshTokens(loginResult.tokens.refreshToken);
    console.log("   New access token received:", newTokens.accessToken.substring(0, 20) + "...");
    console.log();

    console.log("5. Setting up MFA...");
    const mfaSetup = await authService.setupMfa(registerResult.user.id);
    console.log("   MFA secret generated:", mfaSetup.secret.substring(0, 8) + "...");
    console.log("   OTPAuth URL:", mfaSetup.otpauthUrl.substring(0, 40) + "...");
    console.log();

    console.log("6. Changing password...");
    await authService.changePassword(
      registerResult.user.id,
      "SecureP@ss123!",
      "NewSecureP@ss456!"
    );
    console.log("   Password changed successfully!");
    console.log();

    console.log("7. Logging in with new password...");
    await authService.login({
      email: "demo@example.com",
      password: "NewSecureP@ss456!",
    });
    console.log("   Login with new password successful!");
    console.log();

    console.log("8. Testing invalid login...");
    try {
      await authService.login({
        email: "demo@example.com",
        password: "WrongPassword123!",
      });
    } catch (error) {
      if (error instanceof Error) {
        console.log("   Expected error:", error.message);
      }
    }
    console.log();

    console.log("9. Logging out...");
    await authService.logout(newTokens.refreshToken);
    console.log("   Logged out successfully!");
    console.log();

    console.log("10. Fetching user profile...");
    const profile = await authService.getUser(registerResult.user.id);
    console.log("    User:", JSON.stringify(profile, null, 4));
    console.log();

    console.log("=== Demo Complete ===");
  } catch (error) {
    if (error instanceof MfaRequiredError) {
      console.log("MFA token required for this operation");
    } else if (error instanceof Error) {
      console.error("Error:", error.message);
    }
  } finally {
    authService.destroy();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main };
