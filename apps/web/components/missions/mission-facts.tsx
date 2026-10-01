import { DateTime } from "@/components/time/date-time";

import { MISSION_COPY } from "./content";
import { formatApogee, type MissionView } from "./model";
import styles from "./missions.module.css";

type MissionFactsProps = {
  readonly mission: MissionView;
};

export function MissionFacts({ mission }: MissionFactsProps) {
  const copy = MISSION_COPY[mission.locale];
  const { facts } = mission;

  return (
    <dl className={styles.facts}>
      <div>
        <dt>{copy.labels.year}</dt>
        <dd>{facts.year}</dd>
      </div>
      <div>
        <dt>{copy.labels.type}</dt>
        <dd>{copy.types[facts.type]}</dd>
      </div>
      <div>
        <dt>{copy.labels.status}</dt>
        <dd>{copy.statuses[facts.status]}</dd>
      </div>
      {facts.competition ? (
        <div>
          <dt>{copy.labels.competition}</dt>
          <dd>{facts.competition}</dd>
        </div>
      ) : null}
      <div>
        <dt>{copy.labels.launchDate}</dt>
        <dd>
          {facts.launchDate ? (
            <DateTime startsAt={facts.launchDate} locale={mission.locale} />
          ) : (
            copy.notScheduled
          )}
        </dd>
      </div>
      <div>
        <dt>{copy.labels.apogee}</dt>
        <dd>{formatApogee(facts.apogeeMetres, mission.locale, copy.unconfirmed)}</dd>
      </div>
    </dl>
  );
}
