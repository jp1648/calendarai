"""Booking category definitions — add a new category = add a dict entry."""

BOOKING_CATEGORIES: dict[str, dict] = {
    "restaurant": {
        "label": "Restaurant",
        "search_sites": ["opentable.com", "resy.com", "yelp.com"],
        "required_info": ["cuisine or restaurant name", "location/neighborhood", "date and time", "party size"],
        "default_duration_hours": 2,
        "title_template": "Dinner at {business_name}",
        "keywords": ["restaurant", "dinner", "lunch", "brunch", "food", "eat", "reservation", "table", "cuisine"],
        "providers": [
            {"name": "Resy", "method": "workflow"},
            {"name": "OpenTable", "method": "workflow"},
        ],
        "workflow_tools": ["find_restaurant", "book_restaurant"],
    },
    "doctor": {
        "label": "Doctor",
        "search_sites": ["zocdoc.com", "healthgrades.com", "webmd.com"],
        "required_info": ["specialty or reason for visit", "location", "preferred date/time", "insurance (optional)"],
        "default_duration_hours": 1,
        "title_template": "Doctor Appointment — {business_name}",
        "keywords": ["doctor", "physician", "medical", "checkup", "specialist", "dermatologist", "cardiologist"],
        "providers": [
            {"name": "Zocdoc", "method": "browser"},
        ],
    },
    "dentist": {
        "label": "Dentist",
        "search_sites": ["zocdoc.com", "yelp.com", "healthgrades.com"],
        "required_info": ["type of visit (cleaning, checkup, etc.)", "location", "preferred date/time"],
        "default_duration_hours": 1,
        "title_template": "Dentist — {business_name}",
        "keywords": ["dentist", "dental", "teeth", "cleaning", "orthodontist", "oral"],
        "providers": [
            {"name": "Zocdoc", "method": "browser"},
        ],
    },
    "haircut": {
        "label": "Haircut / Salon",
        "search_sites": ["yelp.com", "booksy.com", "vagaro.com"],
        "required_info": ["service type (haircut, color, etc.)", "location", "preferred date/time"],
        "default_duration_hours": 1,
        "title_template": "Haircut at {business_name}",
        "keywords": ["haircut", "barber", "salon", "hair", "stylist", "trim", "color"],
        "providers": [
            {"name": "Booksy", "method": "browser"},
            {"name": "Vagaro", "method": "browser"},
        ],
    },
    "auto_service": {
        "label": "Auto Service",
        "search_sites": ["yelp.com", "repairpal.com", "google.com"],
        "required_info": ["service type (oil change, inspection, etc.)", "vehicle info (optional)", "location", "preferred date/time"],
        "default_duration_hours": 2,
        "title_template": "Auto Service — {business_name}",
        "keywords": ["mechanic", "oil change", "auto", "car service", "tire", "inspection", "brake"],
        "providers": [
            {"name": "RepairPal", "method": "browser"},
        ],
    },
    "fitness": {
        "label": "Fitness Class",
        "search_sites": ["classpass.com", "mindbody.com", "yelp.com"],
        "required_info": ["class type (yoga, spin, pilates, etc.)", "location", "preferred date/time"],
        "default_duration_hours": 1,
        "title_template": "{business_name} — Fitness Class",
        "keywords": ["yoga", "spin", "pilates", "fitness class", "gym class", "crossfit", "barre"],
        "providers": [
            {"name": "Mindbody", "method": "api", "tools": ["mindbody_search_studios", "mindbody_get_classes", "mindbody_book_class"]},
            {"name": "ClassPass", "method": "browser"},
        ],
    },
}


def get_categories_for_prompt() -> str:
    """Format all booking categories as text for system prompt injection."""
    lines = ["Supported booking categories:"]
    for key, cat in BOOKING_CATEGORIES.items():
        sites = ", ".join(cat["search_sites"])
        info = ", ".join(cat["required_info"])
        line = (
            f"- **{cat['label']}** ({key}): search {sites} | ask for: {info} | "
            f"default duration: {cat['default_duration_hours']}h"
        )
        # Surface API tool info for categories that have them
        api_tools = get_api_tools_for_category(key)
        if api_tools:
            line += f" | API tools available: {', '.join(api_tools)}"
        else:
            line += " | No API — use browser_* tools or web_search"
        lines.append(line)
    return "\n".join(lines)


def get_api_tools_for_category(category: str) -> list[str]:
    """Get API tool names for a specific category, if any."""
    cat = BOOKING_CATEGORIES.get(category, {})
    tools = []
    for provider in cat.get("providers", []):
        if provider.get("method") == "api":
            tools.extend(provider.get("tools", []))
    return tools


def get_all_api_tool_names() -> list[str]:
    """Collect all API tool names across all categories."""
    tools = []
    for cat in BOOKING_CATEGORIES.values():
        for provider in cat.get("providers", []):
            if provider.get("method") == "api":
                tools.extend(provider.get("tools", []))
    return tools
