# app/core/llm.py
import os

def generate_tactical_dispatch(event_type: str, severity: int) -> dict:
    """
    Core engine that maps an incident type to standard operating procedures.
    TODO: Wire up actual LLM client (Gemini/OpenAI) using os.getenv("API_KEY")
    """
    
    # Base fallback logic until LLM SDK is injected
    base_personnel = 2 * severity
    base_barricades = 1 * severity
    
    eng_text = f"Priority {severity} {event_type} detected. Deploy {base_barricades} barricades at 500m perimeter. Reroute heavy vehicles via Outer Ring Road."
    kan_text = f"ಆದ್ಯತೆ {severity} {event_type} ಪತ್ತೆಯಾಗಿದೆ. 500 ಮೀಟರ್ ಪರಿಧಿಯಲ್ಲಿ {base_barricades} ಬ್ಯಾರಿಕೇಡ್‌ಗಳನ್ನು ನಿಯೋಜಿಸಿ. ಭಾರಿ ವಾಹನಗಳನ್ನು ಹೊರ ವರ್ತುಲ ರಸ್ತೆ ಮೂಲಕ ಬೇರೆಡೆಗೆ ತಿರುಗಿಸಿ."
    
    return {
        "action_plan_english": eng_text,
        "action_plan_kannada": kan_text,
        "required_personnel": base_personnel,
        "required_barricades": base_barricades
    }
