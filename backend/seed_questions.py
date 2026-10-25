from app.core.database import SessionLocal
from app.models.questions import Question
from app.models.question_options import QuestionOption


QUESTIONS = [
    {
        "category": "R1",
        "question_text": "Which sign means you cannot park here?",
        "options": [
            {"text": "No parking sign", "correct": True},
            {"text": "Bus stop sign", "correct": False},
            {"text": "Hospital sign", "correct": False},
        ],
    },
    {
        "category": "R1",
        "question_text": "Which word means a place where you can buy food?",
        "options": [
            {"text": "Library", "correct": False},
            {"text": "Market", "correct": True},
            {"text": "Airport", "correct": False},
        ],
    },
    {
        "category": "R2",
        "question_text": "Choose the correct sentence.",
        "options": [
            {"text": "I am hungry.", "correct": True},
            {"text": "I hungry am.", "correct": False},
            {"text": "Am I hungry.", "correct": False},
        ],
    },
    {
        "category": "R2",
        "question_text": "Which sentence is correct?",
        "options": [
            {"text": "She go to school every day.", "correct": False},
            {"text": "She goes to school every day.", "correct": True},
            {"text": "She going to school every day.", "correct": False},
        ],
    },
    {
        "category": "R3",
        "question_text": "Which icon is usually used to search on a phone?",
        "options": [
            {"text": "Magnifying glass", "correct": True},
            {"text": "Battery icon", "correct": False},
            {"text": "Camera icon", "correct": False},
        ],
    },
    {
        "category": "R3",
        "question_text": "What should you do if a message asks for your password?",
        "options": [
            {"text": "Send your password", "correct": False},
            {"text": "Do not reply and report it", "correct": True},
            {"text": "Share it with friends", "correct": False},
        ],
    },
]


def main():
    db = SessionLocal()

    try:
        existing_count = db.query(Question).count()

        if existing_count > 0:
            print(f"Questions already exist: {existing_count}. Nothing inserted.")
            return

        for item in QUESTIONS:
            question = Question(
                category=item["category"],
                question_text=item["question_text"],
            )
            db.add(question)
            db.flush()

            for option in item["options"]:
                db.add(
                    QuestionOption(
                        question_id=question.id,
                        option_text=option["text"],
                        is_correct=option["correct"],
                    )
                )

        db.commit()
        print("Inserted 6 questions with options.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()