"""Consolidate gamification schema.

Revision ID: a1b2c3d4e5f6
Revises: 8972d54398b1
"""

from typing import Sequence, Union

from alembic import op


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "8972d54398b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _add_constraint_if_missing(
    table_name: str,
    constraint_name: str,
    constraint_sql: str,
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
                {constraint_sql};
            END IF;
        END $$;
        """
    )


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE zones
        ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION
        """
    )

    op.execute(
        """
        ALTER TABLE zones
        ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS kiosks (
            code VARCHAR(20) PRIMARY KEY,
            name VARCHAR(80) NOT NULL,
            zone_code VARCHAR(4)
        )
        """
    )

    _add_constraint_if_missing(
        "kiosks",
        "fk_kiosks_zone_code_zones",
        "FOREIGN KEY (zone_code) REFERENCES zones(code)",
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_kiosks_zone_code
        ON kiosks (zone_code)
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS game_sessions (
            session_id VARCHAR(40) PRIMARY KEY,
            kiosk_id VARCHAR(20) NOT NULL,
            origin VARCHAR(10) NOT NULL DEFAULT 'UNKNOWN',
            assisted_mode BOOLEAN NOT NULL DEFAULT FALSE,
            age_range VARCHAR(10),
            work_status VARCHAR(15),
            schooling_level VARCHAR(25),
            zone_code VARCHAR(10),
            c1_visual_signs_score SMALLINT NOT NULL DEFAULT 0,
            c2_sentence_comprehension_score SMALLINT NOT NULL DEFAULT 0,
            c3_mobile_icons_score SMALLINT NOT NULL DEFAULT 0,
            c4_cybersecurity_score SMALLINT NOT NULL DEFAULT 0,
            total_literacy_score SMALLINT NOT NULL DEFAULT 0,
            internal_zone_classification VARCHAR(6) NOT NULL,
            completion_status VARCHAR(10) NOT NULL,
            last_step VARCHAR(15),
            duration_seconds INTEGER NOT NULL DEFAULT 0,
            reward_issued BOOLEAN NOT NULL DEFAULT FALSE,
            iot_trigger_type VARCHAR(20) NOT NULL DEFAULT 'NONE',
            repeat_device BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )

    _add_constraint_if_missing(
        "game_sessions",
        "fk_game_sessions_kiosk_id_kiosks",
        "FOREIGN KEY (kiosk_id) REFERENCES kiosks(code)",
    )
    _add_constraint_if_missing(
        "game_sessions",
        "ck_gs_origin",
        "CHECK (origin IN ('KIOSK', 'UNKNOWN', 'MOCK'))",
    )
    _add_constraint_if_missing(
        "game_sessions",
        "ck_gs_age_range",
        """
        CHECK (
            age_range IS NULL OR
            age_range IN ('18_24', '25_34', '35_49', '50_59', '60_PLUS')
        )
        """,
    )
    _add_constraint_if_missing(
        "game_sessions",
        "ck_gs_work_status",
        """
        CHECK (
            work_status IS NULL OR
            work_status IN ('FORMAL', 'INFORMAL', 'HOME', 'STUDENT', 'UNEMPLOYED')
        )
        """,
    )
    _add_constraint_if_missing(
        "game_sessions",
        "ck_gs_schooling_level",
        """
        CHECK (
            schooling_level IS NULL OR
            schooling_level IN (
                'PRIMARY_INCOMPLETE',
                'PRIMARY_COMPLETE',
                'SECONDARY_INCOMPLETE',
                'SECONDARY_COMPLETE',
                'TERTIARY'
            )
        )
        """,
    )
    _add_constraint_if_missing(
        "game_sessions",
        "ck_gs_zone_code",
        """
        CHECK (
            zone_code IS NULL OR
            zone_code IN (
                'Z001', 'Z002', 'Z003', 'Z004', 'Z005', 'Z006',
                'Z007', 'Z008', 'Z009', 'Z010', 'Z011', 'Z012',
                'Z013', 'Z014', 'Z015', 'Z016', 'Z017', 'Z018',
                'Z019', 'Z020', 'Z021', 'Z022', 'Z023', 'Z024',
                'Z025', 'Z026', 'Z027', 'Z028', 'Z029', 'Z030',
                'Z031', 'Z032', 'Z033', 'Z034', 'Z035', 'Z036',
                'DECLINED'
            )
        )
        """,
    )
    _add_constraint_if_missing(
        "game_sessions",
        "ck_gs_completion_status",
        "CHECK (completion_status IN ('COMPLETED', 'ABANDONED'))",
    )
    _add_constraint_if_missing(
        "game_sessions",
        "ck_gs_classification",
        "CHECK (internal_zone_classification IN ('RED', 'YELLOW', 'GREEN'))",
    )
    _add_constraint_if_missing(
        "game_sessions",
        "ck_gs_iot_type",
        """
        CHECK (
            iot_trigger_type IN (
                'NONE',
                'BEVERAGE_DISPENSER',
                'POWER_STATION',
                'WIFI_CREDENTIAL'
            )
        )
        """,
    )
    _add_constraint_if_missing(
        "game_sessions",
        "ck_gs_c1_range",
        "CHECK (c1_visual_signs_score BETWEEN 0 AND 2)",
    )
    _add_constraint_if_missing(
        "game_sessions",
        "ck_gs_c2_range",
        "CHECK (c2_sentence_comprehension_score BETWEEN 0 AND 2)",
    )
    _add_constraint_if_missing(
        "game_sessions",
        "ck_gs_c3_range",
        "CHECK (c3_mobile_icons_score BETWEEN 0 AND 2)",
    )
    _add_constraint_if_missing(
        "game_sessions",
        "ck_gs_c4_range",
        "CHECK (c4_cybersecurity_score BETWEEN 0 AND 3)",
    )
    _add_constraint_if_missing(
        "game_sessions",
        "ck_gs_total_range",
        "CHECK (total_literacy_score BETWEEN 0 AND 9)",
    )
    _add_constraint_if_missing(
        "game_sessions",
        "ck_gs_total_is_sum",
        """
        CHECK (
            total_literacy_score =
            c1_visual_signs_score +
            c2_sentence_comprehension_score +
            c3_mobile_icons_score +
            c4_cybersecurity_score
        )
        """,
    )
    _add_constraint_if_missing(
        "game_sessions",
        "ck_gs_class_matches_total",
        """
        CHECK (
            (
                total_literacy_score <= 3
                AND internal_zone_classification = 'RED'
            )
            OR (
                total_literacy_score BETWEEN 4 AND 6
                AND internal_zone_classification = 'YELLOW'
            )
            OR (
                total_literacy_score >= 7
                AND internal_zone_classification = 'GREEN'
            )
        )
        """,
    )
    _add_constraint_if_missing(
        "game_sessions",
        "ck_gs_duration_nonneg",
        "CHECK (duration_seconds >= 0)",
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_game_sessions_kiosk_id
        ON game_sessions (kiosk_id)
        """
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_game_sessions_zone_code
        ON game_sessions (zone_code)
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS visits (
            visit_id VARCHAR(40) PRIMARY KEY,
            kiosk_id VARCHAR(20) NOT NULL,
            origin VARCHAR(10) NOT NULL DEFAULT 'UNKNOWN',
            assisted_mode BOOLEAN NOT NULL DEFAULT FALSE,
            outcome VARCHAR(12) NOT NULL DEFAULT 'ENTERED',
            session_id VARCHAR(40),
            first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
        """
    )

    _add_constraint_if_missing(
        "visits",
        "fk_visits_kiosk_id_kiosks",
        "FOREIGN KEY (kiosk_id) REFERENCES kiosks(code)",
    )
    _add_constraint_if_missing(
        "visits",
        "ck_visit_origin",
        "CHECK (origin IN ('KIOSK', 'UNKNOWN'))",
    )
    _add_constraint_if_missing(
        "visits",
        "ck_visit_outcome",
        """
        CHECK (
            outcome IN ('ENTERED', 'CONSENTED', 'ABANDONED', 'COMPLETED')
        )
        """,
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_visits_kiosk_id
        ON visits (kiosk_id)
        """
    )

    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_visits_session_id
        ON visits (session_id)
        """
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS daily_counters (
            day DATE NOT NULL,
            kiosk_id VARCHAR(20) NOT NULL,
            outcome VARCHAR(16) NOT NULL,
            entries INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (day, kiosk_id, outcome)
        )
        """
    )

    _add_constraint_if_missing(
        "daily_counters",
        "fk_daily_counters_kiosk_id_kiosks",
        "FOREIGN KEY (kiosk_id) REFERENCES kiosks(code)",
    )
    _add_constraint_if_missing(
        "daily_counters",
        "ck_counter_outcome",
        """
        CHECK (outcome IN ('DECLINED_PRIVACY', 'UNDER_18'))
        """,
    )
    _add_constraint_if_missing(
        "daily_counters",
        "ck_counter_nonneg",
        "CHECK (entries >= 0)",
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS daily_counters
        """
    )

    op.execute(
        """
        DROP TABLE IF EXISTS visits
        """
    )

    op.execute(
        """
        DROP TABLE IF EXISTS game_sessions
        """
    )

    op.execute(
        """
        DROP TABLE IF EXISTS kiosks
        """
    )