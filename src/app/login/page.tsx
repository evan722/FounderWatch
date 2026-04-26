"use client";

import { Button } from "@/components/ui/button";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { toast } from "sonner";

export default function LoginPage() {
  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // AuthProvider will automatically redirect to "/" after sign in
    } catch (error: any) {
      console.error("Google sign in error", error);
      toast.error(error.message || "Failed to sign in");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background absolute inset-0 z-50">
      <div className="max-w-md w-full p-8 bg-card border border-border/50 rounded-2xl shadow-xl text-center space-y-6">
        <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-6">
          <span className="text-primary-foreground font-bold text-xl">F</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome to FounderWatch</h1>
        <p className="text-muted-foreground">Sign in to track your high-priority founders and monitor their signals.</p>
        
        <div className="pt-4">
          <Button onClick={handleGoogleSignIn} className="w-full h-12 text-md">
            Sign in with Google
          </Button>
        </div>
      </div>
    </div>
  );
}
