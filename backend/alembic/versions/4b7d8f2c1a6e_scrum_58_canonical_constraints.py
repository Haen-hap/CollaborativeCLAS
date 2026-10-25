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



def rename_enum_value(type_name: str, old_value: str, new_value: str) -> None:
    op.execute(
        f"""
        DO $$
        BEGIN
            ALTER TYPE {type_name} RENAME VALUE '{old_value}' TO '{new_value}';
        EXCEPTION
            WHEN invalid_parameter_value THEN
                NULL;
        END $$;
        """
    )



def add_check_constraint_if_missing(
    table_name: str,
    constraint_name: str,
    condition: str,
) -> None:
    op.execute(
        f"""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = '{constraint_name}'
                  AND conrelid = '{table_name}'::regclass
            ) THEN
                ALTER TABLE {table_name}
                ADD CONSTRAINT {constraint_name}
                CHECK ({condition});
            END IF;
        END $$;
        """
    )



def upgrade() -> None:
    rename_enum_value("agerange", "AGE_18_24", "18_24")
    rename_enum_value("agerange", "AGE_25_34", "25_34")
    rename_enum_value("agerange", "AGE_35_49", "35_49")
    rename_enum_value("agerange", "AGE_50_59", "50_59")
    rename_enum_value("triggertype", "WIFI_CREDENTIALS", "WIFI_CREDENTIAL")


    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_type
                WHERE typname = 'literacyclassification'
            ) THEN
                CREATE TYPE literacyclassification AS ENUM
                ('RED', 'YELLOW', 'GREEN');
            END IF;
        END $$;
        """
    )

    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'assessment_results'
                  AND column_name = 'literacy_classification'
                  AND udt_name <> 'literacyclassification'
            ) THEN
                ALTER TABLE assessment_results
                ALTER COLUMN literacy_classification TYPE literacyclassification
                USING upper(literacy_classification::text)::literacyclassification;
            END IF;
        END $$;
        """
    )


    add_check_constraint_if_missing(
        "access_points",
        "ck_access_points_code",
        "code IN ('PTYK001', 'PTYK002', 'PTYK003', 'DIRECT_WEB')",
    )
    add_check_constraint_if_missing(
        "access_points",
        "ck_access_points_name",
        "trim(name) <> ''",
    )
    add_check_constraint_if_missing(
        "access_points",
        "ck_access_points_code_type",
        "(code = 'DIRECT_WEB' AND type = 'WEB') OR "
        "(code IN ('PTYK001', 'PTYK002', 'PTYK003') AND type = 'KIOSK')",
    )
    add_check_constraint_if_missing(
        "zones",
        "ck_zones_code",
        "(code = 'DECLINED' OR "
        "(code ~ '^Z[0-9]{3}$' AND substring(code FROM 2)::integer BETWEEN 1 AND 36))",
    )
    add_check_constraint_if_missing(
        "zones",
        "ck_zones_name",
        "trim(name) <> ''",
    )
    add_check_constraint_if_missing(
        "assessment_sessions",
        "ck_assessment_sessions_duration_seconds",
        "duration_seconds >= 0",
    )
    add_check_constraint_if_missing(
        "assessment_sessions",
        "ck_assessment_sessions_zone_location_declined",
        "(zone_code = 'DECLINED' AND location_declined = true) OR "
        "(zone_code <> 'DECLINED' AND location_declined = false)",
    )
    add_check_constraint_if_missing(
        "assessment_results",
        "ck_assessment_results_c1_score",
        "c1_visual_signs_score BETWEEN 0 AND 2",
    )
    add_check_constraint_if_missing(
        "assessment_results",
        "ck_assessment_results_c2_score",
        "c2_sentence_comprehension_score BETWEEN 0 AND 2",
    )
    add_check_constraint_if_missing(
        "assessment_results",
        "ck_assessment_results_c3_score",
        "c3_mobile_icons_score BETWEEN 0 AND 3",
    )
    add_check_constraint_if_missing(
        "assessment_results",
        "ck_assessment_results_c4_score",
        "c4_cybersecurity_score BETWEEN 0 AND 3",
    )
    add_check_constraint_if_missing(
        "assessment_results",
        "ck_assessment_results_total_score",
        "total_literacy_score BETWEEN 0 AND 9",
    )
    add_check_constraint_if_missing(
        "assessment_results",
        "ck_assessment_results_total_matches_components",
        "total_literacy_score = c1_visual_signs_score + "
        "c2_sentence_comprehension_score + c3_mobile_icons_score + "
        "c4_cybersecurity_score",
    )
    add_check_constraint_if_missing(
        "assessment_results",
        "ck_assessment_results_score_classification",
        "(total_literacy_score BETWEEN 0 AND 3 AND literacy_classification = 'RED') OR "
        "(total_literacy_score BETWEEN 4 AND 6 AND literacy_classification = 'YELLOW') OR "
        "(total_literacy_score BETWEEN 7 AND 9 AND literacy_classification = 'GREEN')",
    )
    add_check_constraint_if_missing(
        "rewards",
        "ck_rewards_issued_trigger_type",
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
    rename_enum_value("triggertype", "WIFI_CREDENTIAL", "WIFI_CREDENTIALS")
    rename_enum_value("agerange", "18_24", "AGE_18_24")
    rename_enum_value("agerange", "25_34", "AGE_25_34")
    rename_enum_value("agerange", "35_49", "AGE_35_49")
    rename_enum_value("agerange", "50_59", "AGE_50_59")