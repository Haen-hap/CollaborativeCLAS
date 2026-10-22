import enum

from sqlalchemy import CheckConstraint, Column, Enum, ForeignKey, Integer
from sqlalchemy.orm import Relationship, validates

from app.core.database import Base


class LiteracyClassification(str, enum.Enum):
    RED = "RED"
    YELLOW = "YELLOW"
    GREEN = "GREEN"


class AssessmentResult(Base):
    __tablename__ = "assessment_results"
    __table_args__ = (
        CheckConstraint(
            "c1_visual_signs_score BETWEEN 0 AND 2",
            name="ck_assessment_results_c1_score",
        ),
        CheckConstraint(
            "c2_sentence_comprehension_score BETWEEN 0 AND 2",
            name="ck_assessment_results_c2_score",
        ),
        CheckConstraint(
            "c3_mobile_icons_score BETWEEN 0 AND 2",
            name="ck_assessment_results_c3_score",
        ),
        CheckConstraint(
            "c4_cybersecurity_score BETWEEN 0 AND 3",
            name="ck_assessment_results_c4_score",
        ),
        CheckConstraint(
            "total_literacy_score BETWEEN 0 AND 9",
            name="ck_assessment_results_total_score",
        ),
        CheckConstraint(
            "total_literacy_score = "
            "c1_visual_signs_score + c2_sentence_comprehension_score + "
            "c3_mobile_icons_score + c4_cybersecurity_score",
            name="ck_assessment_results_total_matches_components",
        ),
        CheckConstraint(
            "(total_literacy_score BETWEEN 0 AND 3 AND "
            "literacy_classification = 'RED') OR "
            "(total_literacy_score BETWEEN 4 AND 6 AND "
            "literacy_classification = 'YELLOW') OR "
            "(total_literacy_score BETWEEN 7 AND 9 AND "
            "literacy_classification = 'GREEN')",
            name="ck_assessment_results_score_classification",
        ),
    )

    session_id = Column(
        Integer,
        ForeignKey("assessment_sessions.session_id"),
        primary_key=True,
        nullable=False)
    c1_visual_signs_score = Column(Integer, nullable=False)
    c2_sentence_comprehension_score = Column(Integer, nullable=False)
    c3_mobile_icons_score = Column(Integer, nullable=False)
    c4_cybersecurity_score = Column(Integer, nullable=False)
    total_literacy_score = Column(Integer, nullable=False)
    literacy_classification = Column(
        Enum(
            LiteracyClassification,
            values_callable=lambda values: [member.value for member in values],
        ),
        nullable=False,
    )
    result = Relationship("AssessmentSession", back_populates="result", uselist=False)

    @staticmethod
    def _validate_score(value, field_name, maximum):
        if not isinstance(value, int) or isinstance(value, bool) or not 0 <= value <= maximum:
            raise ValueError(
                f"{field_name} must be an integer between 0 and {maximum}"
            )
        return value

    def _validate_total_consistency(self, pending_key, pending_value):
        fields = (
            "c1_visual_signs_score",
            "c2_sentence_comprehension_score",
            "c3_mobile_icons_score",
            "c4_cybersecurity_score",
            "total_literacy_score",
        )
        values = [
            pending_value if field == pending_key else self.__dict__.get(field)
            for field in fields
        ]
        if all(value is not None for value in values):
            component_total = sum(values[:4])
            if values[4] != component_total:
                raise ValueError(
                    "Total literacy score must equal the sum of component scores"
                )

    def _validate_component_score(self, key, value, field_name, maximum):
        validated_value = self._validate_score(value, field_name, maximum)
        self._validate_total_consistency(key, validated_value)
        self._validate_classification_consistency()
        return validated_value

    @validates("c1_visual_signs_score")
    def validate_c1_score(self, key, value):
        return self._validate_component_score(key, value, "C1 score", 2)

    @validates("c2_sentence_comprehension_score")
    def validate_c2_score(self, key, value):
        return self._validate_component_score(key, value, "C2 score", 2)

    @validates("c3_mobile_icons_score")
    def validate_c3_score(self, key, value):
        return self._validate_component_score(key, value, "C3 score", 2)

    @validates("c4_cybersecurity_score")
    def validate_c4_score(self, key, value):
        return self._validate_component_score(key, value, "C4 score", 3)

    @validates("total_literacy_score")
    def validate_total_score(self, key, value):
        validated_value = self._validate_score(value, "Total literacy score", 9)
        self._validate_total_consistency(key, validated_value)
        self._validate_classification_consistency()
        return validated_value

    @validates("literacy_classification")
    def validate_literacy_classification(self, key, value):
        if isinstance(value, LiteracyClassification):
            validated_value = value
        else:
            try:
                validated_value = LiteracyClassification(value)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"Invalid literacy classification: {value}") from exc
        self._validate_classification_consistency(validated_value)
        return validated_value

    def _validate_classification_consistency(self, pending_classification=None):
        total = self.__dict__.get("total_literacy_score")
        classification = (
            pending_classification
            if pending_classification is not None
            else self.__dict__.get("literacy_classification")
        )
        if total is None or classification is None:
            return
        expected = (
            LiteracyClassification.RED
            if total <= 3
            else LiteracyClassification.YELLOW
            if total <= 6
            else LiteracyClassification.GREEN
        )
        if classification is not expected:
            raise ValueError("Total literacy score and classification must agree")
