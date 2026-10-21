"""SCRUM-58 canonical values and consistency constraints.

Revision ID: 4b7d8f2c1a6e
Revises: d866a5017df2
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4b7d8f2c1a6e"
down_revision: Union[str, Sequence[str], None] = "d866a5017df2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE agerange RENAME VALUE 'AGE_18_24' TO '18_24'")
    op.execute("ALTER TYPE agerange RENAME VALUE 'AGE_25_34' TO '25_34'")
    op.execute("ALTER TYPE agerange RENAME VALUE 'AGE_35_49' TO '35_49'")
    op.execute("ALTER TYPE agerange RENAME VALUE 'AGE_50_59' TO '50_59'")
    op.execute("ALTER TYPE triggertype RENAME VALUE 'WIFI_CREDENTIALS' TO 'WIFI_CREDENTIAL'")

    op.execute(
        "CREATE TYPE literacyclassification AS ENUM "
        "('RED', 'YELLOW', 'GREEN')"
    )
    op.execute(
        "ALTER TABLE assessment_results "
        "ALTER COLUMN literacy_classification TYPE literacyclassification "
        "USING upper(literacy_classification::text)::literacyclassification"
    )

    op.create_check_constraint(
        "ck_access_points_code",
        "access_points",
        "code IN ('PTYK001', 'PTYK002', 'PTYK003', 'DIRECT_WEB')",
    )
    op.create_check_constraint(
        "ck_access_points_name",
        "access_points",
        "trim(name) <> ''",
    )
    op.create_check_constraint(
        "ck_access_points_code_type",
        "access_points",
        "(code = 'DIRECT_WEB' AND type = 'WEB') OR "
        "(code IN ('PTYK001', 'PTYK002', 'PTYK003') AND type = 'KIOSK')",
    )
    op.create_check_constraint(
        "ck_zones_code",
        "zones",
        "(code = 'DECLINED' OR "
        "(code ~ '^Z[0-9]{3}$' AND substring(code FROM 2)::integer BETWEEN 1 AND 36))",
    )
    op.create_check_constraint(
        "ck_zones_name",
        "zones",
        "trim(name) <> ''",
    )
    op.create_check_constraint(
        "ck_assessment_sessions_duration_seconds",
        "assessment_sessions",
        "duration_seconds >= 0",
    )
    op.create_check_constraint(
        "ck_assessment_sessions_zone_location_declined",
        "assessment_sessions",
        "(zone_code = 'DECLINED' AND location_declined = true) OR "
        "(zone_code <> 'DECLINED' AND location_declined = false)",
    )
    op.create_check_constraint(
        "ck_assessment_results_c1_score",
        "assessment_results",
        "c1_visual_signs_score BETWEEN 0 AND 2",
    )
    op.create_check_constraint(
        "ck_assessment_results_c2_score",
        "assessment_results",
        "c2_sentence_comprehension_score BETWEEN 0 AND 2",
    )
    op.create_check_constraint(
        "ck_assessment_results_c3_score",
        "assessment_results",
        "c3_mobile_icons_score BETWEEN 0 AND 2",
    )
    op.create_check_constraint(
        "ck_assessment_results_c4_score",
        "assessment_results",
        "c4_cybersecurity_score BETWEEN 0 AND 3",
    )
    op.create_check_constraint(
        "ck_assessment_results_total_score",
        "assessment_results",
        "total_literacy_score BETWEEN 0 AND 9",
    )
    op.create_check_constraint(
        "ck_assessment_results_total_matches_components",
        "assessment_results",
        "total_literacy_score = c1_visual_signs_score + "
        "c2_sentence_comprehension_score + c3_mobile_icons_score + "
        "c4_cybersecurity_score",
    )
    op.create_check_constraint(
        "ck_assessment_results_score_classification",
        "assessment_results",
        "(total_literacy_score BETWEEN 0 AND 3 AND literacy_classification = 'RED') OR "
        "(total_literacy_score BETWEEN 4 AND 6 AND literacy_classification = 'YELLOW') OR "
        "(total_literacy_score BETWEEN 7 AND 9 AND literacy_classification = 'GREEN')",
    )
    op.create_check_constraint(
        "ck_rewards_issued_trigger_type",
        "rewards",
        "(issued = false AND trigger_type = 'NONE') OR "
        "(issued = true AND trigger_type <> 'NONE')",
    )


def downgrade() -> None:
    for constraint_name, table_name in (
        ("ck_rewards_issued_trigger_type", "rewards"),
        ("ck_assessment_results_score_classification", "assessment_results"),
        ("ck_assessment_results_total_matches_components", "assessment_results"),
        ("ck_assessment_results_total_score", "assessment_results"),
        ("ck_assessment_results_c4_score", "assessment_results"),
        ("ck_assessment_results_c3_score", "assessment_results"),
        ("ck_assessment_results_c2_score", "assessment_results"),
        ("ck_assessment_results_c1_score", "assessment_results"),
        ("ck_assessment_sessions_zone_location_declined", "assessment_sessions"),
        ("ck_assessment_sessions_duration_seconds", "assessment_sessions"),
        ("ck_zones_name", "zones"),
        ("ck_zones_code", "zones"),
        ("ck_access_points_code_type", "access_points"),
        ("ck_access_points_name", "access_points"),
        ("ck_access_points_code", "access_points"),
    ):
        op.drop_constraint(constraint_name, table_name, type_="check")

    op.execute(
        "ALTER TABLE assessment_results "
        "ALTER COLUMN literacy_classification TYPE VARCHAR "
        "USING literacy_classification::text"
    )
    op.execute("DROP TYPE literacyclassification")
    op.execute("ALTER TYPE triggertype RENAME VALUE 'WIFI_CREDENTIAL' TO 'WIFI_CREDENTIALS'")
    op.execute("ALTER TYPE agerange RENAME VALUE '18_24' TO 'AGE_18_24'")
    op.execute("ALTER TYPE agerange RENAME VALUE '25_34' TO 'AGE_25_34'")
    op.execute("ALTER TYPE agerange RENAME VALUE '35_49' TO 'AGE_35_49'")
    op.execute("ALTER TYPE agerange RENAME VALUE '50_59' TO 'AGE_50_59'")
