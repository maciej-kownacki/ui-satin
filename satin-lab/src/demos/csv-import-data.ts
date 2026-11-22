/*
 * The sample files of the CSV import page and its states grid, made in the browser so the docs
 * reader can try the flow without a file of their own.
 *
 * Sales: 340 people met at a trade fair in Poznań, exported from a Polish Excel (semicolons, a
 * UTF-8 BOM). Headers Imię i nazwisko, E-mail, Firma, Telefon, Źródło. Exactly 12 emails are
 * broken. HR: 80 candidates (Name, Stage, Source), 4 with a stage that isn't one of the options.
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

const FIRST = ['Anna', 'Piotr', 'Katarzyna', 'Tomasz', 'Magdalena', 'Paweł', 'Agnieszka', 'Michał', 'Joanna', 'Krzysztof', 'Ewa', 'Łukasz', 'Małgorzata', 'Jakub', 'Zofia', 'Wojciech', 'Natalia', 'Grzegorz', 'Aleksandra', 'Bartłomiej']
const LAST = ['Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kowalczyk', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Woźniak', 'Dąbrowski', 'Kozłowski', 'Jankowski', 'Mazur', 'Krawczyk', 'Piotrowski', 'Grabowski', 'Pawłowski', 'Michalski', 'Król']
const COMPANIES = [
  ['Mebloteka', 'mebloteka.pl'],
  ['Agro-Tech Kalisz', 'agrotech.pl'],
  ['Sklejka Polska', 'sklejka.com.pl'],
  ['Hydrobud', 'hydrobud.pl'],
  ['Pakmar', 'pakmar.eu'],
  ['Zielony Dom', 'zielonydom.pl'],
  ['Stalprofil', 'stalprofil.pl'],
  ['Wiatrak Energia', 'wiatrak.energy'],
  ['Drukarnia Orzeł', 'orzel-druk.pl'],
  ['Logistyka Bałtyk', 'baltyk-log.pl'],
  ['Ceramika Bolesław', 'ceramika-b.pl'],
  ['Fabryka Okien Lech', 'oknalech.pl'],
] as const
const SOURCES = ['Targi Poznań, stoisko', 'Targi Poznań, prelekcja', 'Wizytówka', 'Skan identyfikatora']

/** Polish letters out, for the email's local part. */
const ascii = (s: string) =>
  s
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** The feminine form of a -ski / -cki surname, so "Anna Kowalska", not "Anna Kowalski". */
const surname = (first: string, last: string) => (first.endsWith('a') && /(ski|cki)$/.test(last) ? last.slice(0, -1) + 'a' : last)

/** The 12 broken emails, each a mistake people make typing one. */
const BROKEN = [
  (l: string) => `${l}@firma`,
  (l: string) => `${l}.wp.pl`,
  (l: string) => `${l}@@onet.pl`,
  (l: string) => `${l.replace('.', ' ')}@gmail.com`,
  (l: string) => `${l}@gmail,com`,
  (l: string) => `${l}@`,
  (l: string) => `@${l}.pl`,
  (l: string) => `${l}@interia`,
  (l: string) => `${l} @o2.pl`,
  (l: string) => `${l}(at)wp.pl`,
  (l: string) => `${l}@gmail.`,
  (l: string) => `${l}@poczta onet.pl`,
]
/** Rows (from 1) with a broken email, spread through the file so they land on several pages. */
const BROKEN_ROWS = [7, 23, 58, 91, 117, 144, 171, 203, 236, 262, 298, 331]

const escape = (v: string) => (/[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
const csv = (rows: string[][], delimiter: string) => rows.map((r) => r.map(escape).join(delimiter)).join('\r\n')

/** The trade-fair leads, as the text of a CSV file. */
export function leadsCsv() {
  const rand = random(20261122)
  const rows = [['Imię i nazwisko', 'E-mail', 'Firma', 'Telefon', 'Źródło']]
  for (let n = 1; n <= 340; n++) {
    const first = pick(rand, FIRST)
    const last = surname(first, pick(rand, LAST))
    const [company, domain] = pick(rand, COMPANIES)
    const local = `${ascii(first)}.${ascii(last)}`
    const broken = BROKEN_ROWS.indexOf(n)
    const email = broken >= 0 ? BROKEN[broken]!(local) : `${local}@${domain}`
    const phone = `+48 ${500 + Math.floor(rand() * 300)} ${String(Math.floor(rand() * 1000)).padStart(3, '0')} ${String(Math.floor(rand() * 1000)).padStart(3, '0')}`
    rows.push([`${first} ${last}`, email, company, phone, pick(rand, SOURCES)])
  }
  return csv(rows, ';')
}

/** The leads file, as a browser would hand it over from a drop: UTF-8 with a BOM, as Excel saves it. */
export const leadsFile = () => new File(['﻿' + leadsCsv()], 'targi-poznan-leads.csv', { type: 'text/csv' })

/** The empty template behind "Download template". */
export const leadsTemplateHref = `data:text/csv;charset=utf-8,${encodeURIComponent('﻿Imię i nazwisko;E-mail;Firma;Telefon;Źródło\r\n')}`

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
