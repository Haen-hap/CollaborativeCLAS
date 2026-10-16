import { assessmentQuestions } from "../data/assessmentData";

export default function Dashboard({ result, onBack }) {
  return (
    <main className="results-page answer-review-page">
      <header className="results-heading">
        <div>
          <p className="results-eyebrow">CLAS · Assessment</p>
          <h1>Review answers</h1>
          <p>Your selected answer is shown beside the correct answer.</p>
        </div>
        <button className="results-back-button" type="button" onClick={onBack}>
          Back to your result
        </button>
      </header>

      <section className="results-panel" aria-label="Your assessment answers">
        <div className="answer-review-table-wrap">
          <table className="answer-review-table">
            <thead>
              <tr>
                <th scope="col">Question</th>
                <th scope="col">Your answer</th>
                <th scope="col">Correct answer</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {assessmentQuestions.map((question) => {
                const selectedIndex = result.answers?.[question.id];
                const isCorrect = selectedIndex === question.correctIndex;
                return (
                  <tr key={question.id}>
                    <td>{question.text}</td>
                    <td>{question.options[selectedIndex] ?? "No answer"}</td>
                    <td>{question.options[question.correctIndex]}</td>
                    <td>
                      <span className={`answer-result ${isCorrect ? "correct" : "incorrect"}`}>
                        {isCorrect ? "Correct" : "Not quite"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
