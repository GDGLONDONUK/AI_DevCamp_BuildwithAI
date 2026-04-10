import { CURRICULUM_WEEKS } from "@/data/sessions";
import { CheckCircle2, ExternalLink, Clock, Code2 } from "lucide-react";

const WEEK_COLORS = [
  "from-blue-500 to-blue-700",
  "from-purple-500 to-purple-700",
  "from-green-500 to-green-700",
  "from-orange-500 to-orange-700",
];

const WEEK_BG = [
  "border-blue-500/20 bg-blue-500/5",
  "border-purple-500/20 bg-purple-500/5",
  "border-green-500/20 bg-green-500/5",
  "border-orange-500/20 bg-orange-500/5",
];

export default function CurriculumPage() {
  return (
    <div className="min-h-screen bg-gray-950 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-block bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            BEGINNER LEVEL
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            4-Week Curriculum
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            No prior AI experience required. By the end you&apos;ll understand AI & ML
            fundamentals, be comfortable with Python, train basic ML models, and
            know how AI fits into real products.
          </p>
        </div>

        <div className="grid gap-8">
          {CURRICULUM_WEEKS.map((week, i) => (
            <div
              key={week.week}
              className={`rounded-2xl border p-6 sm:p-8 ${WEEK_BG[i]}`}
            >
              <div className="flex items-start gap-5">
                <div
                  className={`flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br ${WEEK_COLORS[i]} flex items-center justify-center`}
                >
                  <span className="text-white font-bold text-lg">{week.week}</span>
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                    <h2 className="text-xl font-bold text-white">
                      Week {week.week}: {week.title}
                    </h2>
                    {week.subtitle && (
                      <span className="text-sm text-gray-400">
                        ({week.subtitle})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-5">
                    <Clock size={13} />
                    {week.timePerDay}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
                        What you&apos;ll learn
                      </h3>
                      <ul className="space-y-2">
                        {week.learn.map((item) => (
                          <li
                            key={item}
                            className="flex items-start gap-2 text-sm text-gray-400"
                          >
                            <CheckCircle2
                              size={14}
                              className="text-green-400 mt-0.5 flex-shrink-0"
                            />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">
                        Build
                      </h3>
                      <ul className="space-y-2">
                        {week.build.map((item) => (
                          <li
                            key={item}
                            className="flex items-start gap-2 text-sm text-gray-400"
                          >
                            <Code2
                              size={14}
                              className="text-blue-400 mt-0.5 flex-shrink-0"
                            />
                            {item}
                          </li>
                        ))}
                      </ul>

                      {week.resources && week.resources.length > 0 && (
                        <div className="mt-4">
                          <h3 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide">
                            Resources
                          </h3>
                          <div className="space-y-2">
                            {week.resources.map((res) => (
                              <a
                                key={res.url}
                                href={res.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                <ExternalLink size={13} />
                                {res.title}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            🎯 End Goal – Your First AI Models
          </h2>
          <p className="text-gray-400 mb-4">
            Complete the 4-week program and build:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="bg-white/10 text-white text-sm px-4 py-2 rounded-lg">
              ✅ Handwritten digit classifier
            </span>
            <span className="bg-white/10 text-white text-sm px-4 py-2 rounded-lg">
              ✅ Simple image classifier
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
