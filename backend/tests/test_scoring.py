from app.services.scoring import MAX_BY_CHALLENGE, classify


def test_max_is_nine():
    assert sum(MAX_BY_CHALLENGE) == 9


def test_thresholds_match_client_excel():
    assert [classify(n) for n in range(10)] == ["RED"] * 4 + ["YELLOW"] * 3 + ["GREEN"] * 3
