/*
 * The sample file of the CSV import page and its states grid, made in the browser so the docs
 * reader can try the flow without a file of their own: 80 candidates (Name, Stage, Source), 4
 * with a stage that isn't one of the options, so Review and the result have rows to skip.
 */

/** A small seeded generator, so every load makes the same file. */
function random(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}
const pick = <T,>(rand: () => number, list: readonly T[]) => list[Math.floor(rand() * list.length)]!

const escape = (v: string) => (/[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
const csv = (rows: string[][], delimiter: string) => rows.map((r) => r.map(escape).join(delimiter)).join('\r\n')

const PEOPLE = ['Maya Chen', 'Lucas Martin', 'Amara Okafor', 'Jonas Weber', 'Sofia Rossi', 'Daniel Kim', 'Priya Nair', 'Leo Dubois', 'Hana Sato', 'Omar Haddad', 'Ines Silva', 'Noah Fischer', 'Elena Petrova', 'Sam Taylor', 'Aisha Bello', 'Mateo García']
const STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired']
const CANDIDATE_SOURCES = ['LinkedIn', 'Referral', 'Careers page', 'Job fair', 'Agency']
/** Rows (from 1) whose stage the ATS doesn't have. */
const OFF_STAGE: Record<number, string> = { 12: 'Phone screen', 33: 'On hold', 51: 'Onsite', 74: 'Rejected?' }

/** The candidates, as the text of a CSV file. */
export function candidatesCsv() {
  const rand = random(80)
  const rows = [['Name', 'Stage', 'Source']]
  for (let n = 1; n <= 80; n++) {
    const name = `${pick(rand, PEOPLE).split(' ')[0]} ${pick(rand, PEOPLE).split(' ')[1]}`
    // Some stages in lower case: the match ignores case.
    const stage = OFF_STAGE[n] ?? (n % 9 === 0 ? pick(rand, STAGES).toLowerCase() : pick(rand, STAGES))
    rows.push([name, stage, pick(rand, CANDIDATE_SOURCES)])
  }
  return csv(rows, ',')
}

export const candidatesFile = () => new File([candidatesCsv()], 'candidates.csv', { type: 'text/csv' })
