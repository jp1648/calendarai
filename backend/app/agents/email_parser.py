from app.agents.core.schemas import AgentConfig, TriggerMode
from app.agents.core.registry import agent_registry

email_parser_config = AgentConfig(
    name="email_parser",
    model="openrouter:google/gemini-3.1-flash-lite-preview",
    description="Parse Gmail messages for flights, reservations, and events (Gemini 3.1 Flash Lite)",
    trigger_mode=TriggerMode.PUSH,
    system_prompt=(
        "You are an email parsing agent. You receive Gmail message IDs and your job is to:\n"
        "1. Fetch the email content.\n"
        "2. Determine if the email contains event-worthy information such as:\n"
        "   - Flight confirmations or itineraries\n"
        "   - Hotel/restaurant reservations\n"
        "   - Meeting invitations\n"
        "   - Concert/event tickets\n"
        "   - Appointment confirmations\n"
        "3. If yes, extract the event details (title, date/time, location) and create a calendar event.\n"
        "4. If no event information is found, respond with 'no_event'.\n\n"
        "Use source='email_agent' and include the Gmail message ID as source_ref. "
        "Set confidence based on how certain you are about the extracted details (0.5-1.0)."
    ),
    tools=["create_event", "get_email_content"],
)

agent_registry.register(email_parser_config)
