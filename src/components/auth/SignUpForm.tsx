import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Department } from "@/types/department";
import { SignUpFormFields } from "./signup/SignUpFormFields";
import { SignUpFormActions } from "./signup/SignUpFormActions";

interface SignUpFormData {
  email: string;
  password: string;
  name: string;
  phone: string;
  department: Department;
  dni: string;
  residencia: string;
}

export const SignUpForm = ({ onBack }: { onBack: () => void }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SignUpFormData>({
    email: "",
    password: "",
    name: "",
    phone: "",
    department: "sound",
    dni: "",
    residencia: "",
  });

  const handleFormChange = (field: keyof SignUpFormData, value: string | Department) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("Starting signup process with email:", formData.email);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.toLowerCase(),
        password: formData.password,
        options: {
          data: {
            first_name: formData.name.split(' ')[0],
            last_name: formData.name.split(' ').slice(1).join(' '),
            phone: formData.phone,
            department: formData.department,
            dni: formData.dni,
            residencia: formData.residencia,
          },
        },
      });

      if (authError) {
        console.error("Auth error:", authError);
        throw authError;
      }

      // If this is the super user, update their role to admin
      if (formData.email.toLowerCase() === 'sonido@sector-pro.com') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('email', formData.email.toLowerCase());

        if (updateError) {
          console.error("Error updating role:", updateError);
          throw updateError;
        }
      }

      console.log("Signup completed successfully");

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });

      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);
    } catch (error: any) {
      console.error("Error during signup:", error);
      toast({
        title: "Error",
        description: error.message || "There was an error creating your account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      <SignUpFormFields 
        formData={formData}
        onChange={handleFormChange}
      />
      <SignUpFormActions 
        loading={loading}
        onBack={onBack}
      />
    </form>
  );
};