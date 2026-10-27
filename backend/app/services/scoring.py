from collections.abc import Iterable

from app.models.assessment_results import LiteracyClassification


MAX_BY_CHALLENGE = (2, 2, 2, 3)


def calculate_score(scores: Iterable[int]) -> int:
    values = tuple(scores)
    if len(values) != len(MAX_BY_CHALLENGE):
        raise ValueError("Expected one score for each challenge")
    if any(score < 0 or score > maximum for score, maximum in zip(values, MAX_BY_CHALLENGE)):
        raise ValueError("Score is outside the canonical range")
    return sum(values)


def classify(total: int) -> LiteracyClassification:
    if total <= 3:
        return LiteracyClassification.RED
    if total <= 6:
        return LiteracyClassification.YELLOW
    return LiteracyClassification.GREEN
