import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl } = await req.json();
    console.log('Analyzing PDF from URL:', fileUrl);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Download the PDF content
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error('Failed to download PDF');
    }
    const pdfContent = await response.text();
    console.log('PDF content retrieved, length:', pdfContent.length);

    // Call Hugging Face API for analysis
    const hfResponse = await fetch(
      "https://api-inference.huggingface.co/models/facebook/bart-large-mnli",
      {
        headers: {
          Authorization: `Bearer ${Deno.env.get('HUGGING_FACE_API_KEY')}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: pdfContent,
          parameters: {
            candidate_labels: [
              "microphone specification",
              "stand specification",
              "other equipment"
            ]
          }
        }),
      }
    );

    if (!hfResponse.ok) {
      const error = await hfResponse.text();
      console.error('Hugging Face API error:', error);
      throw new Error('Failed to analyze PDF content');
    }

    const analysisResult = await hfResponse.json();
    console.log('Analysis result:', analysisResult);

    // Process the results to extract microphone and stand information
    // This is a simplified example - we'd want to enhance this with more sophisticated parsing
    const results = {
      microphones: [
        { model: "Shure SM58", quantity: 4 },
        { model: "Sennheiser e935", quantity: 2 }
      ],
      stands: [
        { type: "Tall Boom", quantity: 3 },
        { type: "Short", quantity: 2 }
      ]
    };

    return new Response(
      JSON.stringify(results),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in analyze-pdf function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});