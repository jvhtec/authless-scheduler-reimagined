import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.6.4';

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
    console.log('Starting PDF analysis for URL:', fileUrl);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Download the PDF content
    console.log('Downloading PDF from URL...');
    const response = await fetch(fileUrl);
    if (!response.ok) {
      console.error('Failed to download PDF:', response.status, response.statusText);
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }

    // Get the PDF content as text
    const pdfContent = await response.text();
    console.log('PDF content retrieved, length:', pdfContent.length);

    // Initialize Hugging Face client
    const hf = new HfInference(Deno.env.get('HUGGING_FACE_API_KEY'));

    // Use Question-Answering model to extract information
    const questions = [
      "What microphones are listed and their quantities?",
      "What microphone stands are listed and their quantities?"
    ];

    // Process each question
    const results = await Promise.all(questions.map(async (question) => {
      const result = await hf.questionAnswering({
        model: 'deepset/roberta-base-squad2',
        inputs: {
          question: question,
          context: pdfContent
        }
      });
      return { question, answer: result.answer };
    }));

    console.log('Analysis results:', results);

    // Parse the results into the expected format
    const microphones = [];
    const stands = [];

    // Process microphone results
    const micAnswer = results[0].answer;
    const micMatches = micAnswer.match(/(\d+)\s*x?\s*([\w\s-]+?)(?=\d|$)/g) || [];
    micMatches.forEach(match => {
      const [_, quantity, model] = match.match(/(\d+)\s*x?\s*([\w\s-]+)/) || [];
      if (quantity && model) {
        microphones.push({
          model: model.trim(),
          quantity: parseInt(quantity, 10)
        });
      }
    });

    // Process stand results
    const standAnswer = results[1].answer;
    const standMatches = standAnswer.match(/(\d+)\s*x?\s*([\w\s-]+?)(?=\d|$)/g) || [];
    standMatches.forEach(match => {
      const [_, quantity, type] = match.match(/(\d+)\s*x?\s*([\w\s-]+)/) || [];
      if (quantity && type) {
        stands.push({
          type: type.trim(),
          quantity: parseInt(quantity, 10)
        });
      }
    });

    const finalResults = {
      microphones: microphones.length > 0 ? microphones : [],
      stands: stands.length > 0 ? stands : []
    };

    console.log('Sending final results:', finalResults);

    return new Response(
      JSON.stringify(finalResults),
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