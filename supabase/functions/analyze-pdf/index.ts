import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.6.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl } = await req.json();
    console.log('Starting PDF analysis for URL:', fileUrl);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Downloading PDF from URL...');
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }

    const pdfContent = await response.text();
    console.log('PDF content retrieved, length:', pdfContent.length);

    const hf = new HfInference(Deno.env.get('HUGGING_FACE_API_KEY'));

    // First, let's analyze the overall content to identify sections
    const sectionAnalysis = await hf.questionAnswering({
      model: 'deepset/roberta-base-squad2',
      inputs: {
        question: "What sections or categories of equipment are listed in this document?",
        context: pdfContent
      }
    });

    console.log('Section analysis:', sectionAnalysis);

    // Now let's analyze microphones with more specific questions
    const micAnalysis = await hf.questionAnswering({
      model: 'deepset/roberta-base-squad2',
      inputs: {
        question: "List all microphones with their exact quantities, including specific models and numbers.",
        context: pdfContent
      }
    });

    console.log('Microphone analysis:', micAnalysis);

    // Analyze stands separately
    const standAnalysis = await hf.questionAnswering({
      model: 'deepset/roberta-base-squad2',
      inputs: {
        question: "List all microphone stands and their quantities, including types (straight, boom, etc).",
        context: pdfContent
      }
    });

    console.log('Stand analysis:', standAnalysis);

    // Parse microphone results
    const micResults = micAnalysis.answer.split(',').map(item => {
      const match = item.trim().match(/(\d+)\s*x?\s*([\w\s-]+)/i);
      if (match) {
        return {
          quantity: parseInt(match[1]),
          model: match[2].trim()
        };
      }
      return null;
    }).filter(Boolean);

    // Parse stand results
    const standResults = standAnalysis.answer.split(',').map(item => {
      const match = item.trim().match(/(\d+)\s*x?\s*([\w\s-]+)/i);
      if (match) {
        return {
          quantity: parseInt(match[1]),
          type: match[2].trim()
        };
      }
      return null;
    }).filter(Boolean);

    const results = {
      microphones: micResults,
      stands: standResults,
      rawAnalysis: {
        sections: sectionAnalysis.answer,
        microphones: micAnalysis.answer,
        stands: standAnalysis.answer
      }
    };

    console.log('Final analysis results:', results);

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
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
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