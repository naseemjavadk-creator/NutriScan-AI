import Link from "next/link";
import PlateRing from "@/components/PlateRing";

const SAMPLE = [
  { name: "Cooked rice", grams: 200, kcal: 260 },
  { name: "Grilled chicken", grams: 120, kcal: 198 },
  { name: "Vegetable curry", grams: 100, kcal: 90 },
];

const STEPS = [
  { title: "Take or upload a photo", text: "JPG, PNG or WEBP. Use your phone camera or pick a photo you already have." },
  { title: "Check what we found", text: "We list each food and estimate its weight. Fix any name or portion that looks off." },
  { title: "Read your nutrition", text: "Calories, macros, vitamins and minerals, calculated food by food from a public nutrition database." },
];

const HONEST = [
  { title: "Estimates, always", text: "A photo can’t show the oil in the pan or the sugar in the sauce. Every result is an estimate, and we say so." },
  { title: "No invented numbers", text: "If the database has no value for a nutrient, you’ll see “Not available” instead of a guess." },
  { title: "Your corrections count", text: "Change a food, a portion or a cooking method and the totals update from the database, not from the photo." },
];

export default function Landing() {
  return (
    <>
      <section className="mx-auto grid max-w-5xl items-center gap-12 px-5 pb-16 pt-12 md:grid-cols-[1.15fr_1fr] md:pt-20">
        <div>
          <h1 className="text-5xl font-extrabold leading-[1.02] md:text-7xl">Know What’s on Your Plate.</h1>
          <p className="mt-5 max-w-md text-lg text-muted">
            Scan your food. Discover your nutrition. Make informed choices.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/scan" className="btn-primary px-7 py-3.5 text-base">Scan Your First Meal</Link>
            <a href="#how" className="btn-quiet">How it works</a>
          </div>
        </div>

        <figure className="card relative rounded-[2rem] p-6 md:p-7" aria-label="Sample result, not a real scan">
          <figcaption className="mb-4 flex items-center justify-between text-sm text-muted">
            <span>Sample result</span>
            <span className="rounded-full bg-leaf-50 px-2.5 py-0.5 text-xs font-medium text-leaf-700">Example only</span>
          </figcaption>
          <div className="flex justify-center">
            <PlateRing protein={44.6} carbs={66} fat={9.9} size={210}>
              <div>
                <div className="font-display text-5xl font-extrabold leading-none">548</div>
                <div className="mt-1 text-sm text-muted">kcal, estimated</div>
              </div>
            </PlateRing>
          </div>
          <ul className="mt-5 divide-y divide-line text-[15px]">
            {SAMPLE.map((s) => (
              <li key={s.name} className="flex items-baseline justify-between py-2">
                <span>{s.name} <span className="text-muted">· {s.grams} g</span></span>
                <span className="font-medium">{s.kcal} kcal</span>
              </li>
            ))}
          </ul>
        </figure>
      </section>

      <section id="how" className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="text-3xl font-bold md:text-4xl">From photo to nutrition in three steps</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card p-6">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-leaf-100 text-sm font-bold text-leaf-700">{i + 1}</span>
              <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="rounded-[2rem] bg-leaf-50 p-7 md:p-12">
          <h2 className="max-w-xl text-3xl font-bold md:text-4xl">Honest about what a photo can tell you</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {HONEST.map((h) => (
              <div key={h.title}>
                <h3 className="text-lg font-semibold">{h.title}</h3>
                <p className="mt-2 text-muted">{h.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14 text-center">
        <h2 className="text-3xl font-bold md:text-4xl">Ready when your next meal is.</h2>
        <Link href="/scan" className="btn-primary mt-6 px-7 py-3.5 text-base">Scan Your First Meal</Link>
        <p className="mt-3 text-sm text-muted">No account needed to scan. Sign up to keep a food diary.</p>
      </section>
    </>
  );
}
