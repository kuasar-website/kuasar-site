import { useState } from "react";
import { DateTime } from "../../apps/web/components/time/date-time";
import { useTimeCollection } from "../../apps/web/lib/time/use-time";
import type { TimeLocale } from "../../apps/web/lib/time/date";

const records = [
  { id: "later", startsAt: "2026-12-01T00:00:00Z" },
  { id: "event", startsAt: "2026-11-07T10:00:00Z", endsAt: "2026-11-07T11:00:00Z" },
  { id: "earlier", startsAt: "2026-08-01T00:00:00Z" },
];
const many = Array.from({ length: 50 }, (_, i) => ({ id: String(i), startsAt: "2026-12-01" }));

function Dates({ locale }: { locale: TimeLocale }) {
  const selected = useTimeCollection(records, { state: "upcoming", sort: "ascending" });
  const empty = useTimeCollection([], { state: "upcoming" });
  const one = useTimeCollection(records.slice(0, 1), { state: "upcoming" });
  const fifty = useTimeCollection(many, { state: "upcoming" });
  const sorted = useTimeCollection([
    { id: "invalid", startsAt: "bad" }, ...records,
    { ...records[1], id: "tie" },
  ], { sort: "descending" });
  return <>
    {records.map((record) => <div id={record.id} key={record.id}><DateTime {...record} locale={locale} /></div>)}
    <div id="day"><DateTime startsAt="2026-11-07" locale={locale} /></div>
    <div id="offset"><DateTime startsAt="2026-11-07T13:00:00+03:00" endsAt="2026-11-07T14:00:00+03:00" locale={locale} /></div>
    <div id="invalid"><DateTime startsAt="2026-02-30" locale={locale} /></div>
    <div id="ambiguous"><DateTime startsAt="2026-11-07T10:00:00" locale={locale} /></div>
    <div id="reversed"><DateTime startsAt="2026-11-07" endsAt="2026-11-06" locale={locale} /></div>
    <div id="bad-end"><DateTime startsAt="2026-11-07" endsAt="bad" locale={locale} /></div>
    <div id="missing"><DateTime locale={locale} /></div>
    <ul id="selected">{selected.map((r) => <li key={r.id}>{r.id}</li>)}</ul>
    <p id="counts">{[empty.length, one.length, fifty.length].join(",")}</p>
    <p id="sorted">{sorted.map((r) => r.id).join(",")}</p>
  </>;
}

export function Fixture({ locale }: { locale: TimeLocale }) {
  const [visible, setVisible] = useState(true);
  return <main lang={locale}>
    <button onClick={() => setVisible(!visible)}>Toggle</button>
    {visible && <Dates locale={locale} />}
  </main>;
}
