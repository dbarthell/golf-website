import { Table } from '@mantine/core';
import type { LagRow } from '../lib/types';
import { getDistanceForStimp } from '../lib/backswing';
import { useUnits } from '../hooks/useUnits';

// Extended rows: 9", 12", 15" past outside trail foot (24/27/30" backswing)
const EXTENDED_INCHES = [24, 27, 30];

interface Props {
  lagRows: LagRow[];
  distanceFactor: number;
  stimp: number;
}

export function BackswingTable({ lagRows, distanceFactor, stimp }: Props) {
  const { fmtDist, fmtBackswing } = useUnits();

  const rows = lagRows.filter(r =>
    r.original || EXTENDED_INCHES.includes(parseFloat(r.inches.replace('"', ''))),
  );

  return (
    <div className="quick-table-section">
      <h2 className="section-title">Backswing Reference (Stimp {stimp})</h2>
      <div className="table-wrapper">
        <Table className="quick-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Distance</Table.Th>
              <Table.Th>Backswing</Table.Th>
              <Table.Th>Landmark</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map(r => {
              const rawDist = getDistanceForStimp(r, stimp);
              const calFeet = Math.round(rawDist / distanceFactor);
              return (
                <Table.Tr key={r.landmark} className="row-original">
                  <Table.Td>{fmtDist(calFeet)}</Table.Td>
                  <Table.Td>{fmtBackswing(parseFloat(r.inches.replace('"', '')))}</Table.Td>
                  <Table.Td>{r.landmark}</Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </div>
    </div>
  );
}
