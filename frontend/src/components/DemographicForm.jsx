import { useState } from "react";

const AGE_RANGES = [
  "Under 18",
  "18–24",
  "25–34",
  "35–44",
  "45–54",
  "55–64",
  "65+",
];

export default function DemographicForm({ onComplete }) {
  const [ageRange, setAgeRange] = useState("");
  const [gender, setGender] = useState("");
  const [community, setCommunity] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    onComplete({
      ageRange: ageRange || null,
      gender: gender || null,
      community: community.trim() || null,
    });
  }

  function handleSkip() {
    onComplete({
      ageRange: null,
      gender: null,
      community: null,
    });
  }

  return (
    <section
      className="demographic-container"
      aria-labelledby="demographic-title"
    >
      <div className="demographic-card">
        <span className="demographic-badge">Optional step</span>

        <h1 id="demographic-title" className="demographic-title">
          A little about you
        </h1>

        <p className="demographic-subtitle">
          Help us understand the needs of your community. All fields are
          optional.
        </p>

        <div className="demographic-privacy-note">
          Please do not enter your name, email, ID number or exact address. You
          can continue without sharing any information.
        </div>

        <form className="demographic-form" onSubmit={handleSubmit}>
          <div className="demographic-field">
            <label htmlFor="demographic-age">
              Age range
              <span className="demographic-optional">Optional</span>
            </label>

            <select
              id="demographic-age"
              value={ageRange}
              onChange={(event) => setAgeRange(event.target.value)}
            >
              <option value="">Select your age range</option>

              {AGE_RANGES.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </select>
          </div>

          <div className="demographic-field">
            <label htmlFor="demographic-gender">
              Gender
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
            <label htmlFor="demographic-community">
              City or community
              <span className="demographic-optional">Optional</span>
            </label>

            <input
              id="demographic-community"
              type="text"
              value={community}
              onChange={(event) => setCommunity(event.target.value)}
              placeholder="Enter only your city or community"
              maxLength={100}
              aria-describedby="demographic-community-help"
            />

            <p
              id="demographic-community-help"
              className="demographic-field-help"
            >
              Do not enter your street, house number or exact address.
            </p>
          </div>

          <div className="demographic-actions">
            <button
              type="button"
              className="demographic-button secondary"
              onClick={handleSkip}
            >
              Skip this step
            </button>

            <button type="submit" className="demographic-button primary">
              Continue
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
