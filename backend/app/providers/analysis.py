"""Conservative bilingual heuristics; never substitute for a PM's review."""
import re


CLAUSE_BOUNDARY = re.compile(r'[,;.!?]|\b(?:but|however|pero|sin embargo)\b', re.I)
NEGATION = re.compile(r'\b(?:no|not|without|sin|ningún|ningun|ninguna)\b(?:\W+\w+){0,4}\W*$', re.I)
RESOLVED = re.compile(r'^\W*(?:(?:is|was|has been|está|fue|ha sido)\s+)?(?:resolved|cleared|resuelt[oa]s?|solucionad[oa]s?)\b', re.I)


def affirmed(pattern: str, text: str) -> bool:
    """Suppress local negations, not other independent signals in the same sentence."""
    for match in re.finditer(pattern, text, re.I):
        before = CLAUSE_BOUNDARY.split(text[:match.start()])[-1]
        if NEGATION.search(before) and not re.search(r'\b(?:not only|no solo)\b', before, re.I):
            continue
        if RESOLVED.search(text[match.end():]):
            continue
        return True
    return False


def reported_progress(text: str) -> bool:
    pattern = r'\b(completed|delivered|approved|finished|validated|finalizad\w*|completad\w*|entregad\w*|aprobad\w*|validad\w*)\b'
    return reported_fact(pattern, text)


def recorded_decision(text: str) -> bool:
    return reported_fact(r'\b(approved|agreed|decided|aprobad\w*|se acordó|se decidió)\b', text)


def reported_fact(pattern: str, text: str) -> bool:
    if not affirmed(pattern, text):
        return False
    # Examine each clause so future work does not erase an independent completed result.
    for clause in CLAUSE_BOUNDARY.split(text):
        if affirmed(pattern, clause) and not re.search(r'\b(will|must|should|needs? to|to be|debe\w*|será|pendiente|previsto)\b', clause, re.I):
            return True
    return False


def action_owner(text: str) -> str | None:
    match = re.match(r"(?P<owner>[^\W\d_][\wÀ-ÿ .'-]{1,60}?)\s+(?:must|will|should|debe(?:rá)?|tiene que)\b", text, re.I)
    return match['owner'].strip() if match else None


def action_deadline(text: str) -> str | None:
    date = r'\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{2,4}|(?:next\s+)?(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)|(?:próximo\s+)?(?:lunes|martes|miércoles|jueves|viernes|sábado|domingo)'
    match = re.search(r'\b(?:by|before|due(?: on)?|para(?: el)?|antes de(?:l)?)\s+(?P<date>' + date + r')\b', text, re.I)
    return match['date'] if match else None
