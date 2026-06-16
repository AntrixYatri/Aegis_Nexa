# app/services/llm_service.py
import os
from google import genai
from google.genai import types

class IntelligenceService:
    @staticmethod
    def generate_dispatch_orders(event_type: str, severity: int) -> dict:
        """
        Connects directly to the Gemini API to produce dynamic, dual-language 
        Standard Operating Procedures for the Bengaluru Traffic Police.
        """
        # Initialize client - automatically looks for GEMINI_API_KEY in your .env file
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            # Safe local fallback if your API key isn't set up yet during the hackathon
            return IntelligenceService._get_fallback_orders(event_type, severity)
            
        client = genai.Client(api_key=api_key)
        
        prompt = f"""
        You are the AI Command Core for the Bengaluru Traffic Police (BTP). 
        An incident of type '{event_type}' with a severity scale of {severity}/10 has occurred.
        
        Generate an operational response plan containing exactly:
        1. Action Plan English: Clear, concise tactical instructions for field officers.
        2. Action Plan Kannada: A mathematically and contextually accurate translation of the English instructions for localized precinct radio relays.
        3. Required Personnel: Estimated number of traffic cops needed (integer).
        4. Required Barricades: Estimated number of physical barricades needed (integer).
        
        Format the output exactly as a clean JSON object with these keys:
        "action_plan_english", "action_plan_kannada", "required_personnel", "required_barricades"
        Do not include markdown blocks or wrappers. Return raw JSON text only.
        """
        
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            
            # Parse the structured JSON response from the model string
            import json
            return json.loads(response.text)
            
        except Exception as e:
            print(f"Gemini API Exception caught: {e}. Dropping back to tactical fallback rules.")
            return IntelligenceService._get_fallback_orders(event_type, severity)

    @staticmethod
    def _get_fallback_orders(event_type: str, severity: int) -> dict:
        """Deterministic safety routine if API limits hit or keys missing."""
        return {
            "action_plan_english": f"[BTP FALLBACK] Priority {severity} {event_type} event active. Maintain perimeter safety controls.",
            "action_plan_kannada": f"[BTP ಫಾಲ್‌ಬ್ಯಾಕ್] ಆದ್ಯತೆ {severity} {event_type} ಸಕ್ರಿಯವಾಗಿದೆ. ಸುರಕ್ಷತಾ ನಿಯಂತ್ರಣಗಳನ್ನು ನಿರ್ವಹಿಸಿ.",
            "required_personnel": severity * 2,
            "required_barricades": severity
        }
    
    