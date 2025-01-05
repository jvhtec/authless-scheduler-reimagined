import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  jobTitle: string;
  technicianName: string;
  startTime: string;
  location: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, jobTitle, technicianName, startTime, location }: EmailRequest = await req.json();

    const html = `
      <h2>Job Assignment Confirmation Required</h2>
      <p>Hello ${technicianName},</p>
      <p>You have been invited to work on the following job:</p>
      <ul>
        <li><strong>Job:</strong> ${jobTitle}</li>
        <li><strong>Start Time:</strong> ${startTime}</li>
        <li><strong>Location:</strong> ${location}</li>
      </ul>
      <p>Please log in to your dashboard to confirm your availability for this assignment.</p>
      <p>Best regards,<br>Your Management Team</p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Job Assignments <notifications@yourdomain.com>",
        to: [to],
        subject: `Job Assignment: ${jobTitle} - Confirmation Required`,
        html: html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Error sending email:", error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-assignment-email function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);