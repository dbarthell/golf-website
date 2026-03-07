import type { LagRow } from '../lib/types';
import { fmtInches } from '../lib/zbl';

interface Props {
  lagRows: LagRow[];
  distanceFactor: number;
}

export function BackswingTable({ lagRows, distanceFactor }: Props) {
  const originalRows = lagRows.filter(r => r.original);

  return (
    <div className="quick-table-section">
      <h2 className="section-title">Backswing Reference (Stimp 10)</h2>
      <div className="table-wrapper">
        <table className="quick-table">
          <thead>
            <tr>
              <th>Distance</th>
              <th>Backswing</th>
              <th>Landmark</th>
            </tr>
          </thead>
          <tbody>
            {originalRows.map(r => {
              const rawDist = parseFloat(r.stimp10.replace(' ft', ''));
              const calDist = Math.round(rawDist / distanceFactor) + ' ft';
              return (
                <tr key={r.landmark} className="row-original">
                  <td>{calDist}</td>
                  <td>{fmtInches(parseFloat(r.inches.replace('"', '')))}</td>
                  <td>{r.landmark}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
