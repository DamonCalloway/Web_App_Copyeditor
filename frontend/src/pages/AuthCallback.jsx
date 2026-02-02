import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export function AuthCallback() {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      // Extract session_id from URL fragment
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace("#", ""));
      const sessionId = params.get("session_id");

      if (!sessionId) {
        toast.error("Authentication failed - no session ID");
        navigate("/login", { replace: true });
        return;
      }

      try {
        // Exchange session_id for user session
        const response = await fetch(`${API_URL}/api/auth/google/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || "Authentication failed");
        }

        const user = await response.json();
        toast.success(`Welcome, ${user.name}!`);
        
        // Clear the URL fragment and navigate to home
        window.history.replaceState({}, "", window.location.pathname);
        navigate("/", { replace: true, state: { user } });
      } catch (error) {
        toast.error(error.message);
        navigate("/login", { replace: true });
      }
    };

    processAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}
