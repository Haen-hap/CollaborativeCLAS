import datetime

from app.models import *

timeline= datetime.datetime.now()

def test_create_location(db_session):
    loc = Location (country="USA", city="New York", zone_name="Zone 1")
    db_session.add(loc)
    db_session.commit()
    saved_loc= db_session.query(Location).filter_by(city="New York").first()
    assert saved_loc is not None
    assert saved_loc.id is not None
    assert saved_loc.zone_name is not None


def test_question_answers_relationship (db_session):
    assessment= Assessment(title= "Digital writing", description="Base level", assessment_type="Standard")
    db_session.add(assessment)
    db_session.commit()

    question=Questions(assessment_id=assessment.id, question_text="What is the capital of France?", question_type="single Choice")
    db_session.add(question)
    db_session.commit()

    ans1 = Answer(question_id=question.id, answer_value="Paris", is_correct=True)
    ans2= Answer(question_id=question.id, answer_value="London", is_correct=False)
    db_session.add_all([ans1, ans2])
    db_session.commit()

    db_session.refresh(question)

    assert len(question.answers) == 2
    assert ans1.question.question_text == "What is the capital of France?"


def test_assessment_sumbmission_and_result_realtionship (db_session):

 demo= DemographicProfiles(age_group="25-35",education_level="Highschool", employment_status="In work")
 assessment= Assessment(title="Digital Literacy", description="Core digital skills", assessment_type="Standard")
 loc= Location(country="USA", city="New York", zone_name="Zone 1")
 db_session.add_all([demo, assessment, loc])
 db_session.commit()

 submission= AssessmentSubmission(
     demographic_profile_id=demo.id,
     assessment_id=assessment.id,
     location_id=loc.id,
     started_at=timeline,
     completed_at=timeline,
     consent_given=True)

 db_session.add(submission)
 db_session.commit()

 result= AssessmentResult(
     submission_id=submission.id,
     literacy_score=86,
     digital_score=22,
     total_score=108,
     priority_level=1
 )
 db_session.add(result)
 db_session.commit()

 db_session.refresh(submission)

 assert submission.result is not None
 assert result.total_score == 108
 assert result.priority_level == 1

 assert result.submission_id == submission.id

 assert submission.demographic_profile.age_group == "25-35"
 assert submission.assessment.title == "Digital Literacy"
 assert submission.location.city== "New York"

