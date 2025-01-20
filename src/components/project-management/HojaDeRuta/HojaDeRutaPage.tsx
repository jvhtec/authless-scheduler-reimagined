import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import HojaDeRutaForm from "./HojaDeRutaForm";

const HojaDeRutaPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log("HojaDeRuta: No session found, redirecting to auth");
          navigate('/auth');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error("HojaDeRuta: Error fetching profile:", profileError);
          throw profileError;
        }

        if (!profile || !['admin', 'logistics', 'management'].includes(profile.role)) {
          console.log("HojaDeRuta: Unauthorized access attempt");
          navigate('/dashboard');
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error("HojaDeRuta: Error in access check:", error);
        navigate('/dashboard');
      }
    };

    checkAccess();
  }, [navigate]);

  return (
    <Card className="w-full max-w-4xl mx-auto my-6">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate('/video')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-2xl font-bold">Hoja de Ruta Generator</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <HojaDeRutaForm />
      </CardContent>
    </Card>
  );
};

export default HojaDeRutaPage;