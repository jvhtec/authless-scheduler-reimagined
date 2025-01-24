import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Auth = () => {
  const [session, setSession] = useState<any>(null);
  const [showSignUp, setShowSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Remove dark mode class when entering auth page
  useEffect(() => {
    const originalTheme = document.documentElement.classList.contains("dark");
    document.documentElement.classList.remove("dark");

    // Restore theme when leaving auth page
    return () => {
      if (originalTheme) {
        document.documentElement.classList.add("dark");
      }
    };
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        console.log("Auth: Current session status:", !!currentSession);
        setSession(currentSession);
      } catch (error: any) {
        console.error("Auth: Session check error:", error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      console.log("Auth: Auth state changed:", _event);
      setSession(currentSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  // Use Navigate component for redirection
  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-8 md:py-12">
      <div className="container max-w-lg mx-auto flex-1 flex flex-col">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Bienvenido</h1>
          <p className="text-lg text-muted-foreground">
            al Area Tecnica Sector-Pro
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card className="p-6 w-full shadow-lg">
          {showSignUp ? (
            <SignUpForm onBack={() => setShowSignUp(false)} />
          ) : (
            <LoginForm onShowSignUp={() => setShowSignUp(true)} />
          )}
        </Card>

        <div className="mt-8 flex justify-center">
          <img 
            src="/lovable-uploads/ce3ff31a-4cc5-43c8-b5bb-a4056d3735e4.png" 
            alt="Sector Pro Logo" 
            className="h-12 w-auto opacity-80"
          />
        </div>
      </div>
    </div>
  );
};

export default Auth;