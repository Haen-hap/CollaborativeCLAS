import { useState } from "react";

const AGE_RANGES = [
  { value: "18_24", label: "18–24" },
  { value: "25_34", label: "25–34" },
  { value: "35_49", label: "35–49" },
  { value: "50_59", label: "50–59" },
  { value: "60_PLUS", label: "60+" },
];

const WORK_STATUSES = [
  { value: "FORMAL", label: "Formal employment" },
  { value: "INFORMAL", label: "Informal employment" },
  { value: "HOME", label: "At home" },
  { value: "STUDENT", label: "Student" },
  { value: "UNEMPLOYED", label: "Unemployed" },
];

const SCHOOLING_LEVELS = [
  { value: "PRIMARY_INCOMPLETE", label: "Primary school – incomplete" },
  { value: "PRIMARY_COMPLETE", label: "Primary school – complete" },
  { value: "SECONDARY_INCOMPLETE", label: "Secondary school – incomplete" },
  { value: "SECONDARY_COMPLETE", label: "Secondary school – complete" },
  { value: "TERTIARY", label: "Tertiary education" },
];

const ZONE_CODES = [
  ...Array.from(
    { length: 36 },
    (_, index) => `Z${String(index + 1).padStart(3, "0")}`,
  ),
  "DECLINED",
];

export default function DemographicForm({ onComplete, submissionError }) {
  const [ageRange, setAgeRange] = useState("");
  const [gender, setGender] = useState("");
  const [workStatus, setWorkStatus] = useState("");
  const [schoolingLevel, setSchoolingLevel] = useState("");
  const [zoneCode, setZoneCode] = useState("DECLINED");

  function handleSubmit(event) {
    event.preventDefault();

    onComplete({
      ageRange,
      gender: gender || null,
      workStatus,
      schoolingLevel,
      zoneCode,
    });
  }

  return (
    <section
      className="demographic-container"
      aria-labelledby="demographic-title"
    >
      <div className="demographic-card">
        <span className="demographic-badge">Required</span>

        <h1 id="demographic-title" className="demographic-title">
          About you
        </h1>

        <p className="demographic-subtitle">
          A few details help us understand literacy needs in your community.
        </p>

        <div className="demographic-privacy-note">
          Do not enter your name, ID number, email, or street address.
        </div>

        {submissionError && (
          <div className="demographic-privacy-note" role="alert">
            {submissionError}
          </div>
        )}

        <form className="demographic-form" onSubmit={handleSubmit}>
          <div className="demographic-field">
            <label htmlFor="demographic-age">
              Your age range
              <span className="demographic-optional">Required</span>
            </label>

            <select
              id="demographic-age"
              value={ageRange}
              onChange={(event) => setAgeRange(event.target.value)}
              required
            >
              <option value="">Select your age range</option>

              {AGE_RANGES.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>

          <div className="demographic-field">
            <label htmlFor="demographic-gender">
              Your gender
              <span className="demographic-optional">Optional</span>
            </label>

            <select
              id="demographic-gender"
              value={gender}
              onChange={(event) => setGender(event.target.value)}
            >
              <option value="">Select an option</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
            </select>
          </div>

          <div className="demographic-field">
            <label htmlFor="demographic-work-status">
              Your work status
              <span className="demographic-optional">Required</span>
            </label>

            <select
              id="demographic-work-status"
              value={workStatus}
              onChange={(event) => setWorkStatus(event.target.value)}
              required
            >
              <option value="">Select an option</option>

              {WORK_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          <div className="demographic-field">
            <label htmlFor="demographic-schooling">
              Your schooling level
              <span className="demographic-optional">Required</span>
            </label>

            <select
              id="demographic-schooling"
              value={schoolingLevel}
              onChange={(event) => setSchoolingLevel(event.target.value)}
              required
            >
              <option value="">Select an option</option>

              {SCHOOLING_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          <div className="demographic-field">
            <label htmlFor="demographic-zone">
              Your zone
              <span className="demographic-optional">Required</span>
            </label>

            <select
              id="demographic-zone"
              value={zoneCode}
              onChange={(event) => setZoneCode(event.target.value)}
              required
            >
              {ZONE_CODES.map((zone) => (
                <option key={zone} value={zone}>
                  {zone === "DECLINED" ? "Prefer not to share location" : zone}
                </option>
              ))}
            </select>

            <p id="demographic-zone-help" className="demographic-field-help">
              Select the zone where you live, or choose not to share your
              location.
            </p>
          </div>

          <div className="demographic-actions">
            <button type="submit" className="demographic-button primary">
              Continue to questions
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
