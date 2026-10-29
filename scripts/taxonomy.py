"""Civi category taxonomy (shared idea with js/taxonomy.js and functions/_lib.js). Keyword rules, first match by priority."""
import re
RULES = [
 ("Disaster & Weather", r"typhoon|storm|flood|quake|earthquake|volcan|landslide|pagasa|phivolcs|bagyo|ndrrmc|evacuat|tsunami|signal no|el ni[nñ]o|la ni[nñ]a|habagat|amihan"),
 ("Laws & Policy", r"\blaw\b|\bbill\b|republic act|\bra \d|ordinance|executive order|memorandum|circular|supreme court|ruling|impeach|senate|house of rep|congress|veto|signed into"),
 ("Security", r"west philippine sea|\bwps\b|coast guard|military|\bafp\b|police|\bpnp\b|crime|drug|terror|nbi|shooting|scam|arrest"),
 ("Health", r"health|\bdoh\b|hospital|dengue|vaccin|disease|philhealth|outbreak|mpox|covid"),
 ("Economy & Jobs", r"peso|inflation|economy|\bgdp\b|jobs|employment|price|tariff|business|invest|\bbsp\b|stock|market|wage|\bdole\b|ofw|remittance"),
 ("Environment", r"climate|environment|denr|forest|reef|pollution|mining|wildlife|biodivers|plastic|mangrove"),
 ("Transport & Infrastructure", r"\bmrt\b|\blrt\b|jeepney|transport|\bltfrb\b|\blto\b|road|bridge|airport|railway|dpwh|flood control|power|brownout|meralco|water supply"),
 ("Education", r"school|student|deped|ched|tesda|education|teacher|universit|scholar"),
 ("Sports", r"\bpba\b|\buaap\b|\bncaa\b|basketball|volleyball|boxing|olympic|gilas|football|athlete|sea games|fiba"),
 ("Entertainment", r"actor|actress|celebrity|concert|movie|film|showbiz|kapamilya|kapuso|music|album|teleserye|netflix|award show"),
 ("Government", r"marcos|duterte|president|ombudsman|comelec|corruption|government|budget|\blgu\b|mayor|governor|cabinet|secretary|agency|election"),
 ("Community Events", r"festival|fiesta|meetup|workshop|community|volunteer|fun run|event"),
]
CATEGORIES = [r[0] for r in RULES] + ["Other"]
def categorize(text):
    t = text.lower()
    for name, p in RULES:
        if re.search(p, t): return name
    return "Other"
