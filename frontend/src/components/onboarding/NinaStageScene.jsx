import { useMemo } from "react";

const SKYLINE_COUNT = 14;

function generateSkylineGeometry() {
  return Array.from({ length: SKYLINE_COUNT }, (_, idx) => {
    const widthPx = 80 + ((idx * 37) % 50);
    const heightPx = 90 + ((idx * 53) % 80);
    const facadeFill = idx % 2 ? "#46648C" : "#3C5983";
    const offsetLeft = idx * 190 + 160;
    const gridCols = Math.floor(widthPx / 26);
    const gridRows = Math.floor(heightPx / 26);

    const windowRects = Array.from(
      { length: gridRows * gridCols },
      (__, winIdx) => ({
        id: winIdx,
        x: 10 + (winIdx % gridCols) * 26,
        y: 22 + Math.floor(winIdx / gridCols) * 26,
      }),
    );

    return {
      id: `skyline-${idx}`,
      widthPx,
      heightPx,
      facadeFill,
      offsetLeft,
      windowRects,
      showTree: idx % 3 === 0,
      treeOffsetLeft: idx * 190 + 60,
    };
  });
}

export default function NinaStageScene({
  characterPose,
  facialExpression,
  dialogueBubbleText,
}) {
  const skylineBlocks = useMemo(() => generateSkylineGeometry(), []);

  return (
    <div id="scene" className="nina-scene">
      <div className="layer" id="far" aria-hidden="true">
        {Array.from({ length: SKYLINE_COUNT }, (_, idx) => (
          <svg
            key={`ridge-${idx}`}
            style={{ left: `${idx * 260 + 20}px`, bottom: "34px" }}
            width="200"
            height="130"
            viewBox="0 0 200 130"
          >
            <path d="M0 130L100 20L200 130z" fill="#fff" opacity=".35" />
          </svg>
        ))}
      </div>

      <div className="layer" id="near" aria-hidden="true">
        {skylineBlocks.map((block) => (
          <span key={block.id}>
            <svg
              style={{ left: `${block.offsetLeft}px` }}
              width={block.widthPx}
              height={block.heightPx}
              viewBox={`0 0 ${block.widthPx} ${block.heightPx}`}
            >
              <rect
                width={block.widthPx}
                height={block.heightPx}
                fill={block.facadeFill}
              />
              <rect
                x="-4"
                y="0"
                width={block.widthPx + 8}
                height="9"
                fill="#2F4A72"
              />
              {block.windowRects.map((win) => (
                <rect
                  key={win.id}
                  x={win.x}
                  y={win.y}
                  width="13"
                  height="13"
                  rx="3"
                  fill="#fff"
                  opacity=".28"
                />
              ))}
            </svg>
            {block.showTree && (
              <svg
                style={{ left: `${block.treeOffsetLeft}px` }}
                width="40"
                height="80"
                viewBox="0 0 40 80"
              >
                <rect x="18" y="40" width="5" height="40" fill="#46648C" />
                <circle cx="20" cy="30" r="22" fill="#6E8FB8" />
              </svg>
            )}
          </span>
        ))}
      </div>

      <div id="ground" aria-hidden="true" />
      <div id="bubble" role="status" aria-live="polite">
        {dialogueBubbleText}
      </div>

      <svg
        id="hero"
        viewBox="0 0 100 128"
        data-pose={characterPose}
        data-face={facialExpression}
        data-look=""
        aria-label="Nina"
      >
        <defs>
          <linearGradient id="gh" x1=".2" y1="0" x2=".8" y2="1">
            <stop offset="0" stopColor="#5EDBFF" />
            <stop offset="1" stopColor="#00A3E0" />
          </linearGradient>
          <linearGradient id="gb" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2CC8FF" />
            <stop offset="1" stopColor="#0086C8" />
          </linearGradient>
          <linearGradient id="gl" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#17B4F2" />
            <stop offset="1" stopColor="#0072B3" />
          </linearGradient>
          <linearGradient id="gp" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2B8CF0" />
            <stop offset="1" stopColor="#0A4C98" />
          </linearGradient>
          <linearGradient id="gs" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0A84E0" />
            <stop offset="1" stopColor="#005BA8" />
          </linearGradient>
        </defs>
        <ellipse
          className="shadow"
          cx="50"
          cy="122"
          rx="27"
          ry="5"
          fill="#0A192F"
          opacity=".25"
        />
        <g
          stroke="#0B2545"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          <g className="front">
            <g id="nb">
              <g className="leg l1">
                <rect
                  x="37"
                  y="92"
                  width="11"
                  height="22"
                  rx="5.5"
                  fill="url(#gl)"
                />
                <ellipse cx="41.5" cy="116" rx="9.5" ry="5.2" fill="#0A3D74" />
                <ellipse
                  cx="39"
                  cy="114.2"
                  rx="4"
                  ry="1.6"
                  fill="#fff"
                  opacity=".35"
                  stroke="none"
                />
              </g>
              <g className="leg l2">
                <rect
                  x="52"
                  y="92"
                  width="11"
                  height="22"
                  rx="5.5"
                  fill="url(#gl)"
                />
                <ellipse cx="58.5" cy="116" rx="9.5" ry="5.2" fill="#0A3D74" />
                <ellipse
                  cx="56"
                  cy="114.2"
                  rx="4"
                  ry="1.6"
                  fill="#fff"
                  opacity=".35"
                  stroke="none"
                />
              </g>
              <rect
                x="28"
                y="62"
                width="44"
                height="37"
                rx="17"
                fill="url(#gb)"
              />
              <ellipse
                cx="39"
                cy="74"
                rx="6"
                ry="3"
                fill="#fff"
                opacity=".28"
                stroke="none"
                transform="rotate(-25 39 74)"
              />
              <circle cx="50" cy="84" r="6.2" fill="#fff" />
              <text
                x="50"
                y="87.4"
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill="#0072CE"
                stroke="none"
                fontFamily="Fredoka,sans-serif"
              >
                G
              </text>
              <rect
                x="32"
                y="60"
                width="36"
                height="8"
                rx="4"
                fill="url(#gs)"
              />
              <g className="head">
                <path
                  className="pt pt-l"
                  d="M23 36c-15-7-21 11-10 20 8 3 13-2 14-9z"
                  fill="url(#gp)"
                />
                <path
                  className="pt pt-r"
                  d="M77 36c15-7 21 11 10 20-8 3-13-2-14-9z"
                  fill="url(#gp)"
                />
                <ellipse cx="50" cy="42" rx="34" ry="29" fill="url(#gh)" />
                <path
                  d="M16 40C17 15 33 9 50 9s33 6 34 31c-9-9-21-14-34-12-13-2-25 3-34 12z"
                  fill="url(#gp)"
                />
                <path
                  d="M30 17q10-5 20-4"
                  fill="none"
                  stroke="#fff"
                  opacity=".4"
                  strokeWidth="2.2"
                />
                <path d="M50 10c-4-6-1-11 4-10" fill="none" />
                <circle cx="35" cy="46" r="14" fill="#fff" />
                <circle cx="65" cy="46" r="14" fill="#fff" />
                <path d="M49 46h2" fill="none" />
                <g className="look">
                  <g className="pup">
                    <circle
                      cx="36"
                      cy="47"
                      r="5.4"
                      fill="#0B2545"
                      stroke="none"
                    />
                    <circle
                      cx="37.8"
                      cy="45.1"
                      r="1.7"
                      fill="#fff"
                      stroke="none"
                    />
                  </g>
                </g>
                <g className="look">
                  <g className="pup">
                    <circle
                      cx="64"
                      cy="47"
                      r="5.4"
                      fill="#0B2545"
                      stroke="none"
                    />
                    <circle
                      cx="65.8"
                      cy="45.1"
                      r="1.7"
                      fill="#fff"
                      stroke="none"
                    />
                  </g>
                </g>
                <ellipse
                  cx="25"
                  cy="63"
                  rx="5"
                  ry="3"
                  fill="#8EE8FF"
                  opacity=".6"
                  stroke="none"
                />
                <ellipse
                  cx="75"
                  cy="63"
                  rx="5"
                  ry="3"
                  fill="#8EE8FF"
                  opacity=".6"
                  stroke="none"
                />
                <path
                  className="m m-smile"
                  d="M43 62q7 7 14 0"
                  fill="none"
                  strokeWidth="2.6"
                />
                <path
                  className="m m-open"
                  d="M42 60.5q8 12 16 0z"
                  fill="#0B2545"
                />
                <ellipse
                  className="m m-open"
                  cx="50"
                  cy="65.6"
                  rx="3.6"
                  ry="2"
                  fill="#5EDBFF"
                  stroke="none"
                />
                <ellipse
                  className="m m-o"
                  cx="50"
                  cy="63.5"
                  rx="3.2"
                  ry="3.8"
                  fill="#0B2545"
                />
              </g>
              <g className="arm a1">
                <rect
                  x="20"
                  y="66"
                  width="10"
                  height="26"
                  rx="5"
                  fill="url(#gl)"
                />
                <circle cx="25" cy="93" r="6" fill="url(#gh)" />
              </g>
              <g className="arm a2">
                <rect
                  x="70"
                  y="66"
                  width="10"
                  height="26"
                  rx="5"
                  fill="url(#gl)"
                />
                <circle cx="75" cy="93" r="6" fill="url(#gh)" />
              </g>
            </g>
          </g>
          <g className="side">
            <g className="leg l1">
              <rect
                x="42"
                y="92"
                width="11"
                height="22"
                rx="5.5"
                fill="url(#gl)"
              />
              <ellipse cx="50" cy="116" rx="10.5" ry="5.2" fill="#0A3D74" />
            </g>
            <g className="leg l2">
              <rect
                x="48"
                y="92"
                width="11"
                height="22"
                rx="5.5"
                fill="url(#gl)"
              />
              <ellipse cx="56" cy="116" rx="10.5" ry="5.2" fill="#0A3D74" />
            </g>
            <rect
              x="36"
              y="62"
              width="30"
              height="37"
              rx="15"
              fill="url(#gb)"
            />
            <rect
              x="38"
              y="60"
              width="26"
              height="8"
              rx="4"
              fill="url(#gs)"
            />
            <g className="arm a2">
              <rect
                x="45"
                y="67"
                width="10"
                height="26"
                rx="5"
                fill="url(#gl)"
              />
              <circle cx="50" cy="94" r="6" fill="url(#gh)" />
            </g>
            <path
              d="M27 38c-16-8-22 10-11 20 8 3 13-3 14-9z"
              fill="url(#gp)"
            />
            <ellipse cx="50" cy="42" rx="31" ry="29" fill="url(#gh)" />
            <path
              d="M19 40C19 15 35 9 52 9s31 8 31 28c-8-8-19-11-31-10-12-1-22 4-33 13z"
              fill="url(#gp)"
            />
            <path d="M50 10c-4-6-1-11 4-10" fill="none" />
            <circle cx="42" cy="54" r="5" fill="url(#gh)" />
            <circle cx="64" cy="46" r="14" fill="#fff" />
            <g className="look">
              <circle
                cx="69"
                cy="47"
                r="5.4"
                fill="#0B2545"
                stroke="none"
              />
              <circle
                cx="70.8"
                cy="45"
                r="1.7"
                fill="#fff"
                stroke="none"
              />
            </g>
            <ellipse
              cx="68"
              cy="63"
              rx="5"
              ry="3"
              fill="#8EE8FF"
              opacity=".6"
              stroke="none"
            />
            <path d="M66 62q5 5 10 0" fill="none" strokeWidth="2.6" />
          </g>
        </g>
      </svg>
    </div>
  );
}
